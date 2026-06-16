import type { TeamId } from '../data/tournament'
import type { Participant, SweepstakeState } from './urlState'

/** Look up a participant by id. */
export function getParticipant(state: SweepstakeState, id: string): Participant | undefined {
  return state.participants.find((p) => p.id === id)
}

/** Id of the participant owning a team, or null if unassigned. */
export function ownerOf(state: SweepstakeState, teamId: TeamId): string | null {
  return state.assignments[teamId] ?? null
}

/** True when the team is owned by the viewing participant (`meId`). */
export function isMyTeam(
  state: SweepstakeState,
  teamId: TeamId | null,
  meId?: string | null,
): boolean {
  return !!meId && !!teamId && ownerOf(state, teamId) === meId
}

/** teamIds owned by each participant, keyed by participant id. */
export function teamsByParticipant(state: SweepstakeState): Map<string, TeamId[]> {
  const map = new Map<string, TeamId[]>()
  state.participants.forEach((p) => map.set(p.id, []))
  for (const [teamId, id] of Object.entries(state.assignments)) {
    if (!map.has(id)) map.set(id, [])
    map.get(id)!.push(teamId)
  }
  return map
}

export function setAssignment(
  state: SweepstakeState,
  teamId: TeamId,
  participantId: string | null,
): SweepstakeState {
  const assignments = { ...state.assignments }
  if (participantId === null) {
    delete assignments[teamId]
  } else {
    assignments[teamId] = participantId
  }
  return { ...state, assignments }
}

/** Generate a short, URL-friendly id not already used by a participant. */
export function newParticipantId(
  state: SweepstakeState,
  random: () => number = Math.random,
): string {
  const used = new Set(state.participants.map((p) => p.id))
  for (;;) {
    const id = Math.floor(random() * 0x7fffffff).toString(36)
    if (id && !used.has(id)) return id
  }
}

export function addParticipant(
  state: SweepstakeState,
  name: string,
  random: () => number = Math.random,
): SweepstakeState {
  const trimmed = name.trim()
  if (!trimmed) return state
  const participant: Participant = { id: newParticipantId(state, random), name: trimmed }
  return { ...state, participants: [...state.participants, participant] }
}

export function renameParticipant(
  state: SweepstakeState,
  id: string,
  name: string,
): SweepstakeState {
  const participants = state.participants.map((p) => (p.id === id ? { ...p, name } : p))
  return { ...state, participants }
}

/** Remove a participant and drop any teams they owned (ids stay stable for everyone else). */
export function removeParticipant(state: SweepstakeState, id: string): SweepstakeState {
  const participants = state.participants.filter((p) => p.id !== id)
  const assignments: Record<TeamId, string> = {}
  for (const [teamId, ownerId] of Object.entries(state.assignments)) {
    if (ownerId !== id) assignments[teamId] = ownerId
  }
  return { ...state, participants, assignments }
}

/** Unassign every team, keeping the participant list intact (a "reset the draw"). */
export function clearAssignments(state: SweepstakeState): SweepstakeState {
  return { ...state, assignments: {} }
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
  const assignments: Record<TeamId, string> = {}
  shuffled.forEach((teamId, i) => {
    assignments[teamId] = state.participants[i % state.participants.length].id
  })
  return { ...state, assignments }
}
