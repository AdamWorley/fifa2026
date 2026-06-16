import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { preloadFlags } from './lib/flagUrls'

// Warm the browser cache with every flag up front so they never pop in late.
preloadFlags()
import App from './App.tsx'

// 🥚 A little something for whoever opens the dev console (you shouldn't be here).
console.log(
  '%c⚽ FIFA World Cup 2026 Sweepstake %c\nYou really shouldn’t be seeing this... but it’s coming home. ' +
    'Click the host flags for kazoo anthems, tap the prize cards for confetti, and hit "Celebrate" in the footer. 🎉',
  'font-weight:bold;font-size:14px;color:#f5c542;background:#112e51;padding:4px 8px;border-radius:4px',
  'color:#0098db',
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
