import type { ReactNode } from 'react'
import Flag from './Flag'
import { launchConfetti, launchChaos } from '../lib/confetti'
import { useKonamiCode } from '../lib/useKonamiCode'

// 🥚 Easter egg: each host flag links to a gloriously bad kazoo cover
// (well, a search for one) of that nation's anthem. Worth a click.
const HOST_NATIONS = [
  {
    iso: 'CA',
    name: 'Canada',
    anthem: 'https://www.youtube.com/watch?v=-ee1pCYg9IE',
  },
  {
    iso: 'US',
    name: 'USA',
    anthem: 'https://www.youtube.com/watch?v=BNO11qIh8X8',
  },
  {
    iso: 'MX',
    name: 'Mexico',
    anthem: 'https://www.youtube.com/shorts/vpsvcqdSmR8',
  },
]

/** Faint football silhouette used as a decorative accent. */
function FootballGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="presentation" aria-hidden className={className}>
      <circle cx="32" cy="32" r="29" fill="currentColor" opacity="0.18" />
      <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="32,18 43,26 39,39 25,39 21,26" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="32" y1="18" x2="32" y2="5" />
        <line x1="43" y1="26" x2="55" y2="22" />
        <line x1="39" y1="39" x2="47" y2="50" />
        <line x1="25" y1="39" x2="17" y2="50" />
        <line x1="21" y1="26" x2="9" y2="22" />
      </g>
    </svg>
  )
}

/** Faint football boot silhouette used as a decorative accent. */
function BootGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 40" role="presentation" aria-hidden className={className}>
      <path
        d="M4 8 C4 6 6 6 8 6 L20 6 C24 6 26 9 28 12 L46 22 C56 25 60 27 60 31 L60 32 C60 33 59 34 57 34 L8 34 C6 34 4 33 4 31 Z"
        fill="currentColor"
      />
      <g fill="currentColor">
        <circle cx="16" cy="38" r="2.2" />
        <circle cx="28" cy="38" r="2.2" />
        <circle cx="40" cy="38" r="2.2" />
        <circle cx="52" cy="38" r="2.2" />
      </g>
    </svg>
  )
}

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
    <header className="relative overflow-hidden border-b-2 border-gold bg-navy text-white">
      <div className="net-texture pointer-events-none absolute inset-0" aria-hidden />
      <FootballGlyph className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 text-white/5" />
      <div className="nw-container relative flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="flex items-center gap-2.5 text-sm font-semibold text-white/80">
          {HOST_NATIONS.map((host, i) => (
            <div key={host.iso} className="flex items-center gap-2.5">
              {i > 0 && <span className="text-white/30" aria-hidden>·</span>}
              <a
                href={host.anthem}
                target="_blank"
                rel="noopener noreferrer"
                title={`Play the ${host.name} anthem (sort of)`}
                className="flex items-center gap-1.5 rounded transition hover:scale-110 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <Flag iso={host.iso} title={host.name} className="text-base" />
                {host.name}
              </a>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="pitch-grass relative mt-16 overflow-hidden border-t-4 border-white/80 text-white">
      <div className="net-texture pointer-events-none absolute inset-0" aria-hidden />
      <FootballGlyph className="pointer-events-none absolute -bottom-6 right-6 h-28 w-28 text-white/10" />
      <BootGlyph className="pointer-events-none absolute bottom-4 left-4 h-12 w-20 text-white/10 sm:left-10" />
      <div className="nw-container relative flex flex-col gap-1 py-8 text-sm text-white/90">
        <p className="font-black tracking-tight">FIFA World Cup 2026 · Office Sweepstake</p>
        <p className="text-white/80">
          Office sweepstake tracker · results update automatically · not affiliated with FIFA.
        </p>
        <p className="text-xs text-white/70">“We are 26.” · 48 teams · 3 host nations</p>
        <p className="text-xs italic text-white/70">
          🎶 Tsamina mina, eh eh — waka waka, eh eh. This time for 2026.
        </p>
        <button
          type="button"
          onClick={() => launchConfetti()}
          className="mt-3 w-fit rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-wide text-white transition hover:scale-105 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          🎉 Celebrate
        </button>
      </div>
    </footer>
  )
}

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  // 🥚 Konami code (↑↑↓↓←→←→ B A) unleashes confetti chaos and shakes the screen.
  useKonamiCode(launchChaos)

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
