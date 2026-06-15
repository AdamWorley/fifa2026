import { useState, type ReactNode } from 'react'
import { GROUPS, getTeam } from '../data/tournament'
import { buildShareUrl, type SweepstakeState } from '../lib/urlState'
import {
  addParticipant,
  ownerOf,
  removeParticipant,
  renameParticipant,
  setAssignment,
} from '../lib/sweepstake'
import { participantColor } from '../lib/colors'
import Flag from './Flag'

interface Props {
  state: SweepstakeState
  setState: (updater: (prev: SweepstakeState) => SweepstakeState) => void
}

const TOTAL_TEAMS = GROUPS.reduce((sum, g) => sum + g.teamIds.length, 0)

export default function AssignmentEditor({ state, setState }: Readonly<Props>) {
  const [newName, setNewName] = useState('')
  const [copied, setCopied] = useState(false)

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildShareUrl(state))
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 2000)
    } catch {
      globalThis.prompt('Copy this shareable link:', buildShareUrl(state))
    }
  }

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
            className="flex-1 min-w-[12rem] rounded-full border border-line px-4 py-2.5 text-sm focus:border-brand-cyan focus:outline-none"
          />
          <button type="button" className="nw-btn-primary" onClick={handleAdd}>
            Add
          </button>
        </div>

        {state.participants.length > 0 && (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {state.participants.map((name, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 ring-1 ring-line"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: participantColor(i) }}
                >
                  {i + 1}
                </span>
                <input
                  value={name}
                  onChange={(e) => setState((prev) => renameParticipant(prev, i, e.target.value))}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-navy focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setState((prev) => removeParticipant(prev, i))}
                  className="text-slate-muted hover:text-brand-violet"
                  aria-label={`Remove ${name}`}
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
        <p className="mb-4 text-sm text-slate-muted">Pick an owner for each country.</p>
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
                        value={owner ?? ''}
                        onChange={(e) =>
                          setState((prev) =>
                            setAssignment(
                              prev,
                              teamId,
                              e.target.value === '' ? null : Number(e.target.value),
                            ),
                          )
                        }
                        className="max-w-[8.5rem] rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold focus:border-brand-cyan focus:outline-none"
                      >
                        <option value="">— unassigned —</option>
                        {state.participants.map((p, i) => (
                          <option key={i} value={i}>
                            {p || `Player ${i + 1}`}
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
      </CollapsibleCard>

      {/* Share */}
      <section className="nw-card flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl">Share the sweepstake</h2>
          <p className="mt-1 text-sm text-slate-muted">
            Everything is stored in the link — copy it to share the draw with everyone.
          </p>
        </div>
        <button type="button" className="nw-btn-primary" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '🔗 Copy shareable link'}
        </button>
      </section>
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
