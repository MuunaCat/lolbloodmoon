const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { join } = require('path')
const https = require('https')
const fs = require('fs')
const { exec } = require('child_process')
const Store = require('electron-store')

const store = new Store()
const matchCache = new Map()
let overlayWin = null
let gameWatchTimer = null
let autoGameDetector = null

function isLeagueGameRunning() {
  return new Promise(resolve => {
    exec('tasklist /fi "imagename eq League of Legends.exe" /fo csv /nh', (err, stdout) => {
      resolve(!err && stdout.toLowerCase().includes('league of legends.exe'))
    })
  })
}

function createOverlayWindow() {
  if (overlayWin && !overlayWin.isDestroyed()) return
  const saved = store.get('overlayBounds', {})
  const op    = store.get('overlayOpacity', 0.93)
  overlayWin  = new BrowserWindow({
    width: 240, height: 130,
    x: saved.x, y: saved.y,
    alwaysOnTop: true, transparent: true, frame: false,
    skipTaskbar: true, resizable: false,
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false }
  })
  overlayWin.setOpacity(op)
  overlayWin.setAlwaysOnTop(true, 'screen-saver')
  if (process.env.NODE_ENV === 'development') {
    overlayWin.loadURL(`${process.env.ELECTRON_RENDERER_URL}?overlay=true`)
  } else {
    overlayWin.loadFile(join(__dirname, '../renderer/index.html'), { query: { overlay: 'true' } })
  }
  overlayWin.on('moved', () => {
    if (!overlayWin?.isDestroyed()) {
      const [x, y] = overlayWin.getPosition()
      store.set('overlayBounds', { x, y })
    }
  })
  overlayWin.on('closed', () => { overlayWin = null; stopGameWatch() })
  startGameWatch()
}

function destroyOverlayWindow() {
  stopGameWatch()
  if (overlayWin && !overlayWin.isDestroyed()) { overlayWin.destroy(); overlayWin = null }
}

function startGameWatch() {
  if (gameWatchTimer) return
  gameWatchTimer = setInterval(async () => {
    if (!overlayWin || overlayWin.isDestroyed()) { stopGameWatch(); return }
    const running = await isLeagueGameRunning()
    if (running) {
      overlayWin.setAlwaysOnTop(true, 'screen-saver')
      overlayWin.moveTop()
    } else {
      destroyOverlayWindow()
    }
  }, 2000)
}

function stopGameWatch() {
  if (gameWatchTimer) { clearInterval(gameWatchTimer); gameWatchTimer = null }
}

function startAutoGameDetector() {
  if (autoGameDetector) return
  autoGameDetector = setInterval(async () => {
    const running = await isLeagueGameRunning()
    if (running && (!overlayWin || overlayWin.isDestroyed())) {
      createOverlayWindow()
    } else if (!running && overlayWin && !overlayWin.isDestroyed()) {
      destroyOverlayWindow()
    }
  }, 3000)
}

const PLATFORM = {
  NA: 'na1', EUW: 'euw1', EUNE: 'eun1', KR: 'kr',
  BR: 'br1', JP: 'jp1', LAN: 'la1', LAS: 'la2',
  OCE: 'oc1', RU: 'ru', TR: 'tr1'
}

const REGIONAL = {
  NA: 'americas', BR: 'americas', LAN: 'americas', LAS: 'americas',
  EUW: 'europe', EUNE: 'europe', RU: 'europe', TR: 'europe',
  KR: 'asia', JP: 'asia', OCE: 'sea'
}

function jsonGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    let parsed
    try { parsed = new URL(url) } catch { reject(new Error('Invalid URL')); return }
    https.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search, headers }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json)
          else {
            const err = new Error(json.status?.message || `HTTP ${res.statusCode}`)
            err.statusCode = res.statusCode
            reject(err)
          }
        } catch { reject(new Error(`Invalid response (HTTP ${res.statusCode})`)) }
      })
    }).on('error', reject)
  })
}

function riotGet(url, apiKey) {
  return jsonGet(url, { 'X-Riot-Token': apiKey })
}

