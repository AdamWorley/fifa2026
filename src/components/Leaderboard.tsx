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
        Today's your day — add participants and assign teams above to build the
        leaderboard. 🎶
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl">Leaderboard</h2>
        <p className="text-xs font-semibold italic text-slate-muted">
          When you fall get up, oh oh — and if you fall get up, eh eh. 🎶
        </p>
      </div>
      {leaderboard.map((entry, position) => (
        <div key={entry.index} className="nw-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-6 shrink-0 text-center text-lg font-black text-slate-muted">
              {position + 1}
            </span>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
              style={{ background: participantColor(entry.index) }}
            >
              {entry.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="text-lg font-black text-navy">{entry.name}</span>
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
                      <span key={prize.key} title={`${prize.label} — ${prize.blurb}`}>
                        {prize.emoji}
                      </span>
                    ))}
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
