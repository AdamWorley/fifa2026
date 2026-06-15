import { useEffect, useState } from 'react'
import { readStateFromUrl, writeStateToUrl, type SweepstakeState } from './urlState'

/** Sweepstake state synced to the URL query string — the single source of truth. */
export function useSweepstake() {
  const [state, setState] = useState<SweepstakeState>(() => readStateFromUrl())

  // Mirror every change back into the address bar so the link is always shareable.
  useEffect(() => {
    writeStateToUrl(state)
  }, [state])

  // Keep in sync when the user navigates (back/forward, or pastes a new link).
  useEffect(() => {
    const onPop = () => setState(readStateFromUrl())
    globalThis.addEventListener('popstate', onPop)
    return () => globalThis.removeEventListener('popstate', onPop)
  }, [])

  return [state, setState] as const
}
