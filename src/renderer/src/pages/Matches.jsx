import { useState, useEffect, useMemo } from 'react'

function timeAgo(ms) {
  const diff = Date.now() - ms
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatDuration(secs) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function kdaRatio(k, d, a) {
  if (d === 0) return 'Perfect'
  return ((k + a) / d).toFixed(2)
}

const MODE_LABEL = {
  CLASSIC: 'Summoner\'s Rift',
  ARAM: 'ARAM',
  URF: 'URF',
  CHERRY: 'Arena',
  TUTORIAL: 'Tutorial'
}

export default function Matches({ summoner, ddragon, appError }) {
  const [matchIds, setMatchIds]   = useState([])
  const [matches, setMatches]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [loadingMore, setLMore]   = useState(false)
  const [error, setError]         = useState(null)
  const [loaded, setLoaded]       = useState(0)

  const championById = useMemo(() => {
    if (!ddragon) return {}
    const map = {}
    Object.values(ddragon.champions).forEach(c => { map[parseInt(c.key)] = c })
    return map
  }, [ddragon])

  const fetchBatch = async (ids, existing = []) => {
    const results = await Promise.all(ids.map(id => window.api.getMatch(id).catch(() => null)))
    return [...existing, ...results.filter(Boolean)]
  }

  useEffect(() => {
    if (!summoner) return
    setLoading(true)
    setMatches([])
    setLoaded(0)
    window.api.getMatchIds(summoner.puuid)
      .then(async ids => {
        setMatchIds(ids)
        const batch = ids.slice(0, 10)
        const data = await fetchBatch(batch)
        setMatches(data)
        setLoaded(10)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [summoner?.puuid])

  const loadMore = async () => {
    setLMore(true)
    const next = matchIds.slice(loaded, loaded + 10)
    const data = await fetchBatch(next, matches)
    setMatches(data)
    setLoaded(l => l + 10)
    setLMore(false)
  }

  if (appError) return <div className="page"><div className="error-box">⚠ {appError}</div></div>
  if (!summoner) return <div className="page"><div className="error-box">⚠ Configure your settings first.</div></div>

  return (
    <div className="page">
      <h1 className="page-title">Match History</h1>

      {loading && <div className="loading"><div className="spinner" /><span>Loading matches...</span></div>}
      {error && !loading && <div className="error-box">⚠ {error}</div>}

      {!loading && !error && matches.length === 0 && (
        <div className="empty-state">No recent matches found.</div>
      )}

      {!loading && matches.length > 0 && (
        <>
          <div className="matches-list">
            {matches.map(match => {
              const me = match.info.participants.find(p => p.puuid === summoner.puuid)
              if (!me) return null

              const champ = Object.values(ddragon?.champions || {}).find(c => c.name === me.championName)
              const imgUrl = champ && ddragon
                ? `https://ddragon.leagueoflegends.com/cdn/${ddragon.version}/img/champion/${champ.image.full}`
                : null

              const win = me.win
              const { kills: k, deaths: d, assists: a } = me
              const cs = (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0)
              const duration = formatDuration(match.info.gameDuration)
              const ago = timeAgo(match.info.gameCreation)
              const mode = MODE_LABEL[match.info.gameMode] || match.info.gameMode

              return (
                <div key={match.metadata.matchId} className={`match-row ${win ? 'win' : 'loss'}`}>
                  <div className={`match-outcome ${win ? 'win' : 'loss'}`}>{win ? 'WIN' : 'LOSS'}</div>

                  {imgUrl
                    ? <img src={imgUrl} alt={me.championName} className="match-champ-img" />
                    : <div className="match-champ-placeholder">⚔</div>
                  }

                  <div className="match-info">
                    <div className="match-champ-name">{me.championName}</div>
                    <div className="match-meta">{mode} · {duration}</div>
                  </div>

                  <div className="match-kda">
                    <div className="kda-nums">
                      <span className="win-text">{k}</span>
                      <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                      <span className="loss-text">{d}</span>
                      <span style={{ color: 'var(--text-dim)', margin: '0 3px' }}>/</span>
                      <span style={{ color: 'var(--text-mid)' }}>{a}</span>
                    </div>
                    <div className="kda-ratio">{kdaRatio(k, d, a)} KDA</div>
                  </div>

                  <div className="match-stats">
                    <div className="match-cs">{cs} CS</div>
                    <div className="match-time">{ago}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {loaded < matchIds.length && (
            <button className="match-load-btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : `Load more (${matchIds.length - loaded} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
