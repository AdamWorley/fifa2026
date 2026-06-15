import groupsSource from './worldcup.groups.source.json'
import scheduleSource from './worldcup.source.json'
import { flagForName, isoForName } from './teams'

export type TeamId = string

export interface Team {
  id: TeamId
  name: string
  iso: string | null
  flag: string
  group: string
}

export type Stage =
  | 'group'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarter-final'
  | 'semi-final'
  | 'third-place'
  | 'final'

/** One side of a fixture. `teamId` is set for known group-stage teams; for
 *  knockout slots it is null and `label` holds the placeholder (e.g. "2A", "W74"). */
export interface Side {
  teamId: TeamId | null
  label: string
}

export interface Fixture {
  id: string
  num: number | null
  stage: Stage
  group: string | null
  date: string
  time: string
  venue: string
  home: Side
  away: Side
}

export interface Group {
  name: string
  teamIds: TeamId[]
}

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ---- Build teams from the authoritative groups file ----

interface SourceGroup {
  name: string
  teams: string[]
}
interface SourceMatch {
  round: string
  num?: number
  date: string
  time?: string
  team1: string
  team2: string
  group?: string
  ground?: string
}

const sourceGroups = (groupsSource as { groups: SourceGroup[] }).groups
const sourceMatches = (scheduleSource as { matches: SourceMatch[] }).matches

function makeTeam(name: string, group: string): Team {
  return {
    id: slugify(name),
    name,
    iso: isoForName(name),
    flag: flagForName(name),
    group,
  }
}

export const TEAMS: Team[] = sourceGroups.flatMap((g) =>
  g.teams.map((name) => makeTeam(name, g.name)),
)

const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))
const TEAM_ID_BY_NAME = new Map(TEAMS.map((t) => [t.name, t.id]))

export const GROUPS: Group[] = sourceGroups.map((g) => ({
  name: g.name,
  teamIds: g.teams.map((n) => slugify(n)),
}))

export function getTeam(id: TeamId | null | undefined): Team | undefined {
  return id ? TEAM_BY_ID.get(id) : undefined
}

// ---- Build fixtures ----

function stageFromRound(round: string): Stage {
  if (round.startsWith('Matchday')) return 'group'
  switch (round) {
    case 'Round of 32':
      return 'round-of-32'
    case 'Round of 16':
      return 'round-of-16'
    case 'Quarter-final':
      return 'quarter-final'
    case 'Semi-final':
      return 'semi-final'
    case 'Match for third place':
      return 'third-place'
    case 'Final':
      return 'final'
    default:
      return 'group'
  }
}

function sideFor(name: string): Side {
  const teamId = TEAM_ID_BY_NAME.get(name) ?? null
  return { teamId, label: name }
}

let groupSeq = 0
export const FIXTURES: Fixture[] = sourceMatches.map((m) => {
  const stage = stageFromRound(m.round)
  const id = stage === 'group' ? `g-${groupSeq++}` : `m${m.num}`
  return {
    id,
    num: m.num ?? null,
    stage,
    group: m.group ?? null,
    date: m.date,
    time: m.time ?? '',
    venue: m.ground ?? '',
    home: sideFor(m.team1),
    away: sideFor(m.team2),
  }
})

export const GROUP_FIXTURES = FIXTURES.filter((f) => f.stage === 'group')
export const KNOCKOUT_FIXTURES = FIXTURES.filter((f) => f.stage !== 'group')

export const STAGE_LABELS: Record<Stage, string> = {
  group: 'Group stage',
  'round-of-32': 'Round of 32',
  'round-of-16': 'Round of 16',
  'quarter-final': 'Quarter-finals',
  'semi-final': 'Semi-finals',
  'third-place': 'Third-place play-off',
  final: 'Final',
}
