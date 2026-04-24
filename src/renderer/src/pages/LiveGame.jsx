import { useState, useEffect, useRef } from 'react'

const POLL_MS = 3000

function formatTime(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function HealthBar({ current, max }) {
  const pct = max ? Math.round((current / max) * 100) : 0
  const color = pct > 50 ? '#3DD68C' : pct > 25 ? '#F0A500' : '#E44D4D'
  return (
    <div className="stat-bar-track">
      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function ResourceBar({ current, max, type }) {
  const pct = max ? Math.round((current / max) * 100) : 0
  const color = type === 'MANA' ? '#5CB8E4' : type === 'ENERGY' ? '#F0E6D3' : '#555'
  return (
    <div className="stat-bar-track" style={{ marginTop: 4 }}>
      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

export default function LiveGame({ summoner, ddragon }) {
  const [data, setData]         = useState(null)
  const [phase, setPhase]       = useState(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  const poll = async () => {
    const status = await window.api.lcu.status()
    setConnected(status.connected)
    setPhase(status.phase || null)

    if (status.phase === 'InProgress') {
      const live = await window.api.lcu.live()
      if (live) { setData(live); setLastUpdate(Date.now()) }
    } else {
      setData(null)
    }
  }

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(intervalRef.current)
  }, [])

  const isInGame = phase === 'InProgress'

  if (!connected) return (
    <div className="page">
      <h1 className="page-title">Live Game</h1>
      <div className="live-empty">
        <div className="live-empty-icon">◉</div>
        <div className="live-empty-title">League Client Not Detected</div>
        <div className="live-empty-sub">Open League of Legends to see live game data.</div>
        <div className="live-empty-hint">If League is open, set the correct install path in Settings.</div>
      </div>
    </div>
  )

  if (!isInGame) return (
    <div className="page">
      <h1 className="page-title">Live Game</h1>
      <div className="live-empty">
        <div className="live-empty-icon" style={{ color: 'var(--win)' }}>◉</div>
        <div className="live-empty-title" style={{ color: 'var(--win)' }}>Client Connected</div>
        <div className="live-empty-sub">
          {phase === 'None' || !phase ? 'Waiting in lobby...' : `Current phase: ${phase}`}
        </div>
        <div className="live-empty-hint">Stats will appear automatically when a game starts.</div>
      </div>
    </div>
  )

  if (!data) return (
    <div className="page">
      <h1 className="page-title">Live Game</h1>
      <div className="loading"><div className="spinner" /><span>Connecting to live game...</span></div>
    </div>
  )

  const { activePlayer, allPlayers, gameData } = data
  const blueTeam = allPlayers?.filter(p => p.team === 'ORDER') || []
  const redTeam  = allPlayers?.filter(p => p.team === 'CHAOS') || []
  const stats    = activePlayer?.championStats
  const scores   = activePlayer?.scores

  return (
    <div className="page">
      <h1 className="page-title">
        Live Game
        <span className="live-badge">● LIVE</span>
        {gameData?.gameTime && <span className="live-timer">{formatTime(gameData.gameTime)}</span>}
      </h1>

      {/* Active player stats */}
      {activePlayer && (
        <div className="card card-gold live-player-card">
          <div className="live-player-header">
            <div className="live-player-name">{activePlayer.summonerName || summoner?.name}</div>
            <div className="live-player-champ">{activePlayer.championName}</div>
          </div>

          {scores && (
            <div className="live-kda-row">
              <div className="live-kda-block">
                <div className="live-kda-num win-text">{scores.kills}</div>
                <div className="live-kda-label">Kills</div>
              </div>
              <div className="live-kda-sep">/</div>
              <div className="live-kda-block">
                <div className="live-kda-num loss-text">{scores.deaths}</div>
                <div className="live-kda-label">Deaths</div>
              </div>
              <div className="live-kda-sep">/</div>
              <div className="live-kda-block">
                <div className="live-kda-num" style={{ color: 'var(--text-mid)' }}>{scores.assists}</div>
                <div className="live-kda-label">Assists</div>
              </div>
              <div className="live-kda-divider" />
              <div className="live-kda-block">
                <div className="live-kda-num gold-text">{Math.round(activePlayer.currentGold).toLocaleString()}</div>
                <div className="live-kda-label">Gold</div>
              </div>
              <div className="live-kda-block">
                <div className="live-kda-num" style={{ color: 'var(--text-mid)' }}>{scores.creepScore}</div>
                <div className="live-kda-label">CS</div>
              </div>
            </div>
          )}

          {stats && (
            <div className="live-bars">
              <div className="live-bar-row">
                <span className="live-bar-label">HP</span>
                <div style={{ flex: 1 }}>
                  <HealthBar current={stats.currentHealth} max={stats.maxHealth} />
                </div>
                <span className="live-bar-val">{Math.round(stats.currentHealth)} / {Math.round(stats.maxHealth)}</span>
              </div>
              {stats.resourceMax > 0 && (
                <div className="live-bar-row">
                  <span className="live-bar-label">{stats.resourceType || 'MP'}</span>
                  <div style={{ flex: 1 }}>
                    <ResourceBar current={stats.resourceValue} max={stats.resourceMax} type={stats.resourceType} />
                  </div>
                  <span className="live-bar-val">{Math.round(stats.resourceValue)} / {Math.round(stats.resourceMax)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teams */}
      <div className="live-teams">
        <TeamTable title="Blue Team" players={blueTeam} color="#5CB8E4" ddragon={ddragon} activePlayer={activePlayer} />
        <TeamTable title="Red Team"  players={redTeam}  color="#E44D4D" ddragon={ddragon} activePlayer={activePlayer} />
      </div>

      {lastUpdate && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 16 }}>
          Updated {new Date(lastUpdate).toLocaleTimeString()} · refreshes every {POLL_MS / 1000}s
        </div>
      )}
    </div>
  )
}

function TeamTable({ title, players, color, ddragon, activePlayer }) {
  return (
    <div className="live-team">
      <div className="live-team-title" style={{ color }}>{title}</div>
      <div className="live-team-list">
        {players.map((p, i) => {
          const isMe = p.summonerName === activePlayer?.summonerName
          const champ = ddragon ? Object.values(ddragon.champions).find(c => c.name === p.championName) : null
          const imgUrl = champ && ddragon
            ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
            : null

          return (
            <div key={i} className={`live-player-row${isMe ? ' me' : ''}`}>
              {imgUrl
                ? <img src={imgUrl} alt={p.championName} className="live-champ-img" />
                : <div className="live-champ-placeholder">⚔</div>
              }
              <div className="live-player-info">
                <div className="live-player-row-name">{p.summonerName}{isMe && <span className="live-me-tag">YOU</span>}</div>
                <div className="live-player-champ-name">{p.championName}</div>
              </div>
              <div className="live-player-scores">
                <span className="win-text">{p.scores?.kills ?? 0}</span>
                <span style={{ color: 'var(--text-dim)' }}>/</span>
                <span className="loss-text">{p.scores?.deaths ?? 0}</span>
                <span style={{ color: 'var(--text-dim)' }}>/</span>
                <span style={{ color: 'var(--text-mid)' }}>{p.scores?.assists ?? 0}</span>
              </div>
              <div className="live-player-cs">{p.scores?.creepScore ?? 0} CS</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
