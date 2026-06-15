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
