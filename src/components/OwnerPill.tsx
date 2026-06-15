import { participantColor } from '../lib/colors'
import type { Participant } from '../lib/urlState'

interface Props {
  participant: Participant | null | undefined
  size?: 'sm' | 'md'
  /** Highlight this pill as belonging to the current viewer ("you"). */
  you?: boolean
}

/** Small coloured chip showing which participant owns something. */
export default function OwnerPill({ participant, size = 'sm', you = false }: Readonly<Props>) {
  if (!participant) {
    return <span className="text-xs italic text-slate-muted">unassigned</span>
  }
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  const ring = you ? 'ring-2 ring-offset-1 ring-brand-bright' : ''
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold text-white ${pad} ${ring}`}
      style={{ background: participantColor(participant.id), textShadow: '0 1px 1px rgba(0,0,0,0.35)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/80" aria-hidden />
      {participant.name}
      {you && <span className="rounded bg-white/25 px-1 text-[10px] uppercase tracking-wide">you</span>}
    </span>
  )
}
