import { useEffect, useState } from 'react'
import {
  EMPTY_RESULTS,
  refreshIntervalMs,
  type MatchResult,
  type ResultsPayload,
} from './results'

// When we have no data yet (first load failed, or no fixtures), retry soon rather
// than waiting out the long idle interval.
const RETRY_MS = 60_000

function matchKey(home: string, away: string): string {
  return `${home}|${away}`.toLowerCase()
}

/** Overlay any hand-corrections from public/overrides.json onto the API results. */
function applyOverrides(base: MatchResult[], overrides: MatchResult[]): MatchResult[] {
  if (overrides.length === 0) return base
  const byKey = new Map(base.map((m) => [matchKey(m.home, m.away), m]))
  for (const o of overrides) {
    byKey.set(matchKey(o.home, o.away), { ...byKey.get(matchKey(o.home, o.away)), ...o })
  }
  return [...byKey.values()]
}

async function load(): Promise<ResultsPayload> {
  const [resultsRes, overridesRes] = await Promise.allSettled([
    fetch('/api/results', { headers: { accept: 'application/json' } }),
    fetch('/overrides.json', { headers: { accept: 'application/json' } }),
  ])

  let payload: ResultsPayload = EMPTY_RESULTS
  if (resultsRes.status === 'fulfilled' && resultsRes.value.ok) {
    payload = (await resultsRes.value.json()) as ResultsPayload
  }

  let overrides: MatchResult[] = []
  if (overridesRes.status === 'fulfilled' && overridesRes.value.ok) {
    try {
      const data = (await overridesRes.value.json()) as { matches?: MatchResult[] }
      overrides = Array.isArray(data.matches) ? data.matches : []
    } catch {
      overrides = []
    }
  }

  return {
    ...payload,
    source: overrides.length > 0 ? 'overrides' : payload.source,
    matches: applyOverrides(payload.matches, overrides),
  }
}

export function useResults() {
  const [data, setData] = useState<ResultsPayload>(EMPTY_RESULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof globalThis.setTimeout>

    async function tick() {
      let matches: MatchResult[] = []
      try {
        const payload = await load()
        if (!active) return
        setData(payload)
        setError(null)
        matches = payload.matches
      } catch (err) {
        if (active) setError(String(err))
      } finally {
        if (active) setLoading(false)
      }
      if (!active) return
      // Poll briskly while a score is settling, back off to a trickle otherwise.
      const next = matches.length ? refreshIntervalMs(matches) : RETRY_MS
      timer = globalThis.setTimeout(tick, next)
    }

    tick()
    return () => {
      active = false
      globalThis.clearTimeout(timer)
    }
  }, [])

  return { data, loading, error }
}
