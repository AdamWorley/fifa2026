import { GROUPS, type TeamId } from '../data/tournament'
import type { MatchResult } from './results'
import { resolveTeamId } from './aliases'

/** Total group-stage group fixtures that must finish before awards are final. */
const TOTAL_GROUP_MATCHES = 72

// Each booked player counts once towards "most cards": a yellow and a red weigh
// the same, and a second-yellow dismissal arrives as a single red (the prior
// yellow is not counted separately), so a player can add at most one card.
const RED_CARD_WEIGHT = 1

export interface TeamStats {
  teamId: TeamId
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  yellow: number
  red: number
  /** Weighted card count used for the Referee's Favourite award. */
  cards: number
}

function emptyStats(teamId: TeamId): TeamStats {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    yellow: 0,
    red: 0,
    cards: 0,
  }
}

/** Aggregate group-stage stats per team from finished/live results. */
export function computeTeamStats(matches: MatchResult[]): Map<TeamId, TeamStats> {
  const stats = new Map<TeamId, TeamStats>()
  const get = (id: TeamId) => {
    if (!stats.has(id)) stats.set(id, emptyStats(id))
    return stats.get(id)!
  }

  for (const m of matches) {
    if (!m.isGroupStage || !m.score || m.status === 'scheduled') continue
    const homeId = resolveTeamId(m.home)
    const awayId = resolveTeamId(m.away)
    if (!homeId || !awayId) continue

    const home = get(homeId)
    const away = get(awayId)
    const hg = m.score.home
    const ag = m.score.away

    home.played++
    away.played++
    home.goalsFor += hg
    home.goalsAgainst += ag
    away.goalsFor += ag
    away.goalsAgainst += hg

    if (hg > ag) {
      home.won++
      away.lost++
      home.points += 3
    } else if (hg < ag) {
      away.won++
      home.lost++
      away.points += 3
    } else {
      home.drawn++
      away.drawn++
      home.points++
      away.points++
    }

    home.yellow += m.cards.home.yellow
    home.red += m.cards.home.red
    away.yellow += m.cards.away.yellow
    away.red += m.cards.away.red
  }

  for (const s of stats.values()) {
    s.goalDiff = s.goalsFor - s.goalsAgainst
    s.cards = s.yellow + s.red * RED_CARD_WEIGHT
  }
  return stats
}

export interface GroupStanding {
  name: string
  rows: TeamStats[]
}

/** Sort a group by points, then goal difference, then goals scored. */
function compareRows(a: TeamStats, b: TeamStats): number {
  return b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor
}

export function computeGroupStandings(stats: Map<TeamId, TeamStats>): GroupStanding[] {
  return GROUPS.map((group) => ({
    name: group.name,
    rows: group.teamIds.map((id) => stats.get(id) ?? emptyStats(id)).sort(compareRows),
  }))
}

export interface AwardWinner {
  teamId: TeamId
  value: number
}

export interface Awards {
  goldenBoot: AwardWinner | null
  woodenSpoon: AwardWinner | null
  refereesFavourite: AwardWinner | null
  /** True once all 72 group fixtures have finished (awards are then final). */
  groupStageComplete: boolean
}

export function countFinishedGroupMatches(matches: MatchResult[]): number {
  return matches.filter((m) => m.isGroupStage && m.status === 'finished').length
}

export function computeAwards(
  stats: Map<TeamId, TeamStats>,
  matches: MatchResult[],
): Awards {
  const rows = [...stats.values()].filter((s) => s.played > 0)

  const pick = (
    cmp: (a: TeamStats, b: TeamStats) => number,
    value: (s: TeamStats) => number,
  ): AwardWinner | null => {
    if (rows.length === 0) return null
    const best = rows.reduce((acc, s) => (cmp(s, acc) > 0 ? s : acc))
    return { teamId: best.teamId, value: value(best) }
  }

  return {
    goldenBoot: pick((a, b) => a.goalsFor - b.goalsFor, (s) => s.goalsFor),
    woodenSpoon: pick((a, b) => b.goalDiff - a.goalDiff, (s) => s.goalDiff),
    refereesFavourite: pick((a, b) => a.cards - b.cards, (s) => s.cards),
    groupStageComplete: countFinishedGroupMatches(matches) >= TOTAL_GROUP_MATCHES,
  }
}

/**
 * Teams knocked out of the tournament. A team is out if it lost a knockout
 * match, or — once the group stage is complete and the knockout line-up is
 * known — if it played the group stage but didn't reach the knockouts. Group
 * results alone never eliminate a team (the maths is left to the bracket).
 */
export function computeEliminatedTeams(
  matches: MatchResult[],
  teamStats: Map<TeamId, TeamStats>,
  groupStageComplete: boolean,
): Set<TeamId> {
  const eliminated = new Set<TeamId>()
  const qualified = new Set<TeamId>()

  for (const m of matches) {
    if (m.isGroupStage) continue
    // Skip empty placeholder fixtures that the feed hasn't populated yet.
    if (!m.score && m.status === 'scheduled') continue
    const homeId = resolveTeamId(m.home)
    const awayId = resolveTeamId(m.away)
    if (homeId) qualified.add(homeId)
    if (awayId) qualified.add(awayId)
    if (m.status === 'finished' && m.score && homeId && awayId) {
      if (m.score.home > m.score.away) eliminated.add(awayId)
      else if (m.score.away > m.score.home) eliminated.add(homeId)
      // A level score (penalty shoot-out) can't be resolved from goals alone.
    }
  }

  if (groupStageComplete && qualified.size > 0) {
    for (const s of teamStats.values()) {
      if (s.played > 0 && !qualified.has(s.teamId)) eliminated.add(s.teamId)
    }
  }

  return eliminated
}

export interface TournamentResult {
  champion: TeamId | null
  runnerUp: TeamId | null
}

/** Determine the champion and runner-up from the final, if it has been played. */
export function computeTournamentResult(matches: MatchResult[]): TournamentResult {
  const final = matches.find(
    (m) => /final/i.test(m.stage) && !/semi/i.test(m.stage) && !/quarter/i.test(m.stage),
  )
  if (!final || final.status !== 'finished' || !final.score) {
    return { champion: null, runnerUp: null }
  }
  const homeId = resolveTeamId(final.home)
  const awayId = resolveTeamId(final.away)
  if (!homeId || !awayId) return { champion: null, runnerUp: null }
  if (final.score.home === final.score.away) {
    // Score level (penalty shoot-out) — winner not derivable from goals alone.
    return { champion: null, runnerUp: null }
  }
  const homeWon = final.score.home > final.score.away
  return {
    champion: homeWon ? homeId : awayId,
    runnerUp: homeWon ? awayId : homeId,
  }
}
