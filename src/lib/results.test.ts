import { describe, expect, it } from 'vitest'
import { formatUtcOffset, matchPhase, parseKickoff, type MatchResult } from './results'

const KICKOFF = '2026-06-15T18:00:00.000Z'
const KICKOFF_MS = Date.parse(KICKOFF)
const HOUR = 60 * 60 * 1000

function fixture(overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    id: '1',
    stage: 'Group Stage - 1',
    isGroupStage: true,
    date: '2026-06-15',
    kickoff: KICKOFF,
    home: 'Mexico',
    away: 'South Africa',
    status: 'scheduled',
    score: null,
    cards: { home: { yellow: 0, red: 0 }, away: { yellow: 0, red: 0 } },
    ...overrides,
  }
}

describe('parseKickoff', () => {
  it('converts a UTC-6 venue kickoff to the correct UTC instant', () => {
    expect(parseKickoff('2026-06-11', '13:00 UTC-6')).toEqual({
      utc: '2026-06-11T19:00:00.000Z',
      offsetMinutes: -360,
    })
  })

  it('rolls forward across midnight UTC for an evening kickoff', () => {
    expect(parseKickoff('2026-06-11', '20:00 UTC-7')?.utc).toBe('2026-06-12T03:00:00.000Z')
  })

  it('handles positive and half-hour offsets', () => {
    expect(parseKickoff('2026-06-11', '20:00 UTC+5:30')).toEqual({
      utc: '2026-06-11T14:30:00.000Z',
      offsetMinutes: 330,
    })
  })

  it('returns null when the date or time is missing or unparseable', () => {
    expect(parseKickoff('2026-06-11', undefined)).toBeNull()
    expect(parseKickoff('2026-06-11', '')).toBeNull()
    expect(parseKickoff('', '13:00 UTC-6')).toBeNull()
    expect(parseKickoff('2026-06-11', 'TBD')).toBeNull()
  })
})

describe('matchPhase', () => {
  it('is upcoming before kickoff', () => {
    expect(matchPhase(fixture(), KICKOFF_MS - HOUR)).toBe('upcoming')
  })

  it('is now once kicked off and still within the match window', () => {
    expect(matchPhase(fixture(), KICKOFF_MS + HOUR)).toBe('now')
  })

  it('is finalising past the final whistle with no score yet', () => {
    expect(matchPhase(fixture(), KICKOFF_MS + 3 * HOUR)).toBe('finalising')
  })

  it('is finished once a score has landed, regardless of time', () => {
    const played = fixture({ score: { home: 2, away: 0 } })
    expect(matchPhase(played, KICKOFF_MS + HOUR)).toBe('finished')
  })

  it('treats a missing kickoff as upcoming', () => {
    expect(matchPhase(fixture({ kickoff: null }), KICKOFF_MS + 10 * HOUR)).toBe('upcoming')
  })
})

describe('formatUtcOffset', () => {
  it('formats whole-hour, half-hour and zero offsets', () => {
    expect(formatUtcOffset(-360)).toBe('UTC-6')
    expect(formatUtcOffset(330)).toBe('UTC+5:30')
    expect(formatUtcOffset(0)).toBe('UTC+0')
  })
})
