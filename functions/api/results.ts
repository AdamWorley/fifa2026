/**
 * Cloudflare Pages Function: GET /api/results
 *
 * Builds the normalized results payload and stores it in KV (RESULTS_KV), served
 * instantly and refreshed in the background when stale.
 *
 * Data sources (both free, no key):
 *  - Scores/goals: the public-domain openfootball WC2026 dataset (WC_DATA_URL).
 *  - Cards: best-effort parse of the Wikipedia group articles via the MediaWiki
 *    API (license-friendly). openfootball has no cards, and free football APIs
 *    gate them. Wikipedia card parsing is approximate — any match can be
 *    corrected by hand in public/overrides.json (merged client-side), which
 *    always wins.
 *
 * Returns ResultsPayload (see src/lib/results.ts) — kept in sync by hand.
 */

import { parseKickoff, refreshIntervalMs, type MatchResult } from '../../src/lib/results'

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

interface Env {
  WC_DATA_URL?: string
  RESULTS_KV?: KVNamespace
}

interface Ctx {
  env: Env
  request: Request
  waitUntil: (p: Promise<unknown>) => void
}

const DEFAULT_DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
const WIKI_API = 'https://en.wikipedia.org/w/api.php'
const WIKI_UA = 'fifa2026-sweepstake (https://github.com/AdamWorley/fifa2026)'
const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const PAYLOAD_KEY = 'results:payload'

interface SourceMatch {
  round?: string
  num?: number
  date?: string
  time?: string
  ground?: string
  team1?: string
  team2?: string
  group?: string
  score?: { ft?: [number, number] }
}

interface Cards {
  yellow: number
  red: number
}

function dataUrl(env: Env): string {
  return env.WC_DATA_URL || DEFAULT_DATA_URL
}

// ---- score source (openfootball) ----

async function fetchSource(env: Env): Promise<SourceMatch[]> {
  const res = await fetch(dataUrl(env), {
    headers: { 'user-agent': WIKI_UA },
    cf: { cacheTtl: 300 },
  } as RequestInit)
  if (!res.ok) throw new Error(`source ${res.status}`)
  const data = (await res.json()) as { matches?: SourceMatch[] }
  return data.matches ?? []
}

// ---- card source (Wikipedia, best-effort) ----

// Canonical team key so openfootball and Wikipedia names line up.
const NAME_ALIASES: Record<string, string> = {
  'united-states': 'usa',
  'korea-republic': 'south-korea',
  'czechia': 'czech-republic',
}
function teamKey(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return NAME_ALIASES[slug] ?? slug
}

