import { useState, useEffect, useRef } from 'react'

const POLL_MS = 3000

const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D',
  CHALLENGER: '#F0E6D3', UNRANKED: '#444'
}

const QUEUE_NAMES = {
  420: 'Ranked Solo/Duo', 440: 'Ranked Flex', 430: 'Normal Blind',
  400: 'Normal Draft', 450: 'ARAM', 900: 'URF', 1700: 'Arena'
}

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
  if (!max) return null
  return (
    <div className="stat-bar-track" style={{ marginTop: 4 }}>
      <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function RankMini({ data, label }) {
  const tier = data?.tier || 'UNRANKED'
  const color = TIER_COLOR[tier] || '#444'
  const wr = (data?.wins + data?.losses) > 0
    ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
  return (
    <div className="lv-rank-mini">
      <div className="lv-rank-mini-label">{label}</div>
      <div className="lv-rank-mini-tier" style={{ color }}>
        {tier === 'UNRANKED' ? 'Unranked' : `${tier} ${data?.division || ''}`}
      </div>
      {tier !== 'UNRANKED' && (
        <>
          <div className="lv-rank-mini-lp">{data?.leaguePoints} LP</div>
          <div className="lv-rank-mini-wr">
            <span style={{ color: 'var(--win)' }}>{data?.wins}W</span>
            <span style={{ color: 'var(--text-dim)' }}> / </span>
            <span style={{ color: 'var(--loss)' }}>{data?.losses}L</span>
            <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>{wr}%</span>
          </div>
        </>
      )}
    </div>
  )
}

function IdleView({ lcuSummoner, ranked, ddragon }) {
  const soloQ = ranked?.queueMap?.RANKED_SOLO_5x5
  const flexQ  = ranked?.queueMap?.RANKED_FLEX_SR
  return (
    <div className="lv-idle">
      {lcuSummoner && (
        <div className="card card-gold lv-idle-card">
          <div className="lv-idle-header">
            {ddragon && lcuSummoner.profileIconId && (
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/profileicon/${lcuSummoner.profileIconId}.png`}
                alt="" className="lv-idle-icon"
              />
            )}
            <div style={{ flex: 1 }}>
              <div className="lv-idle-name">{lcuSummoner.displayName || lcuSummoner.gameName}</div>
              <div className="lv-idle-level">Level {lcuSummoner.summonerLevel}</div>
            </div>
            <div className="lv-status-pill">● Client Connected</div>
          </div>
          {(soloQ || flexQ) && (
            <div className="lv-rank-row">
              {soloQ && <RankMini data={soloQ} label="Solo / Duo" />}
              {flexQ  && <RankMini data={flexQ}  label="Flex 5v5"  />}
            </div>
          )}
        </div>
      )}
      <div className="lv-waiting">
        <div className="lv-waiting-icon">⊞</div>
        <div className="lv-waiting-text">Not in a game</div>
        <div className="lv-waiting-sub">Live stats appear when you enter champion select or a game.</div>
      </div>
    </div>
  )
}

function SearchingView({ lobby, queueTime, phase }) {
  const queueId = lobby?.gameConfig?.queueId
  const queueName = QUEUE_NAMES[queueId] || (queueId ? `Queue ${queueId}` : 'Custom game')
  const est = queueTime?.estimatedQueueTime
  return (
    <div className="lv-searching">
      <div className="lv-search-pulse">◎</div>
      <div className="lv-search-title">{phase === 'ReadyCheck' ? 'Accept the Match!' : 'Searching for Game'}</div>
      <div className="lv-search-queue">{queueName}</div>
      {est && <div className="lv-search-est">Estimated wait: ~{Math.round(est)}s</div>}
    </div>
  )
}

function ChampSelectView({ session, ddragon }) {
  if (!session) return <div className="loading"><div className="spinner" /></div>

  const myTeam    = session.myTeam    || []
  const theirTeam = session.theirTeam || []
  const timer     = session.timer
  const timeLeft  = timer ? Math.max(0, Math.round((timer.adjustedTimeLeftInPhase ?? timer.timeLeftInPhase) / 1000)) : null

  const getChamp = (id) => {
    if (!id || !ddragon) return null
    return Object.values(ddragon.champions).find(c => parseInt(c.key) === id) || null
  }

  return (
    <div className="lv-champ-select">
      <div className="lv-cs-header">
        <div className="lv-cs-phase">Champion Select</div>
        {timeLeft !== null && (
          <div className="lv-cs-timer" style={{ color: timeLeft < 10 ? 'var(--loss)' : 'var(--gold)' }}>
            {timeLeft}s
          </div>
        )}
      </div>
      <div className="lv-cs-teams">
        <div className="lv-cs-team">
          <div className="lv-cs-team-label" style={{ color: '#5CB8E4' }}>Your Team</div>
          {myTeam.map((p, i) => {
            const champ = getChamp(p.championId)
            const imgUrl = champ && ddragon
              ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
              : null
            const isMe = p.cellId === session.localPlayerCellId
            return (
              <div key={i} className={`lv-cs-player${isMe ? ' me' : ''}`}>
                {imgUrl
                  ? <img src={imgUrl} alt={champ?.name} className="lv-cs-champ-img" />
                  : <div className="lv-cs-champ-empty">{p.championId ? '?' : '—'}</div>
                }
                <span className="lv-cs-champ-name">{champ?.name || (p.championId ? '...' : 'Picking')}</span>
                {isMe && <span className="live-me-tag">YOU</span>}
              </div>
            )
          })}
        </div>
        <div className="lv-cs-vs">VS</div>
        <div className="lv-cs-team">
          <div className="lv-cs-team-label" style={{ color: '#E44D4D' }}>Enemy Team</div>
          {theirTeam.map((p, i) => {
            const champ = getChamp(p.championId)
            const imgUrl = champ && ddragon
              ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
              : null
            return (
              <div key={i} className="lv-cs-player">
                {imgUrl
                  ? <img src={imgUrl} alt={champ?.name} className="lv-cs-champ-img" />
                  : <div className="lv-cs-champ-empty">{p.championId ? '?' : '—'}</div>
                }
                <span className="lv-cs-champ-name">{champ?.name || (p.championId ? '...' : 'Picking')}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function InGameView({ data, summoner, ddragon }) {
  if (!data) return <div className="loading"><div className="spinner" /><span>Connecting to live game...</span></div>
  const { activePlayer, allPlayers } = data
  const blueTeam = allPlayers?.filter(p => p.team === 'ORDER') || []
  const redTeam  = allPlayers?.filter(p => p.team === 'CHAOS')  || []
  const stats    = activePlayer?.championStats
  const scores   = activePlayer?.scores

  return (
    <>
      {activePlayer && (
        <div className="card card-gold live-player-card">
          <div className="live-player-header">
            <div className="live-player-name">{activePlayer.summonerName || summoner?.name}</div>
            <div className="live-player-champ">{activePlayer.championName}</div>
          </div>
          {scores && (
            <div className="live-kda-row">
              {[['Kills', scores.kills, 'win-text'], ['Deaths', scores.deaths, 'loss-text'], ['Assists', scores.assists, '']].map(([lbl, val, cls]) => (
                <div className="live-kda-block" key={lbl}>
                  <div className={`live-kda-num ${cls}`} style={!cls ? { color: 'var(--text-mid)' } : {}}>{val}</div>
                  <div className="live-kda-label">{lbl}</div>
                </div>
              ))}
              <div className="live-kda-divider" />
              <div className="live-kda-block">
                <div className="live-kda-num gold-text">{Math.round(activePlayer.currentGold || 0).toLocaleString()}</div>
                <div className="live-kda-label">Gold</div>
              </div>
              <div className="live-kda-block">
                <div className="live-kda-num" style={{ color: 'var(--text-mid)' }}>{scores.creepScore}</div>
                <div className="live-kda-label">CS</div>
              </div>
              <div className="live-kda-block">
                <div className="live-kda-num" style={{ color: 'var(--text-mid)' }}>{scores.wardScore?.toFixed(0) ?? 0}</div>
                <div className="live-kda-label">Vision</div>
              </div>
            </div>
          )}
          {stats && (
            <div className="live-bars">
              <div className="live-bar-row">
                <span className="live-bar-label">HP</span>
                <div style={{ flex: 1 }}><HealthBar current={stats.currentHealth} max={stats.maxHealth} /></div>
                <span className="live-bar-val">{Math.round(stats.currentHealth)} / {Math.round(stats.maxHealth)}</span>
              </div>
              <ResourceBar current={stats.resourceValue} max={stats.resourceMax} type={stats.resourceType} />
            </div>
          )}
        </div>
      )}
      <div className="live-teams">
        <TeamTable title="Blue Team" players={blueTeam} color="#5CB8E4" ddragon={ddragon} activePlayer={activePlayer} />
        <TeamTable title="Red Team"  players={redTeam}  color="#E44D4D" ddragon={ddragon} activePlayer={activePlayer} />
      </div>
    </>
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
              {imgUrl ? <img src={imgUrl} alt={p.championName} className="live-champ-img" /> : <div className="live-champ-placeholder">⚔</div>}
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

export default function LiveGame({ summoner, ddragon }) {
  const [phase, setPhase]             = useState(null)
  const [connected, setConnected]     = useState(false)
  const [liveData, setLiveData]       = useState(null)
  const [lcuSummoner, setLcuSummoner] = useState(null)
  const [ranked, setRanked]           = useState(null)
  const [champSelect, setChampSelect] = useState(null)
  const [lobby, setLobby]             = useState(null)
  const [queueTime, setQueueTime]     = useState(null)
  const [gameTime, setGameTime]       = useState(null)
  const summonerFetched               = useRef(false)
  const intervalRef                   = useRef(null)

  const poll = async () => {
    const status = await window.api.lcu.status()
    setConnected(status.connected)
    setPhase(status.phase)

    if (!status.connected) { summonerFetched.current = false; return }

    const p = status.phase

    if (p === 'InProgress') {
      const live = await window.api.lcu.live()
      if (live) { setLiveData(live); setGameTime(live.gameData?.gameTime) }
      setChampSelect(null); setLobby(null)
    } else if (p === 'ChampSelect') {
      const cs = await window.api.lcu.champSelect()
      setChampSelect(cs); setLiveData(null)
    } else if (['Lobby', 'Matchmaking', 'ReadyCheck'].includes(p)) {
      const [lb, qt] = await Promise.all([window.api.lcu.lobby(), window.api.lcu.queueTime()])
      setLobby(lb); setQueueTime(qt); setLiveData(null); setChampSelect(null)
    } else {
      setLiveData(null); setChampSelect(null); setLobby(null)
    }

    if (!summonerFetched.current) {
      summonerFetched.current = true
      const [sum, rnk] = await Promise.all([window.api.lcu.summoner(), window.api.lcu.ranked()])
      setLcuSummoner(sum)
      setRanked(rnk)
    }
  }

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(intervalRef.current)
  }, [])

  const isInGame    = phase === 'InProgress'
  const isInCS      = phase === 'ChampSelect'
  const isSearching = phase === 'Matchmaking' || phase === 'ReadyCheck'
  const isInLobby   = phase === 'Lobby'

  return (
    <div className="page">
      <h1 className="page-title">
        Live Game
        {isInGame    && <span className="live-badge">● LIVE</span>}
        {isInGame    && gameTime && <span className="live-timer">{formatTime(gameTime)}</span>}
        {isInCS      && <span className="live-badge" style={{ color: 'var(--gold)' }}>● CHAMP SELECT</span>}
        {isSearching && <span className="live-badge" style={{ color: 'var(--text-mid)', animationDuration: '2s' }}>● SEARCHING</span>}
      </h1>

      {!connected && (
        <div className="live-empty">
          <div className="live-empty-icon">◉</div>
          <div className="live-empty-title">League Client Not Detected</div>
          <div className="live-empty-sub">Open League of Legends to see live data.</div>
          <div className="live-empty-hint">If League is open, set the install path in Settings.</div>
        </div>
      )}

      {connected && isInGame    && <InGameView data={liveData} summoner={summoner} ddragon={ddragon} />}
      {connected && isInCS      && <ChampSelectView session={champSelect} ddragon={ddragon} />}
      {connected && (isSearching || isInLobby) && <SearchingView lobby={lobby} queueTime={queueTime} phase={phase} />}
      {connected && !isInGame && !isInCS && !isSearching && !isInLobby && (
        <IdleView lcuSummoner={lcuSummoner} ranked={ranked} ddragon={ddragon} />
      )}
    </div>
  )
}
