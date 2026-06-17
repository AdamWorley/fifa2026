import { describe, expect, it } from 'vitest'
import { nextMatchesForTeams } from './nextMatches'
import type { MatchResult } from './results'

const HOUR = 60 * 60 * 1000
const NOW = Date.parse('2026-06-15T12:00:00.000Z')

function fixture(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    id: '1',
    stage: 'Group Stage - 1',
    isGroupStage: true,
    date: '2026-06-15',
    kickoff: new Date(NOW + HOUR).toISOString(),
    home: 'Mexico',
    away: 'South Africa',
    status: 'scheduled',
    score: null,
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
    ...overrides,
  }
}

describe('nextMatchesForTeams', () => {
  it('returns the soonest upcoming match for an owned team', () => {
    const matches = [
      fixture({ id: 'a', home: 'Mexico', kickoff: new Date(NOW + 5 * HOUR).toISOString() }),
      fixture({ id: 'b', home: 'Mexico', kickoff: new Date(NOW + 2 * HOUR).toISOString() }),
    ]
    const result = nextMatchesForTeams(matches, ['mexico'], NOW)
    expect(result).toHaveLength(1)
    expect(result[0].match.id).toBe('b')
    expect(result[0].live).toBe(false)
  })

  it('matches a team on either side of the fixture', () => {
    const matches = [fixture({ home: 'South Africa', away: 'Mexico' })]
    expect(nextMatchesForTeams(matches, ['mexico'], NOW)).toHaveLength(1)
  })

  it('prefers a live match over later kickoffs and flags it live', () => {
    const matches = [
      fixture({ id: 'next', kickoff: new Date(NOW + 3 * HOUR).toISOString() }),
      fixture({ id: 'live', kickoff: new Date(NOW - HOUR).toISOString() }),
    ]
    const [entry] = nextMatchesForTeams(matches, ['mexico'], NOW)
    expect(entry.match.id).toBe('live')
    expect(entry.live).toBe(true)
  })

  it('omits teams with no live or upcoming fixture', () => {
    const matches = [fixture({ status: 'finished', score: { home: 1, away: 0 } })]
    expect(nextMatchesForTeams(matches, ['mexico'], NOW)).toEqual([])
  })

  it('returns one entry per owned team, live first then by kickoff', () => {
    const matches = [
      fixture({ id: 'mex', home: 'Mexico', kickoff: new Date(NOW + 4 * HOUR).toISOString() }),
      fixture({ id: 'bra-live', home: 'Brazil', kickoff: new Date(NOW - HOUR).toISOString() }),
    ]
    const result = nextMatchesForTeams(matches, ['mexico', 'brazil'], NOW)
    expect(result.map((e) => e.teamId)).toEqual(['brazil', 'mexico'])
  })

  it('returns nothing when the viewer owns no teams', () => {
    expect(nextMatchesForTeams([fixture()], [], NOW)).toEqual([])
  })
})
