import { useEffect, useState } from 'react'
import Layout from './components/Layout'
import AssignmentEditor from './components/AssignmentEditor'
import GroupsBoard from './components/GroupsBoard'
import AwardsBoard from './components/AwardsBoard'
import KnockoutBracket from './components/KnockoutBracket'
import Leaderboard from './components/Leaderboard'
import StatusBar from './components/StatusBar'
import { useSweepstake } from './lib/useSweepstake'
import { useTournamentData } from './lib/useTournamentData'
import { readTabFromPath, TABS, writeTabToPath, type Tab } from './lib/tabs'

function App() {
  const [state, setState] = useSweepstake()
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

  return (
    <Layout>
      <StatusBar
        loading={data.loading}
        error={data.error}
        source={data.source}
        updatedAt={data.updatedAt}
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? 'nw-btn bg-navy text-white'
                : 'nw-btn bg-white text-navy ring-1 ring-line hover:bg-mist'
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'sweepstake' && (
        <div className="space-y-8">
          <AssignmentEditor state={state} setState={setState} />
          <Leaderboard leaderboard={data.leaderboard} />
        </div>
      )}
      {tab === 'groups' && (
        <GroupsBoard
          standings={data.standings}
          state={state}
          groupMatchesPlayed={data.groupMatchesPlayed}
        />
      )}
      {tab === 'knockouts' && <KnockoutBracket matches={data.matches} state={state} />}
      {tab === 'awards' && <AwardsBoard prizeStandings={data.prizeStandings} state={state} />}
    </Layout>
  )
}

export default App
