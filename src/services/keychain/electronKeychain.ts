import { KeychainService, API_KEY_PROVIDERS } from './types';

export class ElectronKeychainService implements KeychainService {
  async getApiKey(provider: string): Promise<string | null> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.keychain.get(provider);
  }

  async setApiKey(provider: string, key: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.keychain.set(provider, key);
  }

  async deleteApiKey(provider: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.keychain.delete(provider);
  }

  async getAllApiKeys(): Promise<Record<string, string | null>> {
    const keys: Record<string, string | null> = {};
    for (const provider of API_KEY_PROVIDERS) {
      keys[provider] = await this.getApiKey(provider);
    }
    return keys;
  }
}
