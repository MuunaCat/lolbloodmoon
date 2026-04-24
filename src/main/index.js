const { app, BrowserWindow, ipcMain } = require('electron')
const { join } = require('path')
const https = require('https')
const Store = require('electron-store')

const store = new Store()

const PLATFORM = {
  NA: 'na1', EUW: 'euw1', EUNE: 'eune1', KR: 'kr',
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
          else reject(new Error(json.status?.message || `HTTP ${res.statusCode}`))
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    frame: false,
    backgroundColor: '#050505',
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
    return resolveSummoner(apiKey, name, region)
  })

  ipcMain.handle('api:ranked', async (_, summonerId) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`, apiKey)
  })

  ipcMain.handle('api:mastery', async (_, summonerId) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}/top?count=30`, apiKey)
  })

  ipcMain.handle('api:challenges', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${PLATFORM[region]}.api.riotgames.com/lol/challenges/v1/player-data/${puuid}`, apiKey)
  })

  ipcMain.handle('api:match-ids', async (_, puuid) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${REGIONAL[region]}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=20`, apiKey)
  })

  ipcMain.handle('api:match', async (_, matchId) => {
    const apiKey = store.get('apiKey', '')
    const region = store.get('region', 'EUW')
    return riotGet(`https://${REGIONAL[region]}.api.riotgames.com/lol/match/v5/matches/${matchId}`, apiKey)
  })

  ipcMain.handle('api:ddragon', async () => {
    const versions = await jsonGet('https://ddragon.leagueoflegends.com/api/versions.json')
    const version = versions[0]
    const champData = await jsonGet(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)
    return { version, champions: champData.data }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
