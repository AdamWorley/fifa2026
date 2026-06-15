import { useEffect, useState } from 'react'
import { EMPTY_RESULTS, type MatchResult, type ResultsPayload } from './results'

const POLL_MS = 60_000

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

    async function tick() {
      try {
        const payload = await load()
        if (!active) return
        setData(payload)
        setError(null)
      } catch (err) {
        if (active) setError(String(err))
      } finally {
        if (active) setLoading(false)
      }
    }

    tick()
    const id = globalThis.setInterval(tick, POLL_MS)
    return () => {
      active = false
      globalThis.clearInterval(id)
    }
  }, [])

  return { data, loading, error }
}
