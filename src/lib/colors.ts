const PARTICIPANT_COLORS = [
  '#112e51',
  '#00a2c5',
  '#1d006f',
  '#0b7a5b',
  '#b8472a',
  '#7a5b00',
  '#5a2a82',
  '#0b5e8a',
]

export function participantColor(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]
}
