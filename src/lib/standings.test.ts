import { describe, expect, it } from 'vitest'
import type { MatchResult } from './results'
import {
  computeAwards,
  computeEliminatedTeams,
  computeGroupStandings,
  computeTeamStats,
  computeTournamentResult,
} from './standings'

function group(
  home: string,
  away: string,
  hg: number,
  ag: number,
  cards?: Partial<{ hy: number; hr: number; ay: number; ar: number }>,
): MatchResult {
  return {
    id: `${home}-${away}`,
    stage: 'Group Stage - 1',
    isGroupStage: true,
    date: '2026-06-12',
    home,
    away,
    status: 'finished',
    score: { home: hg, away: ag },
    cards: {
      home: { yellow: cards?.hy ?? 0, red: cards?.hr ?? 0 },
      away: { yellow: cards?.ay ?? 0, red: cards?.ar ?? 0 },
    },
  }
}

// Group C teams: Brazil, Morocco, Haiti, Scotland
const matches: MatchResult[] = [
  group('Brazil', 'Scotland', 3, 0, { hy: 1, ay: 2, ar: 1 }),
  group('Morocco', 'Haiti', 1, 1),
  group('Brazil', 'Morocco', 2, 1),
]

describe('team stats', () => {
  it('aggregates points, goals and goal difference', () => {
    const stats = computeTeamStats(matches)
    const brazil = stats.get('brazil')!
    expect(brazil.played).toBe(2)
    expect(brazil.points).toBe(6)
    expect(brazil.goalsFor).toBe(5)
    expect(brazil.goalsAgainst).toBe(1)
    expect(brazil.goalDiff).toBe(4)

    const scotland = stats.get('scotland')!
    expect(scotland.goalDiff).toBe(-3)
    expect(scotland.cards).toBe(3) // 2 yellow + 1 red
  })

  it('ignores scheduled matches and unknown teams', () => {
    const stats = computeTeamStats([
      { ...group('Brazil', 'Scotland', 0, 0), status: 'scheduled', score: null },
      group('Atlantis', 'Wakanda', 5, 0),
    ])
    expect(stats.size).toBe(0)
  })
})

describe('group standings', () => {
  it('orders Group C by points then goal difference', () => {
    const standings = computeGroupStandings(computeTeamStats(matches))
    const groupC = standings.find((g) => g.name === 'Group C')!
    expect(groupC.rows[0].teamId).toBe('brazil')
    expect(groupC.rows.at(-1)!.teamId).toBe('scotland')
    expect(groupC.rows).toHaveLength(4)
  })
})

describe('awards', () => {
  const awards = computeAwards(computeTeamStats(matches), matches)

  it('Golden Boot goes to the top scorer', () => {
    expect(awards.goldenBoot).toEqual({ teamId: 'brazil', value: 5 })
  })
  it('Wooden Spoon goes to the worst goal difference', () => {
    expect(awards.woodenSpoon).toEqual({ teamId: 'scotland', value: -3 })
  })
  it("Referee's Favourite goes to the most-carded team", () => {
    expect(awards.refereesFavourite).toEqual({ teamId: 'scotland', value: 3 })
  })
  it('is not final until all 72 group matches are played', () => {
    expect(awards.groupStageComplete).toBe(false)
  })
})

describe('eliminated teams', () => {
  const stats = computeTeamStats(matches)
  const knockout = (home: string, away: string, hg: number, ag: number): MatchResult => ({
    ...group(home, away, hg, ag),
    stage: 'Round of 16',
    isGroupStage: false,
  })

  it('knocks out the loser of a finished knockout match', () => {
    const out = computeEliminatedTeams([...matches, knockout('Brazil', 'Morocco', 2, 0)], stats, false)
    expect(out.has('morocco')).toBe(true)
    expect(out.has('brazil')).toBe(false)
  })

  it('does not eliminate anyone on group results alone', () => {
    expect(computeEliminatedTeams(matches, stats, false).size).toBe(0)
  })

  it('ignores unpopulated placeholder fixtures', () => {
    const placeholder: MatchResult = {
      ...knockout('Brazil', 'Morocco', 0, 0),
      status: 'scheduled',
      score: null,
    }
    expect(computeEliminatedTeams([...matches, placeholder], stats, false).size).toBe(0)
  })

  it('eliminates group non-qualifiers once the group stage is complete', () => {
    // Knockout line-up names Brazil & Morocco; Scotland & Haiti played but missed out.
    const out = computeEliminatedTeams([...matches, knockout('Brazil', 'Morocco', 2, 0)], stats, true)
    expect(out.has('scotland')).toBe(true)
    expect(out.has('haiti')).toBe(true)
    expect(out.has('morocco')).toBe(true) // lost the knockout
    expect(out.has('brazil')).toBe(false) // still alive
  })
})

describe('tournament result', () => {
  const final: MatchResult = {
    ...group('Argentina', 'France', 3, 1),
    stage: 'Final',
    isGroupStage: false,
  }
  it('reads champion and runner-up from the final', () => {
    expect(computeTournamentResult([...matches, final])).toEqual({
      champion: 'argentina',
      runnerUp: 'france',
    })
  })
  it('returns nulls when the final has not been played', () => {
    expect(computeTournamentResult(matches)).toEqual({ champion: null, runnerUp: null })
  })
})
