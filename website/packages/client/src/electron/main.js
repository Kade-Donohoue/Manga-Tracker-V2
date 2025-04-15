const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { URL } = require('url');
const util = require('util')

app.whenReady().then(() => {
  createWindow();
});

// Create the main window
function createWindow() {
  const persistentSession = session.fromPartition('persist:clerkSession');
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



  // session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
  //   if (permission === 'cookies') {
  //     return callback(true);
  //   }
  //   callback(false);
  // });

  // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Access-Control-Allow-Origin': ['*'], // Allow all origins
  //       'Access-Control-Allow-Credentials': ['true'], // Enable credentials
  //     },
  //   });
  // });
  
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('clerk.') || url.includes('oauth')) {
      shell.openExternal(url); // Opens in the default browser
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });


  // // OAuth flow
  // ipcMain.on('open-oauth', (event, url) => {
  //   const oauthWindow = new BrowserWindow({
  //     width: 600,
  //     height: 800,
  //     parent: win,
  //     modal: true,
  //     show: false,
  //     webPreferences: {
  //       nodeIntegration: false,
  //       contextIsolation: true,
  //     },
  //   });

  //   oauthWindow.loadURL(url); // Use the OAuth URL
  //   oauthWindow.once('ready-to-show', () => {
  //     oauthWindow.show();
  //   });

  //   oauthWindow.webContents.on('will-navigate', (event, newUrl) => {
  //     // Check if the URL is our redirect URI
  //     if (newUrl.startsWith('https://manga.kdonohoue.com/electron')) {
  //       const parsedUrl = new URL(newUrl);
  //       const params = parsedUrl.searchParams.toString(); // Get all query params as a string
    
  //       if (win) {
  //         // Append search params to the existing main window URL
  //         const currentUrl = new URL(win.webContents.getURL());
  //         currentUrl.search = params; // Add query params
  //         const updatedUrl = currentUrl.toString();
    
  //         console.log('Updated main window URL:', updatedUrl);
    
  //         // Use the updated URL without reloading the entire React app
  //         win.loadURL(updatedUrl);
  //       }
    
  //       const code = parsedUrl.searchParams.get('code');
  //       console.log('Received OAuth code:', code);
  //       oauthWindow.close();
  //     }
  //   });
    

  //   oauthWindow.on('closed', () => {
  //     // Handle window close
  //   });
  // });
};



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
