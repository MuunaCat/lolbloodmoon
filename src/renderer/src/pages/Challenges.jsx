import { useState, useEffect } from 'react'

const TIER_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']

const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D',
  CHALLENGER: '#F0E6D3', NONE: '#444'
}

const CATEGORY_LABELS = {
  TEAMWORK: 'Teamwork',
  VETERANCY: 'Veterancy',
  IMAGINATION: 'Imagination',
  EXPERTISE: 'Expertise',
  COLLECTION: 'Collection'
}

function tierPct(level, current, max) {
  if (!max || max === 0) return 100
  return Math.min(100, Math.round((current / max) * 100))
}

export default function Challenges({ summoner, ddragon, appError }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getChallenges(summoner.puuid)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.puuid])

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  const totalLevel = data?.totalPoints?.level || 'NONE'
  const totalColor = TIER_COLOR[totalLevel] || '#888'
  const totalPts   = data?.totalPoints
  const pct        = totalPts ? tierPct(totalLevel, totalPts.current, totalPts.max) : 0
  const categories = data?.categoryPoints ? Object.entries(data.categoryPoints) : []

  return (
    <div className="page">
      <h1 className="page-title">Challenges</h1>

      {loading && <div className="loading"><div className="spinner" /><span>Loading challenges...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && data && (
        <>
          <div className="card card-gold challenges-hero">
            <div>
              <div style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-h)', marginBottom: 10 }}>
                Overall Level
              </div>
              <div className="challenge-total-level" style={{ color: totalColor }}>{totalLevel}</div>
              {totalPts && (
                <>
                  <div className="challenge-total-pts">{totalPts.current.toLocaleString()} / {totalPts.max?.toLocaleString() ?? '—'} points</div>
                  {totalPts.percentile != null && (
                    <div className="challenge-percentile">Top {(totalPts.percentile * 100).toFixed(1)}% of players</div>
                  )}
                  <div style={{ marginTop: 14, height: 4, background: 'var(--border-mid)', borderRadius: 2, overflow: 'hidden', maxWidth: 300 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: totalColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                  </div>
                </>
              )}
            </div>
          </div>

          {categories.length > 0 && (
            <>
              <div className="section-label">Categories</div>
              <div className="categories-grid">
                {categories.map(([key, cat]) => {
                  const color = TIER_COLOR[cat.level] || '#888'
                  const cp = tierPct(cat.level, cat.current, cat.max)
                  return (
                    <div className="card category-card" key={key} style={{ borderColor: `${color}22` }}>
                      <div className="category-name">{CATEGORY_LABELS[key] || key}</div>
                      <div className="category-level" style={{ color }}>{cat.level}</div>
                      <div className="category-pts">{cat.current?.toLocaleString()} / {cat.max?.toLocaleString() ?? '—'} pts</div>
                      <div className="category-bar-track">
                        <div className="category-bar-fill" style={{ width: `${cp}%`, background: color }} />
                      </div>
                      {cat.percentile != null && (
                        <div className="category-pct">Top {(cat.percentile * 100).toFixed(1)}%</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {data.challenges?.length > 0 && (
            <>
              <div className="section-label">Notable ({data.challenges.length} tracked)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.challenges.slice(0, 24).map(c => {
                  const color = TIER_COLOR[c.level] || '#444'
                  return (
                    <div key={c.challengeId} style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${color}33`,
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontSize: 12,
                      color: color
                    }}>
                      {c.level} · {c.value != null ? c.value.toLocaleString() : '—'}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
