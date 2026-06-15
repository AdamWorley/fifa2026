import type { ResultsPayload } from '../lib/results'

interface Props {
  loading: boolean
  error: string | null
  source: ResultsPayload['source']
  updatedAt: string
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StatusBar({ loading, error, source, updatedAt }: Readonly<Props>) {
  const time = formatTime(updatedAt)
  const liveData = source === 'api' || source === 'overrides'

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="inline-flex items-center gap-1.5 font-bold">
        <span
          className={`h-2 w-2 rounded-full ${
            error ? 'bg-brand-violet' : liveData ? 'bg-emerald-500' : 'bg-slate-400'
          } ${loading ? 'animate-pulse' : ''}`}
          aria-hidden
        />
        {error
          ? 'Results feed unavailable'
          : loading
            ? 'Loading results…'
            : liveData
              ? 'Results'
              : 'Awaiting results feed'}
      </span>
      {time && !error && (
        <span className="text-slate-muted">Updated {time}</span>
      )}
      {!liveData && !loading && !error && (
        <span className="text-slate-muted">(fixtures shown; results feed not yet available)</span>
      )}
    </div>
  )
}
