import {
  getTeam,
  KNOCKOUT_FIXTURES,
  STAGE_LABELS,
  type Stage,
} from '../data/tournament'
import { resolveTeamId } from '../lib/aliases'
import { getParticipant, isMyTeam, ownerOf } from '../lib/sweepstake'
import type { MatchResult } from '../lib/results'
import type { SweepstakeState } from '../lib/urlState'
import OwnerPill from './OwnerPill'
import Flag from './Flag'

interface Props {
  matches: MatchResult[]
  state: SweepstakeState
  meId?: string | null
}

const STAGE_ORDER: Stage[] = [
  'round-of-32',
  'round-of-16',
  'quarter-final',
  'semi-final',
  'third-place',
  'final',
]

function liveStageKey(raw: string): Stage | null {
  const s = raw.toLowerCase()
  if (s.includes('32')) return 'round-of-32'
  if (s.includes('16')) return 'round-of-16'
  if (s.includes('quarter')) return 'quarter-final'
  if (s.includes('semi')) return 'semi-final'
  if (s.includes('3rd') || s.includes('third')) return 'third-place'
  if (s.includes('final')) return 'final'
  return null
}

export default function KnockoutBracket({ matches, state, meId }: Readonly<Props>) {
  const liveKnockout = matches.filter((m) => !m.isGroupStage && (m.score || m.status !== 'scheduled'))
  const useLive = liveKnockout.length > 0

  const byStage = new Map<Stage, Row[]>()
  for (const stage of STAGE_ORDER) byStage.set(stage, [])

  if (useLive) {
    for (const m of liveKnockout) {
      const stage = liveStageKey(m.stage)
      if (!stage) continue
      byStage.get(stage)!.push({
        homeId: resolveTeamId(m.home),
        awayId: resolveTeamId(m.away),
        homeLabel: m.home,
        awayLabel: m.away,
        score: m.score,
        status: m.status,
      })
    }
  } else {
    for (const f of KNOCKOUT_FIXTURES) {
      const stage = f.stage as Stage
      if (!byStage.has(stage)) continue
      byStage.get(stage)!.push({
        homeId: f.home.teamId,
        awayId: f.away.teamId,
        homeLabel: f.home.label,
        awayLabel: f.away.label,
        score: null,
        status: 'scheduled',
      })
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl">Knockout stage</h2>
      <p className="mb-4 text-sm text-slate-muted">
        {useLive ? 'Live bracket from the tournament feed.' : 'Bracket fills in once the group stage is decided.'}
      </p>
      <div className="space-y-6">
        {STAGE_ORDER.map((stage) => {
          const rows = byStage.get(stage)!
          if (rows.length === 0) return null
          return (
            <section key={stage}>
              <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-muted">
                {STAGE_LABELS[stage]}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((row, i) => (
                  <MatchCard key={i} row={row} state={state} meId={meId} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

interface Row {
  homeId: string | null
  awayId: string | null
  homeLabel: string
  awayLabel: string
  score: { home: number; away: number } | null
  status: MatchResult['status']
}

function MatchCard({
  row,
  state,
  meId,
}: {
  row: Row
  state: SweepstakeState
  meId?: string | null
}) {
  const homeWon = row.score ? row.score.home > row.score.away : false
  const awayWon = row.score ? row.score.away > row.score.home : false
  const mine = isMyTeam(state, row.homeId, meId) || isMyTeam(state, row.awayId, meId)
  return (
    <div className={`nw-card p-3 text-sm ${mine ? 'ring-2 ring-brand-bright' : ''}`}>
      <Side
        teamId={row.homeId}
        label={row.homeLabel}
        goals={row.score?.home ?? null}
        winner={homeWon}
        state={state}
        meId={meId}
      />
      <div className="my-1 border-t border-line/60" />
      <Side
        teamId={row.awayId}
        label={row.awayLabel}
        goals={row.score?.away ?? null}
        winner={awayWon}
        state={state}
        meId={meId}
      />
    </div>
  )
}

function Side({
  teamId,
  label,
  goals,
  winner,
  state,
  meId,
}: Readonly<{
  teamId: string | null
  label: string
  goals: number | null
  winner: boolean
  state: SweepstakeState
  meId?: string | null
}>) {
  const team = getTeam(teamId)
  const ownerId = teamId ? ownerOf(state, teamId) : null
  const owner = ownerId ? getParticipant(state, ownerId) : null
  return (
    <div className="flex items-center gap-2">
      <Flag iso={team?.iso ?? null} className="text-base" title={team?.name} />
      <div className="min-w-0 flex-1">
        <span className={`truncate ${winner ? 'font-black text-navy' : 'font-semibold text-slate-muted'}`}>
          {team?.name ?? label}
        </span>
        {owner && (
          <span className="ml-1.5 align-middle">
            <OwnerPill participant={owner} you={owner.id === meId} />
          </span>
        )}
      </div>
      <span className={`tabular-nums ${winner ? 'font-black text-navy' : 'text-slate-muted'}`}>
        {goals ?? '–'}
      </span>
    </div>
  )
}
