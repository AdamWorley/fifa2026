import type { Participant } from '../lib/urlState'

interface Props {
  participants: Participant[]
  meId: string | null
  setMeId: (id: string | null) => void
}

/**
 * Lets a viewer say which participant they are, to highlight themselves
 * everywhere. The choice is stored locally on this device (never in the shared
 * link), so it's safe to make it prominent and personal.
 */
export default function ViewerSelect({ participants, meId, setMeId }: Readonly<Props>) {
  if (participants.length === 0) return null
  // If the stored id no longer matches anyone, fall back to the placeholder.
  const value = participants.some((p) => p.id === meId) ? meId! : ''
  const picked = value !== ''

  // Until you've picked, nudge with the gold accent; once chosen, settle into navy.
  const shell = picked
    ? 'border-navy bg-navy text-white'
    : 'border-gold-dark bg-gold-light text-navy shadow-card'

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${shell}`}
    >
      <span aria-hidden className="text-base leading-none">
        {picked ? '🙋' : '👋'}
      </span>
      <span className={picked ? 'text-white/80' : 'text-navy/70'}>
        {picked ? "You're" : 'Viewing as'}
      </span>
      <select
        value={value}
        onChange={(e) => setMeId(e.target.value === '' ? null : e.target.value)}
        aria-label="Choose which player you are"
        className={`-mr-1 cursor-pointer rounded-full border-none bg-transparent py-0.5 pl-1 pr-1 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan ${
          picked ? 'text-white' : 'text-navy'
        }`}
      >
        <option value="">Pick your name…</option>
        {participants.map((p, i) => (
          <option key={p.id} value={p.id}>
            {p.name || `Player ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}
