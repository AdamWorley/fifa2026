import type { TeamId } from '../data/tournament'
import type { SweepstakeState } from './urlState'

/** Index into participants for the owner of a team, or null if unassigned. */
export function ownerOf(state: SweepstakeState, teamId: TeamId): number | null {
  const idx = state.assignments[teamId]
  return idx === undefined ? null : idx
}

/** teamIds owned by each participant, keyed by participant index. */
export function teamsByParticipant(state: SweepstakeState): Map<number, TeamId[]> {
  const map = new Map<number, TeamId[]>()
  state.participants.forEach((_, i) => map.set(i, []))
  for (const [teamId, idx] of Object.entries(state.assignments)) {
    if (!map.has(idx)) map.set(idx, [])
    map.get(idx)!.push(teamId)
  }
  return map
}

export function setAssignment(
  state: SweepstakeState,
  teamId: TeamId,
  participantIndex: number | null,
): SweepstakeState {
  const assignments = { ...state.assignments }
  if (participantIndex === null) {
    delete assignments[teamId]
  } else {
    assignments[teamId] = participantIndex
  }
  return { ...state, assignments }
}

export function addParticipant(state: SweepstakeState, name: string): SweepstakeState {
  const trimmed = name.trim()
  if (!trimmed) return state
  return { ...state, participants: [...state.participants, trimmed] }
}

export function renameParticipant(
  state: SweepstakeState,
  index: number,
  name: string,
): SweepstakeState {
  const participants = state.participants.map((p, i) => (i === index ? name : p))
  return { ...state, participants }
}

/** Remove a participant and re-index assignments (shifting higher indices down). */
export function removeParticipant(state: SweepstakeState, index: number): SweepstakeState {
  const participants = state.participants.filter((_, i) => i !== index)
  const assignments: Record<TeamId, number> = {}
  for (const [teamId, idx] of Object.entries(state.assignments)) {
    if (idx === index) continue
    assignments[teamId] = idx > index ? idx - 1 : idx
  }
  return { ...state, participants, assignments }
}

/**
 * Randomly distribute the given teams across participants as evenly as possible.
 * Existing assignments are cleared. Returns a new state.
 */
export function randomDraw(
  state: SweepstakeState,
  teamIds: TeamId[],
  random: () => number = Math.random,
): SweepstakeState {
  if (state.participants.length === 0) return { ...state, assignments: {} }
  const shuffled = [...teamIds]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const assignments: Record<TeamId, number> = {}
  shuffled.forEach((teamId, i) => {
    assignments[teamId] = i % state.participants.length
  })
  return { ...state, assignments }
}
