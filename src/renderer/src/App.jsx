import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Profile from './pages/Profile'
import Champions from './pages/Champions'
import Challenges from './pages/Challenges'
import Matches from './pages/Matches'
import LiveGame from './pages/LiveGame'
import Settings from './pages/Settings'

const PAGES = {
  profile: Profile, champions: Champions, challenges: Challenges,
  matches: Matches, live: LiveGame, settings: Settings
}

const POLL_INTERVAL = 5 * 60 * 1000  // 5 min Riot API polling
const LCU_INTERVAL  = 4 * 1000       // 4s LCU status check

export default function App() {
  const [page, setPage]         = useState('profile')
  const [summoner, setSummoner] = useState(null)
  const [ddragon, setDDragon]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [lcuStatus, setLcuStatus] = useState({ connected: false, phase: null })
  const [matchRefreshKey, setMatchRefreshKey] = useState(0)

  const prevPhaseRef    = useRef(null)
  const lcuConnectedRef = useRef(false)
  const pollTimerRef    = useRef(null)
  const lcuTimerRef     = useRef(null)

  const loadApp = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const settings = await window.api.getSettings()
      if (!settings.apiKey || !settings.summonerName) {
        setPage('settings')
        setLoading(false)
        return
      }
      const [sum, dd] = await Promise.all([window.api.getSummoner(), window.api.getDDragon()])
      setSummoner(sum)
      setDDragon(dd)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Riot API polling — refresh match history every 5 min
  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      setMatchRefreshKey(k => k + 1)
    }, POLL_INTERVAL)
    return () => clearInterval(pollTimerRef.current)
  }, [])

  // LCU polling — check game phase every 4 seconds
  useEffect(() => {
    const checkLcu = async () => {
      const status = await window.api.lcu.status()
      setLcuStatus(status)

      const prev = prevPhaseRef.current
      const curr = status.phase

      // Game just ended → wait 3 min then refresh (Riot API processing delay)
      if (prev === 'InProgress' && curr === 'EndOfGame') {
        setTimeout(() => setMatchRefreshKey(k => k + 1), 3 * 60 * 1000)
      }

      // Client just disconnected → immediate refresh
      if (prev !== null && !status.connected && lcuConnectedRef.current) {
        setMatchRefreshKey(k => k + 1)
      }

      prevPhaseRef.current = curr
      lcuConnectedRef.current = status.connected
    }

    checkLcu()
    lcuTimerRef.current = setInterval(checkLcu, LCU_INTERVAL)
    return () => clearInterval(lcuTimerRef.current)
  }, [])

  useEffect(() => { loadApp() }, [])

  const Page = PAGES[page]

  return (
    <div className="app-layout">
      <Sidebar
        page={page} setPage={setPage}
        summoner={summoner} ddragon={ddragon}
        lcuStatus={lcuStatus}
      />
      <div className="main-content">
        <div className="content-titlebar" />
        {loading ? (
          <div className="loading" style={{ flex: 1 }}>
            <div className="spinner" />
            <span>Connecting to Riot API...</span>
          </div>
        ) : (
          <Page
            summoner={summoner} ddragon={ddragon}
            appError={error} onRefresh={loadApp}
            matchRefreshKey={matchRefreshKey}
            onManualRefresh={() => setMatchRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </div>
  )
}
