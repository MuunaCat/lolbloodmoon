import { useState, useEffect, useMemo, memo } from 'react'

function timeAgo(ms) {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function kdaRatio(k, d, a) {
  if (d === 0) return 'Perfect'
  return ((k + a) / d).toFixed(2)
}

const POSITION_LABEL = {
  TOP: 'Top', JUNGLE: 'Jungle', MIDDLE: 'Mid',
  BOTTOM: 'Bot', UTILITY: 'Support', NONE: ''
}

const MODE_LABEL = {
  CLASSIC: 'Summoner\'s Rift', ARAM: 'ARAM', URF: 'URF',
  CHERRY: 'Arena', TUTORIAL: 'Tutorial',
  ONEFORALL: 'One for All', NEXUSBLITZ: 'Nexus Blitz',
  ULTBOOK: 'Ultimate Spellbook', ASSASSINATE: 'Snow ARAM',
  DOOMBOTSTEEMO: 'Doom Bots', PROJECT: 'PROJECT', ODYSSEY: 'Odyssey',
  GAMEMODEX: 'Mayhem', PORO_KING: 'Legend of the Poro King'
}

const QUEUE_FILTER_MODES = ['All', 'Ranked', 'Normal', 'ARAM', 'Other']

const ItemIcon = memo(function ItemIcon({ itemId, version }) {
  if (!itemId) return <div className="match-item-placeholder" />
  return (
    <img
      src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`}
      alt=""
      className="match-item-icon"
      onError={e => { e.target.style.display = 'none' }}
    />
  )
})

function MultiKillBadge({ me }) {
  if (me.pentaKills  > 0) return <span className="multikill-badge penta">PENTA</span>
  if (me.quadraKills > 0) return <span className="multikill-badge quadra">QUADRA</span>
  if (me.tripleKills > 0) return <span className="multikill-badge triple">TRIPLE</span>
  if (me.doubleKills > 0) return <span className="multikill-badge double">DOUBLE</span>
  return null
}

const MatchDetail = memo(function MatchDetail({ match, summoner, ddragon }) {
  const me = match.info.participants.find(p => p.puuid === summoner.puuid)
  if (!me) return null

  const blue = match.info.participants.filter(p => p.teamId === 100)
  const red  = match.info.participants.filter(p => p.teamId === 200)
  const ver  = ddragon?.version

  const items = [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6]

  const cs = (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0)
  const durationMin = match.info.gameDuration / 60
  const csPerMin = durationMin > 0 ? (cs / durationMin).toFixed(1) : '0'

  const myTeam = match.info.teams?.find(t => t.teamId === me.teamId)
  const teamKills = myTeam?.objectives?.champion?.kills || 0
  const kp = teamKills > 0 ? Math.round(((me.kills + me.assists) / teamKills) * 100) : 0

  const firstBlood = me.firstBloodKill ? 'Kill' : me.firstBloodAssist ? 'Assist' : null

  const stats = [
    { label: 'Damage',   value: (me.totalDamageDealtToChampions || 0).toLocaleString(), color: '#E44D4D' },
    { label: 'Taken',    value: (me.totalDamageTaken || 0).toLocaleString() },
    { label: 'Gold',     value: (me.goldEarned || 0).toLocaleString(), color: 'var(--gold)' },
    { label: 'Vision',   value: me.visionScore ?? 0 },
    { label: 'CS/min',   value: csPerMin },
    { label: 'KP',       value: `${kp}%` },
    { label: 'Wards',    value: `${me.wardsPlaced ?? 0} / ${me.wardsKilled ?? 0}` },
    { label: 'Healing',  value: (me.totalHeal || 0).toLocaleString() },
    ...(me.turretKills > 0 || me.turretTakedowns > 0
      ? [{ label: 'Turrets', value: me.turretKills || me.turretTakedowns || 0 }] : []),
    ...(firstBlood ? [{ label: 'First Blood', value: firstBlood, color: 'var(--win)' }] : []),
    ...(me.objectivesStolen > 0 ? [{ label: 'Stolen', value: me.objectivesStolen, color: 'var(--gold)' }] : []),
  ]

  return (
    <div className="match-detail">
      {/* My items + stats */}
      <div className="match-detail-my-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="match-detail-section-label">Items</div>
            <div className="match-item-row">
              {items.map((id, i) => <ItemIcon key={i} itemId={id || null} version={ver} />)}
            </div>
          </div>
          {(me.teamPosition || me.individualPosition) && (
            <span style={{ fontSize: 11, color: 'var(--text-mid)', alignSelf: 'flex-end', marginBottom: 2 }}>
              {POSITION_LABEL[me.teamPosition || me.individualPosition] || (me.teamPosition || me.individualPosition)}
            </span>
          )}
        </div>

        <div className="match-stats-grid">
          {stats.map(s => (
            <div key={s.label} className="match-stat-item">
              <span className="match-stat-label">{s.label}</span>
              <span className="match-stat-value" style={s.color ? { color: s.color } : {}}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Teams */}
      <div className="match-detail-teams">
        {[blue, red].map((team, ti) => (
          <div key={ti} className="match-detail-team">
            <div className="match-detail-team-label" style={{ color: ti === 0 ? '#5CB8E4' : '#E44D4D' }}>
              {ti === 0 ? 'Blue' : 'Red'} {team[0]?.win ? '(Win)' : '(Loss)'}
            </div>
            {team.map((p, i) => {
              const isMe = p.puuid === summoner.puuid
              const champ = ddragon?.champions?.[p.championName] || null
              const img = champ && ver ? `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${champ.image.full}` : null
              return (
                <div key={i} className={`match-detail-player${isMe ? ' me' : ''}`}>
                  {img ? <img src={img} alt={p.championName} className="match-detail-champ-img" draggable={false} /> : <div className="match-detail-champ-placeholder">⚔</div>}
                  <span className="match-detail-player-name" style={{ color: isMe ? 'var(--gold)' : 'var(--text)' }}>{p.riotIdGameName || p.summonerName}</span>
                  <span className="match-detail-player-kda">
                    <span className="win-text">{p.kills}</span>/<span className="loss-text">{p.deaths}</span>/<span style={{ color: 'var(--text-mid)' }}>{p.assists}</span>
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})

export default function Matches({ summoner, ddragon, appError, matchRefreshKey, onManualRefresh, initialQueueFilter, onInitQueueFilterConsumed }) {
  const [matchIds, setMatchIds]   = useState([])
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [loadingMore, setLMore]   = useState(false)
  const [error, setError]         = useState(null)
  const [loaded, setLoaded]       = useState(0)
  const [restricted, setRestricted] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [expanded, setExpanded]   = useState(null)
  const [queueFilter, setQueueFilter] = useState('All')
  const [resultFilter, setResultFilter] = useState('All')

  useEffect(() => {
    if (initialQueueFilter && initialQueueFilter !== 'All') {
      setQueueFilter(initialQueueFilter)
      onInitQueueFilterConsumed?.()
    }
  }, [initialQueueFilter])

  const fetchBatchProgressive = async (ids, onEach, onRestricted) => {
    const pending = ids.map(id =>
      window.api.getMatch(id)
        .then(m => {
          if (!m) return
          if (m.__restricted) { onRestricted?.(); return }
          onEach(m)
        })
        .catch(() => null)
    )
    await Promise.all(pending)
  }

  useEffect(() => {
    if (!summoner) return
    let cancelled = false
    setLoading(true)
    setMatches([])
    setMatchIds([])
    setLoaded(0)
    setRestricted(0)
    setError(null)
    setExpanded(null)
    window.api.getMatchIds(summoner.puuid)
      .then(async ids => {
        if (cancelled) return
        setMatchIds(ids)
        const batch = ids.slice(0, 10)
        await fetchBatchProgressive(batch, m => {
          if (cancelled) return
          setMatches(prev => {
            if (prev.some(x => x.metadata.matchId === m.metadata.matchId)) return prev
            return [...prev, m]
          })
        }, () => { if (!cancelled) setRestricted(r => r + 1) })
        if (!cancelled) {
          setLoaded(10)
          setLastUpdated(new Date())
        }
      })
      .catch(e => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [summoner?.puuid, matchRefreshKey])

  const loadMore = async () => {
    setLMore(true)
    const next = matchIds.slice(loaded, loaded + 10)
    await fetchBatchProgressive(next, m => {
      setMatches(prev => {
        if (prev.some(x => x.metadata.matchId === m.metadata.matchId)) return prev
        return [...prev, m]
      })
    }, () => setRestricted(r => r + 1))
    setLoaded(l => l + 10)
    setLMore(false)
  }

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const me = match.info.participants.find(p => p.puuid === summoner?.puuid)
      if (!me) return false

      if (resultFilter === 'Win'  && !me.win) return false
      if (resultFilter === 'Loss' &&  me.win) return false

      if (queueFilter !== 'All') {
        const mode = match.info.gameMode
        const qId  = match.info.queueId
        if (queueFilter === 'Ranked' && ![420, 440].includes(qId))  return false
        if (queueFilter === 'Normal' && ![400, 430].includes(qId))  return false
        if (queueFilter === 'ARAM'   && ![450, 900, 2400].includes(qId))              return false
        if (queueFilter === 'Other'  && [420, 440, 400, 430, 450, 900, 2400].includes(qId)) return false
      }
      return true
    })
  }, [matches, queueFilter, resultFilter, summoner?.puuid])

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ margin: 0, flex: 1 }}>Match History</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn-secondary"
            style={{ padding: '7px 14px', fontSize: 12 }}
            onClick={onManualRefresh}
            disabled={loading}
          >
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {!loading && matches.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['All', 'Win', 'Loss'].map(f => (
            <button
              key={f}
              className={`filter-btn${resultFilter === f ? ' active' : ''}`}
              onClick={() => setResultFilter(f)}
            >{f}</button>
          ))}
          <div style={{ width: 1, background: 'var(--border-mid)', margin: '0 4px' }} />
          {QUEUE_FILTER_MODES.map(f => (
            <button
              key={f}
              className={`filter-btn${queueFilter === f ? ' active' : ''}`}
              onClick={() => setQueueFilter(f)}
            >{f}</button>
          ))}
          {filteredMatches.length !== matches.length && (
            <span style={{ fontSize: 11, color: 'var(--text-dim)', alignSelf: 'center' }}>
              {filteredMatches.length} of {matches.length} shown
            </span>
          )}
        </div>
      )}

      {restricted > 0 && !loading && (
        <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 6, padding: '7px 12px', marginBottom: 12 }}>
          {restricted} ARAM: Mayhem {restricted === 1 ? 'game' : 'games'} not shown — Riot restricts this mode's data via their API.
        </div>
      )}

      {loading && <div className="loading"><div className="spinner" /><span>Loading matches...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && filteredMatches.length === 0 && (
        <div className="empty-state">No matches found{queueFilter !== 'All' || resultFilter !== 'All' ? ' for this filter' : ''}.</div>
      )}

      {!loading && filteredMatches.length > 0 && (
        <>
          <div className="matches-list">
            {filteredMatches.map(match => {
              const me = match.info.participants.find(p => p.puuid === summoner.puuid)
              if (!me) return null

              const champ = ddragon?.champions?.[me.championName] || null
              const imgUrl = champ && ddragon
                ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
                : null

              const win = me.win
              const { kills: k, deaths: d, assists: a } = me
              const cs = (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0)
              const duration = formatDuration(match.info.gameDuration)
              const ago = timeAgo(match.info.gameCreation)
              const mode = MODE_LABEL[match.info.gameMode] || match.info.gameMode
              const isOpen = expanded === match.metadata.matchId

              return (
                <div key={match.metadata.matchId}>
                  <div
                    className={`match-row ${win ? 'win' : 'loss'}${isOpen ? ' expanded' : ''}`}
                    onClick={() => setExpanded(isOpen ? null : match.metadata.matchId)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`match-outcome ${win ? 'win' : 'loss'}`}>{win ? 'WIN' : 'LOSS'}</div>

                    {imgUrl
                      ? <img src={imgUrl} alt={me.championName} className="match-champ-img" draggable={false} />
                      : <div className="match-champ-placeholder">⚔</div>
                    }

                    <div className="match-info">
                      <div className="match-champ-name">
                        {champ?.name || me.championName}
                        <MultiKillBadge me={me} />
                      </div>
                      <div className="match-meta">{mode} · {duration}</div>
                    </div>

                    <div className="match-kda">
                      <div className="kda-nums">
                        <span className="win-text">{k}</span>
                        <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                        <span className="loss-text">{d}</span>
                        <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                        <span style={{ color: 'var(--text-mid)' }}>{a}</span>
                      </div>
                      <div className="kda-ratio">{kdaRatio(k, d, a)} KDA</div>
                    </div>

                    <div className="match-stats">
                      <div className="match-stat-pills">
                        <span className="match-pill"><span className="match-pill-label">CS</span>{cs}</span>
                        <span className="match-pill" style={{ color: '#E44D4D' }}><span className="match-pill-label">DMG</span>{Math.round((me.totalDamageDealtToChampions || 0) / 1000)}k</span>
                      </div>
                      <div className="match-time">{ago}</div>
                    </div>

                    <span className="match-expand-arrow">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {isOpen && (
                    <MatchDetail match={match} summoner={summoner} ddragon={ddragon} />
                  )}
                </div>
              )
            })}
          </div>

          {loaded < matchIds.length && (
            <button className="match-load-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : `Load more (${matchIds.length - loaded} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
