// Desktop shell for Crypt Crawler (Electron): one window showing the release build in desktop/game/.
// Saves and settings live in the window's localStorage, kept in the user's app-data folder by Electron.
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 640, minHeight: 400,
    backgroundColor: '#000000', autoHideMenuBar: true, title: 'Crypt Crawler',
    webPreferences: { contextIsolation: true, nodeIntegration: false, autoplayPolicy: 'no-user-gesture-required' }
  });
  Menu.setApplicationMenu(null);                       // no File / Edit menu; F toggles full screen inside the game
  win.loadFile(path.join(__dirname, 'game', 'index.html'));
  if (process.env.CC_SMOKE) {                          // smoke test: report what loaded, then quit (see desktop/README.md)
    win.webContents.on('console-message', (e, level, msg) => console.log('[page]', msg));
    win.webContents.once('did-finish-load', async () => {
      const r = await win.webContents.executeJavaScript(
        "JSON.stringify({ title: document.title, three: typeof THREE, monsters: typeof MONSTERS, sounds: typeof SOUNDS, pad: typeof RQPad, hook: typeof __cc })");
      console.log('SMOKE ' + r); app.quit();
    });
  }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
