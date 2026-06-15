import { getTeam } from '../data/tournament'
import { participantColor } from '../lib/colors'
import type { LeaderboardEntry } from '../lib/prizes'
import { useRankMovement } from '../lib/useRankMovement'
import Flag from './Flag'

interface Props {
  leaderboard: LeaderboardEntry[]
  meId?: string | null
}

/** ▲n / ▼n / — movement indicator for a rank delta (positive = moved up). */
function Movement({ delta }: Readonly<{ delta: number | undefined }>) {
  if (delta === undefined || delta === 0) {
    return (
      <span className="text-xs text-slate-muted/50" aria-label="no change" title="No change">
        –
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={`text-xs font-bold ${up ? 'text-emerald-600' : 'text-brand-violet'}`}
      aria-label={`${up ? 'up' : 'down'} ${Math.abs(delta)} since last visit`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} since your last visit`}
    >
      {up ? '▲' : '▼'}
      {Math.abs(delta)}
    </span>
  )
}

export default function Leaderboard({ leaderboard, meId }: Readonly<Props>) {
  const moves = useRankMovement(leaderboard)

  if (leaderboard.length === 0) {
    return (
      <div className="max-w-3xl nw-card p-6 text-sm text-slate-muted">
        Today's your day — add participants and assign teams above to build the
        leaderboard. 🎶
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-3">
      <div>
        <h2 className="text-xl">Leaderboard</h2>
        <p className="text-xs font-semibold italic text-slate-muted">
          When you fall get up, oh oh — and if you fall get up, eh eh. 🎶
        </p>
      </div>
      {leaderboard.map((entry, position) => {
        const you = !!meId && entry.id === meId
        return (
          <div
            key={entry.id}
            className={`nw-card p-4 ${you ? 'ring-2 ring-brand-bright' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex w-6 shrink-0 flex-col items-center text-lg font-black text-slate-muted">
                {position + 1}
                <Movement delta={moves.get(entry.id)} />
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                style={{ background: participantColor(entry.id), textShadow: '0 1px 1px rgba(0,0,0,0.35)' }}
              >
                {entry.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-lg font-black text-navy">{entry.name}</span>
              {you && (
                <span className="rounded bg-brand-bright/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-navy">
                  you
                </span>
              )}
              <span className="ml-auto inline-flex items-baseline gap-1">
                <span className="text-2xl font-black text-navy">{entry.points}</span>
                <span className="text-xs font-semibold text-slate-muted">pts</span>
              </span>
            </div>

            {entry.teams.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {entry.teams.map((team) => {
                  const t = getTeam(team.teamId)!
                  return (
                    <span
                      key={team.teamId}
                      className="inline-flex items-center gap-1 rounded-lg bg-mist px-2 py-1 text-xs font-semibold ring-1 ring-line"
                    >
                      <Flag iso={t.iso} className="text-sm" title={t.name} />
                      {t.name}
                      <span className="font-black text-navy">{team.points}</span>
                      {team.prizes.map((prize) => (
                        <span
                          key={prize.key}
                          role="img"
                          aria-label={prize.label}
                          title={`${prize.label} — ${prize.blurb}`}
                        >
                          {prize.emoji}
                        </span>
                      ))}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
