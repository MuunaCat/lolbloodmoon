const BASE_NAV = [
  { id: 'profile',    label: 'Profile',    icon: '◈' },
  { id: 'champions',  label: 'Champions',  icon: '⚔' },
  { id: 'challenges', label: 'Challenges', icon: '◆' },
  { id: 'matches',    label: 'Matches',    icon: '⊞' },
  { id: 'live',       label: 'Live Game',  icon: '◉', live: true },
  { id: 'settings',   label: 'Settings',   icon: '⚙' }
]

const ASTRA_NAV = { id: 'astra', label: 'Astra', icon: '✦', astra: true }

const THEME_CHAMPIONS = {
  bloodmoon:   { id: 'Jhin',        skin: 2,  name: 'Jhin' },           // Blood Moon Jhin
  void:        { id: 'Malzahar',    skin: 4,  name: 'Malzahar' },       // Overlord Malzahar
  ionia:       { id: 'Ahri',        skin: 27, name: 'Ahri' },           // Spirit Blossom Ahri
  demacia:     { id: 'Garen',       skin: 6,  name: 'Garen' },          // Steel Legion Garen
  noxus:       { id: 'Darius',      skin: 15, name: 'Darius' },         // God-King Darius
  freljord:    { id: 'Ashe',        skin: 1,  name: 'Ashe' },           // Freljord Ashe
  shadowisles: { id: 'Thresh',      skin: 5,  name: 'Thresh' },         // Dark Star Thresh
  astra:       { id: 'MissFortune', skin: 15, name: 'Miss Fortune' },   // Star Guardian MF
  bandlecity:  { id: 'Teemo',       skin: 25, name: 'Teemo' },          // Spirit Blossom Teemo
  bilgewater:  { id: 'MissFortune', skin: 8,  name: 'Miss Fortune' },   // Captain Fortune
  ixtal:       { id: 'Qiyana',      skin: 2,  name: 'Qiyana' },         // True Damage Qiyana
  piltover:    { id: 'Caitlyn',     skin: 28, name: 'Caitlyn' },        // Arcane Enforcer Caitlyn
  shurima:     { id: 'Azir',        skin: 4,  name: 'Azir' },           // Warring Kingdoms Azir
  targon:      { id: 'Leona',       skin: 10, name: 'Leona' },          // Solar Eclipse Leona
  zaun:        { id: 'Viktor',      skin: 24, name: 'Viktor' },         // Arcane Savior Viktor
}

export default function Sidebar({ page, setPage, summoner, ddragon, lcuStatus, theme }) {
  const NAV = theme === 'astra' ? [...BASE_NAV, ASTRA_NAV] : BASE_NAV
  const champ      = THEME_CHAMPIONS[theme] || THEME_CHAMPIONS.bloodmoon
  const loadingUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_${champ.skin}.jpg`

  const iconUrl = summoner && ddragon
    ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/profileicon/${summoner.profileIconId}.png`
    : null

  const displayName = summoner
    ? (summoner.gameName ? summoner.gameName : summoner.name)
    : null

  return (
    <div className="sidebar">
      <div className="sidebar-titlebar" />

      <div className="sidebar-brand" onClick={() => setPage('profile')} style={{ cursor: 'pointer' }}>
        <div className="brand-logo">
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
        <div className="sidebar-champ-bg" style={{ backgroundImage: `url(${loadingUrl})` }} />
        {NAV.map(({ id, label, icon, live: isLive, astra: isAstra }) => {
          const isInGame = lcuStatus?.phase === 'InProgress'
          return (
            <div
              key={id}
              className={`nav-item${page === id ? ' active' : ''}`}
              onClick={() => setPage(id)}
              style={isAstra ? { borderColor: page === id ? 'rgba(240,168,192,0.4)' : undefined } : undefined}
            >
              <span className="nav-icon" style={
                isAstra ? { color: 'var(--gold)' } :
                isLive && isInGame ? { color: 'var(--win)' } : undefined
              }>
                {icon}
              </span>
              <span style={isAstra ? { color: 'var(--gold)', fontStyle: 'italic' } : undefined}>{label}</span>
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
