import { useState } from 'react'

const NAV = [
  { id: 'profile',    label: 'Profile',    icon: '◈' },
  { id: 'champions',  label: 'Champions',  icon: '⚔' },
  { id: 'challenges', label: 'Challenges', icon: '◆' },
  { id: 'matches',    label: 'Matches',    icon: '⊞' },
  { id: 'live',       label: 'Live Game',  icon: '◉', live: true },
  { id: 'settings',   label: 'Settings',   icon: '⚙' }
]

const THEME_CHAMPIONS = {
  bloodmoon:   { id: 'Jhin',     skin: 2, name: 'Jhin' },
  void:        { id: 'Malzahar', skin: 0, name: 'Malzahar' },
  ionia:       { id: 'Ahri',     skin: 0, name: 'Ahri' },
  demacia:     { id: 'Garen',    skin: 0, name: 'Garen' },
  noxus:       { id: 'Darius',   skin: 0, name: 'Darius' },
  freljord:    { id: 'Ashe',     skin: 0, name: 'Ashe' },
  shadowisles: { id: 'Thresh',   skin: 0, name: 'Thresh' },
}

const PAGE_TIPS = {
  profile:    'Your ranked stats, win streak, and champion highlights are all here.',
  champions:  'Click any champion card to see your challenge progress and recent stats!',
  challenges: 'Star (★) a challenge to pin it to your overlay during games.',
  matches:    'Expand a match row to see full team builds, items, and events.',
  live:       'Open League of Legends — your overlay appears automatically in-game.',
  settings:   'Use Riot ID format (Name#TAG) and set your LoL path if needed.',
}

export default function Sidebar({ page, setPage, summoner, ddragon, lcuStatus, theme }) {
  const [tipVisible, setTipVisible] = useState(false)

  const champ      = THEME_CHAMPIONS[theme] || THEME_CHAMPIONS.bloodmoon
  const loadingUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_${champ.skin}.jpg`
  const fallbackUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champ.id}_0.jpg`
  const tip        = PAGE_TIPS[page] || 'Tracking your League journey.'

  const iconUrl = summoner && ddragon
    ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/profileicon/${summoner.profileIconId}.png`
    : null

  const displayName = summoner
    ? (summoner.gameName ? summoner.gameName : summoner.name)
    : null

  return (
    <div className="sidebar">
      <div className="sidebar-champ-bg" style={{ backgroundImage: `url(${loadingUrl})` }} />

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

      <div className="sidebar-mascot">
        <div
          className="mascot-wrap"
          onMouseEnter={() => setTipVisible(true)}
          onMouseLeave={() => setTipVisible(false)}
        >
          <div className={`mascot-bubble${tipVisible ? ' visible' : ''}`}>{tip}</div>
          <div className="mascot-avatar">
            <img
              src={loadingUrl}
              alt={champ.name}
              className="mascot-img"
              onError={e => { if (e.target.src !== fallbackUrl) e.target.src = fallbackUrl }}
            />
          </div>
        </div>
      </div>

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
