const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  getSummoner: () => ipcRenderer.invoke('api:summoner'),
  getRanked: (id) => ipcRenderer.invoke('api:ranked', id),
  getMastery: (id) => ipcRenderer.invoke('api:mastery', id),
  getAllMastery: (id) => ipcRenderer.invoke('api:all-mastery', id),
  getChallenges: (puuid) => ipcRenderer.invoke('api:challenges', puuid),
  getChallengeConfigs: () => ipcRenderer.invoke('api:challenge-configs'),
  getMatchIds: (puuid) => ipcRenderer.invoke('api:match-ids', puuid),
  getMatch: (id) => ipcRenderer.invoke('api:match', id),
  getChampionMatchIds: (puuid, champId) => ipcRenderer.invoke('api:champion-match-ids', puuid, champId),
  getChampionRotation: () => ipcRenderer.invoke('api:champion-rotation'),
  getDDragon: () => ipcRenderer.invoke('api:ddragon'),
  lcu: {
    status: () => ipcRenderer.invoke('lcu:status'),
    live: () => ipcRenderer.invoke('lcu:live'),
    gameflow: () => ipcRenderer.invoke('lcu:gameflow'),
    summoner: () => ipcRenderer.invoke('lcu:summoner'),
    ranked: () => ipcRenderer.invoke('lcu:ranked'),
    champSelect: () => ipcRenderer.invoke('lcu:champ-select'),
    lobby: () => ipcRenderer.invoke('lcu:lobby'),
    queueTime: () => ipcRenderer.invoke('lcu:queue-time')
  },
  saveLeaguePath: (p) => ipcRenderer.invoke('save-league-path', p),
  getLeaguePath: () => ipcRenderer.invoke('get-league-path'),
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
})
