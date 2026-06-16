import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { TeamId } from '../data/tournament'

/** A person in the sweepstake, identified by a stable id (never their position). */
export interface Participant {
  id: string
  name: string
}

/** The entire sweepstake lives in the URL — no server, no database. */
export interface SweepstakeState {
  /** Display name of the sweepstake (optional). */
  title?: string
  /** Participants, in display order. Identity is `id`, not array position. */
  participants: Participant[]
  /** teamId -> owning participant id. Absent = unassigned. */
  assignments: Record<TeamId, string>
  /** Once locked, the draw is read-only: no editing participants or assignments. */
  locked?: boolean
}

const PARAM = 's'

export const EMPTY_STATE: SweepstakeState = {
  participants: [],
  assignments: {},
}

// Compact wire format keeps shared URLs short:
//   { t: title, p: [[id, name], …], a: { teamId: participantId } }
// Legacy links (p: [names], a: { teamId: index }) are still decoded, mapping
// positions onto synthesised ids so old shares degrade gracefully.
type WireParticipant = [string, string] | string

interface WireState {
  t?: string
  p: WireParticipant[]
  a: Record<string, string | number>
  l?: 1
}

function toWire(state: SweepstakeState): WireState {
  const wire: WireState = {
    p: state.participants.map((p) => [p.id, p.name] as [string, string]),
    a: state.assignments,
  }
  if (state.title) wire.t = state.title
  if (state.locked) wire.l = 1
  return wire
}

function fromWire(wire: WireState): SweepstakeState {
  const rawParticipants = Array.isArray(wire.p) ? wire.p : []
  const participants: Participant[] = rawParticipants.map((entry, i) =>
    Array.isArray(entry)
      ? { id: String(entry[0]), name: String(entry[1]) }
      : { id: `p${i}`, name: String(entry) }, // legacy: position-based id
  )
  const idByPosition = participants.map((p) => p.id)
  const validIds = new Set(idByPosition)

  const assignments: Record<string, string> = {}
  if (wire.a && typeof wire.a === 'object') {
    for (const [teamId, ref] of Object.entries(wire.a)) {
      // New links carry the participant id; legacy links carry an index.
      const id = typeof ref === 'number' ? idByPosition[ref] : String(ref)
      // Drop assignments that point at a participant who no longer exists.
      if (id !== undefined && validIds.has(id)) assignments[teamId] = id
    }
  }
  const result: SweepstakeState = {
    title: typeof wire.t === 'string' ? wire.t : undefined,
    participants,
    assignments,
  }
  if (wire.l) result.locked = true
  return result
}

export function encodeState(state: SweepstakeState): string {
  return compressToEncodedURIComponent(JSON.stringify(toWire(state)))
}

export function decodeState(encoded: string | null): SweepstakeState {
  if (!encoded) return EMPTY_STATE
  try {
    const json = decompressFromEncodedURIComponent(encoded)
    if (!json) return EMPTY_STATE
    return fromWire(JSON.parse(json) as WireState)
  } catch {
    return EMPTY_STATE
  }
}

/** Read the sweepstake state from the current window location. */
export function readStateFromUrl(): SweepstakeState {
  const params = new URLSearchParams(window.location.search)
  return decodeState(params.get(PARAM))
}

/** Build an absolute, shareable URL for the given state. */
export function buildShareUrl(state: SweepstakeState): string {
  const url = new URL(window.location.href)
  url.searchParams.set(PARAM, encodeState(state))
  return url.toString()
}

/** Replace the current URL's query string with the encoded state (no navigation). */
export function writeStateToUrl(state: SweepstakeState): void {
  const url = new URL(window.location.href)
  if (state.participants.length === 0 && Object.keys(state.assignments).length === 0) {
    url.searchParams.delete(PARAM)
  } else {
    url.searchParams.set(PARAM, encodeState(state))
  }
  window.history.replaceState(null, '', url.toString())
}
