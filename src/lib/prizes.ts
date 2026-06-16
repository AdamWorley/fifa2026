import { getTeam, type TeamId } from '../data/tournament'
import type { SweepstakeState } from './urlState'
import { ownerOf } from './sweepstake'
import type { Awards, TeamStats, TournamentResult } from './standings'

export interface PrizeDef {
  key: string
  label: string
  emoji: string
  blurb: string
}

export const PRIZES: PrizeDef[] = [
  { key: 'champion', label: '1st place', emoji: '🏆', blurb: 'Owns the World Cup winners' },
  { key: 'runnerUp', label: '2nd place', emoji: '🥈', blurb: 'Owns the beaten finalists' },
  {
    key: 'goldenBoot',
    label: 'Golden Boot',
    emoji: '👟',
    blurb: 'Most goals in the group stage',
  },
  {
    key: 'woodenSpoon',
    label: 'Wooden Spoon',
    emoji: '🥄',
    blurb: 'Worst goal difference in the group stage',
  },
  {
    key: 'refereesFavourite',
    label: "Referee's Favourite",
    emoji: '🟨🟥',
    blurb: 'Most cards in the group stage',
  },
]

export interface PrizeStanding {
  def: PrizeDef
  teamId: TeamId | null
  /** The award value (goals / goal difference / cards) where relevant. */
  value: number | null
  /** True for the group-stage awards once the group stage is complete. */
  final: boolean
  ownerId: string | null
}

/** Resolve which team currently holds each prize, and who owns that team. */
export function computePrizeStandings(
  state: SweepstakeState,
  awards: Awards,
  tournament: TournamentResult,
): PrizeStanding[] {
  const byKey: Record<string, { teamId: TeamId | null; value: number | null; final: boolean }> = {
    champion: { teamId: tournament.champion, value: null, final: tournament.champion !== null },
    runnerUp: { teamId: tournament.runnerUp, value: null, final: tournament.runnerUp !== null },
    goldenBoot: {
      teamId: awards.goldenBoot?.teamId ?? null,
      value: awards.goldenBoot?.value ?? null,
      final: awards.groupStageComplete,
    },
    woodenSpoon: {
      teamId: awards.woodenSpoon?.teamId ?? null,
      value: awards.woodenSpoon?.value ?? null,
      final: awards.groupStageComplete,
    },
    refereesFavourite: {
      teamId: awards.refereesFavourite?.teamId ?? null,
      value: awards.refereesFavourite?.value ?? null,
      final: awards.groupStageComplete,
    },
  }

  return PRIZES.map((def) => {
    const entry = byKey[def.key]
    return {
      def,
      teamId: entry.teamId,
      value: entry.value,
      final: entry.final,
      ownerId: entry.teamId ? ownerOf(state, entry.teamId) : null,
    }
  })
}

export interface TeamLeaderboardEntry {
  /** teamId, also the stable id used for rank-movement tracking. */
  id: TeamId
  teamId: TeamId
  /** Group-stage match points this team has earned (the ranking score). */
  points: number
  /** Prizes this team currently holds. */
  prizes: PrizeDef[]
  /** Participant the team was drawn by. */
  ownerId: string
  ownerName: string
}

/** A per-country leaderboard split by where each drawn team is in its run. */
export interface TeamLeaderboard {
  /** Still in the tournament and has played — ranked by match points. */
  playing: TeamLeaderboardEntry[]
  /** Drawn but yet to kick off (no matches played). */
  upcoming: TeamLeaderboardEntry[]
  /** Knocked out — ordered by the points they finished on. */
  eliminated: TeamLeaderboardEntry[]
}

/**
 * Build a per-country leaderboard, split into teams still playing, teams yet to
 * play, and teams that have been knocked out. Within each section the highest
 * match-points come first, with team name as the tie-breaker.
 */
export function buildTeamLeaderboard(
  state: SweepstakeState,
  prizeStandings: PrizeStanding[],
  teamStats: Map<TeamId, TeamStats>,
  eliminated: Set<TeamId>,
): TeamLeaderboard {
  const prizesByTeam = new Map<TeamId, PrizeDef[]>()
  for (const p of prizeStandings) {
    if (p.teamId === null) continue
    if (!prizesByTeam.has(p.teamId)) prizesByTeam.set(p.teamId, [])
    prizesByTeam.get(p.teamId)!.push(p.def)
  }

  const nameById = new Map(
    state.participants.map((p, index) => [p.id, p.name || `Player ${index + 1}`]),
  )

  const byName = (a: TeamLeaderboardEntry, b: TeamLeaderboardEntry) =>
    getTeam(a.teamId)!.name.localeCompare(getTeam(b.teamId)!.name)
  const byPoints = (a: TeamLeaderboardEntry, b: TeamLeaderboardEntry) =>
    b.points - a.points || byName(a, b)

  const board: TeamLeaderboard = { playing: [], upcoming: [], eliminated: [] }

  for (const [teamId, ownerId] of Object.entries(state.assignments) as [TeamId, string][]) {
    if (!nameById.has(ownerId)) continue
    const entry: TeamLeaderboardEntry = {
      id: teamId,
      teamId,
      points: teamStats.get(teamId)?.points ?? 0,
      prizes: prizesByTeam.get(teamId) ?? [],
      ownerId,
      ownerName: nameById.get(ownerId)!,
    }
    if (eliminated.has(teamId)) board.eliminated.push(entry)
    else if ((teamStats.get(teamId)?.played ?? 0) === 0) board.upcoming.push(entry)
    else board.playing.push(entry)
  }

  board.playing.sort(byPoints)
  board.upcoming.sort(byName)
  board.eliminated.sort(byPoints)
  return board
}
