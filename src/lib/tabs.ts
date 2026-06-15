export type Tab = 'sweepstake' | 'groups' | 'knockouts' | 'awards'

export const TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'sweepstake', label: 'Sweepstake', path: '/' },
  { id: 'groups', label: 'Groups', path: '/groups' },
  { id: 'knockouts', label: 'Knockouts', path: '/knockouts' },
  { id: 'awards', label: 'Awards & prizes', path: '/awards' },
]

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

export function tabForPath(pathname: string): Tab {
  const norm = normalizePath(pathname)
  return TABS.find((t) => t.path === norm)?.id ?? 'sweepstake'
}

export function pathForTab(tab: Tab): string {
  return TABS.find((t) => t.id === tab)?.path ?? '/'
}

export function readTabFromPath(): Tab {
  return tabForPath(window.location.pathname)
}

/** Navigate to a tab's path, preserving the query string (the sweepstake state). */
export function writeTabToPath(tab: Tab): void {
  const url = pathForTab(tab) + window.location.search + window.location.hash
  window.history.pushState(null, '', url)
}
