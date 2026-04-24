import { useState, useEffect, useMemo } from 'react'

const FILTERS = ['All', 'Done', 'Remaining']

const TRACKERS = [
  {
    id: 'srank',
    label: 'S Rank Every Champion',
    desc: 'Earn a chest (S−/S/S+) on every champion this season',
    check: (m) => m?.chestGranted === true
  },
  {
    id: 'mastery5',
    label: 'Mastery 5 Every Champion',
    desc: 'Reach Mastery Level 5 on every champion',
    check: (m) => m && m.championLevel >= 5
  }
]

export default function Trackers({ summoner, ddragon, appError }) {
  const [mastery, setMastery]   = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [tracker, setTracker]   = useState('srank')
  const [filter, setFilter]     = useState('All')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getAllMastery(summoner.id)
      .then(setMastery)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.id])

  const masteryById = useMemo(() => {
    if (!mastery) return {}
    const map = {}
    mastery.forEach(m => { map[m.championId] = m })
    return map
  }, [mastery])

  const allChampions = useMemo(() => {
    if (!ddragon) return []
    return Object.values(ddragon.champions).sort((a, b) => a.name.localeCompare(b.name))
  }, [ddragon])

  const activeTracker = TRACKERS.find(t => t.id === tracker)

  const championsWithStatus = useMemo(() => {
    return allChampions.map(champ => ({
      ...champ,
      masteryData: masteryById[parseInt(champ.key)] || null,
      done: activeTracker.check(masteryById[parseInt(champ.key)] || null)
    }))
  }, [allChampions, masteryById, activeTracker])

  const doneCount = championsWithStatus.filter(c => c.done).length
  const total     = championsWithStatus.length
  const pct       = total ? Math.round((doneCount / total) * 100) : 0

  const filtered = useMemo(() => {
    let list = championsWithStatus
    if (filter === 'Done')      list = list.filter(c => c.done)
    if (filter === 'Remaining') list = list.filter(c => !c.done)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    return list
  }, [championsWithStatus, filter, search])

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  return (
    <div className="page">
      <h1 className="page-title">Trackers</h1>

      <div className="tracker-tabs">
        {TRACKERS.map(t => (
          <button
            key={t.id}
            className={`tracker-tab${tracker === t.id ? ' active' : ''}`}
            onClick={() => { setTracker(t.id); setFilter('All'); setSearch('') }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spinner" /><span>Loading champion data...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && mastery && (
        <>
          <div className="card card-gold tracker-hero">
            <div className="tracker-hero-top">
              <div>
                <div className="tracker-hero-label">{activeTracker.desc}</div>
                <div className="tracker-progress-nums">
                  <span className="tracker-done">{doneCount}</span>
                  <span className="tracker-sep"> / </span>
                  <span className="tracker-total">{total}</span>
                  <span className="tracker-pct"> · {pct}%</span>
                </div>
              </div>
              <div className="tracker-big-pct" style={{ color: pct === 100 ? 'var(--win)' : 'var(--gold)' }}>
                {pct}%
              </div>
            </div>
            <div className="tracker-bar-track">
              <div
                className="tracker-bar-fill"
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? 'var(--win)' : 'var(--gold)'
                }}
              />
            </div>
          </div>

          <div className="tracker-toolbar">
            <div className="filter-btns">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`filter-btn${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'Done' ? `✓ Done (${doneCount})` : f === 'Remaining' ? `✗ Remaining (${total - doneCount})` : `All (${total})`}
                </button>
              ))}
            </div>
            <input
              className="search-input"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="tracker-grid">
            {filtered.map(champ => {
              const imgUrl = ddragon
                ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
                : null
              const m = champ.masteryData

              return (
                <div key={champ.key} className={`tracker-card${champ.done ? ' done' : ' todo'}`}>
                  <div className="tracker-card-img-wrap">
                    {imgUrl
                      ? <img src={imgUrl} alt={champ.name} className="tracker-champ-img" />
                      : <div className="tracker-champ-placeholder">⚔</div>
                    }
                    <div className={`tracker-status-badge${champ.done ? ' done' : ' todo'}`}>
                      {champ.done ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="tracker-card-body">
                    <div className="tracker-champ-name">{champ.name}</div>
                    <div className="tracker-champ-detail">
                      {tracker === 'srank' && (
                        m ? (champ.done ? 'Chest earned' : `M${m.championLevel}`) : 'Not played'
                      )}
                      {tracker === 'mastery5' && (
                        m ? `M${m.championLevel}` : 'Not played'
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="empty-state">No champions match this filter.</div>
          )}
        </>
      )}
    </div>
  )
}
