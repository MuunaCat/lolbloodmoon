import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Profile from './pages/Profile'
import Champions from './pages/Champions'
import Challenges from './pages/Challenges'
import Matches from './pages/Matches'
import Settings from './pages/Settings'

const PAGES = { profile: Profile, champions: Champions, challenges: Challenges, matches: Matches, settings: Settings }

export default function App() {
  const [page, setPage] = useState('profile')
  const [summoner, setSummoner] = useState(null)
  const [ddragon, setDDragon] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadApp = async () => {
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
  }

  useEffect(() => { loadApp() }, [])

  const Page = PAGES[page]

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} summoner={summoner} ddragon={ddragon} />
      <div className="main-content">
        <div className="content-titlebar" />
        {loading ? (
          <div className="loading" style={{ flex: 1 }}>
            <div className="spinner" />
            <span>Connecting to Riot API...</span>
          </div>
        ) : (
          <Page summoner={summoner} ddragon={ddragon} appError={error} onRefresh={loadApp} />
        )}
      </div>
    </div>
  )
}
