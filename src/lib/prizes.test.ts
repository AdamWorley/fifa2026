import { describe, expect, it } from 'vitest'
import type { TeamId } from '../data/tournament'
import { buildLeaderboard, PRIZES, type PrizeStanding } from './prizes'
import type { TeamStats } from './standings'
import type { SweepstakeState } from './urlState'

function stat(teamId: TeamId, points: number): TeamStats {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points,
    yellow: 0,
    red: 0,
    cards: 0,
  }
}

const stats = new Map<TeamId, TeamStats>([
  ['brazil', stat('brazil', 6)],
  ['argentina', stat('argentina', 9)],
  ['france', stat('france', 9)],
])

// Alice owns Brazil (6), Bob owns Argentina (9), Carol owns France (9), Dave owns nothing.
const state: SweepstakeState = {
  participants: ['Alice', 'Bob', 'Carol', 'Dave'],
  assignments: { brazil: 0, argentina: 1, france: 2 },
}

const champion = PRIZES.find((p) => p.key === 'champion')!
const prizeStandings: PrizeStanding[] = [
  { def: champion, teamId: 'argentina', value: null, final: true, ownerIndex: 1 },
]

describe('leaderboard', () => {
  it('ranks by total match points, with name as the tie-breaker', () => {
    const board = buildLeaderboard(state, prizeStandings, stats)
    // Bob & Carol tie on 9 → alphabetical; Alice on 6; Dave on 0.
    expect(board.map((e) => e.name)).toEqual(['Bob', 'Carol', 'Alice', 'Dave'])
    expect(board.map((e) => e.points)).toEqual([9, 9, 6, 0])
  })

  it('attaches prizes to the holding team without changing the score', () => {
    const board = buildLeaderboard(state, prizeStandings, stats)
    const bob = board.find((e) => e.name === 'Bob')!
    expect(bob.points).toBe(9) // the champion prize adds no points

    const argentina = bob.teams.find((t) => t.teamId === 'argentina')!
    expect(argentina.prizes).toEqual([champion])

    const alice = board.find((e) => e.name === 'Alice')!
    expect(alice.teams[0].prizes).toEqual([])
  })

  it('gives participants with no teams a zero score and no teams', () => {
    const board = buildLeaderboard(state, prizeStandings, stats)
    const dave = board.find((e) => e.name === 'Dave')!
    expect(dave.points).toBe(0)
    expect(dave.teams).toEqual([])
  })
})
