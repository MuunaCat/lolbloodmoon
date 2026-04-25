import { useState, useEffect, useMemo } from 'react'

const TIER_ORDER = ['NONE', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']

const TIER_COLOR = {
  NONE: '#444', IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D',
  CHALLENGER: '#F0E6D3'
}

const CATEGORY_LABELS = {
  TEAMWORK: 'Teamwork', VETERANCY: 'Veterancy',
  IMAGINATION: 'Imagination', EXPERTISE: 'Expertise', COLLECTION: 'Collection'
}

const TRACKER_DEFS = [
  {
    id: 'srank',
    label: 'S Rank Every Champion',
    desc: 'Earn a chest (S−/S/S+) on every champion this season',
    check: (m) => m?.chestGranted === true,
    detail: (m) => m ? (m.chestGranted ? 'Chest earned' : `M${m.championLevel}`) : 'Not played'
  },
  {
    id: 'mastery5',
    label: 'Mastery 5 Every Champion',
    desc: 'Reach Mastery Level 5 on every champion',
    check: (m) => m && m.championLevel >= 5,
    detail: (m) => m ? `M${m.championLevel}` : 'Not played'
  }
]

const FILTERS = ['All', 'Done', 'Remaining']

function timeAgo(ms) {
  if (!ms) return null
  const diff = Date.now() - ms
  const d = Math.floor(diff / 86400000)
  if (d > 0) return `${d}d ago`
  const h = Math.floor(diff / 3600000)
  return h > 0 ? `${h}h ago` : 'Recently'
}

function tierPct(current, max) {
  if (!max) return 100
  return Math.min(100, Math.round((current / max) * 100))
}

export default function Challenges({ summoner, ddragon, appError }) {
  // Tracker state
  const [mastery, setMastery]               = useState(null)
  const [masteryLoading, setMasteryLoading] = useState(false)
  const [openTracker, setOpenTracker]       = useState(null)
  const [trackerFilter, setTrackerFilter]   = useState('All')
  const [trackerSearch, setTrackerSearch]   = useState('')
  const [srankOverrides, setSrankOverrides] = useState({})

  // Challenge state
  const [playerData, setPlayerData] = useState(null)
  const [configs, setConfigs]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [showAll, setShowAll]       = useState(false)
  const [followed, setFollowed]     = useState([])

  useEffect(() => {
    if (!summoner) return
    setMasteryLoading(true)
    window.api.getAllMastery(summoner.puuid)
      .then(setMastery)
      .catch(() => {})
      .finally(() => setMasteryLoading(false))
  }, [summoner?.puuid])

  useEffect(() => {
    window.api.getSrankOverrides().then(setSrankOverrides).catch(() => {})
    window.api.getFollowedChallenges().then(setFollowed).catch(() => {})
  }, [])

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    Promise.all([
      window.api.getChallenges(summoner.puuid),
      window.api.getChallengeConfigs()
    ])
      .then(([pd, cfg]) => { setPlayerData(pd); setConfigs(cfg) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.puuid])

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

  const toggleSrank = (champKey) => {
    const masteryData = masteryById[parseInt(champKey)] || null
    const apiDone = TRACKER_DEFS.find(t => t.id === 'srank').check(masteryData)
    const currentDone = srankOverrides[champKey] !== undefined ? srankOverrides[champKey] : apiDone
    const newOverrides = { ...srankOverrides, [champKey]: !currentDone }
    setSrankOverrides(newOverrides)
    window.api.saveSrankOverrides(newOverrides)
  }

  const trackerStats = useMemo(() => {
    return TRACKER_DEFS.map(t => {
      const withStatus = allChampions.map(c => {
        const masteryData = masteryById[parseInt(c.key)] || null
        const apiDone = t.check(masteryData)
        const done = t.id === 'srank' && srankOverrides[c.key] !== undefined
          ? srankOverrides[c.key]
          : apiDone
        return { ...c, masteryData, done, isManual: t.id === 'srank' && srankOverrides[c.key] !== undefined }
      })
      const done  = withStatus.filter(c => c.done).length
      const total = withStatus.length
      return { ...t, withStatus, done, total, pct: total ? Math.round((done / total) * 100) : 0 }
    })
  }, [allChampions, masteryById, srankOverrides])

  const toggleFollow = (id) => {
    const next = followed.includes(id) ? followed.filter(x => x !== id) : [...followed, id]
    setFollowed(next)
    window.api.saveFollowedChallenges(next)
  }

  const filteredTrackerChamps = useMemo(() => {
    const t = trackerStats.find(t => t.id === openTracker)
    if (!t) return []
    let list = t.withStatus
    if (trackerFilter === 'Done')      list = list.filter(c => c.done)
    if (trackerFilter === 'Remaining') list = list.filter(c => !c.done)
    if (trackerSearch) {
      const q = trackerSearch.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    return list
  }, [trackerStats, openTracker, trackerFilter, trackerSearch])

  // Challenges
  const merged = useMemo(() => {
    if (!configs || !playerData) return []
    const playerMap = {}
    playerData.challenges?.forEach(c => { playerMap[c.challengeId] = c })
    return configs
      .filter(c => c.state === 'ENABLED' && c.localizedNames)
      .map(c => {
        const locale = c.localizedNames?.en_US || Object.values(c.localizedNames)[0] || {}
        const p = playerMap[c.id] || null
        return {
          id: c.id,
          name: locale.name || `Challenge ${c.id}`,
          description: locale.description || locale.shortDescription || '',
          shortDescription: locale.shortDescription || '',
          thresholds: c.thresholds || {},
          tracking: c.tracking,
          level: p?.level || 'NONE',
          value: p?.value ?? 0,
          percentile: p?.percentile ?? null,
          achievedTime: p?.achievedTime ?? null,
          hasProgress: !!p && (p.value > 0 || p.level !== 'NONE')
        }
      })
      .sort((a, b) => {
        const ai = TIER_ORDER.indexOf(a.level)
        const bi = TIER_ORDER.indexOf(b.level)
        if (bi !== ai) return bi - ai
        return a.name.localeCompare(b.name)
      })
  }, [configs, playerData])

  const filtered = useMemo(() => {
    let list = showAll ? merged : merged.filter(c => c.hasProgress)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
    }
    return list
  }, [merged, showAll, search])

  const progressCount = merged.filter(c => c.hasProgress).length
  const totalLevel    = playerData?.totalPoints?.level || 'NONE'
  const totalColor    = TIER_COLOR[totalLevel] || '#888'
  const totalPts      = playerData?.totalPoints
  const categories    = playerData?.categoryPoints ? Object.entries(playerData.categoryPoints) : []

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  return (
    <div className="page">
      <h1 className="page-title">Challenges</h1>

      {/* ── Trackers ───────────────────────────── */}
      <div className="section-label">Trackers</div>

      {masteryLoading && <div className="loading" style={{ padding: '20px 0' }}><div className="spinner" /></div>}

      {!masteryLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {trackerStats.map(t => {
            const isOpen = openTracker === t.id
            return (
              <div key={t.id} className={`tracker-summary-card${isOpen ? ' open' : ''}`}>
                <div
                  className="tracker-summary-header"
                  onClick={() => { setOpenTracker(isOpen ? null : t.id); setTrackerFilter('All'); setTrackerSearch('') }}
                >
                  <div>
                    <div className="tracker-summary-label">{t.label}</div>
                    <div className="tracker-summary-desc">{t.desc}</div>
                  </div>
                  <div className="tracker-summary-right">
                    <span
                      className="tracker-summary-pct"
                      style={{ color: t.pct === 100 ? 'var(--win)' : 'var(--gold)' }}
                    >{t.pct}%</span>
                    <span className="tracker-summary-count">{t.done}/{t.total}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                <div className="tracker-bar-track" style={{ margin: '10px 0 0' }}>
                  <div
                    className="tracker-bar-fill"
                    style={{ width: `${t.pct}%`, background: t.pct === 100 ? 'var(--win)' : 'var(--gold)' }}
                  />
                </div>

                {isOpen && (
                  <div className="tracker-expanded">
                    <div className="tracker-toolbar" style={{ marginTop: 16 }}>
                      <div className="filter-btns">
                        {FILTERS.map(f => (
                          <button
                            key={f}
                            className={`filter-btn${trackerFilter === f ? ' active' : ''}`}
                            onClick={() => setTrackerFilter(f)}
                          >
                            {f === 'Done' ? `✓ Done (${t.done})` : f === 'Remaining' ? `✗ Remaining (${t.total - t.done})` : `All (${t.total})`}
                          </button>
                        ))}
                      </div>
                      <input
                        className="search-input"
                        placeholder="Search..."
                        value={trackerSearch}
                        onChange={e => setTrackerSearch(e.target.value)}
                      />
                    </div>

                    <div className="tracker-grid" style={{ marginTop: 12 }}>
                      {filteredTrackerChamps.map(champ => {
                        const imgUrl = ddragon
                          ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
                          : null
                        const isSrank = t.id === 'srank'
                        return (
                          <div
                            key={champ.key}
                            className={`tracker-card${champ.done ? ' done' : ' todo'}`}
                            onClick={isSrank ? () => toggleSrank(champ.key) : undefined}
                            style={isSrank ? { cursor: 'pointer' } : undefined}
                            title={isSrank ? (champ.done ? 'Click to mark as not done' : 'Click to mark as done') : undefined}
                          >
                            <div className="tracker-card-img-wrap">
                              {imgUrl
                                ? <img src={imgUrl} alt={champ.name} className="tracker-champ-img" />
                                : <div className="tracker-champ-placeholder">⚔</div>
                              }
                              <div className={`tracker-status-badge${champ.done ? ' done' : ' todo'}`}>
                                {champ.done ? '✓' : '✗'}
                              </div>
                              {champ.isManual && (
                                <div className="tracker-manual-badge" title="Manually set">M</div>
                              )}
                            </div>
                            <div className="tracker-card-body">
                              <div className="tracker-champ-name">{champ.name}</div>
                              <div className="tracker-champ-detail">{t.detail(champ.masteryData)}</div>
                            </div>
                          </div>
                        )
                      })}
                      {filteredTrackerChamps.length === 0 && (
                        <div className="empty-state" style={{ gridColumn: '1/-1' }}>No champions match.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Challenges ─────────────────────────── */}
      <div className="section-label">Challenges</div>

      {loading && <div className="loading"><div className="spinner" /><span>Loading challenges...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && playerData && (
        <>
          {/* Overview */}
          <div className="card card-gold ch-overview">
            <div className="ch-overview-left">
              <div className="section-label" style={{ margin: 0, marginBottom: 8 }}>Overall Level</div>
              <div className="ch-total-level" style={{ color: totalColor }}>{totalLevel}</div>
              {totalPts && (
                <>
                  <div className="ch-total-pts">{totalPts.current?.toLocaleString()} / {totalPts.max?.toLocaleString() ?? '—'} pts</div>
                  {totalPts.percentile != null && (
                    <div className="ch-percentile">Top {(totalPts.percentile * 100).toFixed(1)}% of players</div>
                  )}
                </>
              )}
            </div>
            <div className="ch-overview-cats">
              {categories.map(([key, cat]) => {
                const color = TIER_COLOR[cat.level] || '#888'
                const pct = tierPct(cat.current, cat.max)
                return (
                  <div key={key} className="ch-cat-mini">
                    <div className="ch-cat-mini-name">{CATEGORY_LABELS[key] || key}</div>
                    <div className="ch-cat-mini-level" style={{ color }}>{cat.level}</div>
                    <div className="ch-cat-bar-track">
                      <div className="ch-cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="ch-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                className="search-input"
                style={{ flex: 1, maxWidth: 300 }}
                placeholder="Search challenges..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button className={`filter-btn${showAll ? '' : ' active'}`} onClick={() => setShowAll(false)}>
                In Progress ({progressCount})
              </button>
              <button className={`filter-btn${showAll ? ' active' : ''}`} onClick={() => setShowAll(true)}>
                All ({merged.length})
              </button>
            </div>
            <div className="ch-count">{filtered.length} shown</div>
          </div>

          {/* Challenge list */}
          <div className="ch-list">
            {filtered.length === 0 && <div className="empty-state">No challenges match.</div>}
            {filtered.map(c => {
              const color = TIER_COLOR[c.level] || '#444'
              const isOpen = expanded === c.id
              const thresholdEntries = Object.entries(c.thresholds)
                .filter(([tier]) => TIER_ORDER.includes(tier))
                .sort((a, b) => TIER_ORDER.indexOf(a[0]) - TIER_ORDER.indexOf(b[0]))
              const nextThreshold = thresholdEntries.find(([tier]) => TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(c.level))
              const pct = nextThreshold ? tierPct(c.value, nextThreshold[1]?.value ?? nextThreshold[1]) : 100

              return (
                <div key={c.id} className={`ch-row${isOpen ? ' open' : ''}`}>
                  <div className="ch-row-header" onClick={() => setExpanded(isOpen ? null : c.id)}>
                    <div className="ch-row-left">
                      <span className="ch-tier-dot" style={{ background: color }} />
                      <div>
                        <div className="ch-row-name">{c.name}</div>
                        {c.shortDescription && !isOpen && (
                          <div className="ch-row-short">{c.shortDescription}</div>
                        )}
                      </div>
                    </div>
                    <div className="ch-row-right">
                      {c.level !== 'NONE' && (
                        <span className="ch-tier-badge" style={{ color, borderColor: `${color}44` }}>{c.level}</span>
                      )}
                      {c.value > 0 && <span className="ch-value">{c.value.toLocaleString()}</span>}
                      <button
                        className={`ch-pin-btn${followed.includes(c.id) ? ' pinned' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleFollow(c.id) }}
                        title={followed.includes(c.id) ? 'Unpin from overlay' : 'Pin to overlay'}
                      >
                        {followed.includes(c.id) ? '★' : '☆'}
                      </button>
                      <span className="ch-chevron">{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {c.hasProgress && !isOpen && nextThreshold && (
                    <div className="ch-mini-bar-wrap">
                      <div className="ch-mini-bar-track">
                        <div className="ch-mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )}

                  {isOpen && (
                    <div className="ch-expanded">
                      {c.description && <p className="ch-desc">{c.description}</p>}
                      <div className="ch-thresholds">
                        {thresholdEntries.map(([tier, data]) => {
                          const thVal = typeof data === 'object' ? data.value : data
                          const isCurrent = tier === c.level
                          const isNext = nextThreshold?.[0] === tier
                          const tierColor = TIER_COLOR[tier] || '#888'
                          const barPct = thVal ? Math.min(100, Math.round((c.value / thVal) * 100)) : 0
                          return (
                            <div key={tier} className={`ch-threshold-row${isCurrent ? ' current' : ''}${isNext ? ' next' : ''}`}>
                              <span className="ch-threshold-tier" style={{ color: tierColor }}>{tier}</span>
                              <span className="ch-threshold-val">{thVal?.toLocaleString()}</span>
                              <div className="ch-threshold-bar-track">
                                <div className="ch-threshold-bar-fill" style={{ width: `${barPct}%`, background: tierColor }} />
                              </div>
                              {isCurrent && <span className="ch-threshold-tag current">Current</span>}
                              {isNext && <span className="ch-threshold-tag next">Next</span>}
                            </div>
                          )
                        })}
                      </div>
                      <div className="ch-meta-row">
                        {c.percentile != null && (
                          <span className="ch-meta-item">Top {(c.percentile * 100).toFixed(1)}% of players</span>
                        )}
                        {c.achievedTime && (
                          <span className="ch-meta-item">Achieved {timeAgo(c.achievedTime)}</span>
                        )}
                        {c.tracking && <span className="ch-meta-item">{c.tracking}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
