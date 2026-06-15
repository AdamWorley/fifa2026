import type { ReactNode } from 'react'

function Header() {
  return (
    <header className="border-b border-line bg-navy text-white">
      <div className="nw-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black tracking-tight text-white">netwealth</span>
          <span className="hidden h-6 w-px bg-white/25 sm:block" aria-hidden />
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-brand-bright">
            Sweepstake
          </span>
        </div>
        <p className="text-sm font-semibold text-white/80">
          FIFA World Cup 2026 · Canada · USA · Mexico
        </p>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="nw-container flex flex-col gap-1 py-8 text-sm text-slate-muted">
        <p className="font-bold text-navy">Netwealth World Cup 2026 Sweepstake</p>
        <p>
          Office sweepstake tracker · results update automatically · not affiliated with FIFA.
        </p>
        <p className="text-xs text-slate-muted/80">“Feel confident about tomorrow.”</p>
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
