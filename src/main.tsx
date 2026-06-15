import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { preloadFlags } from './lib/flagUrls'

// Warm the browser cache with every flag up front so they never pop in late.
preloadFlags()
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
