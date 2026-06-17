import type { TeamId } from '../data/tournament'
import { resolveTeamId } from './aliases'
import { matchPhase, upcomingMatches, type MatchResult } from './results'

export interface NextMatch {
  match: MatchResult
  live: boolean
}

/** The live, or else soonest upcoming, match from a set — or null if none. */
export function pickNext(matches: MatchResult[], now: number): NextMatch | null {
  // A match in play wins; the feed never sends 'live', so derive it from kickoff vs now.
  const live = matches.find((m) => matchPhase(m, now) === 'now')
  if (live) return { match: live, live: true }
  const upcoming = upcomingMatches(matches, now)
  return upcoming.length ? { match: upcoming[0], live: false } : null
}

/** True when the fixture is played by the given team (either side, via name aliases). */
function matchInvolves(m: MatchResult, teamId: TeamId): boolean {
  return resolveTeamId(m.home) === teamId || resolveTeamId(m.away) === teamId
}

export interface TeamNextMatch extends NextMatch {
  teamId: TeamId
}

/**
 * One entry per owned team that has a live or upcoming fixture — its next match.
 * Live matches first, then earliest kickoff; teams with nothing left are omitted.
 */
export function nextMatchesForTeams(
  matches: MatchResult[],
  teamIds: TeamId[],
  now: number,
): TeamNextMatch[] {
  return teamIds
    .map((teamId): TeamNextMatch | null => {
      const next = pickNext(
        matches.filter((m) => matchInvolves(m, teamId)),
        now,
      )
      return next ? { teamId, ...next } : null
    })
    .filter((e): e is TeamNextMatch => e !== null)
    .sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1
      return Date.parse(a.match.kickoff ?? '') - Date.parse(b.match.kickoff ?? '')
    })
}
