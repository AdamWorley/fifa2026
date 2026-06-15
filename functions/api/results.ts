/**
 * Cloudflare Pages Function: GET /api/results
 *
 * Fetches the public-domain openfootball World Cup 2026 dataset, normalizes it,
 * and stores it in KV (RESULTS_KV). The stored copy is served instantly and
 * refreshed in the background when stale, so visitor traffic never triggers
 * blocking upstream calls. KV is the durable store the worker writes through to.
 *
 * openfootball provides scores/goals but NOT cards — the Referee's Favourite
 * award is fed via public/overrides.json (merged client-side).
 *
 * Returns ResultsPayload (see src/lib/results.ts) — kept in sync by hand.
 *
 * Config (wrangler.toml):
 *   WC_DATA_URL (var, optional) — override the source JSON URL
 *   RESULTS_KV  (kv)            — durable store for the normalized payload
 */

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

interface Env {
  WC_DATA_URL?: string
  RESULTS_KV?: KVNamespace
  // Optional: a football-data.org token to probe whether WC cards (bookings)
  // are available on the free tier. Set as a Cloudflare secret.
  FOOTBALL_DATA_TOKEN?: string
}

const FD_BASE = 'https://api.football-data.org/v4'

interface FdMatch {
  id?: number
  status?: string
  homeTeam?: { name?: string }
  awayTeam?: { name?: string }
}
interface FdBody {
  matches?: FdMatch[]
  filters?: unknown
  message?: string
  bookings?: unknown[]
}

async function fdGet(path: string, token: string): Promise<{ status: number; body: FdBody | null }> {
  const res = await fetch(`${FD_BASE}${path}`, { headers: { 'X-Auth-Token': token } })
  const body = (await res.json().catch(() => null)) as FdBody | null
  return { status: res.status, body }
}

interface Ctx {
  env: Env
  request: Request
  waitUntil: (p: Promise<unknown>) => void
}

const DEFAULT_DATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

// openfootball updates roughly daily; no need to refetch more often than this.
const REFRESH_MS = 10 * 60_000
const PAYLOAD_KEY = 'results:payload'

interface SourceMatch {
  round?: string
  num?: number
  date?: string
  team1?: string
  team2?: string
  group?: string
  score?: { ft?: [number, number] }
}

function dataUrl(env: Env): string {
  return env.WC_DATA_URL || DEFAULT_DATA_URL
}

async function fetchSource(env: Env): Promise<SourceMatch[]> {
  const res = await fetch(dataUrl(env), {
    headers: { 'user-agent': 'fifa2026-sweepstake' },
    cf: { cacheTtl: 300 },
  } as RequestInit)
  if (!res.ok) throw new Error(`source ${res.status}`)
  const data = (await res.json()) as { matches?: SourceMatch[] }
  return data.matches ?? []
}

function normalize(m: SourceMatch) {
  const ft = m.score?.ft
  const round = m.round ?? ''
  const isGroupStage = Boolean(m.group) || round.startsWith('Matchday')
  return {
    id: String(m.num ?? `${m.date ?? ''}-${m.team1 ?? ''}-${m.team2 ?? ''}`),
    stage: round,
    isGroupStage,
    date: m.date ?? '',
    home: m.team1 ?? '',
    away: m.team2 ?? '',
    status: ft ? ('finished' as const) : ('scheduled' as const),
    score: ft ? { home: ft[0], away: ft[1] } : null,
    // openfootball has no card data; overrides.json can supply it client-side.
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
  }
}

/** Fetch the source, normalize, persist to KV, and return the payload. */
async function refresh(env: Env): Promise<unknown> {
  const matches = (await fetchSource(env)).map(normalize)
  const payload = { updatedAt: new Date().toISOString(), source: 'api' as const, matches }
  if (env.RESULTS_KV) await env.RESULTS_KV.put(PAYLOAD_KEY, JSON.stringify(payload))
  return payload
}

interface StoredPayload {
  updatedAt: string
}

export const onRequestGet = async (context: Ctx): Promise<Response> => {
  const { env, request } = context

  const params = new URL(request.url).searchParams

  // ?cardsdebug=1 probes whether football-data.org returns WC match bookings
  // (cards) on the current token's tier — to decide if cards can be free.
  if (params.get('cardsdebug') === '1') {
    const token = env.FOOTBALL_DATA_TOKEN
    if (!token) return json({ error: 'Set the FOOTBALL_DATA_TOKEN secret first' }, 0)
    try {
      const list = await fdGet('/competitions/WC/matches', token)
      const matches = list.body?.matches ?? []
      const finished = matches.filter((m) => m.status === 'FINISHED')
      let detailStatus: number | null = null
      let detailMessage: string | undefined
      let bookings: unknown[] | 'absent' = 'absent'
      if (finished[0]?.id) {
        const d = await fdGet(`/matches/${finished[0].id}`, token)
        detailStatus = d.status
        detailMessage = d.body?.message
        bookings = Array.isArray(d.body?.bookings) ? d.body!.bookings! : 'absent'
      }
      return json(
        {
          listStatus: list.status,
          listMessage: list.body?.message,
          filters: list.body?.filters ?? null,
          totalMatches: matches.length,
          finishedMatches: finished.length,
          sampleMatchId: finished[0]?.id ?? null,
          detailStatus,
          detailMessage,
          bookingsAvailable: Array.isArray(bookings),
          bookingsCount: Array.isArray(bookings) ? bookings.length : 0,
          bookingsSample: Array.isArray(bookings) ? bookings.slice(0, 3) : null,
        },
        0,
      )
    } catch (err) {
      return json({ cardsDebugError: String(err) }, 0)
    }
  }

  // ?debug=1 surfaces the source URL and how many matches/results it returned.
  if (params.get('debug') === '1') {
    try {
      const matches = await fetchSource(env)
      const played = matches.filter((m) => m.score?.ft).length
      return json({ url: dataUrl(env), total: matches.length, played, sample: matches.slice(0, 1) }, 0)
    } catch (err) {
      return json({ url: dataUrl(env), fetchError: String(err) }, 0)
    }
  }

  const kv = env.RESULTS_KV
  const storedRaw = kv ? await kv.get(PAYLOAD_KEY) : null
  const stored = storedRaw ? (JSON.parse(storedRaw) as StoredPayload) : null
  const fresh = stored ? Date.now() - Date.parse(stored.updatedAt) < REFRESH_MS : false

  if (stored && fresh) return rawJson(storedRaw!, 60)
  if (stored) {
    // Serve the stale copy immediately; refresh KV in the background.
    context.waitUntil(refresh(env).catch(() => {}))
    return rawJson(storedRaw!, 0)
  }

  // Cold start (nothing stored yet): fetch synchronously.
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
