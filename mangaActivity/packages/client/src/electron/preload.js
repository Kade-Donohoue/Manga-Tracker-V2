const { contextBridge, ipcRenderer } = require('electron');

// Expose the functions and properties in a single object
contextBridge.exposeInMainWorld('electron', {
  openOAuth: (url) => ipcRenderer.send('open-oauth', url),
  isElectron: true,
});
