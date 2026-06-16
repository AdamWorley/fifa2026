import { describe, expect, it } from 'vitest'
import type { TeamId } from '../data/tournament'
import { buildTeamLeaderboard, PRIZES, type PrizeStanding } from './prizes'
import type { TeamStats } from './standings'
import type { SweepstakeState } from './urlState'

function stat(teamId: TeamId, points: number, played = 2): TeamStats {
  return {
    teamId,
    played,
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

// Alice owns Brazil (6) plus Scotland (no matches played yet), Bob owns
// Argentina (9), Carol owns France (9), Dave owns nothing.
const state: SweepstakeState = {
  participants: [
    { id: 'al', name: 'Alice' },
    { id: 'bo', name: 'Bob' },
    { id: 'ca', name: 'Carol' },
    { id: 'da', name: 'Dave' },
  ],
  assignments: { brazil: 'al', scotland: 'al', argentina: 'bo', france: 'ca' },
}

const champion = PRIZES.find((p) => p.key === 'champion')!
const prizeStandings: PrizeStanding[] = [
  { def: champion, teamId: 'argentina', value: null, final: true, ownerId: 'bo' },
]

const noneOut = new Set<TeamId>()

describe('team leaderboard', () => {
  it('ranks the playing section by match points, with team name as the tie-breaker', () => {
    const board = buildTeamLeaderboard(state, prizeStandings, stats, noneOut)
    // Argentina & France tie on 9 → team-name order; Brazil on 6.
    expect(board.playing.map((e) => e.teamId)).toEqual(['argentina', 'france', 'brazil'])
    expect(board.playing.map((e) => e.points)).toEqual([9, 9, 6])
  })

  it('records the participant each team was drawn by', () => {
    const board = buildTeamLeaderboard(state, prizeStandings, stats, noneOut)
    const argentina = board.playing.find((e) => e.teamId === 'argentina')!
    expect(argentina.ownerId).toBe('bo')
    expect(argentina.ownerName).toBe('Bob')
  })

  it('attaches prizes to the holding team without changing the score', () => {
    const board = buildTeamLeaderboard(state, prizeStandings, stats, noneOut)
    const argentina = board.playing.find((e) => e.teamId === 'argentina')!
    expect(argentina.points).toBe(9) // the champion prize adds no points
    expect(argentina.prizes).toEqual([champion])

    const brazil = board.playing.find((e) => e.teamId === 'brazil')!
    expect(brazil.prizes).toEqual([])
  })

  it('puts teams yet to play in the upcoming section', () => {
    const board = buildTeamLeaderboard(state, prizeStandings, stats, noneOut)
    // Scotland (Alice's) has no entry in stats, so it is waiting to play.
    expect(board.upcoming.map((e) => e.teamId)).toEqual(['scotland'])
    expect(board.playing.map((e) => e.teamId)).not.toContain('scotland')
  })

  it('moves knocked-out teams into the eliminated section', () => {
    const board = buildTeamLeaderboard(state, prizeStandings, stats, new Set<TeamId>(['france']))
    expect(board.eliminated.map((e) => e.teamId)).toEqual(['france'])
    expect(board.playing.map((e) => e.teamId)).toEqual(['argentina', 'brazil'])
  })
})
