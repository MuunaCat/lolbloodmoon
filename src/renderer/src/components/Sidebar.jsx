const NAV = [
  { id: 'profile',    label: 'Profile',     icon: '◈' },
  { id: 'champions',  label: 'Champions',   icon: '⚔' },
  { id: 'challenges', label: 'Challenges',  icon: '◆' },
  { id: 'matches',    label: 'Matches',     icon: '⊞' },
  { id: 'live',       label: 'Live Game',   icon: '◉', live: true },
  { id: 'settings',   label: 'Settings',    icon: '⚙' }
]

export default function Sidebar({ page, setPage, summoner, ddragon, lcuStatus }) {
  const iconUrl = summoner && ddragon
    ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/profileicon/${summoner.profileIconId}.png`
    : null

  const displayName = summoner
    ? (summoner.gameName ? summoner.gameName : summoner.name)
    : null

  return (
    <div className="sidebar">
      <div className="sidebar-titlebar">
        <div className="win-controls">
          <button className="win-btn-win min" title="Minimize" onClick={() => window.api.window.minimize()}>&#x2013;</button>
          <button className="win-btn-win max" title="Maximize" onClick={() => window.api.window.maximize()}>&#x25A1;</button>
          <button className="win-btn-win close" title="Close"  onClick={() => window.api.window.close()}>&#x2715;</button>
        </div>
      </div>

      <div className="sidebar-brand" onClick={() => setPage('profile')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo">
          {/* Blood Moon crescent icon */}
          <svg className="brand-hex" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <mask id="moon-crescent-mask">
                <circle cx="20" cy="20" r="17" fill="white"/>
                <circle cx="27" cy="14" r="13" fill="black"/>
              </mask>
            </defs>
            <circle cx="20" cy="20" r="17" fill="var(--gold)" mask="url(#moon-crescent-mask)"/>
            <circle cx="20" cy="20" r="17" fill="none" stroke="var(--gold)" strokeWidth="0.6" opacity="0.35"/>
          </svg>
          <span className="brand-name">BloodMoon</span>
        </div>
        <div className="brand-sub">LoLBloodMoon</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon, live: isLive }) => {
          const isInGame = lcuStatus?.phase === 'InProgress'
          return (
            <div
              key={id}
              className={`nav-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
            >
              <span className="nav-icon" style={isLive && isInGame ? { color: 'var(--win)' } : undefined}>
                {icon}
              </span>
              <span>{label}</span>
              {isLive && (
                <span
                  className="lcu-dot"
                  style={{ background: lcuStatus?.connected ? (isInGame ? 'var(--win)' : 'var(--gold)') : '#444' }}
                  title={lcuStatus?.connected ? (isInGame ? 'In Game' : 'Client open') : 'Client not detected'}
                />
              )}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-profile">
        {iconUrl
          ? <img src={iconUrl} alt="" className="sidebar-avatar" draggable={false} />
          : <div className="sidebar-avatar-placeholder">◈</div>
        }
        {displayName ? (
          <div>
            <div className="sidebar-name">{displayName}</div>
            <div className="sidebar-level">Lv. {summoner?.summonerLevel}</div>
          </div>
        ) : (
          <div className="sidebar-name" style={{ color: 'var(--text-dim)' }}>Not configured</div>
        )}
      </div>
    </div>
  )
}
