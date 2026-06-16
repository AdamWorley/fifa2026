import { useCallback, useRef } from 'react'

/**
 * Returns a click/tap handler that fires `onTrigger` once `taps` taps land
 * within `windowMs` of each other. A pause longer than the window resets the
 * count. Gives touch devices (no keyboard for the Konami code) a way in.
 */
export function useTapBurst(
  onTrigger: () => void,
  taps = 5,
  windowMs = 1500,
): () => void {
  const count = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback(() => {
    count.current += 1
    if (timer.current) clearTimeout(timer.current)

    if (count.current >= taps) {
      count.current = 0
      onTrigger()
      return
    }
    timer.current = setTimeout(() => {
      count.current = 0
    }, windowMs)
  }, [onTrigger, taps, windowMs])
}
