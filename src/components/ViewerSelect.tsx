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

  // Until you've picked, nudge with a soft gold tint; once chosen, settle into a calm navy tint.
  const shell = picked
    ? 'border-navy/30 bg-navy/5 text-navy'
    : 'border-gold-dark/40 bg-gold-light/40 text-navy'

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${shell}`}
    >
      <span className="text-navy/60">{picked ? "You're" : 'Viewing as'}</span>
      <select
        value={value}
        onChange={(e) => setMeId(e.target.value === '' ? null : e.target.value)}
        aria-label="Choose which player you are"
        className="-mr-1 cursor-pointer rounded-full border-none bg-transparent py-0.5 pl-1 pr-1 text-sm font-bold text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
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
