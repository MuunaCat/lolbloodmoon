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

export default function Challenges({ summoner, appError }) {
  const [playerData, setPlayerData] = useState(null)
  const [configs, setConfigs]       = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [search, setSearch]         = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [showAll, setShowAll]       = useState(false)
  const [catFilter, setCatFilter]   = useState('ALL')

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
              <button
                className={`filter-btn${showAll ? '' : ' active'}`}
                onClick={() => setShowAll(false)}
              >
                In Progress ({progressCount})
              </button>
              <button
                className={`filter-btn${showAll ? ' active' : ''}`}
                onClick={() => setShowAll(true)}
              >
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
                      {c.value > 0 && (
                        <span className="ch-value">{c.value.toLocaleString()}</span>
                      )}
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
                        {c.tracking && (
                          <span className="ch-meta-item">{c.tracking}</span>
                        )}
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
