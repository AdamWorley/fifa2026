import { useEffect, useState } from 'react'

const PARAM = 'me'

function readMe(): string | null {
  return new URLSearchParams(window.location.search).get(PARAM)
}

/**
 * The current viewer's participant id, stored in a `?me=` query param that is
 * separate from the shared sweepstake state (`?s=`). Personal, not part of the
 * draw — so it rides along in the address bar without changing what others see.
 */
export function useViewer() {
  const [me, setMeState] = useState<string | null>(() => readMe())

  useEffect(() => {
    const onPop = () => setMeState(readMe())
    globalThis.addEventListener('popstate', onPop)
    return () => globalThis.removeEventListener('popstate', onPop)
  }, [])

  function setMe(id: string | null) {
    setMeState(id)
    const url = new URL(window.location.href)
    if (id) url.searchParams.set(PARAM, id)
    else url.searchParams.delete(PARAM)
    window.history.replaceState(null, '', url.toString())
  }

  return [me, setMe] as const
}
