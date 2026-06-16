import { participantColor } from '../lib/colors'
import { teamsByParticipant } from '../lib/sweepstake'
import type { SweepstakeState } from '../lib/urlState'

interface Props {
  state: SweepstakeState
  meId?: string | null
}

/**
 * Read-only roster shown once a draw is locked. Lists who is playing (and how
 * many teams each drew) without revealing the team-by-team assignment.
 */
export default function ParticipantsPanel({ state, meId }: Readonly<Props>) {
  if (state.participants.length === 0) return null

  const counts = teamsByParticipant(state)

  return (
    <section className="nw-card p-6">
      <div className="mb-4">
        <h2 className="text-xl">Participants</h2>
        <p className="text-xs text-slate-muted">
          The draw is locked — {state.participants.length} playing.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {state.participants.map((participant, i) => {
          const you = !!meId && participant.id === meId
          const teamCount = counts.get(participant.id)?.length ?? 0
          return (
            <li
              key={participant.id}
              className={`flex items-center gap-2 rounded-xl bg-mist px-3 py-2 ring-1 ring-line ${
                you ? 'ring-2 ring-brand-bright' : ''
              }`}
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{
                  background: participantColor(participant.id),
                  textShadow: '0 1px 1px rgba(0,0,0,0.35)',
                }}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
                {participant.name || `Player ${i + 1}`}
              </span>
              {you && (
                <span className="shrink-0 rounded bg-brand-bright/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-navy">
                  you
                </span>
              )}
              <span className="shrink-0 text-xs font-semibold text-slate-muted">
                {teamCount} {teamCount === 1 ? 'team' : 'teams'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
