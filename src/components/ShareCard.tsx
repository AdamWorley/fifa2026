import { useState } from 'react'
import { buildShareUrl, type SweepstakeState } from '../lib/urlState'

interface Props {
  state: SweepstakeState
}

/** Read-only share box — the whole sweepstake is encoded in the link. */
export default function ShareCard({ state }: Readonly<Props>) {
  const [copied, setCopied] = useState(false)
  const shareUrl = buildShareUrl(state)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      globalThis.setTimeout(() => setCopied(false), 2000)
    } catch {
      globalThis.prompt('Copy this shareable link:', shareUrl)
    }
  }

  return (
    <section className="nw-card space-y-3 p-6">
      <div>
        <h2 className="text-xl">Share the sweepstake</h2>
        <p className="mt-1 text-sm text-slate-muted">
          Everything is stored in the link — copy it to share the draw with everyone.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          readOnly
          value={shareUrl}
          aria-label="Shareable sweepstake link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-full border border-line bg-mist px-4 py-2.5 text-sm text-slate-muted focus:border-brand-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan"
        />
        <button type="button" className="nw-btn-primary shrink-0" onClick={handleCopy}>
          {copied ? '✓ Copied!' : '🔗 Copy link'}
        </button>
      </div>
    </section>
  )
}
