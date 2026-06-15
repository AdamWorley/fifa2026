import { useEffect, useState } from 'react'
import { upcomingMatches, type MatchResult } from '../lib/results'

interface Props {
  matches: MatchResult[]
}

function pickNext(matches: MatchResult[], now: number): { match: MatchResult; live: boolean } | null {
  const live = matches.find((m) => m.status === 'live')
  if (live) return { match: live, live: true }
  const upcoming = upcomingMatches(matches, now)
  return upcoming.length ? { match: upcoming[0], live: false } : null
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

/** A compact banner showing the live match, or a countdown to the next kickoff. */
export default function NextMatchCountdown({ matches }: Readonly<Props>) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 30_000)
    return () => globalThis.clearInterval(timer)
  }, [])

  const next = pickNext(matches, now)
  if (!next) return null
  const { match, live } = next

  return (
    <div className="nw-card flex flex-wrap items-center gap-x-3 gap-y-1 p-4 text-sm">
      {live ? (
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
      {!live && match.kickoff && (
        <span className="ml-auto text-slate-muted">
          {formatKickoff(match.kickoff)} ·{' '}
          <span className="font-bold text-navy">in {formatGap(Date.parse(match.kickoff) - now)}</span>
        </span>
      )}
    </div>
  )
}
