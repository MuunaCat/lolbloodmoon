import { useState, useEffect, useMemo, useCallback } from 'react'

const MASTERY_COLOR = ['', '#888', '#888', '#888', '#5CB8E4', '#4CAF6A', '#9B59B6', '#C84040']
const MAX_POINTS_PER_LEVEL = [0, 1800, 6000, 12600, 21600, 36000, 52000, Infinity]

// Known mastery challenge IDs (confirmed via leagueofchallenges.com)
const CHALLENGE_ID_M5  = 401104  // "Master Yourself" — Earn Mastery 5 on N champs
const CHALLENGE_ID_M10 = 401107  // "Master the Enemy" — Earn Mastery 10 on N champs

const TIER_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']

function formatPoints(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function formatDate(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function kdaRatio(k, d, a) {
  if (d === 0) return 'Perfect'
  return ((k + a) / d).toFixed(2)
}

function getNextThreshold(thresholds, currentValue) {
  if (!thresholds) return null
  for (const tier of TIER_ORDER) {
    const t = thresholds[tier]
    if (t != null && currentValue < t) return { tier, value: t }
  }
  return null
}

const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0', GOLD: '#C89B3C',
  PLATINUM: '#4CAF6A', EMERALD: '#1FA657', DIAMOND: '#5CB8E4',
  MASTER: '#9B59B6', GRANDMASTER: '#E55B4D', CHALLENGER: '#F0E6D3'
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
  const maxPts = MAX_POINTS_PER_LEVEL[Math.min(lvl, 7)]
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

  const lvl     = masteryEntry.championLevel
  const pts     = masteryEntry.championPoints
  const color   = MASTERY_COLOR[Math.min(lvl, 7)] || '#888'
  const maxPts  = MAX_POINTS_PER_LEVEL[Math.min(lvl, 7)]
  const pct     = maxPts === Infinity ? 100 : Math.min(100, Math.round((pts / maxPts) * 100))
  const ptsToNext = maxPts === Infinity ? null : maxPts - pts

  const imgUrl = champ && ddragon
    ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
    : null

  // Build relevant challenges for this champion
  const relevantChallenges = useMemo(() => {
    const list = []

    // Level 5 Mastery Challenge (401104)
    const m5 = challengeMap[CHALLENGE_ID_M5]
    const m5cfg = configMap[CHALLENGE_ID_M5]
    if (m5cfg) {
      list.push({
        id: CHALLENGE_ID_M5,
        label: 'Level 5 Mastery Challenge',
        subLabel: 'Earn Mastery 5 on different champions',
        playerValue: m5?.value ?? 0,
        currentLevel: m5?.level,
        thresholds: m5cfg.thresholds,
        contributes: lvl >= 5,
        contributesNote: lvl >= 5 ? 'This champion counts' : `Reach M5 to count (currently M${lvl})`,
      })
    }

    // Class-based challenge: "Master <Tag>" (e.g. Master Fighter)
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
          subLabel: classCfg.localizedNames?.en_US?.shortDescription || `Earn high Mastery on ${tag}s`,
          playerValue: classChallenge?.value ?? 0,
          currentLevel: classChallenge?.level,
          thresholds: classCfg.thresholds,
          contributes: lvl >= 7,
          contributesNote: lvl >= 7 ? 'This champion counts (M7+)' : `Reach M7 to count (currently M${lvl})`,
        })
      }
    }

    // Master the Enemy (401107) — M10 challenge
    const m10 = challengeMap[CHALLENGE_ID_M10]
    const m10cfg = configMap[CHALLENGE_ID_M10]
    if (m10cfg) {
      list.push({
        id: CHALLENGE_ID_M10,
        label: 'Master the Enemy',
        subLabel: 'Earn Mastery 10 on different champions',
        playerValue: m10?.value ?? 0,
        currentLevel: m10?.level,
        thresholds: m10cfg.thresholds,
        contributes: lvl >= 10,
        contributesNote: lvl >= 10 ? 'This champion counts (M10)' : `Reach M10 to count (currently M${lvl})`,
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

  return (
    <div className="champ-modal-backdrop" onClick={handleBackdrop}>
      <div className="champ-modal">
        <button className="champ-modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="champ-modal-header">
          {imgUrl && <img src={imgUrl} alt={champ?.name} className="champ-modal-img" />}
          <div className="champ-modal-title-block">
            <div className="champ-modal-name">{champ?.name ?? `Champion ${masteryEntry.championId}`}</div>
            {champ?.title && <div className="champ-modal-subtitle">{champ.title}</div>}
            {champ?.tags?.length > 0 && (
              <div className="champ-modal-tags">
                {champ.tags.map(t => <span key={t} className="champ-tag">{t}</span>)}
              </div>
            )}
            {rank != null && <div className="champ-modal-rank">#{rank + 1} most played</div>}
          </div>
        </div>

        {/* Mastery */}
        <div className="champ-modal-section-title">Mastery</div>
        <div className="champ-modal-mastery-row">
          <div className="champ-modal-mastery-badge" style={{ color, borderColor: `${color}44` }}>
            M{lvl}
          </div>
          <div style={{ flex: 1 }}>
            <div className="champ-modal-pts-line">
              <span style={{ color }}>{formatPoints(pts)} pts</span>
              {ptsToNext != null && (
                <span className="champ-modal-pts-next">{formatPoints(ptsToNext)} to M{lvl + 1}</span>
              )}
            </div>
            <MasteryBar pts={pts} lvl={lvl} color={color} />
            <div className="champ-modal-meta">
              <span>Last played: {formatDate(masteryEntry.lastPlayTime)}</span>
              {masteryEntry.chestGranted && <span className="champ-chest-granted">✓ Chest earned</span>}
              {lvl >= 5 && masteryEntry.tokensEarned > 0 && (
                <span style={{ color: 'var(--gold)' }}>
                  {masteryEntry.tokensEarned} token{masteryEntry.tokensEarned !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Challenges */}
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

        {/* Recent stats */}
        <div className="champ-modal-section-title" style={{ marginTop: 20 }}>
          Recent Performance
          {matchStats?.sample > 0 && (
            <span className="champ-modal-section-sub">last {matchStats.sample} games of {matchStats.played} played</span>
          )}
        </div>
        {loadingStats && (
          <div className="loading" style={{ padding: '16px 0', justifyContent: 'flex-start' }}>
            <div className="spinner" /><span>Loading stats...</span>
          </div>
        )}
        {!loadingStats && matchStats && matchStats.played === 0 && (
          <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No recent games found with this champion.</div>
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

export default function Champions({ summoner, ddragon, appError }) {
  const [mastery, setMastery]           = useState(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [search, setSearch]             = useState('')
  const [selected, setSelected]         = useState(null)
  const [challengeMap, setChallengeMap] = useState({})  // { challengeId: playerChallenge }
  const [configMap, setConfigMap]       = useState({})  // { challengeId: challengeConfig }

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    window.api.getMastery(summoner.puuid)
      .then(setMastery)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.puuid])

  // Fetch challenge data + configs once (for the modal)
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

  const handleClose = useCallback(() => setSelected(null), [])

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
          {filtered.map((m, idx) => {
            const champ = championById[m.championId]
            const imgUrl = champ && ddragon
              ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
              : null
            const lvl   = m.championLevel
            const color = MASTERY_COLOR[Math.min(lvl, 7)] || '#888'
            const maxPts = MAX_POINTS_PER_LEVEL[Math.min(lvl, 7)]
            const pct   = maxPts === Infinity ? 100 : Math.min(100, Math.round((m.championPoints / maxPts) * 100))

            return (
              <div
                className="champ-card"
                key={m.championId}
                onClick={() => setSelected({ entry: m, champ, rank: idx })}
                style={{ cursor: 'pointer' }}
              >
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
