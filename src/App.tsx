import { useEffect, useRef, useState } from 'react'
import Layout from './components/Layout'
import AssignmentEditor from './components/AssignmentEditor'
import GroupsBoard from './components/GroupsBoard'
import AwardsBoard from './components/AwardsBoard'
import KnockoutBracket from './components/KnockoutBracket'
import MatchBreakdown from './components/MatchBreakdown'
import NextMatchCountdown from './components/NextMatchCountdown'
import Leaderboard from './components/Leaderboard'
import ParticipantsPanel from './components/ParticipantsPanel'
import ShareCard from './components/ShareCard'
import StatusBar from './components/StatusBar'
import ViewerSelect from './components/ViewerSelect'
import { setLocked } from './lib/sweepstake'
import { useSweepstake } from './lib/useSweepstake'
import { useViewer } from './lib/useViewer'
import { useTournamentData } from './lib/useTournamentData'
import { readTabFromPath, TABS, writeTabToPath, type Tab } from './lib/tabs'

function App() {
  const [state, setState] = useSweepstake()
  const [meId, setMeId] = useViewer()
  const [tab, setTabState] = useState<Tab>(() => readTabFromPath())
  const data = useTournamentData(state)

  // Keep the active tab in sync with browser back/forward navigation.
  useEffect(() => {
    const onPop = () => setTabState(readTabFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function setTab(next: Tab) {
    setTabState(next)
    writeTabToPath(next)
  }

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleUnlock() {
    const ok = globalThis.confirm('Unlock the draw? You will be able to edit participants and team assignments again.')
    if (ok) setState((prev) => setLocked(prev, false))
  }

  function onTabKeyDown(e: React.KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    const next = (i + dir + TABS.length) % TABS.length
    setTab(TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <Layout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <StatusBar
          loading={data.loading}
          error={data.error}
          source={data.source}
          updatedAt={data.updatedAt}
        />
        <ViewerSelect participants={state.participants} meId={meId} setMeId={setMeId} />
      </div>

      <nav className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Sweepstake views">
        {TABS.map((t, i) => {
          const selected = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={
                selected
                  ? 'nw-btn bg-navy text-white'
                  : 'nw-btn bg-white text-navy ring-1 ring-line hover:bg-mist'
              }
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'sweepstake' &&
          (state.locked ? (
            <div className="space-y-8">
              <NextMatchCountdown matches={data.matches} />
              <Leaderboard leaderboard={data.leaderboard} meId={meId} />
              <ParticipantsPanel state={state} meId={meId} />
              <ShareCard state={state} />
              <div className="flex items-center gap-3 text-sm text-slate-muted">
                <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
                  🔒 Draw locked
                </span>
                <button
                  type="button"
                  onClick={handleUnlock}
                  className="nw-btn bg-white px-3 py-1.5 text-xs text-navy ring-1 ring-line hover:bg-mist"
                >
                  Unlock to edit
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <NextMatchCountdown matches={data.matches} />
              <AssignmentEditor state={state} setState={setState} />
              <Leaderboard leaderboard={data.leaderboard} meId={meId} />
            </div>
          ))}
        {tab === 'groups' && (
          <GroupsBoard
            standings={data.standings}
            state={state}
            groupMatchesPlayed={data.groupMatchesPlayed}
            meId={meId}
          />
        )}
        {tab === 'knockouts' && <KnockoutBracket matches={data.matches} state={state} meId={meId} />}
        {tab === 'matches' && <MatchBreakdown matches={data.matches} state={state} meId={meId} />}
        {tab === 'awards' && (
          <AwardsBoard prizeStandings={data.prizeStandings} state={state} meId={meId} />
        )}
      </div>
    </Layout>
  )
}

export default App
