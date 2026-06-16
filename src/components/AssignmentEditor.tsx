import { useState, type ReactNode } from 'react'
import { GROUPS, getTeam } from '../data/tournament'
import type { SweepstakeState } from '../lib/urlState'
import {
  addParticipant,
  clearAssignments,
  ownerOf,
  randomDraw,
  removeParticipant,
  renameParticipant,
  setAssignment,
  setLocked,
} from '../lib/sweepstake'
import { participantColor } from '../lib/colors'
import Flag from './Flag'
import ShareCard from './ShareCard'

interface Props {
  state: SweepstakeState
  setState: (updater: (prev: SweepstakeState) => SweepstakeState) => void
}

const ALL_TEAM_IDS = GROUPS.flatMap((g) => g.teamIds)
const TOTAL_TEAMS = ALL_TEAM_IDS.length

export default function AssignmentEditor({ state, setState }: Readonly<Props>) {
  const [newName, setNewName] = useState('')

  const assignedCount = Object.keys(state.assignments).length
  const allAssigned = assignedCount >= TOTAL_TEAMS

  // Collapse the editing sections when arriving at a fully-assigned draw
  // (e.g. opening a shared link) so the focus is on the results.
  const [participantsOpen, setParticipantsOpen] = useState(!allAssigned)
  const [assignOpen, setAssignOpen] = useState(!allAssigned)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setState((prev) => addParticipant(prev, name))
    setNewName('')
  }

  function handleReset() {
    if (assignedCount === 0) return
    const ok = globalThis.confirm('Clear all team assignments? Participants are kept.')
    if (ok) setState((prev) => clearAssignments(prev))
  }

  function handleRandomDraw() {
    if (state.participants.length === 0) return
    if (
      assignedCount > 0 &&
      !globalThis.confirm('Randomly redraw every team? This replaces the current assignments.')
    )
      return
    setState((prev) => randomDraw(prev, ALL_TEAM_IDS))
  }

  const canDraw = state.participants.length > 0

  function handleLock() {
    const message = allAssigned
      ? 'Lock the draw? Participants and team assignments can no longer be edited (you can unlock later).'
      : `Only ${assignedCount}/${TOTAL_TEAMS} teams are assigned. Lock the draw anyway? ` +
        'Participants and team assignments can no longer be edited (you can unlock later).'
    if (globalThis.confirm(message)) setState((prev) => setLocked(prev, true))
  }

  const canLock = state.participants.length > 0 && assignedCount > 0

  return (
    <div className="space-y-6">
      <CollapsibleCard
        title="Participants"
        subtitle={`${state.participants.length} people · ${assignedCount}/${TOTAL_TEAMS} teams assigned`}
        open={participantsOpen}
        onToggle={() => setParticipantsOpen((o) => !o)}
      >
        <div className="flex flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a colleague's name…"
            className="flex-1 min-w-[12rem] rounded-full border border-line px-4 py-2.5 text-sm focus:border-brand-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
          />
          <button type="button" className="nw-btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>

        {state.participants.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {state.participants.map((participant, i) => (
              <li
                key={participant.id}
                className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 ring-1 ring-line"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{
                    background: participantColor(participant.id),
                    textShadow: '0 1px 1px rgba(0,0,0,0.35)',
                  }}
                >
                  {i + 1}
                </span>
                <input
                  value={participant.name}
                  onChange={(e) =>
                    setState((prev) => renameParticipant(prev, participant.id, e.target.value))
                  }
                  className="min-w-0 flex-1 rounded bg-transparent text-sm font-semibold text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                />
                <button
                  type="button"
                  onClick={() => setState((prev) => removeParticipant(prev, participant.id))}
                  className="rounded-full px-1 text-slate-muted hover:text-brand-violet focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                  aria-label={`Remove ${participant.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      <CollapsibleCard
        title="Assign teams"
        subtitle={`${assignedCount}/${TOTAL_TEAMS} assigned`}
        open={assignOpen}
        onToggle={() => setAssignOpen((o) => !o)}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-muted">Pick an owner for each country, or draw at random.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRandomDraw}
              disabled={!canDraw}
              aria-disabled={!canDraw}
              title={canDraw ? undefined : 'Add a participant first'}
              className="nw-btn bg-white px-3 py-1.5 text-xs text-navy ring-1 ring-line hover:bg-mist disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🎲 Random draw
            </button>
            {assignedCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="nw-btn bg-white px-3 py-1.5 text-xs text-navy ring-1 ring-line hover:bg-mist"
              >
                ↺ Reset draw
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.name}>
              <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-slate-muted">
                {group.name}
              </h3>
              <ul className="space-y-1.5">
                {group.teamIds.map((teamId) => {
                  const team = getTeam(teamId)!
                  const owner = ownerOf(state, teamId)
                  return (
                    <li key={teamId} className="flex items-center gap-2">
                      <Flag iso={team.iso} className="text-lg" title={team.name} />
                      <span className="flex-1 truncate text-sm font-semibold">{team.name}</span>
                      <select
                        aria-label={`Owner of ${team.name}`}
                        value={owner ?? ''}
                        onChange={(e) =>
                          setState((prev) =>
                            setAssignment(prev, teamId, e.target.value === '' ? null : e.target.value),
                          )
                        }
                        className="max-w-[8.5rem] rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold focus:border-brand-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
                      >
                        <option value="">— unassigned —</option>
                        {state.participants.map((p, i) => (
                          <option key={p.id} value={p.id}>
                            {p.name || `Player ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
          <button
            type="button"
            className="nw-btn-primary"
            onClick={handleLock}
            disabled={!canLock}
            aria-disabled={!canLock}
          >
            🔒 Lock the draw
          </button>
          <p className="flex-1 text-xs text-slate-muted">
            {canLock
              ? 'Freezes participants and assignments. The editor is hidden and the roster moves below the leaderboard (you can unlock later).'
              : 'Add at least one participant and assign a team before locking.'}
          </p>
        </div>
      </CollapsibleCard>

      <ShareCard state={state} />
    </div>
  )
}

interface CollapsibleProps {
  title: string
  subtitle: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}

function CollapsibleCard({ title, subtitle, open, onToggle, children }: Readonly<CollapsibleProps>) {
  return (
    <section className="nw-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left"
      >
        <h2 className="text-xl">{title}</h2>
        <span className="flex items-center gap-3 text-sm font-semibold text-slate-muted">
          {subtitle}
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </section>
  )
}
