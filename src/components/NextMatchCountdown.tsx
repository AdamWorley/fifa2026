import { useEffect, useState } from 'react'
import { getTeam, type TeamId } from '../data/tournament'
import { teamsByParticipant } from '../lib/sweepstake'
import { nextMatchesForTeams, pickNext } from '../lib/nextMatches'
import type { MatchResult } from '../lib/results'
import type { SweepstakeState } from '../lib/urlState'
import Flag from './Flag'

interface Props {
  matches: MatchResult[]
  state: SweepstakeState
  meId?: string | null
}

/** Human "2d 3h" / "3h 12m" / "8m" from a millisecond gap. */
function formatGap(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/**
 * BBC's live broadcast on iPlayer. The exact per-match stream needs BBC's opaque
 * programme id (not derivable from match data), so we link the BBC One live
 * channel — where most UK World Cup matches air — as the closest direct option.
 */
const BBC_LIVE_URL = 'https://www.bbc.co.uk/iplayer/live/bbcone'

function formatKickoff(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** A single row: the fixture, plus a live link or a countdown to kickoff. */
function MatchRow({
  match,
  live,
  now,
  teamId,
}: Readonly<{ match: MatchResult; live: boolean; now: number; teamId?: TeamId }>) {
  const team = teamId ? getTeam(teamId) : undefined
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {team ? (
        <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-wide text-brand-cyan">
          <Flag iso={team.iso} title={team.name} />
          {team.name}
        </span>
      ) : live ? (
        <span className="inline-flex items-center gap-1.5 font-black uppercase tracking-wide text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          Live now
        </span>
      ) : (
        <span className="font-black uppercase tracking-wide text-brand-cyan">Next up</span>
      )}
      <span className="font-bold text-navy">
        {match.home} <span className="text-slate-muted">v</span> {match.away}
      </span>
      {live ? (
        <a
          href={BBC_LIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1 font-bold text-emerald-600 hover:underline"
        >
          {team && (
            <span className="inline-flex items-center gap-1 font-black uppercase tracking-wide">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
              Live
            </span>
          )}
          Watch on BBC iPlayer
          <span aria-hidden>↗</span>
        </a>
      ) : (
        match.kickoff && (
          <span className="ml-auto text-slate-muted">
            {formatKickoff(match.kickoff)} ·{' '}
            <span className="font-bold text-navy">in {formatGap(Date.parse(match.kickoff) - now)}</span>
          </span>
        )
      )}
    </div>
  )
}

/**
 * The viewer's teams' next matches (one row per owned team), or — when no viewer
 * is set or none of their teams have a fixture left — the tournament's next match.
 */
export default function NextMatchCountdown({ matches, state, meId }: Readonly<Props>) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 30_000)
    return () => globalThis.clearInterval(timer)
  }, [])

  const myTeamIds = meId ? (teamsByParticipant(state).get(meId) ?? []) : []
  const mine = nextMatchesForTeams(matches, myTeamIds, now)

  if (mine.length > 0) {
    return (
      <div className="nw-card space-y-2 p-4">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-muted">
          Your teams’ next matches
        </h3>
        {mine.map((e) => (
          <MatchRow key={e.teamId} match={e.match} live={e.live} now={now} teamId={e.teamId} />
        ))}
      </div>
    )
  }

  // No viewer, or their teams are done: fall back to the tournament's next match.
  const next = pickNext(matches, now)
  if (!next) return null
  return (
    <div className="nw-card p-4">
      <MatchRow match={next.match} live={next.live} now={now} />
    </div>
  )
}
