import { describe, expect, it } from 'vitest'
import { decodeState, encodeState, EMPTY_STATE, type SweepstakeState } from './urlState'
import {
  addParticipant,
  ownerOf,
  randomDraw,
  removeParticipant,
  setAssignment,
  teamsByParticipant,
} from './sweepstake'

const sample: SweepstakeState = {
  title: 'Office Cup',
  participants: ['Alice', 'Bob'],
  assignments: { brazil: 0, england: 1, spain: 0 },
}

describe('url state round-trip', () => {
  it('encodes and decodes back to the same state', () => {
    expect(decodeState(encodeState(sample))).toEqual(sample)
  })

  it('returns empty state for null/garbage', () => {
    expect(decodeState(null)).toEqual(EMPTY_STATE)
    expect(decodeState('not-valid-lzstring!!')).toEqual(EMPTY_STATE)
  })

  it('drops assignments pointing at non-existent participants', () => {
    const decoded = decodeState(
      encodeState({ participants: ['Solo'], assignments: { brazil: 0, spain: 5 } }),
    )
    expect(decoded.assignments).toEqual({ brazil: 0 })
  })
})

describe('assignment helpers', () => {
  it('reads owner or null', () => {
    expect(ownerOf(sample, 'brazil')).toBe(0)
    expect(ownerOf(sample, 'japan')).toBeNull()
  })

  it('groups teams by participant', () => {
    const map = teamsByParticipant(sample)
    expect(map.get(0)?.sort()).toEqual(['brazil', 'spain'])
    expect(map.get(1)).toEqual(['england'])
  })

  it('assigns and unassigns immutably', () => {
    const assigned = setAssignment(sample, 'japan', 1)
    expect(assigned.assignments.japan).toBe(1)
    expect(sample.assignments.japan).toBeUndefined()
    expect(setAssignment(assigned, 'japan', null).assignments.japan).toBeUndefined()
  })

  it('re-indexes assignments when a participant is removed', () => {
    const result = removeParticipant(sample, 0) // remove Alice (index 0)
    expect(result.participants).toEqual(['Bob'])
    // Bob shifts from index 1 to 0; Alice's teams are dropped.
    expect(result.assignments).toEqual({ england: 0 })
  })

  it('adds participants and trims blanks', () => {
    expect(addParticipant(sample, '  Carol  ').participants).toContain('Carol')
    expect(addParticipant(sample, '   ')).toBe(sample)
  })
})

describe('random draw', () => {
  it('distributes all teams evenly and deterministically with a seeded rng', () => {
    let seed = 1
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const teams = Array.from({ length: 48 }, (_, i) => `t${i}`)
    const drawn = randomDraw({ participants: ['A', 'B', 'C'], assignments: {} }, teams, rng)
    const counts = [0, 0, 0]
    for (const idx of Object.values(drawn.assignments)) counts[idx]++
    expect(Object.keys(drawn.assignments)).toHaveLength(48)
    expect(counts).toEqual([16, 16, 16])
  })

  it('clears assignments when there are no participants', () => {
    expect(randomDraw({ participants: [], assignments: { brazil: 0 } }, ['brazil']).assignments).toEqual(
      {},
    )
  })
})
