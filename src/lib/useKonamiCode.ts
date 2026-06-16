import { useEffect, useRef } from 'react'

// The canonical cheat code. Letters are matched case-insensitively.
const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
]

/**
 * Fire `onUnlock` when the user enters the Konami code. A wrong key resets
 * progress, but is itself treated as a possible fresh start so you never have
 * to pause between attempts.
 */
export function useKonamiCode(onUnlock: () => void): void {
  const progress = useRef(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (key === SEQUENCE[progress.current]) {
        progress.current += 1
        if (progress.current === SEQUENCE.length) {
          progress.current = 0
          onUnlock()
        }
      } else {
        progress.current = key === SEQUENCE[0] ? 1 : 0
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onUnlock])
}
