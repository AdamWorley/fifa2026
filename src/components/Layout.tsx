import type { ReactNode } from 'react'

function TrophyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="World Cup trophy" className={className}>
      <defs>
        <linearGradient id="trophy-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor="#f5c542" />
          <stop offset="1" stopColor="#c8941a" />
        </linearGradient>
      </defs>
      <path
        d="M21 16 C11 16 11 30 23 32"
        fill="none"
        stroke="url(#trophy-gold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M43 16 C53 16 53 30 41 32"
        fill="none"
        stroke="url(#trophy-gold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M19 12 H45 V22 C45 33 38.5 39 32 39 C25.5 39 19 33 19 22 Z" fill="url(#trophy-gold)" />
      <rect x="28.5" y="39" width="7" height="9" fill="url(#trophy-gold)" />
      <path d="M22.5 48 H41.5 L43.5 54 H20.5 Z" fill="url(#trophy-gold)" />
      <rect x="18" y="54" width="28" height="5" rx="1.5" fill="url(#trophy-gold)" />
    </svg>
  )
}

function Header() {
  return (
    <header className="border-b border-line bg-navy text-white">
      <div className="nw-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <TrophyMark className="h-10 w-10 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-black uppercase tracking-tight text-white sm:text-xl">
              FIFA World Cup <span className="text-gold">26</span>
            </span>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-brand-bright">
              Office Sweepstake
            </span>
          </div>
        </div>
        <p className="text-sm font-semibold text-white/80">Canada · USA · Mexico</p>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="nw-container flex flex-col gap-1 py-8 text-sm text-slate-muted">
        <p className="font-bold text-navy">FIFA World Cup 2026 · Office Sweepstake</p>
        <p>
          Office sweepstake tracker · results update automatically · not affiliated with FIFA.
        </p>
        <p className="text-xs text-slate-muted/80">“We are 26.” · 48 teams · 3 host nations</p>
        <p className="text-xs italic text-slate-muted/80">
          🎶 Tsamina mina, eh eh — waka waka, eh eh. This time for 2026.
        </p>
      </div>
    </footer>
  )
}

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="nw-container py-8">{children}</div>
      </main>
      <Footer />
    </div>
  )
}
