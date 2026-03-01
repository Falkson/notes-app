const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs   = require('fs');

const NOTES_DIR = path.join(app.getPath('userData'), 'notes');
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR, { recursive: true });
}

let mainWindow   = null;
let splashWindow = null;

// ── Auto-updater ───────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Uppdatering klar',
      message: 'En ny version har laddats ner. Vill du installera den nu?',
      buttons: ['Installera nu', 'Senare']
    }).then(result => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
  });
  autoUpdater.on('error', (err) => console.log('Auto-updater fel:', err.message));
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 3000);
}

// ── Splash screen ──────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480, height: 480,
    frame: false, transparent: true, resizable: false,
    center: true, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#1a1c21',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));
}

// ── Huvudfönster ───────────────────────────────────────────────
function createMain() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset', backgroundColor: '#1a1c21', show: false,
    icon: path.join(__dirname, 'notesIcon.icns'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
      mainWindow.show(); mainWindow.focus();
      if (app.isPackaged) setupAutoUpdater();
    }, 4000);
  });
}

app.whenReady().then(() => { createSplash(); createMain(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createSplash(); createMain(); } });

// ── IPC: Logo path ─────────────────────────────────────────────
ipcMain.handle('notes:getLogoPath', () => {
  return path.join(__dirname, 'notes.png');
});

// ── IPC: Lista anteckningar ────────────────────────────────────
ipcMain.handle('notes:list', () => {
  try {
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.txt'));
    return files.map(filename => {
      const content = fs.readFileSync(path.join(NOTES_DIR, filename), 'utf-8');
      const lines   = content.split('\n');
      const dateTime = lines[0]?.replace('DATUM: ', '').trim() || '';
      const title    = lines[1]?.replace('RUBRIK: ', '').trim() || '';
      const body     = lines.slice(3).join('\n').trim();
      return { id: filename, dateTime, title, body, filename };
    }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  } catch { return []; }
});

// ── IPC: Spara ─────────────────────────────────────────────────
ipcMain.handle('notes:save', (event, { id, dateTime, title, body }) => {
  const filename = id || `note_${Date.now()}.txt`;
  const filePath = path.join(NOTES_DIR, filename);
  // Format: rad 0 = DATUM, rad 1 = RUBRIK, rad 2 = tom, rad 3+ = body
  fs.writeFileSync(filePath, `DATUM: ${dateTime}\nRUBRIK: ${title || ''}\n\n${body}`, 'utf-8');
  return filename;
});

// ── IPC: Ta bort ───────────────────────────────────────────────
ipcMain.handle('notes:delete', (event, filename) => {
  const filePath = path.join(NOTES_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

// ── IPC: Hämta en ─────────────────────────────────────────────
ipcMain.handle('notes:get', (event, filename) => {
  try {
    const content  = fs.readFileSync(path.join(NOTES_DIR, filename), 'utf-8');
    const lines    = content.split('\n');
    const dateTime = lines[0]?.replace('DATUM: ', '').trim() || '';
    const title    = lines[1]?.replace('RUBRIK: ', '').trim() || '';
    const body     = lines.slice(3).join('\n').trim();
    return { id: filename, dateTime, title, body, filename };
  } catch { return null; }
});

// ── IPC: Exportera PDF ─────────────────────────────────────────
ipcMain.handle('notes:exportPDF', async (event, { dateTime, title, body }) => {
  try {
    const safeName = dateTime
      ? 'anteckning_' + dateTime.replace(/T/, '_').replace(/:/g, '-').slice(0, 16) + '.pdf'
      : `anteckning_${Date.now()}.pdf`;
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Spara anteckning som PDF',
      defaultPath: path.join(app.getPath('downloads'), safeName),
      filters: [{ name: 'PDF-dokument', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, reason: 'canceled' };
    const pdfData = await mainWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
    fs.writeFileSync(filePath, pdfData);
    return { success: true, filePath };
  } catch (err) { return { success: false, reason: err.message }; }
});    center: true, alwaysOnTop: true, skipTaskbar: true,
    backgroundColor: '#1a1c21',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  splashWindow.loadFile(path.join(__dirname, 'renderer', 'splash.html'));
}

// ── Huvudfönster ───────────────────────────────────────────────
function createMain() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset', backgroundColor: '#1a1c21', show: false,
    icon: path.join(__dirname, 'notesIcon.icns'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) { splashWindow.close(); splashWindow = null; }
      mainWindow.show(); mainWindow.focus();
      if (app.isPackaged) setupAutoUpdater();
    }, 4000);
  });
}

app.whenReady().then(() => { createSplash(); createMain(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createSplash(); createMain(); } });

// ── IPC: Lista anteckningar ────────────────────────────────────
ipcMain.handle('notes:list', () => {
  try {
    const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith('.txt'));
    return files.map(filename => {
      const content = fs.readFileSync(path.join(NOTES_DIR, filename), 'utf-8');
      const lines   = content.split('\n');
      const dateTime = lines[0]?.replace('DATUM: ', '').trim() || '';
      const title    = lines[1]?.replace('RUBRIK: ', '').trim() || '';
      const body     = lines.slice(3).join('\n').trim();
      return { id: filename, dateTime, title, body, filename };
    }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  } catch { return []; }
});

// ── IPC: Spara ─────────────────────────────────────────────────
ipcMain.handle('notes:save', (event, { id, dateTime, title, body }) => {
  const filename = id || `note_${Date.now()}.txt`;
  const filePath = path.join(NOTES_DIR, filename);
  // Format: rad 0 = DATUM, rad 1 = RUBRIK, rad 2 = tom, rad 3+ = body
  fs.writeFileSync(filePath, `DATUM: ${dateTime}\nRUBRIK: ${title || ''}\n\n${body}`, 'utf-8');
  return filename;
});

// ── IPC: Ta bort ───────────────────────────────────────────────
ipcMain.handle('notes:delete', (event, filename) => {
  const filePath = path.join(NOTES_DIR, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

// ── IPC: Hämta en ─────────────────────────────────────────────
ipcMain.handle('notes:get', (event, filename) => {
  try {
    const content  = fs.readFileSync(path.join(NOTES_DIR, filename), 'utf-8');
    const lines    = content.split('\n');
    const dateTime = lines[0]?.replace('DATUM: ', '').trim() || '';
    const title    = lines[1]?.replace('RUBRIK: ', '').trim() || '';
    const body     = lines.slice(3).join('\n').trim();
    return { id: filename, dateTime, title, body, filename };
  } catch { return null; }
});

// ── IPC: Exportera PDF ─────────────────────────────────────────
ipcMain.handle('notes:exportPDF', async (event, { dateTime, title, body }) => {
  try {
    const safeName = dateTime
      ? 'anteckning_' + dateTime.replace(/T/, '_').replace(/:/g, '-').slice(0, 16) + '.pdf'
      : `anteckning_${Date.now()}.pdf`;
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: 'Spara anteckning som PDF',
      defaultPath: path.join(app.getPath('downloads'), safeName),
      filters: [{ name: 'PDF-dokument', extensions: ['pdf'] }]
    });
    if (canceled || !filePath) return { success: false, reason: 'canceled' };
    const pdfData = await mainWindow.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
    fs.writeFileSync(filePath, pdfData);
    return { success: true, filePath };
  } catch (err) { return { success: false, reason: err.message }; }
});
