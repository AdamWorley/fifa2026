import { useMemo } from 'react'
import type { SweepstakeState } from './urlState'
import { useResults } from './useResults'
import {
  computeAwards,
  computeGroupStandings,
  computeTeamStats,
  computeTournamentResult,
  countFinishedGroupMatches,
} from './standings'
import { buildLeaderboard, computePrizeStandings } from './prizes'

/** One hook that fetches live results and derives every view's data. */
export function useTournamentData(state: SweepstakeState) {
  const { data, loading, error } = useResults()
  const matches = data.matches

  const stats = useMemo(() => computeTeamStats(matches), [matches])
  const standings = useMemo(() => computeGroupStandings(stats), [stats])
  const awards = useMemo(() => computeAwards(stats, matches), [stats, matches])
  const tournament = useMemo(() => computeTournamentResult(matches), [matches])
  const prizeStandings = useMemo(
    () => computePrizeStandings(state, awards, tournament),
    [state, awards, tournament],
  )
  const leaderboard = useMemo(
    () => buildLeaderboard(state, prizeStandings, stats),
    [state, prizeStandings, stats],
  )
  const groupMatchesPlayed = useMemo(() => countFinishedGroupMatches(matches), [matches])

  return {
    loading,
    error,
    updatedAt: data.updatedAt,
    source: data.source,
    matches,
    standings,
    awards,
    tournament,
    prizeStandings,
    leaderboard,
    groupMatchesPlayed,
  }
}
