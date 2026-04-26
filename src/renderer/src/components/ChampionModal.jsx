import { useState, useEffect, useMemo } from 'react'

export const MASTERY_COLORS = {
  0: '#444', 1: '#5C5C5C', 2: '#7A7A7A', 3: '#9A9A9A',
  4: '#CD7F32', 5: '#4CAF6A', 6: '#9B59B6', 7: '#C84040',
  8: '#C89B3C', 9: '#E4C87A', 10: '#F0E6D3'
}
export const getMasteryColor = (lvl) => MASTERY_COLORS[Math.min(Math.max(lvl || 0, 0), 10)] || '#444'
export const MAX_POINTS_PER_LEVEL = [0, 1800, 6000, 12600, 21600, 36000, 52000, Infinity, Infinity, Infinity, Infinity]
export function formatPoints(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const CHALLENGE_ID_M5  = 401104
const CHALLENGE_ID_M10 = 401107

const TIER_ORDER = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
const TIER_COLOR = {
  IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0', GOLD: '#C89B3C',
  PLATINUM: '#4CAF6A', EMERALD: '#1FA657', DIAMOND: '#5CB8E4',
  MASTER: '#9B59B6', GRANDMASTER: '#E55B4D', CHALLENGER: '#F0E6D3'
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

export default function ChampionModal({ masteryEntry, champ, ddragon, summoner, rank, onClose, challengeMap, configMap }) {
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
    const targetChampId = masteryEntry.championId
    setLoadingStats(true)
    setMatchStats(null)
    window.api.getChampionMatchIds(summoner.puuid, targetChampId)
      .then(async ids => {
        if (!ids || ids.length === 0) { setMatchStats({ played: 0 }); return }
        // Fetch up to 20 to have enough after filtering — Riot's champion filter isn't always reliable
        const batch = ids.slice(0, 20)
        const results = await Promise.all(batch.map(id => window.api.getMatch(id).catch(() => null)))
        // Only count games where the player actually played this specific champion
        const valid = results.filter(m => {
          if (!m || m.__restricted) return false
          const me = m.info.participants.find(p => p.puuid === summoner.puuid)
          return !!(me && me.championId === targetChampId)
        })
        if (valid.length === 0) { setMatchStats({ played: ids.length, sample: 0 }); return }
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
