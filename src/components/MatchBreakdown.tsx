import { useMemo, useState } from 'react'
import { getTeam, STAGE_LABELS, type Stage } from '../data/tournament'
import { resolveTeamId } from '../lib/aliases'
import { ownerOf } from '../lib/sweepstake'
import { formatUtcOffset, type MatchResult, type MatchStatus, type TeamCards } from '../lib/results'
import type { SweepstakeState } from '../lib/urlState'
import OwnerPill from './OwnerPill'
import Flag from './Flag'

interface Props {
  matches: MatchResult[]
  state: SweepstakeState
}

const STAGE_ORDER: Stage[] = [
  'group',
  'round-of-32',
  'round-of-16',
  'quarter-final',
  'semi-final',
  'third-place',
  'final',
]

/** Map a raw upstream round label (e.g. "Group Stage - 1") onto our Stage union. */
function stageKey(raw: string): Stage {
  const s = raw.toLowerCase()
  if (s.includes('32')) return 'round-of-32'
  if (s.includes('16')) return 'round-of-16'
  if (s.includes('quarter')) return 'quarter-final'
  if (s.includes('semi')) return 'semi-final'
  if (s.includes('3rd') || s.includes('third')) return 'third-place'
  if (s.includes('final')) return 'final'
  return 'group'
}

const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}

/** Kickoff in the viewer's own time zone. */
function formatLocal(kickoff: string): string {
  const d = new Date(kickoff)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, DATE_TIME_OPTS)
}

/** Kickoff in the host venue's local time, e.g. "Thu, 11 Jun, 13:00 · Mexico City (UTC-6)". */
function formatVenue(kickoff: string, offsetMinutes: number, venue: string): string {
  const ms = new Date(kickoff).getTime()
  if (Number.isNaN(ms)) return ''
  // Shift the instant by the venue offset, then read it back as UTC to recover
  // the venue's wall-clock time without depending on an IANA tz database.
  const wall = new Date(ms + offsetMinutes * 60_000)
  const time = wall.toLocaleString(undefined, { ...DATE_TIME_OPTS, timeZone: 'UTC' })
  const where = venue ? `${venue} · ` : ''
  return `${time} (${where}${formatUtcOffset(offsetMinutes)})`
}

/** Fallback for matches with no kickoff time — show the date without a zone shift. */
function formatDateOnly(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!m) return date
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

type Filter = 'all' | MatchStatus

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'finished', label: 'Finished' },
  { id: 'scheduled', label: 'Upcoming' },
]

export default function MatchBreakdown({ matches, state }: Readonly<Props>) {
  const [filter, setFilter] = useState<Filter>('all')

  const byStage = useMemo(() => {
    const map = new Map<Stage, MatchResult[]>()
    for (const stage of STAGE_ORDER) map.set(stage, [])
    for (const m of matches) {
      if (filter !== 'all' && m.status !== filter) continue
      map.get(stageKey(m.stage))!.push(m)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.date.localeCompare(b.date))
    }
    return map
  }, [matches, filter])

  const upcoming = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'scheduled')
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3),
    [matches],
  )

  const total = matches.length
  const shown = [...byStage.values()].reduce((n, list) => n + list.length, 0)

  return (
    <div>
      <h2 className="mb-1 text-xl">Match breakdown</h2>
      <p className="mb-4 text-sm text-slate-muted">
        Every fixture with scores, status and disciplinary cards. Owned teams show their participant.
      </p>

      {upcoming.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-muted">
            Next up
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} state={state} />
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={
              filter === f.id
                ? 'nw-btn bg-navy text-white'
                : 'nw-btn bg-white text-navy ring-1 ring-line hover:bg-mist'
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown === 0 ? (
        <p className="nw-card p-6 text-center text-sm text-slate-muted">
          {total === 0 ? 'No matches available yet.' : 'No matches match this filter.'}
        </p>
      ) : (
        <div className="space-y-6">
          {STAGE_ORDER.map((stage) => {
            const rows = byStage.get(stage)!
            if (rows.length === 0) return null
            return (
              <section key={stage}>
                <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-muted">
                  {STAGE_LABELS[stage]}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((m) => (
                    <MatchCard key={m.id} match={m} state={state} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

const STATUS_BADGE: Record<MatchStatus, string> = {
  live: 'bg-emerald-500 text-white',
  finished: 'bg-slate-200 text-slate-700',
  scheduled: 'bg-mist text-slate-muted',
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  live: 'Live',
  finished: 'Full time',
  scheduled: 'Upcoming',
}

function MatchCard({ match, state }: Readonly<{ match: MatchResult; state: SweepstakeState }>) {
  const homeWon = match.score ? match.score.home > match.score.away : false
  const awayWon = match.score ? match.score.away > match.score.home : false
  const date = match.kickoff ? formatLocal(match.kickoff) : formatDateOnly(match.date)
  const venueTime =
    match.kickoff != null && match.venueOffsetMinutes != null
      ? `Venue time: ${formatVenue(match.kickoff, match.venueOffsetMinutes, match.venue ?? '')}`
      : undefined

  return (
    <div className="nw-card p-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-slate-muted" title={venueTime}>
          {date}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${STATUS_BADGE[match.status]}`}>
          {STATUS_LABEL[match.status]}
        </span>
      </div>
      <Side
        teamName={match.home}
        goals={match.score?.home ?? null}
        cards={match.cards.home}
        winner={homeWon}
        state={state}
      />
      <div className="my-1 border-t border-line/60" />
      <Side
        teamName={match.away}
        goals={match.score?.away ?? null}
        cards={match.cards.away}
        winner={awayWon}
        state={state}
      />
    </div>
  )
}

function Side({
  teamName,
  goals,
  cards,
  winner,
  state,
}: Readonly<{
  teamName: string
  goals: number | null
  cards: TeamCards
  winner: boolean
  state: SweepstakeState
}>) {
  const teamId = resolveTeamId(teamName)
  const team = getTeam(teamId)
  const owner = teamId ? ownerOf(state, teamId) : null
  return (
    <div className="flex items-center gap-2">
      <Flag iso={team?.iso ?? null} className="text-base" title={team?.name} />
      <div className="min-w-0 flex-1">
        <span className={`truncate ${winner ? 'font-black text-navy' : 'font-semibold text-slate-muted'}`}>
          {team?.name ?? teamName}
        </span>
        {owner !== null && (
          <span className="ml-1.5 align-middle">
            <OwnerPill name={state.participants[owner]} index={owner} />
          </span>
        )}
      </div>
      <Cards cards={cards} />
      <span className={`tabular-nums ${winner ? 'font-black text-navy' : 'text-slate-muted'}`}>
        {goals ?? '–'}
      </span>
    </div>
  )
}

/** Yellow/red card counts; hidden entirely when there are none. */
function Cards({ cards }: Readonly<{ cards: TeamCards }>) {
  if (cards.yellow === 0 && cards.red === 0) return null
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs font-bold tabular-nums">
      {cards.yellow > 0 && (
        <span className="inline-flex items-center gap-0.5 text-amber-600" title={`${cards.yellow} yellow`}>
          <span className="h-3 w-2 rounded-[1px] bg-amber-400" aria-hidden />
          {cards.yellow}
        </span>
      )}
      {cards.red > 0 && (
        <span className="inline-flex items-center gap-0.5 text-red-600" title={`${cards.red} red`}>
          <span className="h-3 w-2 rounded-[1px] bg-red-500" aria-hidden />
          {cards.red}
        </span>
      )}
    </span>
  )
}
