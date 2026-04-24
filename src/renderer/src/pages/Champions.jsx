import { useState, useEffect, useMemo } from 'react'

const MASTERY_COLOR = ['', '#888', '#888', '#888', '#5CB8E4', '#4CAF6A', '#9B59B6', '#C84040']
const MAX_POINTS_PER_LEVEL = [0, 1800, 6000, 12600, 21600, 36000, 52000, Infinity]

function formatPoints(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function Champions({ summoner, ddragon, appError }) {
  const [mastery, setMastery] = useState(null)
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState(null)
  const [search, setSearch]    = useState('')

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getMastery(summoner.id)
      .then(setMastery)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.id])

  const championById = useMemo(() => {
    if (!ddragon) return {}
    const map = {}
    Object.values(ddragon.champions).forEach(c => { map[parseInt(c.key)] = c })
    return map
  }, [ddragon])

  const filtered = useMemo(() => {
    if (!mastery) return []
    if (!search) return mastery
    const q = search.toLowerCase()
    return mastery.filter(m => {
      const champ = championById[m.championId]
      return champ?.name.toLowerCase().includes(q)
    })
  }, [mastery, search, championById])

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  return (
    <div className="page">
      <h1 className="page-title">Champions</h1>

      <div className="champ-toolbar">
        <input
          className="search-input"
          placeholder="Search champions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {mastery && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>Top {mastery.length} by mastery</span>}
      </div>

      {loading && <div className="loading"><div className="spinner" /><span>Loading mastery...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">No champions found.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="champ-grid">
          {filtered.map(m => {
            const champ = championById[m.championId]
            const imgUrl = champ && ddragon
              ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
              : null
            const lvl = m.championLevel
            const color = MASTERY_COLOR[Math.min(lvl, 7)] || '#888'
            const maxPts = MAX_POINTS_PER_LEVEL[Math.min(lvl, 7)]
            const pct = maxPts === Infinity ? 100 : Math.min(100, Math.round((m.championPoints / maxPts) * 100))

            return (
              <div className="champ-card" key={m.championId}>
                <div className="champ-img-wrap">
                  {imgUrl
                    ? <img src={imgUrl} alt={champ?.name} className="champ-img" />
                    : <div className="champ-img-placeholder">⚔</div>
                  }
                  <span className="mastery-level-badge" style={{ color, border: `1px solid ${color}55` }}>
                    M{lvl}
                  </span>
                </div>
                <div className="champ-body">
                  <div className="champ-name">{champ?.name ?? `Champion ${m.championId}`}</div>
                  <div className="champ-points">{formatPoints(m.championPoints)} pts</div>
                  <div className="champ-pts-bar-track">
                    <div className="champ-pts-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
