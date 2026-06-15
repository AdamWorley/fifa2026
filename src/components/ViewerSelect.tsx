import type { Participant } from '../lib/urlState'

interface Props {
  participants: Participant[]
  meId: string | null
  setMeId: (id: string | null) => void
}

/** Lets a viewer say which participant they are, to highlight themselves everywhere. */
export default function ViewerSelect({ participants, meId, setMeId }: Readonly<Props>) {
  if (participants.length === 0) return null
  // If the stored id no longer matches anyone, fall back to the placeholder.
  const value = participants.some((p) => p.id === meId) ? meId! : ''
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-muted">
      Viewing as
      <select
        value={value}
        onChange={(e) => setMeId(e.target.value === '' ? null : e.target.value)}
        className="rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-navy focus:border-brand-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
      >
        <option value="">Pick your name</option>
        {participants.map((p, i) => (
          <option key={p.id} value={p.id}>
            {p.name || `Player ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  )
}
