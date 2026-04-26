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

const THEME_CHAMPIONS = {
  bloodmoon:   { id: 'Jhin',     skin: 2 },
  void:        { id: 'Malzahar', skin: 0 },
  ionia:       { id: 'Ahri',     skin: 0 },
  demacia:     { id: 'Garen',    skin: 0 },
  noxus:       { id: 'Darius',   skin: 0 },
  freljord:    { id: 'Ashe',     skin: 0 },
  shadowisles: { id: 'Thresh',   skin: 0 },
}

const POLL_INTERVAL = 5 * 60 * 1000
const LCU_INTERVAL  = 4 * 1000

export default function App() {
  const [page, setPage]           = useState('profile')
  const [summoner, setSummoner]   = useState(null)
  const [ddragon, setDDragon]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [lcuStatus, setLcuStatus] = useState({ connected: false, phase: null })
  const [matchRefreshKey, setMatchRefreshKey] = useState(0)
  const [region, setRegion]       = useState('EUW')
  const [theme, setTheme]         = useState('bloodmoon')
  const [champInitSearch, setChampInitSearch] = useState('')
  const [matchesInitFilter, setMatchesInitFilter] = useState('All')

  const prevPhaseRef    = useRef(null)
  const lcuConnectedRef = useRef(false)
  const pollTimerRef    = useRef(null)
  const lcuTimerRef     = useRef(null)
  const notifiedExpiry  = useRef(false)

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Load saved theme on startup
  useEffect(() => {
    window.api.getTheme().then(t => setTheme(t)).catch(() => {})
  }, [])

  const handleThemeChange = useCallback((newTheme) => {
    setTheme(newTheme)
    window.api.saveTheme(newTheme).catch(() => {})
  }, [])

  const loadApp = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const settings = await window.api.getSettings()
      setRegion(settings.region || 'EUW')
      if (!settings.apiKey || !settings.summonerName) {
        setPage('settings')
        setLoading(false)
        return
      }
      const [sum, dd] = await Promise.all([window.api.getSummoner(), window.api.getDDragon()])
      setSummoner(sum)
      setDDragon(dd)
      notifiedExpiry.current = false
    } catch (e) {
      const isExpired = e.message === 'Unauthorized'
      const msg = isExpired
        ? 'API key expired or invalid. Development keys expire every 24 hours — regenerate yours at developer.riotgames.com, then update it in Settings.'
        : e.message
      setError(msg)
      if (isExpired && !notifiedExpiry.current) {
        notifiedExpiry.current = true
        try {
          new Notification('LoLBloodMoon — API Key Expired', {
            body: 'Development keys expire every 24 hours. Open Settings to update.'
          })
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSettingsSaved = useCallback(async () => {
    await loadApp()
    setMatchRefreshKey(k => k + 1)
    setPage('profile')
  }, [loadApp])

  const navigateToChampion = useCallback((champName) => {
    setChampInitSearch(champName)
    setPage('champions')
  }, [])

  const navigateToMatches = useCallback((queueFilter = 'All') => {
    setMatchesInitFilter(queueFilter)
    setPage('matches')
  }, [])

  useEffect(() => {
    pollTimerRef.current = setInterval(() => {
      setMatchRefreshKey(k => k + 1)
    }, POLL_INTERVAL)
    return () => clearInterval(pollTimerRef.current)
  }, [])

  useEffect(() => {
    const checkLcu = async () => {
      let status
      try { status = await window.api.lcu.status() } catch { return }
      setLcuStatus(status)

      const prev = prevPhaseRef.current
      const curr = status.phase

      if (prev !== 'InProgress' && curr === 'InProgress') {
        window.api.showOverlay()
      }
      if (prev === 'InProgress' && curr !== 'InProgress') {
        window.api.hideOverlay()
      }
      if (prev === 'InProgress' && curr === 'EndOfGame') {
        setTimeout(() => setMatchRefreshKey(k => k + 1), 3 * 60 * 1000)
      }
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
  const themeChamp = THEME_CHAMPIONS[theme] || THEME_CHAMPIONS.bloodmoon
  const splashUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${themeChamp.id}_${themeChamp.skin}.jpg`

  return (
    <div className="app-layout">
      <div className="bg-stars" aria-hidden="true" />
      <Sidebar
        page={page} setPage={setPage}
        summoner={summoner} ddragon={ddragon}
        lcuStatus={lcuStatus} theme={theme}
      />
      <div className="main-content">
        <div className="main-champ-bg" style={{ backgroundImage: `url(${splashUrl})` }} />
        <div className="content-titlebar">
          <div className="titlebar-controls">
            <button className="tb-btn tb-min" onClick={() => window.api.window.minimize()} title="Minimize">
              <svg viewBox="0 0 14 2" fill="none" width="14" height="2"><path d="M1 1H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button className="tb-btn tb-max" onClick={() => window.api.window.maximize()} title="Maximize">
              <svg viewBox="0 0 13 13" fill="none" width="11" height="11"><rect x="1" y="1" width="11" height="11" stroke="currentColor" strokeWidth="1.5" rx="2"/></svg>
            </button>
            <button className="tb-btn tb-close" onClick={() => window.api.window.close()} title="Close">
              <svg viewBox="0 0 13 13" fill="none" width="11" height="11"><path d="M2 2L11 11M11 2L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
        {loading ? (
          <div className="loading" style={{ flex: 1 }}>
            <div className="spinner" />
            <span>Connecting to Riot API...</span>
          </div>
        ) : (
          <Page
            summoner={summoner} ddragon={ddragon}
            appError={error} onRefresh={loadApp}
            onSettingsSaved={handleSettingsSaved}
            matchRefreshKey={matchRefreshKey}
            onManualRefresh={() => setMatchRefreshKey(k => k + 1)}
            region={region}
            theme={theme} onThemeChange={handleThemeChange}
            onChampionNavigate={navigateToChampion}
            onNavigateMatches={navigateToMatches}
            initialSearch={page === 'champions' ? champInitSearch : ''}
            onInitSearchConsumed={() => setChampInitSearch('')}
            initialQueueFilter={page === 'matches' ? matchesInitFilter : 'All'}
            onInitQueueFilterConsumed={() => setMatchesInitFilter('All')}
          />
        )}
      </div>
    </div>
  )
}
