import { getTeam } from '../data/tournament'
import { participantColor } from '../lib/colors'
import type { LeaderboardEntry } from '../lib/prizes'
import Flag from './Flag'

interface Props {
  leaderboard: LeaderboardEntry[]
}

export default function Leaderboard({ leaderboard }: Readonly<Props>) {
  if (leaderboard.length === 0) {
    return (
      <div className="nw-card p-6 text-sm text-slate-muted">
        Add participants and assign teams above to build the leaderboard.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl">Leaderboard</h2>
      {leaderboard.map((entry) => (
        <div key={entry.index} className="nw-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ background: participantColor(entry.index) }}
            >
              {entry.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-lg font-black text-navy">{entry.name}</span>
            <span className="text-xs font-semibold text-slate-muted">
              {entry.teamIds.length} team{entry.teamIds.length === 1 ? '' : 's'}
            </span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {entry.prizes.map((prize) => (
                <span
                  key={prize.key}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-violet/10 px-2.5 py-1 text-xs font-bold text-brand-violet"
                  title={prize.blurb}
                >
                  {prize.emoji} {prize.label}
                </span>
              ))}
            </div>
          </div>

          {entry.teamIds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {entry.teamIds.map((teamId) => {
                const team = getTeam(teamId)!
                return (
                  <span
                    key={teamId}
                    className="inline-flex items-center gap-1 rounded-lg bg-mist px-2 py-1 text-xs font-semibold ring-1 ring-line"
                  >
                    <Flag iso={team.iso} className="text-sm" title={team.name} />
                    {team.name}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
