import { useState, useEffect, useRef } from 'react'

const TIER_ORDER = ['NONE', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
const TIER_COLOR = {
  NONE: '#555', IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D', CHALLENGER: '#F0E6D3'
}
const TIER_SHORT = {
  NONE: '', IRON: 'I', BRONZE: 'B', SILVER: 'S', GOLD: 'G',
  PLATINUM: 'P', EMERALD: 'E', DIAMOND: 'D', MASTER: 'M',
  GRANDMASTER: 'GM', CHALLENGER: 'C'
}

const COLLAPSED = [240, 130]
const EXPANDED  = [270, 370]

export default function OverlayApp() {
  const [expanded, setExpanded]         = useState(false)
  const [isDead, setIsDead]             = useState(false)
  const [challenges, setChallenges]     = useState([])
  const [followed, setFollowed]         = useState([])
  const [opacity, setOpacity]           = useState(0.93)
  const [deathPulse, setDeathPulse]     = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [liveStats, setLiveStats]       = useState(null)
  const pollRef = useRef(null)

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
                const level = p?.level || 'NONE'
                const value = p?.value ?? 0
                const next  = entries.find(([t]) => TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(level))
                const nextVal = next ? (typeof next[1] === 'object' ? next[1].value : next[1]) : null
                const pct = nextVal ? Math.min(100, Math.round((value / nextVal) * 100)) : 100
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

  useEffect(() => {
    const poll = async () => {
      try {
        const live = await window.api.lcu.live()
        if (live?.activePlayer) {
          setIsDead(!!live.activePlayer.isDead)
          const s = live.activePlayer.scores
          if (s) setLiveStats({
            k: s.kills ?? 0, d: s.deaths ?? 0, a: s.assists ?? 0, cs: s.creepScore ?? 0,
            champ: live.activePlayer.championName || null
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

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (!next) setShowSettings(false)
    await window.api.resizeOverlay(...(next ? EXPANDED : COLLAPSED))
  }

  const handleOpacity    = async (v) => { const n = parseFloat(v); setOpacity(n); await window.api.saveOverlayOpacity(n) }
  const handleDeathPulse = async (v) => { setDeathPulse(v); await window.api.saveOverlaySettings({ showDeathPulse: v }) }

  const pinned    = challenges.filter(c => followed.includes(c.id))
  const deadActive = isDead && deathPulse

  const gold  = deadActive ? '#C84040' : '#C89B3C'
  const cardBg     = deadActive ? 'rgba(14,4,4,0.97)' : 'rgba(8,8,8,0.97)'
  const cardBorder = `1px solid ${deadActive ? 'rgba(200,50,50,0.4)' : 'rgba(200,155,60,0.2)'}`

  const ANIM = `@keyframes ovPulse{0%,100%{box-shadow:0 0 10px rgba(220,50,50,0.35)}50%{box-shadow:0 0 22px rgba(220,50,50,0.75)}}`

  // ── Collapsed: compact widget ─────────────────
  if (!expanded) {
    return (
      <div style={{ width: '100vw', height: '100vh', background: 'transparent', padding: 4, WebkitAppRegion: 'drag' }}>
        <style>{ANIM}</style>
        <div style={{
          width: '100%', height: '100%', background: cardBg, border: cardBorder,
          borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: deadActive ? '0 0 14px rgba(200,30,30,0.4)' : '0 2px 10px rgba(0,0,0,0.7)',
          animation: deadActive ? 'ovPulse 1s ease-in-out infinite' : 'none',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 7px', background: deadActive ? 'rgba(200,50,50,0.08)' : 'rgba(200,155,60,0.06)', borderBottom: `1px solid ${deadActive ? 'rgba(200,50,50,0.14)' : 'rgba(200,155,60,0.1)'}`, flexShrink: 0, gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: deadActive ? '#E55' : gold, letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>
              {deadActive ? '☠' : liveStats ? '⚔' : '★'}{' '}
              {liveStats?.champ
                ? <span style={{ textTransform: 'none', letterSpacing: 0 }}>{liveStats.champ}</span>
                : (deadActive ? 'Dead' : 'Challenges')
              }
            </span>
            {liveStats && (
              <span style={{ fontSize: 9, color: '#aaa', fontVariantNumeric: 'tabular-nums', marginRight: 4 }}>
                <span style={{ color: '#3DD68C' }}>{liveStats.k}</span>
                <span style={{ color: '#555' }}>/</span>
                <span style={{ color: '#E44D4D' }}>{liveStats.d}</span>
                <span style={{ color: '#555' }}>/</span>
                <span>{liveStats.a}</span>
                <span style={{ color: '#666', marginLeft: 4 }}>{liveStats.cs}cs</span>
              </span>
            )}
            <div style={{ WebkitAppRegion: 'no-drag' }}>
              <MiniBtn onClick={toggle} title="Expand">▼</MiniBtn>
            </div>
          </div>

          {/* Challenge mini-rows */}
          <div style={{ flex: 1, padding: '3px 7px 3px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {loading && <span style={{ fontSize: 9, color: '#555' }}>Loading...</span>}
            {!loading && pinned.length === 0 && (
              <span style={{ fontSize: 9, color: '#444', lineHeight: 1.6 }}>No pins — add in Challenges tab</span>
            )}
            {!loading && pinned.map(c => {
              const col  = c.isComplete ? '#3DD68C' : (TIER_COLOR[c.level] || '#888')
              const bar  = deadActive ? '#C84040' : col
              const abbr = c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name
              const short = TIER_SHORT[c.level] || ''
              return (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 9, color: '#ccc', width: 82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{abbr}</span>
                  <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${c.pct}%`, background: bar, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 8, color: col, width: 24, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {c.isComplete ? '✓' : `${c.pct}%`}
                  </span>
                  {short && <span style={{ fontSize: 7, color: col, width: 12, flexShrink: 0, textAlign: 'right' }}>{short}</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Expanded: full detail panel ───────────────
  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent', padding: 3 }}>
      <style>{ANIM}</style>
      <div style={{ width: '100%', height: '100%', background: cardBg, border: cardBorder, borderRadius: 9, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif', boxShadow: deadActive ? '0 0 14px rgba(200,30,30,0.4)' : '0 2px 12px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ padding: '5px 8px', background: deadActive ? 'rgba(200,50,50,0.08)' : 'rgba(200,155,60,0.06)', borderBottom: `1px solid ${deadActive ? 'rgba(200,50,50,0.14)' : 'rgba(200,155,60,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', WebkitAppRegion: 'drag', cursor: 'move', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: deadActive ? '#E55' : gold, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'rgba(200,155,60,0.35)', letterSpacing: 2, fontSize: 8 }}>⠿</span>
            {deadActive ? '☠ Respawning' : showSettings ? '⚙ Settings' : '★ Challenges'}
          </span>
          <div style={{ display: 'flex', gap: 3, WebkitAppRegion: 'no-drag' }}>
            <Btn onClick={() => setShowSettings(s => !s)} color={showSettings ? gold : '#777'} bg={showSettings ? 'rgba(200,155,60,0.16)' : 'rgba(255,255,255,0.06)'} title="Settings">⚙</Btn>
            <Btn onClick={toggle} color="#777" title="Collapse">−</Btn>
            <Btn onClick={() => window.api.hideOverlay()} color="#E44D4D" bg="rgba(180,40,40,0.22)" title="Close">×</Btn>
          </div>
        </div>

        {showSettings ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 7 }}>Opacity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e => handleOpacity(e.target.value)} style={{ flex: 1, accentColor: gold, height: 3 }} />
                <span style={{ fontSize: 10, color: '#aaa', width: 30, textAlign: 'right', flexShrink: 0 }}>{Math.round(opacity * 100)}%</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 8, color: '#666', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 7 }}>Death Pulse</div>
              <div onClick={() => handleDeathPulse(!deathPulse)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 10, color: '#bbb' }}>Pulse when dead</span>
                <div style={{ width: 30, height: 16, borderRadius: 8, background: deathPulse ? 'rgba(200,155,60,0.65)' : 'rgba(255,255,255,0.08)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: deathPulse ? 15 : 2, width: 12, height: 12, borderRadius: '50%', background: deathPulse ? gold : '#444', transition: 'left 0.2s, background 0.2s' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
            {loading && <div style={{ textAlign: 'center', padding: 18, color: '#555', fontSize: 10 }}>Loading...</div>}
            {!loading && pinned.length === 0 && (
              <div style={{ textAlign: 'center', padding: 18, color: '#444', fontSize: 10, lineHeight: 1.8 }}>
                No pinned challenges.<br />Pin with ★ in the Challenges tab.
              </div>
            )}
            {!loading && pinned.map(c => {
              const color   = TIER_COLOR[c.level] || '#888'
              const barColor = c.isComplete ? '#3DD68C' : deadActive ? '#C84040' : color
              const rowBg   = c.isComplete ? 'rgba(61,214,140,0.05)' : deadActive ? 'rgba(200,50,50,0.07)' : 'rgba(255,255,255,0.02)'
              const border  = c.isComplete ? 'rgba(61,214,140,0.13)' : deadActive ? 'rgba(200,50,50,0.18)' : 'rgba(255,255,255,0.05)'
              return (
                <div key={c.id} style={{ marginBottom: 4, padding: '4px 6px', borderRadius: 5, background: rowBg, border: `1px solid ${border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: c.isComplete ? '#3DD68C' : deadActive ? '#E77' : '#E8DCC8', fontWeight: 500, flex: 1, marginRight: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <span style={{ fontSize: 8, color, fontWeight: 700, flexShrink: 0 }}>{c.level !== 'NONE' ? c.level : ''}</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${c.pct}%`, background: barColor, borderRadius: 1, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
                    {c.value.toLocaleString()}{c.nextVal ? ` / ${c.nextVal.toLocaleString()} → ${c.next[0]}` : ' · Complete'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer drag strip */}
        <div style={{ height: 8, WebkitAppRegion: 'drag', cursor: 'move', flexShrink: 0, borderTop: `1px solid ${deadActive ? 'rgba(200,50,50,0.06)' : 'rgba(200,155,60,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(200,155,60,0.18)', fontSize: 7, letterSpacing: 3 }}>⠿</span>
        </div>
      </div>
    </div>
  )
}

function Btn({ onClick, color, bg, title, children }) {
  return (
    <div onClick={onClick} title={title} style={{ width: 16, height: 16, borderRadius: 3, background: bg || 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color, lineHeight: 1 }}>
      {children}
    </div>
  )
}

function MiniBtn({ onClick, title, children }) {
  return (
    <div onClick={onClick} title={title} style={{ width: 14, height: 14, borderRadius: 3, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 9, color: '#888', lineHeight: 1 }}>
      {children}
    </div>
  )
}