async function resolveSummoner(apiKey, name, region) {
  const platform = PLATFORM[region]
  const regional = REGIONAL[region]
  if (name.includes('#')) {
    const [gameName, tagLine] = name.split('#')
    const account = await riotGet(
      `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      apiKey
    )
    const summoner = await riotGet(
      `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
      apiKey
    )
    return { ...summoner, gameName: account.gameName, tagLine: account.tagLine }
  }
  return riotGet(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`,
    apiKey
  )
}

// ── LCU ──────────────────────────────────────────
const LCU_AGENT = new https.Agent({ rejectUnauthorized: false })

const LOCKFILE_PATHS = [
  'C:\\Riot Games\\League of Legends\\lockfile',
  'C:\\Program Files\\Riot Games\\League of Legends\\lockfile',
  'C:\\Program Files (x86)\\Riot Games\\League of Legends\\lockfile'
]

function readLockfile() {
  const custom = store.get('leaguePath', '')
  const paths = custom ? [custom, ...LOCKFILE_PATHS] : LOCKFILE_PATHS
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const [, , port, password] = fs.readFileSync(p, 'utf8').split(':')
        return { port: parseInt(port), password }
      }
    } catch {}
  }
  return null
}

function lcuGet(urlPath, lf) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`riot:${lf.password}`).toString('base64')
    https.get({
      hostname: '127.0.0.1', port: lf.port, path: urlPath,
      headers: { Authorization: `Basic ${auth}` },
      agent: LCU_AGENT
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    }).on('error', reject)
  })
}

function liveGet(urlPath) {
  return new Promise((resolve) => {
    https.get({
      hostname: '127.0.0.1', port: 2999, path: urlPath,
      agent: LCU_AGENT
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve(null) } })
    }).on('error', () => resolve(null))
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    backgroundColor: '#050505',
    icon: join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  const win = createWindow()
  startAutoGameDetector()

  ipcMain.on('window:minimize', () => win.minimize())
  ipcMain.on('window:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize())
  ipcMain.on('window:close', () => win.close())

  ipcMain.handle('get-settings', () => ({
    apiKey: store.get('apiKey', ''),
    summonerName: store.get('summonerName', ''),
    region: store.get('region', 'EUW')
  }))

  ipcMain.handle('save-settings', (_, s) => {
    store.set('apiKey', s.apiKey)
    store.set('summonerName', s.summonerName)
    store.set('region', s.region)
    return true
  })

  ipcMain.handle('api:summoner', async () => {
    const apiKey = store.get('apiKey', '')
    const name = store.get('summonerName', '')
    const region = store.get('region', 'EUW')
    if (!apiKey || !name) throw new Error('Configure your API key and summoner name in Settings first.')
    const result = await resolveSummoner(apiKey, name, region)
    if (result?.puuid) store.set('cachedPuuid', result.puuid)
    return result
  })

  ipcMain.handle('api:ranked', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`, apiKey)
  })

  ipcMain.handle('api:mastery', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=30`, apiKey)
  })

  ipcMain.handle('api:all-mastery', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`, apiKey)
  })

  ipcMain.handle('api:challenges', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/challenges/v1/player-data/${puuid}`, apiKey)
  })

  ipcMain.handle('api:challenge-configs', async () => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/challenges/v1/challenges/config`, apiKey)
  })

  ipcMain.handle('api:match-ids', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${REGIONAL[region]}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=50`, apiKey)
  })

  ipcMain.handle('api:match', async (_, matchId) => {
    if (matchCache.has(matchId)) return matchCache.get(matchId)
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    try {
      const data = await riotGet(`https://${REGIONAL[region]}.api.riotgames.com/lol/match/v5/matches/${matchId}`, apiKey)
      matchCache.set(matchId, data)
      return data
    } catch (e) {
      if (e.statusCode === 403) return { __restricted: true }
      throw e
    }
  })

  ipcMain.handle('api:champion-match-ids', async (_, puuid, championId) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${REGIONAL[region]}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20&champion=${championId}`, apiKey)
  })

  ipcMain.handle('api:champion-rotation', async () => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/platform/v3/champion-rotations`, apiKey)
  })

  ipcMain.handle('api:ddragon', async () => {
    const versions = await jsonGet('https://ddragon.leagueoflegends.com/api/versions.json')
    const version = versions[0]
    const champData = await jsonGet(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)
    return { version, champions: champData.data }
  })

  // ── LCU handlers ─────────────────────────────
  ipcMain.handle('lcu:status', async () => {
    const lf = readLockfile()
    if (!lf) {
      // No client lockfile — check if game process is running (handles Mayhem / edge cases)
      const live = await liveGet('/liveclientdata/allgamedata')
      if (live?.activePlayer) return { connected: true, phase: 'InProgress' }
      return { connected: false }
    }
    try {
      const phase = await lcuGet('/lol/gameflow/v1/gameflow-phase', lf)
      const phaseStr = typeof phase === 'string' ? phase : 'None'
      // If LCU doesn't say InProgress, double-check via game port 2999
      // (some modes like Mayhem may not update the phase correctly)
      if (phaseStr !== 'InProgress') {
        const live = await liveGet('/liveclientdata/allgamedata')
        if (live?.activePlayer) return { connected: true, phase: 'InProgress' }
      }
      return { connected: true, phase: phaseStr }
    } catch {
      const live = await liveGet('/liveclientdata/allgamedata')
      if (live?.activePlayer) return { connected: true, phase: 'InProgress' }
      return { connected: false }
    }
  })

  ipcMain.handle('lcu:live', async () => {
    return liveGet('/liveclientdata/allgamedata')
  })

  ipcMain.handle('lcu:gameflow', async () => {
    const lf = readLockfile()
    if (!lf) return null
    try { return await lcuGet('/lol/gameflow/v1/gameflow-phase', lf) }
    catch { return null }
  })

  ipcMain.handle('lcu:summoner', async () => {
    const lf = readLockfile()
    if (!lf) return null
    try { return await lcuGet('/lol/summoner/v1/current-summoner', lf) }
    catch { return null }
  })

  ipcMain.handle('lcu:ranked', async () => {
    const lf = readLockfile()
    if (!lf) return null
    try { return await lcuGet('/lol/ranked/v1/current-summoner', lf) }
    catch { return null }
  })

  ipcMain.handle('lcu:champ-select', async () => {
    const lf = readLockfile()
    if (!lf) return null
    try { return await lcuGet('/lol/champ-select/v1/session', lf) }
    catch { return null }
  })

  ipcMain.handle('lcu:lobby', async () => {
    const lf = readLockfile()
    if (!lf) return null
    try { return await lcuGet('/lol/lobby/v2/lobby', lf) }
    catch { return null }
  })

  ipcMain.handle('lcu:queue-time', async () => {
    const lf = readLockfile()
    if (!lf) return null
    try { return await lcuGet('/lol/lobby/v2/lobby/matchmaking/search-state', lf) }
    catch { return null }
  })

  ipcMain.handle('save-league-path', (_, p) => {
    store.set('leaguePath', p)
    return true
  })

  ipcMain.handle('get-league-path', () => store.get('leaguePath', ''))

  // ── Persistent store helpers ──────────────────
  ipcMain.handle('store:get-followed', () => store.get('followedChallenges', []))
  ipcMain.handle('store:save-followed', (_, ids) => { store.set('followedChallenges', ids); return true })
  ipcMain.handle('store:get-opacity', () => store.get('overlayOpacity', 0.93))
  ipcMain.handle('store:save-opacity', (_, v) => {
    store.set('overlayOpacity', v)
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.setOpacity(parseFloat(v))
    return true
  })
  ipcMain.handle('store:get-srank-overrides', () => store.get('srankOverrides', {}))
  ipcMain.handle('store:save-srank-overrides', (_, data) => { store.set('srankOverrides', data); return true })
  ipcMain.handle('store:get-puuid', () => store.get('cachedPuuid', ''))
  ipcMain.handle('store:get-theme', () => store.get('theme', 'default'))
  ipcMain.handle('store:save-theme', (_, t) => { store.set('theme', t); return true })
  ipcMain.handle('store:get-overlay-settings', () => store.get('overlaySettings', { showDeathPulse: true }))
  ipcMain.handle('store:save-overlay-settings', (_, s) => { store.set('overlaySettings', s); return true })
  ipcMain.handle('shell:open-external', (_, url) => shell.openExternal(url))

  // ── Overlay window ────────────────────────────
  ipcMain.handle('overlay:show', () => { createOverlayWindow(); return true })
  ipcMain.handle('overlay:hide', () => { destroyOverlayWindow(); return true })

  ipcMain.handle('overlay:resize', (_, w, h) => {
    if (overlayWin && !overlayWin.isDestroyed()) overlayWin.setSize(w, h)
    return true
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
