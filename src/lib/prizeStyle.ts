/**
 * Shared styling for prize emoji. The Golden Boot's 👟 ships as a grey
 * trainer; this sepia-based filter pushes it to trophy gold while letting the
 * emoji's own shading show through. Used both as a CSS filter on rendered
 * emoji and (via GOLD_FILTER) on the confetti sprite canvas, so they match.
 */
export const GOLD_FILTER = 'sepia(1) saturate(5) hue-rotate(-8deg) brightness(1.15)'

/** Inline style that gold-tints a prize emoji, selected by prize key. */
export function prizeEmojiStyle(key: string): { filter: string } | undefined {
  return key === 'goldenBoot' ? { filter: GOLD_FILTER } : undefined
}
