import { useEffect, useState } from 'react'

const KEY = 'fifa2026:me'

function readStored(): string | null {
  try {
    return globalThis.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/**
 * The current viewer's participant id, stored in localStorage so it stays on
 * this device only. It is personal — not part of the draw and never encoded
 * into a shared link — so picking "who you are" can't reveal you to others.
 */
export function useViewer() {
  const [me, setMeState] = useState<string | null>(() => readStored())

  // Keep multiple tabs in sync when the choice changes elsewhere.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setMeState(e.newValue)
    }
    globalThis.addEventListener('storage', onStorage)
    return () => globalThis.removeEventListener('storage', onStorage)
  }, [])

  function setMe(id: string | null) {
    setMeState(id)
    try {
      if (id) globalThis.localStorage.setItem(KEY, id)
      else globalThis.localStorage.removeItem(KEY)
    } catch {
      /* ignore — storage may be unavailable */
    }
  }

  return [me, setMe] as const
}
