import { useState, useEffect } from 'react'

const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D',
  CHALLENGER: '#F0E6D3'
}

export default function Profile({ summoner, ddragon, appError, onRefresh }) {
  const [ranked, setRanked] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getRanked(summoner.id)
      .then(setRanked)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.id])

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
        <div>
          <div className="profile-name">{displayName}</div>
          <div className="profile-region">Summoner · Level {summoner.summonerLevel}</div>
        </div>
      </div>

      <div className="section-label">Ranked</div>

      {loading && <div className="loading"><div className="spinner" /></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}
      {!loading && !error && (
        <div className="ranked-grid">
          <RankCard queue={soloQ} label="Solo / Duo" />
          <RankCard queue={flexQ}  label="Flex 5v5"  />
        </div>
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
