import { getTeam } from '../data/tournament'
import { participantColor } from '../lib/colors'
import type { TeamLeaderboard, TeamLeaderboardEntry } from '../lib/prizes'
import { useRankMovement } from '../lib/useRankMovement'
import { prizeEmojiStyle } from '../lib/prizeStyle'
import Flag from './Flag'

interface Props {
  leaderboard: TeamLeaderboard
  meId?: string | null
}

/** Medal for the top three teams; null beyond third. */
const MEDALS = [
  { emoji: '🥇', label: '1st place' },
  { emoji: '🥈', label: '2nd place' },
  { emoji: '🥉', label: '3rd place' },
]

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

interface CardProps {
  entry: TeamLeaderboardEntry
  meId?: string | null
  /** 1-based rank; omit to hide the rank cell (e.g. for upcoming teams). */
  rank?: number
  /** Show a medal for the top three (only meaningful with a rank). */
  medal?: boolean
  /** Rank movement delta; omit to hide the movement row. */
  movement?: number
  /** Render the points total. */
  showPoints?: boolean
  /** Mute the card (for knocked-out teams). */
  dim?: boolean
}

function TeamCard({ entry, meId, rank, medal, movement, showPoints, dim }: Readonly<CardProps>) {
  const you = !!meId && entry.ownerId === meId
  const team = getTeam(entry.teamId)!
  return (
    <div
      className={`nw-card flex flex-col p-4 ${you ? 'ring-2 ring-brand-bright' : ''} ${dim ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center gap-3">
        {rank !== undefined && (
          <span className="flex w-6 shrink-0 flex-col items-center text-lg font-black text-slate-muted">
            {medal && MEDALS[rank - 1] ? (
              <span className="text-xl leading-none" role="img" aria-label={MEDALS[rank - 1].label}>
                {MEDALS[rank - 1].emoji}
              </span>
            ) : (
              rank
            )}
            {movement !== undefined && <Movement delta={movement} />}
          </span>
        )}
        <Flag iso={team.iso} className="shrink-0 text-3xl" title={team.name} />
        <span className="min-w-0 flex-1 truncate text-lg font-black text-navy">{team.name}</span>
        {entry.prizes.map((prize) => (
          <span
            key={prize.key}
            className="shrink-0"
            role="img"
            aria-label={prize.label}
            title={`${prize.label} — ${prize.blurb}`}
            style={prizeEmojiStyle(prize.key)}
          >
            {prize.emoji}
          </span>
        ))}
        {showPoints && (
          <span className="inline-flex shrink-0 items-baseline gap-1">
            <span className="text-2xl font-black text-navy">{entry.points}</span>
            <span className="text-xs font-semibold text-slate-muted">pts</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-muted">
        <span className="font-semibold">Drawn by</span>
        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-mist px-2 py-1 font-semibold ring-1 ring-line">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
            style={{ background: participantColor(entry.ownerId), textShadow: '0 1px 1px rgba(0,0,0,0.35)' }}
          >
            {entry.ownerName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-navy">{entry.ownerName}</span>
        </span>
        {you && (
          <span className="shrink-0 rounded bg-brand-bright/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-navy">
            you
          </span>
        )}
        {entry.played > 0 && (
          <span className="ml-auto shrink-0 whitespace-nowrap font-semibold">
            {entry.played} {entry.played === 1 ? 'match' : 'matches'} played
          </span>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle: string; children: React.ReactNode }>) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-black text-navy">{title}</h3>
        <p className="text-xs text-slate-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

const GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

export default function Leaderboard({ leaderboard, meId }: Readonly<Props>) {
  const { playing, upcoming, eliminated } = leaderboard
  const moves = useRankMovement(playing)

  if (playing.length === 0 && upcoming.length === 0 && eliminated.length === 0) {
    return (
      <div className="max-w-3xl nw-card p-6 text-sm text-slate-muted">
        Today's your day — add participants and assign teams above to build the
        leaderboard. 🎶
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4">
          <h2 className="text-xl">Leaderboard</h2>
          <p className="text-xs font-semibold italic text-slate-muted">
            When you fall get up, oh oh — and if you fall get up, eh eh. 🎶
          </p>
        </div>
        {playing.length > 0 ? (
          <div className={GRID}>
            {playing.map((entry, i) => (
              <TeamCard
                key={entry.id}
                entry={entry}
                meId={meId}
                rank={i + 1}
                medal
                movement={moves.get(entry.id) ?? 0}
                showPoints
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-muted">No teams have kicked off yet.</p>
        )}
      </div>

      {upcoming.length > 0 && (
        <Section title="Yet to play" subtitle="Drawn teams still waiting for their first match.">
          <div className={GRID}>
            {upcoming.map((entry) => (
              <TeamCard key={entry.id} entry={entry} meId={meId} />
            ))}
          </div>
        </Section>
      )}

      {eliminated.length > 0 && (
        <Section title="Knocked out" subtitle="Out of the tournament — final points shown.">
          <div className={GRID}>
            {eliminated.map((entry) => (
              <TeamCard key={entry.id} entry={entry} meId={meId} showPoints dim />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
