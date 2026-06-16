import { flushSync } from 'react-dom'

type DocWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown
}

/**
 * Run a React state update inside a View Transition so the resulting DOM swap
 * animates (see the `::view-transition-*` rules in index.css). Falls back to a
 * plain synchronous update when the API is unavailable (e.g. Firefox, older
 * Safari) or the user prefers reduced motion, so behaviour is unchanged there.
 *
 * `flushSync` forces React to apply the update synchronously inside the
 * transition callback, which is what the API needs to capture the "after" frame.
 */
export function withViewTransition(update: () => void): void {
  const doc = document as DocWithViewTransition
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion) {
    update()
    return
  }

  doc.startViewTransition(() => flushSync(update))
}
