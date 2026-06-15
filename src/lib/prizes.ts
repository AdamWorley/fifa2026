import type { TeamId } from '../data/tournament'
import type { SweepstakeState } from './urlState'
import { ownerOf, teamsByParticipant } from './sweepstake'
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

export interface LeaderboardTeam {
  teamId: TeamId
  /** Group-stage match points this team has earned. */
  points: number
  /** Prizes this team currently holds. */
  prizes: PrizeDef[]
}

export interface LeaderboardEntry {
  id: string
  name: string
  teams: LeaderboardTeam[]
  /** Total group-stage match points across all owned teams (ranking score). */
  points: number
}

/** Build a per-participant leaderboard, highest match-points total first. */
export function buildLeaderboard(
  state: SweepstakeState,
  prizeStandings: PrizeStanding[],
  teamStats: Map<TeamId, TeamStats>,
): LeaderboardEntry[] {
  const teamsByOwner = teamsByParticipant(state)
  const prizesByTeam = new Map<TeamId, PrizeDef[]>()
  for (const p of prizeStandings) {
    if (p.teamId === null) continue
    if (!prizesByTeam.has(p.teamId)) prizesByTeam.set(p.teamId, [])
    prizesByTeam.get(p.teamId)!.push(p.def)
  }

  return state.participants
    .map((participant, index) => {
      const teams = (teamsByOwner.get(participant.id) ?? [])
        .filter((teamId) => (teamStats.get(teamId)?.played ?? 0) > 0)
        .map((teamId) => ({
          teamId,
          points: teamStats.get(teamId)?.points ?? 0,
          prizes: prizesByTeam.get(teamId) ?? [],
        }))
      return {
        id: participant.id,
        name: participant.name || `Player ${index + 1}`,
        teams,
        points: teams.reduce((sum, t) => sum + t.points, 0),
      }
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
}
