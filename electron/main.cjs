const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');


// Note: Linux requires either:
// 1. chrome-sandbox with SUID bit (chown root:root && chmod 4755)
// 2. Or run with --no-sandbox flag from command line
// The postinst.sh script should set SUID permissions automatically

// Note: electron-squirrel-startup removed - we use NSIS for Windows, not Squirrel


const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'StoryForge',
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    // Development: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
    // Uncomment for debugging production issues:
    // mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Hide the default application menu
  Menu.setApplicationMenu(null);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
