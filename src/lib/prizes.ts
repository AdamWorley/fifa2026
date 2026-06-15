import type { TeamId } from '../data/tournament'
import type { SweepstakeState } from './urlState'
import { ownerOf, teamsByParticipant } from './sweepstake'
import type { Awards, TournamentResult } from './standings'

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
  ownerIndex: number | null
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
      ownerIndex: entry.teamId ? ownerOf(state, entry.teamId) : null,
    }
  })
}

export interface LeaderboardEntry {
  index: number
  name: string
  teamIds: TeamId[]
  /** Prize labels this participant currently holds. */
  prizes: PrizeDef[]
}

/** Build a per-participant leaderboard, prize-holders first. */
export function buildLeaderboard(
  state: SweepstakeState,
  prizeStandings: PrizeStanding[],
): LeaderboardEntry[] {
  const teamsByIdx = teamsByParticipant(state)
  const prizesByIdx = new Map<number, PrizeDef[]>()
  for (const p of prizeStandings) {
    if (p.ownerIndex === null) continue
    if (!prizesByIdx.has(p.ownerIndex)) prizesByIdx.set(p.ownerIndex, [])
    prizesByIdx.get(p.ownerIndex)!.push(p.def)
  }

  return state.participants
    .map((name, index) => ({
      index,
      name: name || `Player ${index + 1}`,
      teamIds: teamsByIdx.get(index) ?? [],
      prizes: prizesByIdx.get(index) ?? [],
    }))
    .sort((a, b) => b.prizes.length - a.prizes.length || a.name.localeCompare(b.name))
}
