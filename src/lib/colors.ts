const PARTICIPANT_COLORS = [
  '#112e51',
  '#00829e', // darkened cyan for legible white text
  '#1d006f',
  '#0b7a5b',
  '#b8472a',
  '#7a5b00',
  '#5a2a82',
  '#0b5e8a',
]

/** Stable djb2 hash of a string → non-negative integer. */
function hash(key: string): number {
  let h = 5381
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h + key.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Pick a colour for a participant. Keyed by a stable string (the participant id)
 * so a person keeps their colour even when someone above them is removed.
 */
export function participantColor(key: string): string {
  return PARTICIPANT_COLORS[hash(key) % PARTICIPANT_COLORS.length]
}
