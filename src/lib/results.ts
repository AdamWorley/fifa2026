// Normalized shape returned by GET /api/results (the Cloudflare proxy).
// Kept deliberately small and stable; the proxy in functions/api/results.ts
// produces exactly this shape from whatever upstream API is configured.

export interface TeamCards {
  yellow: number
  red: number
}

export type MatchStatus = 'scheduled' | 'live' | 'finished'

export interface MatchResult {
  /** Upstream fixture id (string). */
  id: string
  /** Raw upstream round label, e.g. "Group Stage - 1", "Round of 32". */
  stage: string
  isGroupStage: boolean
  /** Calendar date of the match (YYYY-MM-DD), in the venue's local zone. */
  date: string
  /** Kickoff as an ISO 8601 UTC instant, or null when the source carried no time. */
  kickoff?: string | null
  /** Host venue (city/stadium) from the source feed. */
  venue?: string
  /** Venue's offset from UTC in minutes (e.g. -360 for UTC-6), or null. */
  venueOffsetMinutes?: number | null
  /** Upstream team names (resolved to our slugs on the client via aliases). */
  home: string
  away: string
  status: MatchStatus
  score: { home: number; away: number } | null
  cards: { home: TeamCards; away: TeamCards }
}

export interface ResultsPayload {
  updatedAt: string
  source: 'api' | 'overrides' | 'none'
  matches: MatchResult[]
}

export const EMPTY_RESULTS: ResultsPayload = {
  updatedAt: '',
  source: 'none',
  matches: [],
}

/**
 * Scheduled matches whose kickoff is still in the future, soonest first.
 * The single source of truth for "what's coming up" — shared so the Sweepstake
 * banner and the Match breakdown "Next up" list never drift apart. A match stays
 * `scheduled` until its final score lands (often hours after kickoff), so the
 * future-kickoff check is what keeps already-started matches out of "upcoming".
 */
export function upcomingMatches(matches: MatchResult[], now: number = Date.now()): MatchResult[] {
  return matches
    .filter((m) => m.status === 'scheduled' && m.kickoff != null && Date.parse(m.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff!) - Date.parse(b.kickoff!))
}

// ---- refresh scheduling ----

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS

/** Kickoff to final whistle: 90' + half-time + stoppage, with room for ET + penalties. */
const MATCH_DURATION_MS = 2.5 * HOUR_MS
/**
 * openfootball is updated by hand, often a few hours after full time, so we keep
 * checking until the final score lands — up to this long past the final whistle.
 */
const SETTLE_WINDOW_MS = 5 * HOUR_MS

/**
 * The state a fixture is actually in, derived on the client from kickoff vs now.
 * The upstream feed only ever reports `scheduled` or `finished`, so a match that
 * has kicked off and one that's over-but-unscored both arrive as `scheduled`;
 * this splits them into `now` (in play) and `finalising` (awaiting the result).
 */
export type MatchPhase = 'upcoming' | 'now' | 'finalising' | 'finished'

export function matchPhase(m: MatchResult, now: number = Date.now()): MatchPhase {
  if (m.status === 'finished' || m.score) return 'finished'
  if (m.status === 'live') return 'now'
  if (!m.kickoff) return 'upcoming'
  const start = Date.parse(m.kickoff)
  if (Number.isNaN(start) || now < start) return 'upcoming'
  // Kicked off but no score yet: in play until the final whistle, then awaiting result.
  return now < start + MATCH_DURATION_MS ? 'now' : 'finalising'
}

/** Cadence while a match's score is still expected to land. */
export const ACTIVE_REFRESH_MS = 15 * MINUTE_MS
/** Cadence when nothing is in play — just enough to keep the cache from going cold. */
export const IDLE_REFRESH_MS = 6 * HOUR_MS

/**
 * A match we should still be actively polling for: it has kicked off, we don't yet
 * have a final score, and we're inside the window where the score is expected to
 * land. Once finished (or past the window) it no longer drives fast polling.
 */
function isSettling(m: MatchResult, now: number): boolean {
  if (m.status === 'finished' || !m.kickoff) return false
  const start = Date.parse(m.kickoff)
  if (Number.isNaN(start)) return false
  return now >= start && now <= start + MATCH_DURATION_MS + SETTLE_WINDOW_MS
}

/**
 * How long a cached results payload should be treated as fresh, given the schedule:
 * short while any match's score is still settling, long otherwise. Lets both the
 * server refresh and the client poll back off to a trickle when nothing is in play.
 */
export function refreshIntervalMs(matches: MatchResult[], now: number = Date.now()): number {
  return matches.some((m) => isSettling(m, now)) ? ACTIVE_REFRESH_MS : IDLE_REFRESH_MS
}

// ---- kickoff time handling ----

export interface Kickoff {
  /** ISO 8601 UTC instant, e.g. "2026-06-11T19:00:00.000Z". */
  utc: string
  /** Venue offset from UTC in minutes (e.g. -360 for UTC-6). */
  offsetMinutes: number
}

// openfootball times look like "13:00 UTC-6" / "20:00 UTC+5:30".
const TIME_RE = /\b(\d{1,2}):(\d{2})\s*UTC\s*([+-]\d{1,2})(?::?(\d{2}))?/i

/**
 * Parse a source date (YYYY-MM-DD) plus a "HH:MM UTC±H[:MM]" time — where the
 * clock time is the venue's local wall-clock — into a true UTC instant and the
 * venue's offset. Returns null when either part is missing or unparseable.
 */
export function parseKickoff(date: string, time?: string | null): Kickoff | null {
  if (!date || !time) return null
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const tm = TIME_RE.exec(time)
  if (!dm || !tm) return null
  const [, y, mo, d] = dm
  const [, hh, mm, offH, offM] = tm
  const sign = offH.startsWith('-') ? -1 : 1
  const offsetMinutes = sign * (Math.abs(Number(offH)) * 60 + Number(offM ?? 0))
  const utcMs =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm)) -
    offsetMinutes * 60_000
  return { utc: new Date(utcMs).toISOString(), offsetMinutes }
}

/** Format a UTC-minute offset as a label like "UTC-6" or "UTC+5:30". */
export function formatUtcOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+'
  const abs = Math.abs(offsetMinutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `UTC${sign}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`
}
