import { getTeam } from '../data/tournament'
import { getParticipant } from '../lib/sweepstake'
import type { SweepstakeState } from '../lib/urlState'
import type { PrizeStanding } from '../lib/prizes'
import OwnerPill from './OwnerPill'
import Flag from './Flag'
import { launchConfetti } from '../lib/confetti'

interface Props {
  prizeStandings: PrizeStanding[]
  state: SweepstakeState
  meId?: string | null
}

function valueLabel(key: string, value: number | null): string | null {
  if (value === null) return null
  switch (key) {
    case 'goldenBoot':
      return `${value} goals`
    case 'woodenSpoon':
      return `${value > 0 ? '+' : ''}${value} GD`
    case 'refereesFavourite':
      return `${value} cards`
    default:
      return null
  }
}

export default function AwardsBoard({ prizeStandings, state, meId }: Readonly<Props>) {
  return (
    <div>
      <h2 className="mb-1 text-xl">Awards &amp; prizes</h2>
      <p className="mb-1 text-sm text-slate-muted">
        1st &amp; 2nd go to the World Cup finalists&apos; owners. The group-stage awards show a
        <span className="font-semibold"> provisional</span> leader and <span aria-hidden>🔒</span>{' '}
        <span className="font-semibold">lock in</span> once all 72 group matches are played.
      </p>
      <p className="mb-4 text-xs italic text-slate-muted/80">
        Card counts (Referee&apos;s Favourite) are filled best-effort from public match data and may
        be incomplete until results settle.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prizeStandings.map((p) => {
          const team = getTeam(p.teamId)
          const owner = p.ownerId ? getParticipant(state, p.ownerId) : null
          const value = valueLabel(p.def.key, p.value)
          return (
            // 🥚 Easter egg: clicking a prize card rains its emoji down the screen.
            <button
              type="button"
              key={p.def.key}
              onClick={() => launchConfetti({ emoji: p.def.emoji })}
              title={`Celebrate the ${p.def.label}!`}
              className="nw-card flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-violet"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden>
                  {p.def.emoji}
                </span>
                {team && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      p.final ? 'bg-brand-violet text-white' : 'bg-line text-slate-muted'
                    }`}
                    title={p.final ? 'Locked in — group stage complete' : 'Provisional — still being played'}
                  >
                    {p.final ? '🔒 Final' : 'Provisional'}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-lg">{p.def.label}</h3>
              <p className="text-xs text-slate-muted">{p.def.blurb}</p>

              <div className="mt-4 border-t border-line pt-3">
                {team ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Flag iso={team.iso} className="text-2xl" title={team.name} />
                      <span className="font-black text-navy">{team.name}</span>
                      {value && (
                        <span className="ml-auto text-sm font-bold text-brand-cyan">{value}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-slate-muted">Owner:</span>
                      <OwnerPill participant={owner} you={!!owner && owner.id === meId} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm italic text-slate-muted">To be decided</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
