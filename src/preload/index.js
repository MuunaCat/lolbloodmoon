const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (s) => ipcRenderer.invoke('save-settings', s),
  getSummoner: () => ipcRenderer.invoke('api:summoner'),
  getRanked: (id) => ipcRenderer.invoke('api:ranked', id),
  getMastery: (id) => ipcRenderer.invoke('api:mastery', id),
  getAllMastery: (id) => ipcRenderer.invoke('api:all-mastery', id),
  getChallenges: (puuid) => ipcRenderer.invoke('api:challenges', puuid),
  getMatchIds: (puuid) => ipcRenderer.invoke('api:match-ids', puuid),
  getMatch: (id) => ipcRenderer.invoke('api:match', id),
  getDDragon: () => ipcRenderer.invoke('api:ddragon'),
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
})
