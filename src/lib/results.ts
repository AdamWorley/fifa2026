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
  date: string
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
