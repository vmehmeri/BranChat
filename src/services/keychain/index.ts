import { KeychainService } from './types';
import { BrowserKeychainService } from './browserKeychain';
import { ElectronKeychainService } from './electronKeychain';

export * from './types';

let keychainInstance: KeychainService | null = null;

export function getKeychainService(): KeychainService {
  if (!keychainInstance) {
    // Check if running in Electron
    if (isElectron()) {
      keychainInstance = new ElectronKeychainService();
    } else {
      keychainInstance = new BrowserKeychainService();
    }
  }
  return keychainInstance;
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

// Reset the singleton (useful for testing)
export function resetKeychainService(): void {
  keychainInstance = null;
}
