import { getTeam } from '../data/tournament'
import { getParticipant, isMyTeam, ownerOf } from '../lib/sweepstake'
import type { SweepstakeState } from '../lib/urlState'
import type { GroupStanding } from '../lib/standings'
import OwnerPill from './OwnerPill'
import Flag from './Flag'

interface Props {
  standings: GroupStanding[]
  state: SweepstakeState
  groupMatchesPlayed: number
  meId?: string | null
}

export default function GroupsBoard({
  standings,
  state,
  groupMatchesPlayed,
  meId,
}: Readonly<Props>) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl">Group standings</h2>
        <span className="text-sm font-semibold text-slate-muted">
          {groupMatchesPlayed}/72 group matches played
        </span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {standings.map((group) => (
          <GroupTable key={group.name} group={group} state={state} meId={meId} />
        ))}
      </div>
    </div>
  )
}

function GroupTable({
  group,
  state,
  meId,
}: Readonly<{ group: GroupStanding; state: SweepstakeState; meId?: string | null }>) {
  const mineInGroup = group.rows.some((row) => isMyTeam(state, row.teamId, meId))
  return (
    <div className={`nw-card overflow-hidden ${mineInGroup ? 'ring-2 ring-brand-bright' : ''}`}>
      <div className="bg-navy px-4 py-2.5 text-sm font-black uppercase tracking-wide text-white">
        {group.name}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-bold uppercase text-slate-muted">
            <th className="py-2 pl-3 text-left">Team</th>
            <th className="px-1 text-center" title="Played">
              P
            </th>
            <th className="px-1 text-center" title="Goal difference">
              GD
            </th>
            <th className="px-1 pr-3 text-center" title="Points">
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row, i) => {
            const team = getTeam(row.teamId)!
            const ownerId = ownerOf(state, row.teamId)
            const owner = ownerId ? getParticipant(state, ownerId) : null
            const advancing = i < 2
            const mine = isMyTeam(state, row.teamId, meId)
            const rowBg = mine ? 'bg-brand-bright/10' : advancing ? 'bg-brand-cyan/5' : ''
            return (
              <tr
                key={row.teamId}
                className={`border-b border-line/60 last:border-0 ${rowBg}`}
              >
                <td className="py-2 pl-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 text-center text-xs font-bold ${advancing ? 'text-brand-cyan' : 'text-slate-muted'}`}
                    >
                      {i + 1}
                    </span>
                    <Flag iso={team.iso} className="text-base" title={team.name} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-navy">{team.name}</div>
                      {owner && (
                        <div className="mt-0.5">
                          <OwnerPill participant={owner} you={owner.id === meId} />
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-1 text-center tabular-nums">{row.played}</td>
                <td className="px-1 text-center tabular-nums">
                  {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                </td>
                <td className="px-1 pr-3 text-center font-black tabular-nums text-navy">
                  {row.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
