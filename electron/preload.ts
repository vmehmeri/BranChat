import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal, secure API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  isElectron: true,

  // Keychain operations (for API keys)
  keychain: {
    get: (key: string): Promise<string | null> =>
      ipcRenderer.invoke('keychain:get', key),
    set: (key: string, value: string): Promise<boolean> =>
      ipcRenderer.invoke('keychain:set', key, value),
    delete: (key: string): Promise<boolean> =>
      ipcRenderer.invoke('keychain:delete', key),
  },

  // App info
  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke('app:getVersion'),

  getDataPaths: (): Promise<{
    userData: string;
    database: string;
    settings: string;
    blobs: string;
  }> => ipcRenderer.invoke('app:getDataPaths'),

  // Window state
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isFullscreen: boolean) => callback(isFullscreen);
    ipcRenderer.on('fullscreen-change', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('fullscreen-change', handler);
  },

  // Database file operations
  database: {
    read: (): Promise<number[] | null> =>
      ipcRenderer.invoke('db:read'),
    write: (data: number[]): Promise<boolean> =>
      ipcRenderer.invoke('db:write', data),
  },

  // Settings file operations
  settings: {
    read: (): Promise<string | null> =>
      ipcRenderer.invoke('settings:read'),
    write: (data: string): Promise<boolean> =>
      ipcRenderer.invoke('settings:write', data),
  },

  // Blob storage operations (for attachment data)
  blobs: {
    save: (id: string, data: string): Promise<void> =>
      ipcRenderer.invoke('blobs:save', id, data),
    load: (id: string): Promise<string | null> =>
      ipcRenderer.invoke('blobs:load', id),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke('blobs:delete', id),
    exists: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('blobs:exists', id),
    list: (): Promise<string[]> =>
      ipcRenderer.invoke('blobs:list'),
  },
});
