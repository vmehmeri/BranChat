import { app, BrowserWindow, ipcMain } from 'electron';
import * as keytar from 'keytar';
import path from 'path';
import fs from 'fs';

const SERVICE_NAME = 'BranChat';
const DB_FILENAME = 'branchat.db';
const SETTINGS_FILENAME = 'settings.json';
const BLOBS_DIR = 'blobs';

function getDbPath(): string {
  return path.join(app.getPath('userData'), DB_FILENAME);
}

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILENAME);
}

function getBlobsDir(): string {
  const dir = path.join(app.getPath('userData'), BLOBS_DIR);
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getBlobPath(id: string): string {
  // Sanitize ID to be a safe filename
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getBlobsDir(), `${safeId}.blob`);
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Set dock icon on macOS (use PNG for dock.setIcon)
  if (process.platform === 'darwin') {
    const iconPath = path.join(process.cwd(), 'public/icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(iconPath);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS native title bar
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Notify renderer of full screen changes
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-change', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-change', false);
  });
}

// IPC handlers for keychain operations
ipcMain.handle('keychain:get', async (_, key: string) => {
  try {
    return await keytar.getPassword(SERVICE_NAME, key);
  } catch (error) {
    console.error('Failed to get keychain item:', error);
    return null;
  }
});

ipcMain.handle('keychain:set', async (_, key: string, value: string) => {
  try {
    await keytar.setPassword(SERVICE_NAME, key, value);
    return true;
  } catch (error) {
    console.error('Failed to set keychain item:', error);
    return false;
  }
});

ipcMain.handle('keychain:delete', async (_, key: string) => {
  try {
    return await keytar.deletePassword(SERVICE_NAME, key);
  } catch (error) {
    console.error('Failed to delete keychain item:', error);
    return false;
  }
});

// IPC handler for app version
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// IPC handler for getting data paths
ipcMain.handle('app:getDataPaths', () => {
  return {
    userData: app.getPath('userData'),
    database: getDbPath(),
    settings: getSettingsPath(),
    blobs: getBlobsDir(),
  };
});

// IPC handlers for database file operations
ipcMain.handle('db:read', async () => {
  try {
    const dbPath = getDbPath();
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath);
      return Array.from(data); // Convert Buffer to array for IPC
    }
    return null;
  } catch (error) {
    console.error('Failed to read database file:', error);
    return null;
  }
});

ipcMain.handle('db:write', async (_, data: number[]) => {
  try {
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, Buffer.from(data));
    return true;
  } catch (error) {
    console.error('Failed to write database file:', error);
    return false;
  }
});

// IPC handlers for settings file operations
ipcMain.handle('settings:read', async () => {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      return fs.readFileSync(settingsPath, 'utf-8');
    }
    return null;
  } catch (error) {
    console.error('Failed to read settings file:', error);
    return null;
  }
});

ipcMain.handle('settings:write', async (_, data: string) => {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, data, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write settings file:', error);
    return false;
  }
});

// IPC handlers for blob storage operations
ipcMain.handle('blobs:save', async (_, id: string, data: string) => {
  try {
    const blobPath = getBlobPath(id);
    fs.writeFileSync(blobPath, data, 'utf-8');
  } catch (error) {
    console.error('Failed to save blob:', error);
    throw error;
  }
});

ipcMain.handle('blobs:load', async (_, id: string) => {
  try {
    const blobPath = getBlobPath(id);
    if (fs.existsSync(blobPath)) {
      return fs.readFileSync(blobPath, 'utf-8');
    }
    return null;
  } catch (error) {
    console.error('Failed to load blob:', error);
    return null;
  }
});

ipcMain.handle('blobs:delete', async (_, id: string) => {
  try {
    const blobPath = getBlobPath(id);
    if (fs.existsSync(blobPath)) {
      fs.unlinkSync(blobPath);
    }
  } catch (error) {
    console.error('Failed to delete blob:', error);
    throw error;
  }
});

ipcMain.handle('blobs:exists', async (_, id: string) => {
  try {
    const blobPath = getBlobPath(id);
    return fs.existsSync(blobPath);
  } catch (error) {
    console.error('Failed to check blob existence:', error);
    return false;
  }
});

ipcMain.handle('blobs:list', async () => {
  try {
    const blobsDir = getBlobsDir();
    const files = fs.readdirSync(blobsDir);
    // Extract IDs from filenames (remove .blob extension)
    return files
      .filter(f => f.endsWith('.blob'))
      .map(f => f.replace('.blob', ''));
  } catch (error) {
    console.error('Failed to list blobs:', error);
    return [];
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
