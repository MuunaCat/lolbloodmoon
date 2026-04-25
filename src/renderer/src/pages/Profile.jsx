import { useState, useEffect, useMemo } from 'react'

const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D',
  CHALLENGER: '#F0E6D3'
}

export default function Profile({ summoner, ddragon, appError, onRefresh }) {
  const [ranked, setRanked]         = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [rotation, setRotation]     = useState(null)
  const [recentMatches, setRecent]  = useState(null)

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getRanked(summoner.id)
      .then(setRanked)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.id])

  // Free rotation
  useEffect(() => {
    window.api.getChampionRotation().then(setRotation).catch(() => {})
  }, [])

  // Recent 5 matches for streak + highlights
  useEffect(() => {
    if (!summoner?.puuid) return
    window.api.getMatchIds(summoner.puuid)
      .then(async ids => {
        const batch = ids.slice(0, 10)
        const results = await Promise.all(batch.map(id => window.api.getMatch(id).catch(() => null)))
        setRecent(results.filter(Boolean))
      })
      .catch(() => {})
  }, [summoner?.puuid])

  // Compute streak + highlights from recent matches
  const { streak, highlights } = useMemo(() => {
    if (!recentMatches || !summoner?.puuid) return { streak: null, highlights: [] }

    let streak = 0
    let lastWin = null
    for (const m of recentMatches.slice(0, 5)) {
      const me = m.info.participants.find(p => p.puuid === summoner.puuid)
      if (!me) continue
      if (lastWin === null) lastWin = me.win
      if (me.win === lastWin) streak++
      else break
    }

    const hl = []
    for (const m of recentMatches) {
      const me = m.info.participants.find(p => p.puuid === summoner.puuid)
      if (!me) continue
      if (me.pentaKills  > 0) hl.push({ type: 'PENTA KILL',  champ: me.championName, cls: 'penta' })
      else if (me.quadraKills > 0) hl.push({ type: 'QUADRA KILL', champ: me.championName, cls: 'quadra' })
      else if (me.tripleKills > 0) hl.push({ type: 'TRIPLE KILL', champ: me.championName, cls: 'triple' })
      if (hl.length >= 5) break
    }

    return { streak: { count: streak, win: lastWin }, highlights: hl }
  }, [recentMatches, summoner?.puuid])

  const rotationChamps = useMemo(() => {
    if (!rotation?.freeChampionIds || !ddragon) return []
    const byId = {}
    Object.values(ddragon.champions).forEach(c => { byId[parseInt(c.key)] = c })
    return rotation.freeChampionIds.map(id => byId[id]).filter(Boolean)
  }, [rotation, ddragon])

  if (appError) return (
    <div className="page">
      <div className="error-box">⚠ {appError} — <span style={{ marginLeft: 8, textDecoration: 'underline', cursor: 'pointer' }} onClick={onRefresh}>Retry</span></div>
    </div>
  )

  if (!summoner) return (
    <div className="page">
      <div className="error-box">⚠ No summoner data. Configure your settings first.</div>
    </div>
  )

  const iconUrl = ddragon
    ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/profileicon/${summoner.profileIconId}.png`
    : null

  const displayName = summoner.gameName
    ? <>{summoner.gameName}<span className="profile-tag">#{summoner.tagLine}</span></>
    : summoner.name

  const soloQ = ranked?.find(r => r.queueType === 'RANKED_SOLO_5x5')
  const flexQ  = ranked?.find(r => r.queueType === 'RANKED_FLEX_SR')

  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>

      <div className="profile-hero card card-gold">
        <div className="profile-icon-wrap">
          {iconUrl
            ? <img src={iconUrl} alt="icon" className="profile-icon" />
            : <div style={{ width: 88, height: 88, borderRadius: 10, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'var(--text-dim)' }}>◈</div>
          }
          <span className="profile-level-badge">{summoner.summonerLevel}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div className="profile-name">{displayName}</div>
          <div className="profile-region">Summoner · Level {summoner.summonerLevel}</div>
        </div>
        {streak && streak.count >= 2 && (
          <div className="profile-streak" style={{ color: streak.win ? 'var(--win)' : 'var(--loss)' }}>
            <div className="profile-streak-count">{streak.count}</div>
            <div className="profile-streak-label">{streak.win ? 'WIN' : 'LOSS'} STREAK</div>
          </div>
        )}
      </div>

      {/* Multi-kill highlights */}
      {highlights.length > 0 && (
        <>
          <div className="section-label">Recent Highlights</div>
          <div className="profile-highlights">
            {highlights.map((h, i) => (
              <div key={i} className={`multikill-badge ${h.cls}`} style={{ padding: '5px 10px', fontSize: 11 }}>
                {h.type} · {h.champ}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-label">Ranked</div>
      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}
      {!loading && !error && (
        <div className="ranked-grid">
          <RankCard queue={soloQ} label="Solo / Duo" />
          <RankCard queue={flexQ}  label="Flex 5v5"  />
        </div>
      )}

      {/* Free champion rotation */}
      {rotationChamps.length > 0 && (
        <>
          <div className="section-label">Free This Week ({rotationChamps.length} champions)</div>
          <div className="profile-rotation-grid">
            {rotationChamps.map(c => {
              const img = `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${c.image.full}`
              return (
                <div key={c.key} className="profile-rotation-card" title={c.name}>
                  <img src={img} alt={c.name} className="profile-rotation-img" />
                  <div className="profile-rotation-name">{c.name}</div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function RankCard({ queue, label }) {
  const color = queue ? (TIER_COLOR[queue.tier] || '#888') : '#333'

  if (!queue) return (
    <div className="card rank-card" style={{ '--accent-color': color }}>
      <div className="rank-queue-label">{label}</div>
      <div className="rank-unranked">Unranked</div>
    </div>
  )

  const { tier, rank, leaguePoints: lp, wins, losses } = queue
  const total = wins + losses
  const wr = total ? Math.round((wins / total) * 100) : 0

  return (
    <div className="card rank-card" style={{ '--accent-color': color, borderColor: `${color}30` }}>
      <div className="rank-queue-label">{label}</div>
      <div className={`rank-tier-text tier-${tier}`}>
        {tier}<span className="rank-division"> {rank}</span>
      </div>
      <div className="rank-lp">{lp} LP</div>
      <div className="rank-row">
        <span className="win-text">{wins}W</span>
        <span style={{ color: 'var(--text-dim)' }}>/</span>
        <span className="loss-text">{losses}L</span>
        <span className="rank-wr">{wr}% WR</span>
      </div>
      <div className="rank-bar-track">
        <div className="rank-bar-fill" style={{ width: `${wr}%`, background: color }} />
      </div>
    </div>
  )
}
