import { useState, useEffect, useMemo, useCallback } from 'react'
import ChampionModal, { getMasteryColor, formatPoints, MAX_POINTS_PER_LEVEL } from '../components/ChampionModal'

function normalizeSearch(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

const CHAMP_CLASSES = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support']

export default function Champions({ summoner, ddragon, appError, initialSearch, onInitSearchConsumed, region }) {
  const [mastery, setMastery]           = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [search, setSearch]             = useState(initialSearch || '')
  const [selected, setSelected]         = useState(null)
  const [challengeMap, setChallengeMap] = useState({})
  const [configMap, setConfigMap]       = useState({})
  const [classFilter, setClassFilter]   = useState(null)
  const [unplayedOnly, setUnplayedOnly] = useState(false)
  const [pendingOpen, setPendingOpen]   = useState('')

  // Consume initial search and queue modal open
  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch)
      setPendingOpen(initialSearch)
      setClassFilter(null)
      setUnplayedOnly(false)
      onInitSearchConsumed?.()
    }
  }, [initialSearch])

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getAllMastery(summoner.puuid)
      .then(setMastery)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.puuid])

  useEffect(() => {
    if (!summoner?.puuid) return
    Promise.all([
      window.api.getChallenges(summoner.puuid).catch(() => null),
      window.api.getChallengeConfigs().catch(() => null),
    ]).then(([challengeData, configs]) => {
      if (challengeData?.challenges) {
        const map = {}
        challengeData.challenges.forEach(c => { map[c.challengeId] = c })
        setChallengeMap(map)
      }
      if (Array.isArray(configs)) {
        const map = {}
        configs.forEach(cfg => { map[cfg.id] = cfg })
        setConfigMap(map)
      }
    })
  }, [summoner?.puuid])

  const masteryById = useMemo(() => {
    if (!mastery) return {}
    const map = {}
    mastery.forEach(m => { map[m.championId] = m })
    return map
  }, [mastery])

  const championById = useMemo(() => {
    if (!ddragon) return {}
    const map = {}
    Object.values(ddragon.champions).forEach(c => { map[parseInt(c.key)] = c })
    return map
  }, [ddragon])

  // All champions merged: mastery data + unplayed champions from ddragon
  const allChampions = useMemo(() => {
    if (!ddragon) return []
    const allDDragon = Object.values(ddragon.champions)
    const result = allDDragon.map(champ => {
      const champId = parseInt(champ.key)
      const m = masteryById[champId] || null
      return { champ, m, pts: m?.championPoints || 0, lvl: m?.championLevel || 0, played: !!m }
    })
    // Sort: played champs by mastery points desc, then unplayed alphabetically
    result.sort((a, b) => {
      if (a.played !== b.played) return a.played ? -1 : 1
      if (b.pts !== a.pts) return b.pts - a.pts
      return a.champ.name.localeCompare(b.champ.name)
    })
    return result
  }, [ddragon, masteryById])

  // Auto-open modal when navigating from Profile (waits for allChampions to be ready)
  useEffect(() => {
    if (!pendingOpen || allChampions.length === 0) return
    const match = allChampions.find(({ champ }) => champ.name === pendingOpen)
    if (match) {
      const champId = parseInt(match.champ.key)
      setSelected({
        entry: match.m || { championId: champId, championLevel: 0, championPoints: 0 },
        champ: match.champ,
        rank: match.m ? allChampions.findIndex(c => c.champ.key === match.champ.key) : -1
      })
    }
    setPendingOpen('')
  }, [pendingOpen, allChampions])

  const filtered = useMemo(() => {
    let list = allChampions
    if (unplayedOnly) list = list.filter(c => !c.played)
    if (classFilter)  list = list.filter(({ champ }) => champ.tags?.includes(classFilter))
    if (search) {
      const q = normalizeSearch(search)
      list = list.filter(({ champ }) => normalizeSearch(champ.name).includes(q))
    }
    return list
  }, [allChampions, search, classFilter, unplayedOnly])

  const handleClose = useCallback(() => setSelected(null), [])

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  const playedCount = allChampions.filter(c => c.played).length

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
        {!loading && (
          <span style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {playedCount} played · {allChampions.length} total
          </span>
        )}
      </div>
      <div className="champ-filter-bar">
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={unplayedOnly ? 'unplayed' : (classFilter || 'all')}
          onChange={e => {
            const v = e.target.value
            if (v === 'all')      { setClassFilter(null); setUnplayedOnly(false) }
            else if (v === 'unplayed') { setClassFilter(null); setUnplayedOnly(true) }
            else                  { setClassFilter(v); setUnplayedOnly(false) }
          }}
        >
          <option value="all">All classes</option>
          <option value="unplayed">Unplayed</option>
          {CHAMP_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>
        {!loading && filtered.length !== allChampions.length && (
          <span style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
            {filtered.length} shown
          </span>
        )}
      </div>

      {loading && <div className="loading"><div className="spinner" /><span>Loading mastery...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">No champions found.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="champ-grid">
          {filtered.map(({ champ, m, pts, lvl }, idx) => {
            const champId = parseInt(champ.key)
            const imgUrl = ddragon
              ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
              : null
            const color = getMasteryColor(lvl)
            const maxPts = MAX_POINTS_PER_LEVEL[Math.min(lvl, 10)]
            const pct = !m ? 0 : (maxPts === Infinity ? 100 : Math.min(100, Math.round((pts / maxPts) * 100)))

            return (
              <div
                className="champ-card"
                key={champId}
                onClick={() => setSelected({
                  entry: m || { championId: champId, championLevel: 0, championPoints: 0 },
                  champ,
                  rank: m ? allChampions.findIndex(c => c.champ.key === champ.key) : -1
                })}
                style={{ cursor: 'pointer', opacity: m ? 1 : 0.55 }}
              >
                <div className="champ-img-wrap">
                  <div className="champ-img-placeholder">⚔</div>
                  {imgUrl && (
                    <img src={imgUrl} alt={champ.name} className="champ-img" draggable={false}
                      onError={e => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }} />
                  )}
                  <span className="mastery-level-badge" style={{ color, border: `1px solid ${color}55` }}>
                    {lvl > 0 ? `M${lvl}` : '—'}
                  </span>
                </div>
                <div className="champ-body">
                  <div className="champ-name">{champ.name}</div>
                  <div className="champ-points">{m ? `${formatPoints(pts)} pts` : 'Not played'}</div>
                  <div className="champ-pts-bar-track">
                    <div className="champ-pts-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <ChampionModal
          masteryEntry={selected.entry}
          champ={selected.champ}
          ddragon={ddragon}
          summoner={summoner}
          rank={selected.rank}
          onClose={handleClose}
          challengeMap={challengeMap}
          configMap={configMap}
          region={region}
        />
      )}
    </div>
  )
}
