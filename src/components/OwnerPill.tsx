import { participantColor } from '../lib/colors'

interface Props {
  name: string | null
  index: number | null
  size?: 'sm' | 'md'
}

/** Small coloured chip showing which participant owns something. */
export default function OwnerPill({ name, index, size = 'sm' }: Readonly<Props>) {
  if (name === null || index === null) {
    return <span className="text-xs italic text-slate-muted">unassigned</span>
  }
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold text-white ${pad}`}
      style={{ background: participantColor(index) }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden />
      {name}
    </span>
  )
}
