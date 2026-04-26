import { useState, useEffect, useRef, useCallback } from 'react'

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

function ChampSelectView({ session, ddragon, masteryById, srankOverrides }) {
  if (!session) return <div className="loading"><div className="spinner" /></div>

  const myTeam    = session.myTeam    || []
  const theirTeam = session.theirTeam || []
  const bench     = session.benchChampions || []
  const isAram    = bench.length > 0
  const timer     = session.timer
  const timeLeft  = timer ? Math.max(0, Math.round((timer.adjustedTimeLeftInPhase ?? timer.timeLeftInPhase) / 1000)) : null

  const getChamp = (id) => {
    if (!id || !ddragon) return null
    return Object.values(ddragon.champions).find(c => parseInt(c.key) === id) || null
  }

  const getNeeds = (champ) => {
    if (!champ || !masteryById) return { needsS: false, needsM5: false }
    const m = masteryById[parseInt(champ.key)]
    const sRankApi = m?.chestGranted === true
    const sRankDone = srankOverrides[champ.key] !== undefined ? srankOverrides[champ.key] : sRankApi
    return { needsS: !sRankDone, needsM5: !(m && m.championLevel >= 5), mastery: m }
  }

  const getMasteryBadges = (champ) => {
    const { needsS, needsM5, mastery } = getNeeds(champ)
    if (!needsS && !needsM5) return null
    return (
      <span style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
        {needsS && (
          <span title="S rank chest not earned" style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(200,155,60,0.18)', color: 'var(--gold)', border: '1px solid rgba(200,155,60,0.3)' }}>S</span>
        )}
        {needsM5 && (
          <span title={mastery ? `Mastery ${mastery.championLevel}` : 'Never played'} style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3, background: 'rgba(92,184,228,0.15)', color: '#5CB8E4', border: '1px solid rgba(92,184,228,0.3)' }}>M5</span>
        )}
      </span>
    )
  }

  const benchChamps = bench
    .map(b => getChamp(b.championId))
    .filter(Boolean)
    .map(champ => ({ champ, ...getNeeds(champ) }))
    .sort((a, b) => {
      const scoreA = (a.needsS ? 2 : 0) + (a.needsM5 ? 1 : 0)
      const scoreB = (b.needsS ? 2 : 0) + (b.needsM5 ? 1 : 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      return a.champ.name.localeCompare(b.champ.name)
    })

  const benchNeedsS  = benchChamps.filter(c => c.needsS).length
  const benchNeedsM5 = benchChamps.filter(c => c.needsM5).length

  return (
    <div className="lv-champ-select">
      <div className="lv-cs-header">
        <div className="lv-cs-phase">{isAram ? 'ARAM — Champion Select' : 'Champion Select'}</div>
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
                {champ && getMasteryBadges(champ)}
                {champ && (
                  <button
                    className="btn-secondary"
                    style={{ marginLeft: 'auto', padding: '2px 7px', fontSize: 10, flexShrink: 0 }}
                    title={`Open ${champ.name} on op.gg`}
                    onClick={() => window.api.openExternal(`https://www.op.gg/champions/${champ.id.toLowerCase()}/build`)}
                  >op.gg</button>
                )}
              </div>
            )
          })}
        </div>
        {!isAram && (
          <>
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
                    {champ && (
                      <button
                        className="btn-secondary"
                        style={{ marginLeft: 'auto', padding: '2px 7px', fontSize: 10, flexShrink: 0 }}
                        title={`Open ${champ.name} on op.gg`}
                        onClick={() => window.api.openExternal(`https://www.op.gg/champions/${champ.id.toLowerCase()}/build`)}
                      >op.gg</button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {isAram && benchChamps.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="lv-cs-team-label" style={{ color: 'var(--gold)', margin: 0 }}>Available Champions</div>
            {masteryById && (benchNeedsS > 0 || benchNeedsM5 > 0) && (
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {benchNeedsS > 0 && <span style={{ color: 'var(--gold)' }}>{benchNeedsS} need S</span>}
                {benchNeedsS > 0 && benchNeedsM5 > 0 && <span style={{ color: 'var(--text-dim)' }}> · </span>}
                {benchNeedsM5 > 0 && <span style={{ color: '#5CB8E4' }}>{benchNeedsM5} need M5</span>}
              </span>
            )}
          </div>
          {!masteryById && (
            <div className="loading" style={{ padding: '16px 0' }}>
              <div className="spinner" />
              <span style={{ fontSize: 12 }}>Loading mastery data...</span>
            </div>
          )}
          {masteryById && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6 }}>
            {benchChamps.map(({ champ, needsS, needsM5, mastery }) => {
              const imgUrl = ddragon
                ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
                : null
              const needsWork = needsS || needsM5
              return (
                <div
                  key={champ.key}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '7px 5px', borderRadius: 6,
                    background: needsWork ? 'rgba(200,155,60,0.06)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${needsWork ? 'rgba(200,155,60,0.18)' : 'rgba(255,255,255,0.05)'}`,
                    opacity: needsWork ? 1 : 0.45,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  title={`${champ.name} — open on op.gg`}
                  onClick={() => window.api.openExternal(`https://www.op.gg/champions/${champ.id.toLowerCase()}/build`)}
                >
                  {imgUrl && (
                    <img src={imgUrl} alt={champ.name} style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} />
                  )}
                  <span style={{ fontSize: 10, color: 'var(--text)', textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {champ.name}
                  </span>
                  {(needsS || needsM5) && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {needsS && (
                        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 3px', borderRadius: 2, background: 'rgba(200,155,60,0.18)', color: 'var(--gold)', border: '1px solid rgba(200,155,60,0.3)' }}>S</span>
                      )}
                      {needsM5 && (
                        <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 3px', borderRadius: 2, background: 'rgba(92,184,228,0.15)', color: '#5CB8E4', border: '1px solid rgba(92,184,228,0.3)' }}
                          title={mastery ? `Mastery ${mastery.championLevel}` : 'Never played'}
                        >M{mastery?.championLevel ?? '0'}</span>
                      )}
                    </div>
                  )}
                  {!needsS && !needsM5 && (
                    <span style={{ fontSize: 8, color: 'var(--win)' }}>✓ Done</span>
                  )}
                </div>
              )
            })}
          </div>}
        </div>
      )}
    </div>
  )
}

