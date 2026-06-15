import { useEffect, useState } from 'react'
import type { LeaderboardEntry } from './prizes'

const KEY = 'wc2026:leaderboard-ranks'

function readRanks(): Record<string, number> {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

/**
 * Rank change for each participant since the page was last loaded. Positive =
 * moved up the board. The baseline is captured once on mount (from the previous
 * visit, persisted in localStorage); the latest order is saved back for next time.
 */
export function useRankMovement(leaderboard: LeaderboardEntry[]): Map<string, number> {
  // Captured once on mount (lazy init runs a single time) — the "last visit" baseline.
  const [baseline] = useState(readRanks)

  const moves = new Map<string, number>()
  leaderboard.forEach((entry, i) => {
    const prev = baseline[entry.id]
    if (prev !== undefined) moves.set(entry.id, prev - i)
  })

  useEffect(() => {
    const current: Record<string, number> = {}
    leaderboard.forEach((entry, i) => {
      current[entry.id] = i
    })
    try {
      globalThis.localStorage?.setItem(KEY, JSON.stringify(current))
    } catch {
      /* storage unavailable — movement just won't persist */
    }
  }, [leaderboard])

  return moves
}
