import { describe, expect, it } from 'vitest'
import { formatUtcOffset, parseKickoff } from './results'

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

describe('formatUtcOffset', () => {
  it('formats whole-hour, half-hour and zero offsets', () => {
    expect(formatUtcOffset(-360)).toBe('UTC-6')
    expect(formatUtcOffset(330)).toBe('UTC+5:30')
    expect(formatUtcOffset(0)).toBe('UTC+0')
  })
})