function InGameView({ data, summoner, ddragon }) {
  const [showStats, setShowStats] = useState(false)

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
          {stats && (
            <>
              <button
                className="live-stats-toggle"
                onClick={() => setShowStats(s => !s)}
              >
                {showStats ? '▲ Hide Stats' : '▼ Show Stats'}
              </button>
              {showStats && (
                <div className="live-stats-grid">
                  {[
                    ['AD',    Math.round(stats.attackDamage  ?? 0)],
                    ['AP',    Math.round(stats.abilityPower  ?? 0)],
                    ['Armor', Math.round(stats.armor         ?? 0)],
                    ['MR',    Math.round(stats.magicResist   ?? 0)],
                    ['MS',    Math.round(stats.moveSpeed     ?? 0)],
                    ['AS',    (stats.attackSpeed            ?? 0).toFixed(2)],
                    ['Haste', Math.round(stats.abilityHaste  ?? 0)],
                    ['Crit',  Math.round((stats.critChance  ?? 0) * 100) + '%'],
                  ].map(([label, val]) => (
                    <div key={label} className="live-stat-item">
                      <div className="live-stat-val">{val}</div>
                      <div className="live-stat-label">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
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

function ItemIcon({ itemId, version }) {
  if (!itemId) return null
  return (
    <img
      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
      alt=""
      className="live-item-icon"
      onError={e => { e.target.style.display = 'none' }}
    />
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
          const items = (p.items || []).filter(it => it.itemID).slice(0, 7)
          return (
            <div key={i} className={`live-player-row${isMe ? ' me' : ''}`} style={{ flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
                {imgUrl ? <img src={imgUrl} alt={p.championName} className="live-champ-img" /> : <div className="live-champ-placeholder">⚔</div>}
                <div className="live-player-info">
                  <div className="live-player-row-name">
                    {p.summonerName}{isMe && <span className="live-me-tag">YOU</span>}
                    {p.level != null && <span className="live-player-level">Lv.{p.level}</span>}
                  </div>
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
              {items.length > 0 && ddragon && (
                <div className="live-player-items">
                  {items.map((it, idx) => (
                    <ItemIcon key={idx} itemId={it.itemID} version={ddragon.version} />
                  ))}
                </div>
              )}
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
  const [displayTime, setDisplayTime] = useState(null)
  const [csmasteryById, setCsMasteryById]     = useState(null)
  const [csSrankOverrides, setCsSrankOverrides] = useState({})
  const summonerFetched               = useRef(false)
  const masteryFetched                = useRef(false)
  const intervalRef                   = useRef(null)
  const tickRef                       = useRef(null)

  // Smooth local timer that counts up every second between polls
  useEffect(() => {
    clearInterval(tickRef.current)
    if (gameTime == null) { setDisplayTime(null); return }
    setDisplayTime(gameTime)
    tickRef.current = setInterval(() => setDisplayTime(t => t != null ? t + 1 : t), 1000)
    return () => clearInterval(tickRef.current)
  }, [gameTime])

  const poll = async () => {
    const status = await window.api.lcu.status()
    setConnected(status.connected)
    setPhase(status.phase)

    if (!status.connected) { summonerFetched.current = false; return }

    const p = status.phase

    if (p === 'InProgress') {
      const live = await window.api.lcu.live()
      if (live) {
        setLiveData(live)
        if (live.gameData?.gameTime != null) setGameTime(live.gameData.gameTime)
      }
      setChampSelect(null); setLobby(null)
      masteryFetched.current = false
    } else if (p === 'ChampSelect') {
      const cs = await window.api.lcu.champSelect()
      setChampSelect(cs); setLiveData(null); setGameTime(null)
      if (!masteryFetched.current && summoner?.puuid) {
        masteryFetched.current = true
        try {
          const [masteryList, overrides] = await Promise.all([
            window.api.getAllMastery(summoner.puuid),
            window.api.getSrankOverrides()
          ])
          const map = {}
          masteryList?.forEach(m => { map[m.championId] = m })
          setCsMasteryById(map)
          setCsSrankOverrides(overrides || {})
        } catch {}
      }
    } else if (['Lobby', 'Matchmaking', 'ReadyCheck'].includes(p)) {
      const [lb, qt] = await Promise.all([window.api.lcu.lobby(), window.api.lcu.queueTime()])
      setLobby(lb); setQueueTime(qt); setLiveData(null); setChampSelect(null); setGameTime(null)
      masteryFetched.current = false
    } else {
      setLiveData(null); setChampSelect(null); setLobby(null); setGameTime(null)
      masteryFetched.current = false
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

  const [refreshing, setRefreshing] = useState(false)

  const manualRefresh = async () => {
    setRefreshing(true)
    clearInterval(intervalRef.current)
    summonerFetched.current = false
    await poll()
    intervalRef.current = setInterval(poll, POLL_MS)
    setRefreshing(false)
  }

  const isInGame    = phase === 'InProgress'
  const isInCS      = phase === 'ChampSelect'
  const isSearching = phase === 'Matchmaking' || phase === 'ReadyCheck'
  const isInLobby   = phase === 'Lobby'

  return (
    <div className="page">
      <h1 className="page-title">
        Live Game
        {isInGame    && <span className="live-badge">● LIVE</span>}
        {isInGame    && displayTime != null && <span className="live-timer">{formatTime(displayTime)}</span>}
        {isInCS      && <span className="live-badge" style={{ color: 'var(--gold)' }}>● CHAMP SELECT</span>}
        {isSearching && <span className="live-badge" style={{ color: 'var(--text-mid)', animationDuration: '2s' }}>● SEARCHING</span>}
        <button
          className="btn-secondary"
          style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: 12 }}
          onClick={manualRefresh}
          disabled={refreshing}
        >
          {refreshing ? '...' : '↻ Refresh'}
        </button>
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
      {connected && isInCS      && <ChampSelectView session={champSelect} ddragon={ddragon} masteryById={csmasteryById} srankOverrides={csSrankOverrides} />}
      {connected && (isSearching || isInLobby) && <SearchingView lobby={lobby} queueTime={queueTime} phase={phase} />}
      {connected && !isInGame && !isInCS && !isSearching && !isInLobby && (
        <IdleView lcuSummoner={lcuSummoner} ranked={ranked} ddragon={ddragon} />
      )}
    </div>
  )
}
