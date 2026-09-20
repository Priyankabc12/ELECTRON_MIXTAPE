const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  playIndex: (i) => ipcRenderer.send('play-index', i),
  playCursor: () => ipcRenderer.send('play-cursor'),
  next: () => ipcRenderer.send('next-song'),
  prev: () => ipcRenderer.send('prev-song'),
  togglePlay: () => ipcRenderer.send('toggle-play'),
  moveCursor: (d) => ipcRenderer.send('move-cursor', d),
  stop: () => ipcRenderer.send('stop-playback'),
  onState: (callback) => ipcRenderer.on('state-update', (e, state) => callback(state)),
});
