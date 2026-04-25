import { useState, useEffect } from 'react'

const REGIONS = ['NA', 'EUW', 'EUNE', 'KR', 'BR', 'JP', 'LAN', 'LAS', 'OCE', 'RU', 'TR']

const THEMES = [
  { id: 'default',   label: 'Default',    desc: 'Classic dark gold' },
  { id: 'bloodmoon', label: 'Blood Moon', desc: 'Deep crimson & ember' },
  { id: 'cosmic',    label: 'Cosmic',     desc: 'Deep space blue & nebula' },
  { id: 'void',      label: 'The Void',   desc: 'Dark purple void' },
]

export default function Settings({ onRefresh, onSettingsSaved, theme, onThemeChange }) {
  const [apiKey, setApiKey]           = useState('')
  const [summonerName, setSummoner]   = useState('')
  const [region, setRegion]           = useState('EUW')
  const [leaguePath, setLeaguePath]   = useState('')
  const [showKey, setShowKey]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [feedback, setFeedback]       = useState(null)

  useEffect(() => {
    window.api.getSettings().then(s => {
      setApiKey(s.apiKey || '')
      setSummoner(s.summonerName || '')
      setRegion(s.region || 'EUW')
    })
    window.api.getLeaguePath().then(p => setLeaguePath(p || ''))
  }, [])

  const save = async () => {
    if (!apiKey.trim()) { setFeedback({ type: 'error', msg: 'API key is required.' }); return }
    if (!summonerName.trim()) { setFeedback({ type: 'error', msg: 'Summoner name is required.' }); return }
    setSaving(true)
    setFeedback(null)
    try {
      await window.api.saveSettings({ apiKey: apiKey.trim(), summonerName: summonerName.trim(), region })
      await window.api.saveLeaguePath(leaguePath.trim())
      setFeedback({ type: 'success', msg: 'Settings saved. Refreshing data...' })
      setTimeout(() => { (onSettingsSaved || onRefresh)(); setFeedback(null) }, 1200)
    } catch (e) {
      setFeedback({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      <div className="settings-form">
        <div className="form-group">
          <label className="form-label">Riot API Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              spellCheck={false}
            />
            <button
              className="btn-secondary"
              onClick={() => setShowKey(s => !s)}
              style={{ flexShrink: 0, padding: '10px 14px' }}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <span className="form-hint">
            Get your Personal API key at{' '}
            <strong
              className="settings-link"
              onClick={() => window.api.openExternal('https://developer.riotgames.com')}
            >developer.riotgames.com</strong>.
            Personal keys don't expire and are for private use only.
          </span>
        </div>

        <div className="divider" />

        <div className="form-group">
          <label className="form-label">Riot ID / Summoner Name</label>
          <input
            className="form-input"
            type="text"
            value={summonerName}
            onChange={e => setSummoner(e.target.value)}
            placeholder="Name#TAG  or  SummonerName"
          />
          <span className="form-hint">
            Use Riot ID format <strong style={{ color: 'var(--text)' }}>Name#TAG</strong> (recommended) or your legacy summoner name.
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Region</label>
          <select className="form-select" value={region} onChange={e => setRegion(e.target.value)}>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {feedback && (
          <div className={`save-feedback ${feedback.type}`}>
            {feedback.type === 'success' ? '✓ ' : '⚠ '}{feedback.msg}
          </div>
        )}

        <div className="form-actions">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Refresh'}
          </button>
        </div>

        <div className="divider" />

        <div className="form-group">
          <label className="form-label">League of Legends Path (optional)</label>
          <input
            className="form-input"
            type="text"
            value={leaguePath}
            onChange={e => setLeaguePath(e.target.value)}
            placeholder="C:\Riot Games\League of Legends\lockfile"
          />
          <span className="form-hint">
            Only needed if League is installed in a non-default location.
            Leave blank to auto-detect. Points to the <strong style={{ color: 'var(--text)' }}>lockfile</strong> inside your LoL folder.
          </span>
        </div>

        <div className="divider" />

        <div className="form-group">
          <label className="form-label">Theme</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                className={`theme-btn${theme === t.id ? ' active' : ''}`}
                onClick={() => onThemeChange?.(t.id)}
              >
                <span className="theme-btn-name">{t.label}</span>
                <span className="theme-btn-desc">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div style={{ padding: '4px 0' }}>
          <div className="form-label" style={{ marginBottom: 10 }}>About</div>
          <div className="form-hint" style={{ lineHeight: 1.8 }}>
            LoLBloodMoon is a personal desktop app for viewing your summoner profile,
            champion mastery, challenge progress, and match history.<br />
            Your API key is stored <strong style={{ color: 'var(--text)' }}>locally only</strong> — never sent to any third-party server.
            All requests go directly to{' '}
            <strong
              className="settings-link"
              onClick={() => window.api.openExternal('https://api.riotgames.com')}
            >api.riotgames.com</strong>.
          </div>
        </div>
      </div>
    </div>
  )
}
