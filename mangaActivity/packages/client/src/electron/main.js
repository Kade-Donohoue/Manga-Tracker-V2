const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { URL } = require('url');
const util = require('util')

app.whenReady().then(() => {
  createWindow();
});

// Create the main window
const createWindow = () => {
  const win = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(process.resourcesPath, 'src/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      session: session.defaultSession,
      webSecurity: false,
      icon: path.join(__dirname, "src/electron/icon.png")
    },
  });
  // const persistentSession = session.fromPartition('persist:myPersistentSession');
  // win.webContents.session = persistentSession

  let cookies = win.webContents.session.cookies;
  cookies.on('changed', function(event, cookie, cause, removed) {
    if (cookie.session && !removed) {
      let url = util.format('%s://%s%s', (!cookie.httpOnly && cookie.secure) ? 'https' : 'http', cookie.domain, cookie.path);
      console.log('url', url);
      cookies.set({
        url: url,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        expirationDate: new Date().setDate(new Date().getDate() + 14)
      }, function(err) {
        if (err) {
          log.error('Error trying to persist cookie', err, cookie);
        }
      });
    }
  });


  win.maximize();
  win.show();


  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:3000/');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // OAuth flow
  ipcMain.on('open-oauth', (event, url) => {
    const oauthWindow = new BrowserWindow({
      width: 600,
      height: 800,
      parent: win,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    oauthWindow.loadURL(url); // Use the OAuth URL
    oauthWindow.once('ready-to-show', () => {
      oauthWindow.show();
    });

    oauthWindow.webContents.on('will-navigate', (event, newUrl) => {
      // Check if the URL is our redirect URI
      if (newUrl.startsWith('https://manga.kdonohoue.com/electron')) {
        const parsedUrl = new URL(newUrl);
        const params = parsedUrl.searchParams.toString(); // Get all query params as a string
    
        if (win) {
          // Append search params to the existing main window URL
          const currentUrl = new URL(win.webContents.getURL());
          currentUrl.search = params; // Add query params
          const updatedUrl = currentUrl.toString();
    
          console.log('Updated main window URL:', updatedUrl);
    
          // Use the updated URL without reloading the entire React app
          win.loadURL(updatedUrl);
        }
    
        const code = parsedUrl.searchParams.get('code');
        console.log('Received OAuth code:', code);
        oauthWindow.close();
      }
    });
    

    oauthWindow.on('closed', () => {
      // Handle window close
    });
  });
};



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
