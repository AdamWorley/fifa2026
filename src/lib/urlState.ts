import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { TeamId } from '../data/tournament'

/** The entire sweepstake lives in the URL — no server, no database. */
export interface SweepstakeState {
  /** Display name of the sweepstake (optional). */
  title?: string
  /** Participant names, indexed by position. */
  participants: string[]
  /** teamId -> index into `participants`. Absent = unassigned. */
  assignments: Record<TeamId, number>
}

const PARAM = 's'

export const EMPTY_STATE: SweepstakeState = {
  participants: [],
  assignments: {},
}

// Compact wire format keeps shared URLs short:
//   { t: title, p: [names], a: { teamId: participantIndex } }
interface WireState {
  t?: string
  p: string[]
  a: Record<string, number>
}

function toWire(state: SweepstakeState): WireState {
  const wire: WireState = { p: state.participants, a: state.assignments }
  if (state.title) wire.t = state.title
  return wire
}

function fromWire(wire: WireState): SweepstakeState {
  const participants = Array.isArray(wire.p) ? wire.p.map(String) : []
  const assignments: Record<string, number> = {}
  if (wire.a && typeof wire.a === 'object') {
    for (const [teamId, idx] of Object.entries(wire.a)) {
      const n = Number(idx)
      // Drop assignments that point at a participant who no longer exists.
      if (Number.isInteger(n) && n >= 0 && n < participants.length) {
        assignments[teamId] = n
      }
    }
  }
  return {
    title: typeof wire.t === 'string' ? wire.t : undefined,
    participants,
    assignments,
  }
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
