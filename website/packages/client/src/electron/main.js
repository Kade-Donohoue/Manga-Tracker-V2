const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { URL } = require('url');
const util = require('util')

app.whenReady().then(() => {
  createWindow();
});

// Create the main window
function createWindow() {
  // const persistentSession = session.fromPartition('persist:clerkSession');
  const win = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(process.resourcesPath, 'src/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      session: persistentSession,
      webSecurity: true,
      icon: path.join(__dirname, "src/electron/icon.png")
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000/');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.maximize();
  win.show();
  
  win.webContents.setWindowOpenHandler(({ url }) => {
    // if (url.includes('clerk.') || url.includes('oauth')) {
    //   shell.openExternal(url); // Opens in the default browser
    //   return { action: 'deny' };
    // }
    // return { action: 'allow' };
  });

};

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
