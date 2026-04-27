import { useState, useEffect, useRef } from 'react'

// ── Challenge tier config ─────────────────────────────
const TIER_ORDER = ['NONE', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
const TIER_COLOR = {
  NONE: '#555', IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', DIAMOND: '#5CB8E4',
  MASTER: '#9B59B6', GRANDMASTER: '#E55B4D', CHALLENGER: '#F0E6D3'
}
const TIER_SHORT = {
  NONE: '', IRON: 'I', BRONZE: 'B', SILVER: 'S', GOLD: 'G',
  PLATINUM: 'P', DIAMOND: 'D', MASTER: 'M', GRANDMASTER: 'GM', CHALLENGER: 'C'
}

// ── CS benchmarks (community standard) ──────────────
// Average: 7/min  |  Good: 8/min  |  Excellent: 9+/min
// User reference: 100 CS at 15 min = 6.67/min (average)
function getTargetCsRate(gameTimeSec) {
  if (gameTimeSec < 120)  return 0
  if (gameTimeSec < 600)  return 6.0   // early laning
  if (gameTimeSec < 900)  return 7.0   // mid laning
  if (gameTimeSec < 1200) return 7.5   // 15 min mark
  return 8.0                           // 20+ min, farm efficiency improves
}
function csColor(cs, gameTimeSec) {
  if (!gameTimeSec || gameTimeSec < 120) return TEXT
  const rate = cs / (gameTimeSec / 60)
  if (rate >= 8)   return GREEN
  if (rate >= 6.5) return GOLD
  return RED
}
function vsColor(vs, gameTimeSec) {
  if (!gameTimeSec || gameTimeSec < 120) return TEXT
  const rate = vs / (gameTimeSec / 60)
  if (rate >= 1.5) return GREEN
  if (rate >= 0.8) return GOLD
  return RED
}

// ── Item suggestion: champion class → desired DDragon item tags ──
const CLASS_ITEM_TAGS = {
  Marksman: ['Damage', 'AttackSpeed', 'CriticalStrike', 'LifeSteal'],
  Mage:     ['SpellDamage', 'CooldownReduction', 'Mana', 'MagicPenetration'],
  Fighter:  ['Damage', 'Health', 'CooldownReduction', 'LifeSteal'],
  Tank:     ['Health', 'Armor', 'SpellBlock', 'Tenacity'],
  Assassin: ['Damage', 'CooldownReduction', 'ArmorPenetration'],
  Support:  ['Mana', 'Health', 'CooldownReduction', 'GoldPer'],
}

const COLLAPSED = [272, 178]
const EXPANDED  = [306, 530]

const GOLD   = '#C89B3C'
const RED    = '#E44D4D'
const GREEN  = '#3DD68C'
const TEXT   = '#E8E4DC'
const DIM    = 'rgba(255,255,255,0.42)'
const LABEL  = 'rgba(255,255,255,0.26)'
const FONT   = 'Inter, -apple-system, system-ui, sans-serif'

const ANIM = `
  @keyframes ovPulse {
    0%,100% { box-shadow: 0 0 10px rgba(210,50,50,0.32); border-color: rgba(210,50,50,0.32); }
    50%      { box-shadow: 0 0 22px rgba(210,50,50,0.70); border-color: rgba(210,50,50,0.55); }
  }
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 2px; }
`

export default function OverlayApp() {
  const [expanded, setExpanded]             = useState(false)
  const [isDead, setIsDead]                 = useState(false)
  const [challenges, setChallenges]         = useState([])
  const [followed, setFollowed]             = useState([])
  const [opacity, setOpacity]               = useState(0.93)
  const [deathPulse, setDeathPulse]         = useState(true)
  const [showSettings, setShowSettings]     = useState(false)
  const [loading, setLoading]               = useState(true)
  const [liveStats, setLiveStats]           = useState(null)
  const [itemSuggestion, setItemSuggestion] = useState(null)
  const pollRef       = useRef(null)
  const itemDataRef   = useRef(null)   // cached DDragon item data
  const champCacheRef = useRef(null)   // { name, tags } — refreshed per champion

  // ── Init: load challenges + settings ─────────────
  useEffect(() => {
    window.api.resizeOverlay(...COLLAPSED)
    async function init() {
      const [puuid, followedIds, op, overlaySettings] = await Promise.all([
        window.api.getCachedPuuid(),
        window.api.getFollowedChallenges(),
        window.api.getOverlayOpacity(),
        window.api.getOverlaySettings()
      ])
      setFollowed(followedIds)
      setOpacity(op)
      setDeathPulse(overlaySettings?.showDeathPulse ?? true)
      if (puuid) {
        try {
          const [playerData, configs] = await Promise.all([
            window.api.getChallenges(puuid),
            window.api.getChallengeConfigs()
          ])
          if (playerData && configs) {
            const playerMap = {}
            playerData.challenges?.forEach(c => { playerMap[c.challengeId] = c })
            setChallenges(configs
              .filter(c => c.state === 'ENABLED' && c.localizedNames)
              .map(c => {
                const locale = c.localizedNames?.en_US || Object.values(c.localizedNames)[0] || {}
                const p = playerMap[c.id] || null
                const entries = Object.entries(c.thresholds || {})
                  .filter(([t]) => TIER_ORDER.includes(t))
                  .sort((a, b) => TIER_ORDER.indexOf(a[0]) - TIER_ORDER.indexOf(b[0]))
                const level   = p?.level || 'NONE'
                const value   = p?.value ?? 0
                const next    = entries.find(([t]) => TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(level))
                const nextVal = next ? (typeof next[1] === 'object' ? next[1].value : next[1]) : null
                const pct     = nextVal ? Math.min(100, Math.round((value / nextVal) * 100)) : 100
                return { id: c.id, name: locale.name || `Challenge ${c.id}`, level, value, pct, next, nextVal, isComplete: !next }
              })
            )
          }
        } catch {}
      }
      setLoading(false)
    }
    init()
  }, [])

  // ── Live game polling (every 3s) ──────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const live = await window.api.lcu.live()
        if (live?.activePlayer) {
          const me = live.allPlayers?.find(p => p.summonerName === live.activePlayer.summonerName)
          const s  = live.activePlayer.scores
          setIsDead(!!(me?.isDead))
          if (s) setLiveStats({
            k:         s.kills        ?? 0,
            d:         s.deaths       ?? 0,
            a:         s.assists      ?? 0,
            cs:        s.creepScore   ?? 0,
            wardScore: s.wardScore    ?? 0,
            champ:     live.activePlayer.championName || null,
            gold:      Math.floor(live.activePlayer.currentGold ?? 0),
            level:     live.activePlayer.level ?? 1,
            gameTime:  live.gameData?.gameTime ?? 0,
            items:     me?.items ?? [],
          })
        } else {
          setIsDead(false)
          setLiveStats(null)
        }
      } catch { setIsDead(false); setLiveStats(null) }
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  // ── Item suggestion: recompute when gold/items change ──
  useEffect(() => {
    if (!liveStats?.champ) { setItemSuggestion(null); return }
    let cancelled = false
    ;(async () => {
      try {
        // Load item data once and cache it
        if (!itemDataRef.current) {
          const data = await window.api.getItems()
          if (cancelled || !data?.data) return
          itemDataRef.current = data
        }

        // Load champion tags — re-fetch only when champion changes
        if (champCacheRef.current?.name !== liveStats.champ) {
          const ddragon = await window.api.getDDragon()
          if (cancelled) return
          const champ = Object.values(ddragon?.champions || {}).find(c => c.name === liveStats.champ)
          champCacheRef.current = { name: liveStats.champ, tags: champ?.tags || [] }
        }

        // Tags the current champion benefits from
        const wantedTags = champCacheRef.current.tags.flatMap(t => CLASS_ITEM_TAGS[t] || [])
        const ownedIds   = new Set((liveStats.items || []).map(i => String(i.itemID)))

        // Filter: completed Summoner's Rift items, not already owned, matching class
        const candidates = Object.entries(itemDataRef.current.data)
          .filter(([id, item]) =>
            !ownedIds.has(id) &&
            item.gold?.purchasable &&
            item.gold.total >= 2000 &&
            item.maps?.['11'] &&
            !(item.into?.length > 0) &&
            (wantedTags.length === 0 || item.tags?.some(t => wantedTags.includes(t)))
          )
          .map(([id, item]) => ({ id, ...item }))

        if (!candidates.length) { if (!cancelled) setItemSuggestion(null); return }

        // Prefer most expensive item player can afford; else cheapest unaffordable
        const gold       = liveStats.gold
        const affordable = candidates.filter(i => i.gold.total <= gold)
        const pick       = affordable.length
          ? affordable.sort((a, b) => b.gold.total - a.gold.total)[0]
          : candidates.sort((a, b) => a.gold.total - b.gold.total)[0]

        if (!cancelled) setItemSuggestion({
          name:      pick.name,
          id:        pick.id,
          cost:      pick.gold.total,
          canAfford: pick.gold.total <= gold,
          plaintext: pick.plaintext || '',
          version:   itemDataRef.current.version,
        })
      } catch { if (!cancelled) setItemSuggestion(null) }
    })()
    return () => { cancelled = true }
  }, [liveStats?.champ, liveStats?.gold, liveStats?.items?.length])

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (!next) setShowSettings(false)
    await window.api.resizeOverlay(...(next ? EXPANDED : COLLAPSED))
  }

  const handleOpacity    = async (v) => { const n = parseFloat(v); setOpacity(n); await window.api.saveOverlayOpacity(n) }
  const handleDeathPulse = async (v) => { setDeathPulse(v); await window.api.saveOverlaySettings({ showDeathPulse: v }) }

  const pinned     = challenges.filter(c => followed.includes(c.id))
  const deadActive = isDead && deathPulse

  const bg     = deadActive ? 'rgba(14,5,5,0.97)'    : 'rgba(11,11,15,0.96)'
  const border = deadActive ? 'rgba(210,50,50,0.35)' : 'rgba(255,255,255,0.09)'
  const accent = deadActive ? RED : GOLD

  // ── Collapsed view ───────────────────────────────
  if (!expanded) {
    const cCol = liveStats ? csColor(liveStats.cs, liveStats.gameTime) : DIM
    const vCol = liveStats ? vsColor(liveStats.wardScore, liveStats.gameTime) : DIM
    return (
      <div style={{ width: '100vw', height: '100vh', padding: 4, background: 'transparent', WebkitAppRegion: 'drag', fontFamily: FONT }}>
        <style>{ANIM}</style>
        <div style={{
          width: '100%', height: '100%',
          background: bg, border: `1px solid ${border}`, borderRadius: 8,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: deadActive ? 'none' : '0 2px 14px rgba(0,0,0,0.8)',
          animation: deadActive ? 'ovPulse 1.6s ease-in-out infinite' : 'none',
        }}>

          {/* Header: champ name | KDA | expand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px 6px', borderBottom: `1px solid rgba(255,255,255,0.06)`, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: deadActive ? '#E66' : liveStats ? TEXT : DIM, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.4px' }}>
              {deadActive ? '☠ DEAD' : liveStats?.champ?.toUpperCase() ?? '★ CHALLENGES'}
            </span>
            {liveStats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: GREEN }}>{liveStats.k}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', margin: '0 1px' }}>/</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: RED }}>{liveStats.d}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', margin: '0 1px' }}>/</span>
                <span style={{ fontSize: 15, fontWeight: 600, color: DIM }}>{liveStats.a}</span>
              </div>
            )}
            <div style={{ WebkitAppRegion: 'no-drag', marginLeft: 2 }}>
              <MiniBtn onClick={toggle} title="Expand">▾</MiniBtn>
            </div>
          </div>

          {/* Stats row: CS (pace-colored) | VS (pace-colored) | Gold */}
          {liveStats && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 3px', borderBottom: `1px solid rgba(255,255,255,0.05)`, flexShrink: 0 }}>
              <StatPill label="CS" value={liveStats.cs} color={cCol} />
              <Sep />
              <StatPill label="VS" value={liveStats.wardScore} color={vCol} />
              <Sep />
              <StatPill label="G" value={liveStats.gold >= 1000 ? `${(liveStats.gold / 1000).toFixed(1)}k` : liveStats.gold} color={GOLD} />
            </div>
          )}

          {/* Pinned challenges */}
          <div style={{ flex: 1, padding: '5px 7px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading && <span style={{ fontSize: 11, color: DIM }}>Loading...</span>}
            {!loading && pinned.length === 0 && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>No pins — add in Challenges tab</span>
            )}
            {!loading && pinned.map(c => <ChallengeRow key={c.id} c={c} deadActive={deadActive} compact />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Expanded view ────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', padding: 3, background: 'transparent', fontFamily: FONT }}>
      <style>{ANIM}</style>
      <div style={{
        width: '100%', height: '100%',
        background: bg, border: `1px solid ${border}`, borderRadius: 9,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: deadActive ? 'none' : '0 4px 20px rgba(0,0,0,0.85)',
        animation: deadActive ? 'ovPulse 1.6s ease-in-out infinite' : 'none',
      }}>

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderBottom: `1px solid rgba(255,255,255,0.07)`, WebkitAppRegion: 'drag', cursor: 'move', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: deadActive ? '#E66' : accent, letterSpacing: '1.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 8, letterSpacing: 2 }}>⠿</span>
            {deadActive ? '☠ Respawning' : showSettings ? 'Settings' : 'Live Overlay'}
          </span>
          <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}>
            <ActionBtn onClick={() => setShowSettings(s => !s)} active={showSettings} title="Settings">⚙</ActionBtn>
            <ActionBtn onClick={toggle} title="Collapse">−</ActionBtn>
            <ActionBtn onClick={() => window.api.hideOverlay()} danger title="Close">×</ActionBtn>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showSettings
            ? <SettingsPanel opacity={opacity} deathPulse={deathPulse} onOpacity={handleOpacity} onDeathPulse={handleDeathPulse} accent={accent} />
            : (
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {liveStats
                  ? <LiveCard stats={liveStats} deadActive={deadActive} accent={accent} itemSuggestion={itemSuggestion} />
                  : <div style={{ textAlign: 'center', padding: '20px 0', color: DIM, fontSize: 12 }}>Not in game</div>
                }
                <SectionLabel>Pinned Challenges</SectionLabel>
                {loading && <div style={{ fontSize: 11, color: DIM, textAlign: 'center', padding: 10 }}>Loading...</div>}
                {!loading && pinned.length === 0 && (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', textAlign: 'center', padding: '8px 0', lineHeight: 1.7 }}>
                    No pinned challenges.<br />Pin with ★ in the Challenges tab.
                  </div>
                )}
                {!loading && pinned.map(c => <ChallengeRow key={c.id} c={c} deadActive={deadActive} />)}
              </div>
            )
          }
        </div>

        {/* Footer drag strip */}
        <div style={{ height: 8, WebkitAppRegion: 'drag', cursor: 'move', flexShrink: 0, borderTop: `1px solid rgba(255,255,255,0.04)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 7, letterSpacing: 3 }}>⠿</span>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────

function Sep() {
  return <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.07)', margin: '0 6px', alignSelf: 'center' }} />
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 9, fontWeight: 700, color: LABEL, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{children}</div>
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: LABEL, letterSpacing: '0.5px' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || TEXT, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function ChallengeRow({ c, deadActive, compact }) {
  const col      = c.isComplete ? GREEN : (TIER_COLOR[c.level] || '#888')
  const barColor = deadActive ? '#C84040' : col
  const short    = TIER_SHORT[c.level] || ''
  return (
    <div title={c.name}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: compact ? 3 : 4 }}>
        <span style={{ fontSize: 11, color: TEXT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 6, lineHeight: 1.2 }}>
          {c.name}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: col, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {c.isComplete ? '✓' : `${c.pct}%`}
          {short ? <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>{short}</span> : null}
        </span>
      </div>
      <div style={{ height: compact ? 4 : 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${c.pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      {!compact && c.nextVal && (
        <div style={{ fontSize: 9, color: LABEL, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
          {c.value.toLocaleString()} / {c.nextVal.toLocaleString()}
          {c.next?.[0] ? <span style={{ color: TIER_COLOR[c.next[0]] || '#888', marginLeft: 4 }}>→ {c.next[0]}</span> : null}
        </div>
      )}
    </div>
  )
}

function LiveCard({ stats, deadActive, accent, itemSuggestion }) {
  const gameTimeMin = stats.gameTime > 0 ? stats.gameTime / 60 : 0
  const hasTime     = gameTimeMin > 0.5
  const csRate      = hasTime ? (stats.cs / gameTimeMin).toFixed(1) : null
  const csTarget    = hasTime ? Math.round(gameTimeMin * getTargetCsRate(stats.gameTime)) : null
  const csDiff      = csTarget != null ? stats.cs - csTarget : null
  const cCol        = csColor(stats.cs, stats.gameTime)
  const vsRate      = gameTimeMin > 1 ? (stats.wardScore / gameTimeMin).toFixed(1) : null
  const vCol        = vsColor(stats.wardScore, stats.gameTime)

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* Champion + Level + Game time */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: deadActive ? '#E77' : accent, textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stats.champ || 'In Game'}
        </span>
        <span style={{ fontSize: 10, color: DIM, flexShrink: 0, marginLeft: 6 }}>
          Lv <span style={{ color: TEXT, fontWeight: 600 }}>{stats.level}</span>
        </span>
      </div>

      {/* KDA — large, centred */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: GREEN, fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'center' }}>{stats.k}</span>
        <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.18)' }}>/</span>
        <span style={{ fontSize: 22, fontWeight: 700, color: RED,   fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'center' }}>{stats.d}</span>
        <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.18)' }}>/</span>
        <span style={{ fontSize: 22, fontWeight: 600, color: DIM,   fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'center' }}>{stats.a}</span>
      </div>

      {/* CS with pace bar */}
      {csRate && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: LABEL, letterSpacing: '0.5px' }}>CS</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: cCol, fontVariantNumeric: 'tabular-nums' }}>{stats.cs}</span>
              <span style={{ fontSize: 9, color: cCol }}>{csRate}/min</span>
            </div>
            {csDiff != null && (
              <span style={{ fontSize: 9, color: csDiff >= 0 ? GREEN : RED }}>
                {csDiff >= 0 ? `+${csDiff}` : String(csDiff)} vs target
              </span>
            )}
          </div>
          {csTarget != null && csTarget > 0 && (
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
              <div style={{ height: '100%', width: `${Math.min(100, Math.round((stats.cs / csTarget) * 100))}%`, background: cCol, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>
      )}

      {/* Gold + Vision score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatPill label="GOLD" value={stats.gold >= 1000 ? `${(stats.gold / 1000).toFixed(1)}k` : stats.gold} color={GOLD} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: LABEL, letterSpacing: '0.5px' }}>VS</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: vCol, fontVariantNumeric: 'tabular-nums' }}>{stats.wardScore}</span>
          {vsRate && <span style={{ fontSize: 9, color: vCol }}>{vsRate}/min</span>}
        </div>
      </div>

      {/* Item suggestion */}
      {itemSuggestion && <ItemSuggestion suggestion={itemSuggestion} currentGold={stats.gold} />}
    </div>
  )
}

function ItemSuggestion({ suggestion, currentGold }) {
  const pct      = Math.min(100, Math.round((currentGold / suggestion.cost) * 100))
  const barColor = suggestion.canAfford ? GREEN : GOLD
  const imgUrl   = suggestion.version
    ? `https://ddragon.leagueoflegends.com/cdn/${suggestion.version}/img/item/${suggestion.id}.png`
    : null

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 7 }}>
      <SectionLabel>Suggested Next</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, marginBottom: 5 }}>
        {imgUrl && (
          <img
            src={imgUrl} alt={suggestion.name}
            style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.10)' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suggestion.name}</div>
          {suggestion.plaintext && (
            <div style={{ fontSize: 10, color: DIM, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suggestion.plaintext}</div>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: suggestion.canAfford ? GREEN : GOLD, flexShrink: 0 }}>
          {suggestion.cost >= 1000 ? `${(suggestion.cost / 1000).toFixed(1)}k` : suggestion.cost}g
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 9, color: suggestion.canAfford ? GREEN : LABEL, marginTop: 3 }}>
        {suggestion.canAfford ? '✓ Can afford now' : `Need ${(suggestion.cost - currentGold).toLocaleString()}g more`}
      </div>
    </div>
  )
}

