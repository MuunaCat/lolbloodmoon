import { useState, useEffect, useMemo, useCallback } from 'react'

const MASTERY_COLORS = {
  0: '#444', 1: '#5C5C5C', 2: '#7A7A7A', 3: '#9A9A9A',
  4: '#CD7F32', 5: '#4CAF6A', 6: '#9B59B6', 7: '#C84040',
  8: '#C89B3C', 9: '#E4C87A', 10: '#F0E6D3'
}
const getMasteryColor = (lvl) => MASTERY_COLORS[Math.min(Math.max(lvl || 0, 0), 10)] || '#444'

const MAX_POINTS_PER_LEVEL = [0, 1800, 6000, 12600, 21600, 36000, 52000, Infinity, Infinity, Infinity, Infinity]

const CHALLENGE_ID_M5  = 401104
const CHALLENGE_ID_M10 = 401107

const TIER_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']

const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0', GOLD: '#C89B3C',
  PLATINUM: '#4CAF6A', EMERALD: '#1FA657', DIAMOND: '#5CB8E4',
  MASTER: '#9B59B6', GRANDMASTER: '#E55B4D', CHALLENGER: '#F0E6D3'
}

function formatPoints(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function kdaRatio(k, d, a) {
  if (d === 0) return 'Perfect'
  return ((k + a) / d).toFixed(2)
}

function normalizeSearch(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getNextThreshold(thresholds, currentValue) {
  if (!thresholds) return null
  for (const tier of TIER_ORDER) {
    const t = thresholds[tier]
    if (t != null && currentValue < t) return { tier, value: t }
  }
  return null
}

function ChallengeProgressRow({ label, subLabel, playerValue, thresholds, currentLevel, contributes, contributesNote }) {
  const next = getNextThreshold(thresholds, playerValue)
  const pct  = next ? Math.min(100, Math.round((playerValue / next.value) * 100)) : 100
  const tierColor = TIER_COLOR[currentLevel] || '#888'

  return (
    <div className="champ-challenge-row">
      <div className="champ-challenge-row-header">
        <div>
          <div className="champ-challenge-name">{label}</div>
          {subLabel && <div className="champ-challenge-sub">{subLabel}</div>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {currentLevel && (
            <span className="champ-challenge-tier" style={{ color: tierColor, borderColor: `${tierColor}44` }}>
              {currentLevel}
            </span>
          )}
        </div>
      </div>
      <div className="champ-challenge-progress-row">
        <div className="champ-pts-bar-track" style={{ flex: 1 }}>
          <div className="champ-pts-bar-fill" style={{ width: `${pct}%`, background: tierColor }} />
        </div>
        <span className="champ-challenge-val">
          {Math.round(playerValue)}{next ? ` / ${next.value}` : ' ✓'}
        </span>
      </div>
      {contributes != null && (
        <div className={`champ-challenge-contrib ${contributes ? 'yes' : 'no'}`}>
          {contributes ? `✓ ${contributesNote}` : `○ ${contributesNote}`}
        </div>
      )}
    </div>
  )
}

function MasteryBar({ pts, lvl, color }) {
  const maxPts = MAX_POINTS_PER_LEVEL[Math.min(lvl || 0, 10)]
  const pct = maxPts === Infinity ? 100 : Math.min(100, Math.round((pts / maxPts) * 100))
  return (
    <div className="champ-pts-bar-track" style={{ height: 4 }}>
      <div className="champ-pts-bar-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function ChampionModal({ masteryEntry, champ, ddragon, summoner, rank, onClose, challengeMap, configMap }) {
  const [matchStats, setMatchStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const lvl     = masteryEntry.championLevel || 0
  const pts     = masteryEntry.championPoints || 0
  const color   = getMasteryColor(lvl)
  const maxPts  = MAX_POINTS_PER_LEVEL[Math.min(lvl, 10)]
  const pct     = maxPts === Infinity ? 100 : Math.min(100, Math.round((pts / maxPts) * 100))
  const ptsToNext = maxPts === Infinity ? null : maxPts - pts

  const imgUrl = champ && ddragon
    ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
    : null

  const relevantChallenges = useMemo(() => {
    const list = []

    const m5 = challengeMap[CHALLENGE_ID_M5]
    const m5cfg = configMap[CHALLENGE_ID_M5]
    if (m5cfg) {
      list.push({
        id: CHALLENGE_ID_M5,
        label: 'Master Yourself',
        subLabel: 'Earn Mastery Level 5 on different champions',
        playerValue: m5?.value ?? 0,
        currentLevel: m5?.level,
        thresholds: m5cfg.thresholds,
        contributes: lvl >= 5,
        contributesNote: lvl >= 5 ? 'This champion counts' : `Reach Mastery 5 to count (currently M${lvl})`,
      })
    }

    for (const tag of (champ?.tags || [])) {
      const className = `Master ${tag}`
      const classCfg = Object.values(configMap).find(cfg => {
        const name = cfg.localizedNames?.en_US?.name || cfg.localizedNames?.en_GB?.name || ''
        return name === className
      })
      if (classCfg) {
        const classChallenge = challengeMap[classCfg.id]
        list.push({
          id: classCfg.id,
          label: className,
          subLabel: `Earn Mastery 7 on different ${tag} champions`,
          playerValue: classChallenge?.value ?? 0,
          currentLevel: classChallenge?.level,
          thresholds: classCfg.thresholds,
          contributes: lvl >= 7,
          contributesNote: lvl >= 7 ? 'This champion counts (Mastery 7+)' : `Reach Mastery 7 to count (currently M${lvl})`,
        })
      }
    }

    const m10 = challengeMap[CHALLENGE_ID_M10]
    const m10cfg = configMap[CHALLENGE_ID_M10]
    if (m10cfg) {
      list.push({
        id: CHALLENGE_ID_M10,
        label: 'Master the Enemy',
        subLabel: 'Earn Mastery Level 10 on different champions',
        playerValue: m10?.value ?? 0,
        currentLevel: m10?.level,
        thresholds: m10cfg.thresholds,
        contributes: lvl >= 10,
        contributesNote: lvl >= 10 ? 'This champion counts (Mastery 10)' : `Reach Mastery 10 to count (currently M${lvl})`,
      })
    }

    return list
  }, [challengeMap, configMap, lvl, champ])

  useEffect(() => {
    if (!summoner?.puuid || !masteryEntry.championId) return
    setLoadingStats(true)
    window.api.getChampionMatchIds(summoner.puuid, masteryEntry.championId)
      .then(async ids => {
        if (!ids || ids.length === 0) { setMatchStats({ played: 0 }); return }
        const batch = ids.slice(0, 10)
        const results = await Promise.all(batch.map(id => window.api.getMatch(id).catch(() => null)))
        const valid = results.filter(Boolean)
        let wins = 0, kills = 0, deaths = 0, assists = 0, cs = 0
        for (const m of valid) {
          const me = m.info.participants.find(p => p.puuid === summoner.puuid)
          if (!me) continue
          if (me.win) wins++
          kills   += me.kills
          deaths  += me.deaths
          assists += me.assists
          cs      += (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0)
        }
        const n = valid.length
        setMatchStats({
          played: ids.length, sample: n, wins, losses: n - wins,
          wr: n ? Math.round((wins / n) * 100) : 0,
          avgK: n ? (kills / n).toFixed(1) : 0,
          avgD: n ? (deaths / n).toFixed(1) : 0,
          avgA: n ? (assists / n).toFixed(1) : 0,
          avgKda: n && deaths > 0 ? kdaRatio(kills, deaths, assists) : 'Perfect',
          avgCs: n ? Math.round(cs / n) : 0,
        })
      })
      .catch(() => setMatchStats(null))
      .finally(() => setLoadingStats(false))
  }, [summoner?.puuid, masteryEntry.championId])

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const masteryLabel = lvl === 0 ? 'Not played' : `Mastery ${lvl}`

  return (
    <div className="champ-modal-backdrop" onClick={handleBackdrop}>
      <div className="champ-modal">
        <button className="champ-modal-close" onClick={onClose}>✕</button>

        <div className="champ-modal-header">
          {imgUrl && <img src={imgUrl} alt={champ?.name} className="champ-modal-img" draggable={false}
            onError={e => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none' }} />}
          <div className="champ-modal-title-block">
            <div className="champ-modal-name">{champ?.name ?? `Champion ${masteryEntry.championId}`}</div>
            {champ?.title && <div className="champ-modal-subtitle">{champ.title}</div>}
            {champ?.tags?.length > 0 && (
              <div className="champ-modal-tags">
                {champ.tags.map(t => <span key={t} className="champ-tag">{t}</span>)}
              </div>
            )}
            {rank != null && rank >= 0 && <div className="champ-modal-rank">#{rank + 1} most played</div>}
          </div>
        </div>

        <div className="champ-modal-section-title">Mastery</div>
        <div className="champ-modal-mastery-row">
          <div className="champ-modal-mastery-badge" style={{ color, borderColor: `${color}44` }}>
            {lvl > 0 ? `M${lvl}` : '—'}
          </div>
          <div style={{ flex: 1 }}>
            <div className="champ-modal-pts-line">
              <span style={{ color, fontWeight: 700 }}>{masteryLabel}</span>
              <span style={{ color: 'var(--text-mid)', fontSize: 13 }}>{formatPoints(pts)} pts</span>
              {ptsToNext != null && lvl > 0 && (
                <span className="champ-modal-pts-next">{formatPoints(ptsToNext)} to M{lvl + 1}</span>
              )}
            </div>
            {lvl > 0 && <MasteryBar pts={pts} lvl={lvl} color={color} />}
            <div className="champ-modal-meta">
              {masteryEntry.lastPlayTime > 0 && <span>Last played: {formatDate(masteryEntry.lastPlayTime)}</span>}
              {masteryEntry.chestGranted && <span className="champ-chest-granted">✓ Chest earned</span>}
              {lvl >= 5 && masteryEntry.tokensEarned > 0 && (
                <span style={{ color: 'var(--gold)' }}>
                  {masteryEntry.tokensEarned} token{masteryEntry.tokensEarned !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {relevantChallenges.length > 0 && (
          <>
            <div className="champ-modal-section-title">Related Challenges</div>
            <div className="champ-challenges-list">
              {relevantChallenges.map(ch => (
                <ChallengeProgressRow key={ch.id} {...ch} />
              ))}
            </div>
          </>
        )}

        <div className="champ-modal-section-title" style={{ marginTop: 20 }}>
          Recent Performance
          {matchStats?.sample > 0 && (
            <span className="champ-modal-section-sub"> — last {matchStats.sample} of {matchStats.played} games</span>
          )}
        </div>
        {loadingStats && (
          <div className="loading" style={{ padding: '16px 0', justifyContent: 'flex-start' }}>
            <div className="spinner" /><span>Loading stats...</span>
          </div>
        )}
        {!loadingStats && matchStats && matchStats.played === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No recorded games with this champion.</div>
        )}
        {!loadingStats && matchStats && matchStats.played > 0 && (
          <div className="champ-modal-stats-grid">
            <div className="champ-stat-block">
              <div className="champ-stat-val" style={{ color: matchStats.wr >= 50 ? 'var(--win)' : 'var(--loss)' }}>{matchStats.wr}%</div>
              <div className="champ-stat-label">Win Rate</div>
              <div className="champ-stat-sub">{matchStats.wins}W {matchStats.losses}L</div>
            </div>
            <div className="champ-stat-block">
              <div className="champ-stat-val">
                <span className="win-text">{matchStats.avgK}</span>
                <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>/</span>
                <span className="loss-text">{matchStats.avgD}</span>
                <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>/</span>
                <span style={{ color: 'var(--text-mid)' }}>{matchStats.avgA}</span>
              </div>
              <div className="champ-stat-label">Avg KDA</div>
              <div className="champ-stat-sub">{matchStats.avgKda} ratio</div>
            </div>
            <div className="champ-stat-block">
              <div className="champ-stat-val" style={{ color: 'var(--text-mid)' }}>{matchStats.avgCs}</div>
              <div className="champ-stat-label">Avg CS</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const CHAMP_CLASSES = ['Fighter', 'Tank', 'Mage', 'Assassin', 'Marksman', 'Support']

export default function Champions({ summoner, ddragon, appError, initialSearch, onInitSearchConsumed }) {
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
        <div className="filter-btns" style={{ flexWrap: 'wrap' }}>
          <button
            className={`filter-btn${!classFilter && !unplayedOnly ? ' active' : ''}`}
            onClick={() => { setClassFilter(null); setUnplayedOnly(false) }}
          >All</button>
          <button
            className={`filter-btn${unplayedOnly ? ' active' : ''}`}
            onClick={() => { setUnplayedOnly(v => !v); setClassFilter(null) }}
          >Unplayed</button>
          {CHAMP_CLASSES.map(cls => (
            <button
              key={cls}
              className={`filter-btn${classFilter === cls ? ' active' : ''}`}
              onClick={() => { setClassFilter(classFilter === cls ? null : cls); setUnplayedOnly(false) }}
            >{cls}</button>
          ))}
        </div>
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
        />
      )}
    </div>
  )
}
