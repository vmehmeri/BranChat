export interface ElectronAPI {
  isElectron: boolean;
  keychain: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<boolean>;
    delete: (key: string) => Promise<boolean>;
  };
  getAppVersion: () => Promise<string>;
  getDataPaths: () => Promise<{
    userData: string;
    database: string;
    settings: string;
    blobs: string;
  }>;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
  database: {
    read: () => Promise<number[] | null>;
    write: (data: number[]) => Promise<boolean>;
  };
  settings: {
    read: () => Promise<string | null>;
    write: (data: string) => Promise<boolean>;
  };
  blobs?: {
    save: (id: string, data: string) => Promise<void>;
    load: (id: string) => Promise<string | null>;
    delete: (id: string) => Promise<void>;
    exists: (id: string) => Promise<boolean>;
    list: () => Promise<string[]>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
