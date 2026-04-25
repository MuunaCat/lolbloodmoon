import { useState, useEffect, useRef } from 'react'

const TIER_ORDER = ['NONE', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER']
const TIER_COLOR = {
  NONE: '#666', IRON: '#7D6E5E', BRONZE: '#A0522D', SILVER: '#9EA9B0',
  GOLD: '#C89B3C', PLATINUM: '#4CAF6A', EMERALD: '#1FA657',
  DIAMOND: '#5CB8E4', MASTER: '#9B59B6', GRANDMASTER: '#E55B4D', CHALLENGER: '#F0E6D3'
}

const COLLAPSED = [64, 64]
const EXPANDED  = [290, 460]

export default function OverlayApp() {
  const [expanded, setExpanded]     = useState(false)
  const [isDead, setIsDead]         = useState(false)
  const [challenges, setChallenges] = useState([])
  const [followed, setFollowed]     = useState([])
  const [opacity, setOpacity]       = useState(0.93)
  const [loading, setLoading]       = useState(true)
  const pollRef = useRef(null)

  useEffect(() => {
    async function init() {
      const [puuid, followedIds, op] = await Promise.all([
        window.api.getCachedPuuid(),
        window.api.getFollowedChallenges(),
        window.api.getOverlayOpacity()
      ])
      setFollowed(followedIds)
      setOpacity(op)
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
        if (live?.activePlayer) setIsDead(!!live.activePlayer.isDead)
        else setIsDead(false)
      } catch { setIsDead(false) }
    }
    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => clearInterval(pollRef.current)
  }, [])

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    await window.api.resizeOverlay(...(next ? EXPANDED : COLLAPSED))
  }

  const handleOpacity = async (v) => {
    const num = parseFloat(v)
    setOpacity(num)
    await window.api.saveOverlayOpacity(num)
  }

  const pinned = challenges.filter(c => followed.includes(c.id))

  const btnStyle = {
    width: 52, height: 52, borderRadius: 10,
    background: isDead ? 'rgba(180,30,30,0.9)' : 'rgba(10,10,10,0.92)',
    border: `1.5px solid ${isDead ? 'rgba(230,60,60,0.7)' : 'rgba(200,155,60,0.55)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: 20,
    boxShadow: isDead ? '0 0 14px rgba(220,50,50,0.5)' : '0 0 10px rgba(0,0,0,0.6)',
    transition: 'all 0.18s',
    WebkitAppRegion: 'no-drag', userSelect: 'none',
    animation: isDead ? 'ovPulse 1s ease-in-out infinite' : 'none',
  }

  if (!expanded) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', WebkitAppRegion: 'drag' }}>
        <style>{`@keyframes ovPulse { 0%,100%{box-shadow:0 0 8px rgba(220,50,50,0.4)} 50%{box-shadow:0 0 20px rgba(220,50,50,0.8)} }`}</style>
        <div style={btnStyle} onClick={toggle} title="Open challenge tracker">
          {isDead ? '☠' : '★'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent', padding: 3 }}>
      <div style={{ width: '100%', height: '100%', background: 'rgba(8,8,8,0.94)', border: '1px solid rgba(200,155,60,0.25)', borderRadius: 9, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* Header — drag zone */}
        <div style={{ padding: '7px 9px', background: 'rgba(200,155,60,0.07)', borderBottom: '1px solid rgba(200,155,60,0.13)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', WebkitAppRegion: 'drag', cursor: 'move', flexShrink: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#C89B3C', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {isDead ? '☠ Respawning' : '★ Challenges'}
          </span>
          <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}>
            <Btn onClick={toggle} color="#888" title="Collapse">−</Btn>
            <Btn onClick={() => window.api.hideOverlay()} color="#E44D4D" bg="rgba(180,40,40,0.3)" title="Close">×</Btn>
          </div>
        </div>

        {/* Challenge list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {loading && <div style={{ textAlign: 'center', padding: 24, color: '#555', fontSize: 11 }}>Loading...</div>}
          {!loading && pinned.length === 0 && (
            <div style={{ textAlign: 'center', padding: 24, color: '#444', fontSize: 11, lineHeight: 1.7 }}>
              No pinned challenges.<br />Pin with ★ in the Challenges tab.
            </div>
          )}
          {!loading && pinned.map(c => {
            const color = TIER_COLOR[c.level] || '#666'
            const barColor = c.isComplete ? '#3DD68C' : isDead ? '#C84040' : color
            const rowBg    = c.isComplete ? 'rgba(61,214,140,0.05)' : isDead ? 'rgba(200,50,50,0.07)' : 'rgba(255,255,255,0.02)'
            const border   = c.isComplete ? 'rgba(61,214,140,0.12)' : isDead ? 'rgba(200,50,50,0.18)' : 'rgba(255,255,255,0.04)'
            return (
              <div key={c.id} style={{ marginBottom: 5, padding: '5px 7px', borderRadius: 6, background: rowBg, border: `1px solid ${border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: c.isComplete ? '#3DD68C' : isDead ? '#E44D4D' : '#CCC', fontWeight: 500, flex: 1, marginRight: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  <span style={{ fontSize: 9, color, fontWeight: 600, flexShrink: 0 }}>{c.level}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${c.pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>
                  {c.value.toLocaleString()}{c.nextVal ? ` / ${c.nextVal.toLocaleString()} → ${c.next[0]}` : ' · Complete'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Opacity slider */}
        <div style={{ padding: '5px 9px', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, WebkitAppRegion: 'no-drag' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 9, color: '#444', width: 44, flexShrink: 0 }}>Opacity</span>
            <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={e => handleOpacity(e.target.value)} style={{ flex: 1, accentColor: '#C89B3C', height: 3 }} />
            <span style={{ fontSize: 9, color: '#444', width: 28, textAlign: 'right' }}>{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Btn({ onClick, color, bg, title, children }) {
  return (
    <div onClick={onClick} title={title} style={{ width: 18, height: 18, borderRadius: 4, background: bg || 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color, lineHeight: 1 }}>
      {children}
    </div>
  )
}
