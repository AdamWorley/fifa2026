/**
 * Tiny dependency-free confetti. Draws onto a full-screen canvas overlay,
 * animates a burst of falling particles, then tears the canvas down again.
 * Particles are either coloured rectangles or, when `emoji` is given, glyphs
 * (used to rain the relevant prize emoji when an award card is clicked).
 */

interface ConfettiOptions {
  /** One or more emoji to rain instead of coloured paper (e.g. '🏆' or '🟨🟥'). */
  emoji?: string
  /** How many particles to spawn. */
  count?: number
}

const COLOURS = ['#f5c542', '#112e51', '#0098db', '#7c3aed', '#ffffff', '#e11d48']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number
  colour: string
  glyph?: string
}

// requestAnimationFrame gives us the timestamp, so we never call Date.now().
export function launchConfetti(options: ConfettiOptions = {}): void {
  if (typeof document === 'undefined') return

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  const canvas = document.createElement('canvas')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = window.devicePixelRatio || 1
  const width = window.innerWidth
  const height = window.innerHeight
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  const glyphs = options.emoji ? [...splitGlyphs(options.emoji)] : null
  const count = options.count ?? (glyphs ? 70 : 140)

  const particles: Particle[] = Array.from({ length: count }, (_, i) => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.5,
    vx: (Math.random() - 0.5) * 2.4,
    vy: 2 + Math.random() * 4,
    size: glyphs ? 20 + Math.random() * 18 : 6 + Math.random() * 6,
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
    colour: COLOURS[i % COLOURS.length],
    glyph: glyphs ? glyphs[i % glyphs.length] : undefined,
  }))

  // Safety cap so a stray particle can never keep the canvas alive forever.
  const maxDurationMs = 8000
  let start: number | null = null

  function frame(now: number) {
    if (start === null) start = now
    const elapsed = now - start
    ctx!.clearRect(0, 0, width, height)

    // Gently fade everything out over the final stretch of the safety window.
    const alpha =
      elapsed > maxDurationMs * 0.85
        ? Math.max(0, 1 - (elapsed - maxDurationMs * 0.85) / (maxDurationMs * 0.15))
        : 1
    ctx!.globalAlpha = alpha

    let allLanded = true
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05 // gravity
      p.rotation += p.spin

      // Keep going until the last particle has cleared the bottom edge.
      if (p.y - p.size < height) allLanded = false

      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rotation)
      if (p.glyph) {
        ctx!.font = `${p.size}px serif`
        ctx!.textAlign = 'center'
        ctx!.textBaseline = 'middle'
        ctx!.fillText(p.glyph, 0, 0)
      } else {
        ctx!.fillStyle = p.colour
        ctx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      }
      ctx!.restore()
    }

    if (!allLanded && elapsed < maxDurationMs) {
      requestAnimationFrame(frame)
    } else {
      canvas.remove()
    }
  }

  requestAnimationFrame(frame)
}

/** Split a string into user-perceived glyphs so emoji like 🟨🟥 rain separately. */
function splitGlyphs(input: string): string[] {
  // Intl.Segmenter handles multi-codepoint emoji; fall back to spread otherwise.
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter
  if (Segmenter) {
    const seg = new Segmenter(undefined, { granularity: 'grapheme' })
    return [...seg.segment(input)].map((s) => s.segment)
  }
  return [...input]
}