function countCards(region: string): Cards {
  // Each booked player counts once. A lone yellow is a {{yel}}; a dismissal is a
  // single {{sent off}} template whether it's a straight red or a second-yellow
  // red. We deliberately do NOT add the prior yellow(s) of a second-yellow
  // dismissal back in — two yellows that become a red still count as one card.
  const yellow = (region.match(/\{\{yel(\b|\|)/gi) || []).length
  const red = (region.match(/\{\{sent off(\b|\|)/gi) || []).length
  return { yellow, red }
}

/** Find the index just past the `|}` that closes the wiki table opened at startIdx. */
function tableEnd(text: string, startIdx: number): number {
  const re = /\{\||\|\}/g
  re.lastIndex = startIdx
  let depth = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    depth += m[0] === '{|' ? 1 : -1
    if (depth === 0) return m.index + 2
  }
  return text.length
}

/** Parse one group article's wikitext into per-match home/away card counts. */
function parseArticleCards(wikitext: string): Map<string, { home: Cards; away: Cards }> {
  const out = new Map<string, { home: Cards; away: Cards }>()
  const headings = [...wikitext.matchAll(/^={3,5}\s*([^=\n]+?)\s+vs\.?\s+([^=\n]+?)\s*={3,5}\s*$/gim)]
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    const home = h[1].trim()
    const away = h[2].trim()
    const start = h.index! + h[0].length
    const end = i + 1 < headings.length ? headings[i + 1].index! : wikitext.length
    const segment = wikitext.slice(start, end)

    const cells = [...segment.matchAll(/\|\s*valign="top"\s+width="\d+%"/gi)]
    if (cells.length < 2) continue // match not played / no lineups yet
    // Bound the away column to the lineup wrapper so we don't pick up cards from
    // post-lineup sections (man of the match, notes, the next match, etc.).
    const wrapperStart = segment.lastIndexOf('{|', cells[0].index!)
    const wrapperEnd = wrapperStart >= 0 ? tableEnd(segment, wrapperStart) : segment.length
    const homeRegion = segment.slice(cells[0].index!, cells[1].index!)
    const awayRegion = segment.slice(cells[cells.length - 1].index!, wrapperEnd)
    out.set(`${teamKey(home)}|${teamKey(away)}`, {
      home: countCards(homeRegion),
      away: countCards(awayRegion),
    })
  }
  return out
}

async function fetchGroupCards(letter: string): Promise<Map<string, { home: Cards; away: Cards }>> {
  const title = `2026 FIFA World Cup Group ${letter}`
  const url = `${WIKI_API}?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&formatversion=2&redirects=1`
  const res = await fetch(url, { headers: { 'user-agent': WIKI_UA }, cf: { cacheTtl: 600 } } as RequestInit)
  if (!res.ok) throw new Error(`wiki ${res.status}`)
  const data = (await res.json()) as { parse?: { wikitext?: string } }
  const wikitext = data.parse?.wikitext
  return wikitext ? parseArticleCards(wikitext) : new Map()
}

async function fetchAllCards(): Promise<Map<string, { home: Cards; away: Cards }>> {
  const maps = await Promise.all(
    GROUP_LETTERS.map((l) => fetchGroupCards(l).catch(() => new Map<string, { home: Cards; away: Cards }>())),
  )
  const merged = new Map<string, { home: Cards; away: Cards }>()
  for (const m of maps) for (const [k, v] of m) merged.set(k, v)
  return merged
}

const NO_CARDS = { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } }

function cardsFor(
  m: SourceMatch,
  wiki: Map<string, { home: Cards; away: Cards }>,
): { home: Cards; away: Cards } {
  const h = teamKey(m.team1 ?? '')
  const a = teamKey(m.team2 ?? '')
  const direct = wiki.get(`${h}|${a}`)
  if (direct) return direct
  const swapped = wiki.get(`${a}|${h}`)
  if (swapped) return { home: swapped.away, away: swapped.home }
  return NO_CARDS
}

// ---- normalize + refresh ----

function normalize(m: SourceMatch, wiki: Map<string, { home: Cards; away: Cards }>) {
  const ft = m.score?.ft
  const round = m.round ?? ''
  const isGroupStage = Boolean(m.group) || round.startsWith('Matchday')
  const kickoff = parseKickoff(m.date ?? '', m.time)
  return {
    id: String(m.num ?? `${m.date ?? ''}-${m.team1 ?? ''}-${m.team2 ?? ''}`),
    stage: round,
    isGroupStage,
    date: m.date ?? '',
    kickoff: kickoff?.utc ?? null,
    venue: m.ground ?? '',
    venueOffsetMinutes: kickoff?.offsetMinutes ?? null,
    home: m.team1 ?? '',
    away: m.team2 ?? '',
    status: ft ? ('finished' as const) : ('scheduled' as const),
    score: ft ? { home: ft[0], away: ft[1] } : null,
    cards: isGroupStage && ft ? cardsFor(m, wiki) : NO_CARDS,
  }
}

async function refresh(env: Env): Promise<unknown> {
  const [source, wiki] = await Promise.all([fetchSource(env), fetchAllCards().catch(() => new Map())])
  const matches = source.map((m) => normalize(m, wiki as Map<string, { home: Cards; away: Cards }>))
  const payload = { updatedAt: new Date().toISOString(), source: 'api' as const, matches }
  if (env.RESULTS_KV) await env.RESULTS_KV.put(PAYLOAD_KEY, JSON.stringify(payload))
  return payload
}

interface StoredPayload {
  updatedAt: string
  matches?: MatchResult[]
}

export const onRequestGet = async (context: Ctx): Promise<Response> => {
  const { env, request } = context
  const params = new URL(request.url).searchParams

  // ?debug=1 surfaces source counts and how many matches got card data.
  if (params.get('debug') === '1') {
    try {
      const [source, wiki] = await Promise.all([fetchSource(env), fetchAllCards()])
      const played = source.filter((m) => m.score?.ft)
      const carded = played
        .map((m) => ({ m, c: cardsFor(m, wiki) }))
        .filter((x) => x.c.home.yellow + x.c.home.red + x.c.away.yellow + x.c.away.red > 0)
      return json(
        {
          url: dataUrl(env),
          total: source.length,
          played: played.length,
          wikiMatchesParsed: wiki.size,
          matchesWithCards: carded.length,
          sample: carded.slice(0, 3).map((x) => ({
            match: `${x.m.team1} v ${x.m.team2}`,
            cards: x.c,
          })),
        },
        0,
      )
    } catch (err) {
      return json({ url: dataUrl(env), debugError: String(err) }, 0)
    }
  }

  const kv = env.RESULTS_KV
  const storedRaw = kv ? await kv.get(PAYLOAD_KEY) : null
  const stored = storedRaw ? (JSON.parse(storedRaw) as StoredPayload) : null
  // Stay fresh longer when no match is settling, so we don't re-scrape the upstream
  // sources round the clock; refresh briskly only while a score is expected to land.
  const interval = stored ? refreshIntervalMs(stored.matches ?? []) : 0
  const fresh = stored ? Date.now() - Date.parse(stored.updatedAt) < interval : false

  if (stored && fresh) return rawJson(storedRaw!, 60)
  if (stored) {
    context.waitUntil(refresh(env).catch(() => {}))
    return rawJson(storedRaw!, 0)
  }

  try {
    return json(await refresh(env), 60)
  } catch (err) {
    return json({ updatedAt: nowIso(), source: 'none', matches: [], error: String(err) }, 0)
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function headers(maxAge: number): Record<string, string> {
  return {
    'content-type': 'application/json',
    'cache-control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
    'access-control-allow-origin': '*',
  }
}

function json(body: unknown, maxAge = 0): Response {
  return new Response(JSON.stringify(body), { headers: headers(maxAge) })
}

function rawJson(body: string, maxAge = 0): Response {
  return new Response(body, { headers: headers(maxAge) })
}
