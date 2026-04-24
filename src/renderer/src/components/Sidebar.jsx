const NAV = [
  { id: 'profile',    label: 'Profile',     icon: '◈' },
  { id: 'champions',  label: 'Champions',   icon: '⚔' },
  { id: 'challenges', label: 'Challenges',  icon: '◆' },
  { id: 'matches',    label: 'Matches',     icon: '⊞' },
  { id: 'settings',   label: 'Settings',    icon: '⚙' }
]

export default function Sidebar({ page, setPage, summoner, ddragon }) {
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
          <button className="win-btn close"   onClick={() => window.api.window.close()} />
          <button className="win-btn min"     onClick={() => window.api.window.minimize()} />
          <button className="win-btn max"     onClick={() => window.api.window.maximize()} />
        </div>
      </div>

      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg className="brand-hex" viewBox="0 0 40 46" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0L40 11.5V34.5L20 46L0 34.5V11.5L20 0Z" />
            <path d="M20 8L32 15V29L20 36L8 29V15L20 8Z" fill="#050505" />
            <text x="20" y="27" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#C89B3C" fontFamily="Cinzel, Georgia, serif">LoL</text>
          </svg>
          <span className="brand-name">MoonBase</span>
        </div>
        <div className="brand-sub">LoLMoonBase</div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ id, label, icon }) => (
          <div
            key={id}
            className={`nav-item${page === id ? ' active' : ''}`}
            onClick={() => setPage(id)}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-profile">
        {iconUrl
          ? <img src={iconUrl} alt="" className="sidebar-avatar" />
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
