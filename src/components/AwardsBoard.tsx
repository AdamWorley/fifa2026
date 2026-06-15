import { getTeam } from '../data/tournament'
import type { SweepstakeState } from '../lib/urlState'
import type { PrizeStanding } from '../lib/prizes'
import OwnerPill from './OwnerPill'
import Flag from './Flag'

interface Props {
  prizeStandings: PrizeStanding[]
  state: SweepstakeState
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

export default function AwardsBoard({ prizeStandings, state }: Readonly<Props>) {
  return (
    <div>
      <h2 className="mb-1 text-xl">Awards &amp; prizes</h2>
      <p className="mb-4 text-sm text-slate-muted">
        1st &amp; 2nd go to the World Cup finalists&apos; owners. The group-stage awards show the
        current leader and lock in once all 72 group matches are played.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {prizeStandings.map((p) => {
          const team = getTeam(p.teamId)
          const owner = p.ownerIndex
          const value = valueLabel(p.def.key, p.value)
          return (
            <div key={p.def.key} className="nw-card flex flex-col p-5">
              <div className="flex items-start justify-between">
                <span className="text-3xl" aria-hidden>
                  {p.def.emoji}
                </span>
                {team && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                      p.final ? 'bg-brand-violet text-white' : 'bg-line text-slate-muted'
                    }`}
                  >
                    {p.final ? 'Final' : 'Current leader'}
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
                      <OwnerPill
                        name={owner === null ? null : state.participants[owner]}
                        index={owner}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm italic text-slate-muted">To be decided</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