function SettingsPanel({ opacity, deathPulse, onOpacity, onDeathPulse, accent }) {
  return (
    <div style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <div>
        <SectionLabel>Opacity</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <input
            type="range" min="0.2" max="1" step="0.05" value={opacity}
            onChange={e => onOpacity(e.target.value)}
            style={{ flex: 1, accentColor: accent, height: 3 }}
          />
          <span style={{ fontSize: 12, color: TEXT, width: 34, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{Math.round(opacity * 100)}%</span>
        </div>
      </div>
      <div>
        <SectionLabel>Death Pulse</SectionLabel>
        <div
          onClick={() => onDeathPulse(!deathPulse)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', marginTop: 8 }}
        >
          <span style={{ fontSize: 12, color: TEXT }}>Pulse when dead</span>
          <Toggle on={deathPulse} color={accent} />
        </div>
      </div>
      <div style={{ padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: LABEL, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>Tip</div>
        <div style={{ fontSize: 11, color: DIM, lineHeight: 1.6 }}>
          For the overlay to stay on top during gameplay, set League of Legends to{' '}
          <span style={{ color: TEXT, fontWeight: 600 }}>Borderless Windowed</span> mode in Video settings.
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, color }) {
  return (
    <div style={{ width: 30, height: 16, borderRadius: 8, background: on ? `${color}88` : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: on ? 15 : 2, width: 12, height: 12, borderRadius: '50%', background: on ? color : '#555', transition: 'left 0.2s, background 0.2s' }} />
    </div>
  )
}

function MiniBtn({ onClick, title, children }) {
  return (
    <div onClick={onClick} title={title} style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: TEXT, lineHeight: 1, WebkitAppRegion: 'no-drag' }}>
      {children}
    </div>
  )
}

function ActionBtn({ onClick, title, children, active, danger }) {
  const bg    = danger ? 'rgba(200,50,50,0.22)'  : active ? 'rgba(200,155,60,0.20)' : 'rgba(255,255,255,0.07)'
  const color = danger ? RED : active ? GOLD : '#999'
  return (
    <div onClick={onClick} title={title} style={{ width: 18, height: 18, borderRadius: 4, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color, lineHeight: 1 }}>
      {children}
    </div>
  )
}
