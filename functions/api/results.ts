/**
 * Cloudflare Pages Function: GET /api/results
 *
 * The latest normalized results (scores, goals, cards) are stored in a KV
 * namespace (RESULTS_KV). This function serves that stored copy instantly and
 * refreshes it from the football API in the background when it goes stale — so
 * visitor traffic never triggers blocking upstream calls and the API key/quota
 * stay server-side. KV is the durable store the worker writes through to.
 *
 * Returns ResultsPayload (see src/lib/results.ts) — kept in sync by hand.
 *
 * Configure via wrangler / Pages dashboard:
 *   FOOTBALL_API_KEY   (secret)  — api-sports.io key
 *   FOOTBALL_LEAGUE_ID (var)     — World Cup league id (default "1")
 *   FOOTBALL_SEASON    (var)     — season year (default "2026")
 *   RESULTS_KV         (kv)      — durable store for the normalized payload
 */

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

interface Env {
  FOOTBALL_API_KEY?: string
  FOOTBALL_LEAGUE_ID?: string
  FOOTBALL_SEASON?: string
  RESULTS_KV?: KVNamespace
}

interface Ctx {
  env: Env
  request: Request
  waitUntil: (p: Promise<unknown>) => void
}

const API_BASE = 'https://v3.football.api-sports.io'

// Serve the stored copy until it's older than this, then refresh in background.
const REFRESH_MS = 60_000
// Cap fresh statistics calls per refresh to protect the daily quota; finished
// fixtures' cards are stored in KV and never re-fetched.
const MAX_STATS_CALLS = 12

const PAYLOAD_KEY = 'results:payload'
const CARDS_KEY = 'results:cards'

type Status = 'scheduled' | 'live' | 'finished'

interface CardCount {
  yellow: number
  red: number
}
interface MatchCards {
  home: CardCount
  away: CardCount
}

function mapStatus(short: string): Status {
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished'
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'].includes(short)) return 'live'
  return 'scheduled'
}

// Minimal shapes for the fields we read from API-FOOTBALL responses.
interface ApiEnvelope<T> {
  response?: T
}
interface StatItem {
  type?: string
  value?: number | string | null
}
interface StatTeam {
  statistics?: StatItem[]
}
interface ApiFixture {
  fixture?: { id?: number; date?: string; status?: { short?: string } }
  league?: { round?: string }
  teams?: { home?: { name?: string }; away?: { name?: string } }
  goals?: { home?: number | null; away?: number | null }
}

async function apiGet<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'x-apisports-key': key } })
  if (!res.ok) throw new Error(`upstream ${res.status} for ${path}`)
  return res.json() as Promise<T>
}

async function fetchCards(fixtureId: number, key: string): Promise<MatchCards | null> {
  const data = await apiGet<ApiEnvelope<StatTeam[]>>(
    `/fixtures/statistics?fixture=${fixtureId}`,
    key,
  )
  const teams = data.response ?? []
  if (teams.length < 2) return null
  const read = (team: StatTeam): CardCount => {
    const stats = team.statistics ?? []
    const find = (type: string) => Number(stats.find((s) => s.type === type)?.value ?? 0) || 0
    return { yellow: find('Yellow Cards'), red: find('Red Cards') }
  }
  return { home: read(teams[0]), away: read(teams[1]) }
}

/** Fetch from the API, normalize, persist to KV, and return the payload. */
async function refresh(env: Env): Promise<unknown> {
  const key = env.FOOTBALL_API_KEY!
  const league = env.FOOTBALL_LEAGUE_ID || '1'
  const season = env.FOOTBALL_SEASON || '2026'
  const kv = env.RESULTS_KV

  const fixturesData = await apiGet<ApiEnvelope<ApiFixture[]>>(
    `/fixtures?league=${league}&season=${season}`,
    key,
  )
  const fixtures = fixturesData.response ?? []

  // Load the persisted card tallies; only fetch ones we don't have yet.
  let cardsMap: Record<string, MatchCards> = {}
  if (kv) {
    const raw = await kv.get(CARDS_KEY)
    if (raw) cardsMap = JSON.parse(raw) as Record<string, MatchCards>
  }

  let statsBudget = MAX_STATS_CALLS
  for (const fx of fixtures) {
    const id = fx?.fixture?.id
    const round = (fx?.league?.round ?? '').toLowerCase()
    const finishedGroup = mapStatus(fx?.fixture?.status?.short ?? 'NS') === 'finished' && round.includes('group')
    if (!finishedGroup || typeof id !== 'number' || cardsMap[id] || statsBudget <= 0) continue
    statsBudget--
    const cards = await fetchCards(id, key).catch(() => null)
    if (cards) cardsMap[id] = cards
  }

  const matches = fixtures.map((fx) => {
    const round = fx?.league?.round ?? ''
    const homeGoals = fx?.goals?.home
    const awayGoals = fx?.goals?.away
    const id = fx?.fixture?.id
    return {
      id: String(id ?? ''),
      stage: round,
      isGroupStage: round.toLowerCase().includes('group'),
      date: fx?.fixture?.date ?? '',
      home: fx?.teams?.home?.name ?? '',
      away: fx?.teams?.away?.name ?? '',
      status: mapStatus(fx?.fixture?.status?.short ?? 'NS'),
      score:
        homeGoals === null || homeGoals === undefined
          ? null
          : { home: Number(homeGoals), away: Number(awayGoals) },
      cards: (typeof id === 'number' && cardsMap[id]) || {
        home: { yellow: 0, red: 0 },
        away: { yellow: 0, red: 0 },
      },
    }
  })

  const payload = { updatedAt: new Date().toISOString(), source: 'api' as const, matches }
  if (kv) {
    await kv.put(PAYLOAD_KEY, JSON.stringify(payload))
    await kv.put(CARDS_KEY, JSON.stringify(cardsMap))
  }
  return payload
}

interface StoredPayload {
  updatedAt: string
}

export const onRequestGet = async (context: Ctx): Promise<Response> => {
  const { env } = context

  // Without a key (local dev / preview) return an empty payload so the UI still
  // renders the static fixtures as "scheduled".
  if (!env.FOOTBALL_API_KEY) {
    return json({ updatedAt: nowIso(), source: 'none', matches: [] })
  }

  const kv = env.RESULTS_KV
  const storedRaw = kv ? await kv.get(PAYLOAD_KEY) : null
  const stored = storedRaw ? (JSON.parse(storedRaw) as StoredPayload) : null
  const fresh = stored ? Date.now() - Date.parse(stored.updatedAt) < REFRESH_MS : false

  if (stored && fresh) return rawJson(storedRaw!, 30)
  if (stored) {
    // Serve the stale copy immediately; refresh KV in the background.
    context.waitUntil(refresh(env).catch(() => {}))
    return rawJson(storedRaw!, 0)
  }

  // Cold start (nothing stored yet): fetch synchronously.
  try {
    return json(await refresh(env), 30)
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
