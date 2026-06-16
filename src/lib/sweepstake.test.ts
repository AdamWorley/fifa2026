import { describe, expect, it } from 'vitest'
import { decodeState, encodeState, EMPTY_STATE, type SweepstakeState } from './urlState'
import {
  addParticipant,
  isMyTeam,
  ownerOf,
  randomDraw,
  removeParticipant,
  setAssignment,
  teamsByParticipant,
} from './sweepstake'

const sample: SweepstakeState = {
  title: 'Office Cup',
  participants: [
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
  ],
  assignments: { brazil: 'a', england: 'b', spain: 'a' },
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
      encodeState({
        participants: [{ id: 's', name: 'Solo' }],
        assignments: { brazil: 's', spain: 'ghost' },
      }),
    )
    expect(decoded.assignments).toEqual({ brazil: 's' })
  })
})

describe('assignment helpers', () => {
  it('reads owner or null', () => {
    expect(ownerOf(sample, 'brazil')).toBe('a')
    expect(ownerOf(sample, 'japan')).toBeNull()
  })

  it('flags a team as mine only when I own it and a viewer is set', () => {
    expect(isMyTeam(sample, 'brazil', 'a')).toBe(true)
    expect(isMyTeam(sample, 'england', 'a')).toBe(false) // Bob's team
    expect(isMyTeam(sample, 'japan', 'a')).toBe(false) // unassigned
    expect(isMyTeam(sample, 'brazil', null)).toBe(false) // no viewer selected
    expect(isMyTeam(sample, null, 'a')).toBe(false) // unknown team
  })

  it('groups teams by participant', () => {
    const map = teamsByParticipant(sample)
    expect(map.get('a')?.sort()).toEqual(['brazil', 'spain'])
    expect(map.get('b')).toEqual(['england'])
  })

  it('assigns and unassigns immutably', () => {
    const assigned = setAssignment(sample, 'japan', 'b')
    expect(assigned.assignments.japan).toBe('b')
    expect(sample.assignments.japan).toBeUndefined()
    expect(setAssignment(assigned, 'japan', null).assignments.japan).toBeUndefined()
  })

  it('drops a removed participant’s teams without disturbing other ids', () => {
    const result = removeParticipant(sample, 'a') // remove Alice
    expect(result.participants).toEqual([{ id: 'b', name: 'Bob' }])
    // Bob keeps his id; Alice's teams are dropped.
    expect(result.assignments).toEqual({ england: 'b' })
  })

  it('adds participants with a fresh id and trims blanks', () => {
    const added = addParticipant(sample, '  Carol  ')
    expect(added.participants.map((p) => p.name)).toContain('Carol')
    expect(added.participants.at(-1)?.id).toBeTruthy()
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
    const participants = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ]
    const drawn = randomDraw({ participants, assignments: {} }, teams, rng)
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    for (const id of Object.values(drawn.assignments)) counts[id]++
    expect(Object.keys(drawn.assignments)).toHaveLength(48)
    expect(counts).toEqual({ a: 16, b: 16, c: 16 })
  })

  it('clears assignments when there are no participants', () => {
    expect(
      randomDraw({ participants: [], assignments: { brazil: 'a' } }, ['brazil']).assignments,
    ).toEqual({})
  })
})
