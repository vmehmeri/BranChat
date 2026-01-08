import { KeychainService, API_KEY_PROVIDERS, ApiKeyProvider } from './types';

const STORAGE_PREFIX = 'branchat_apikey_';

export class BrowserKeychainService implements KeychainService {
  async getApiKey(provider: string): Promise<string | null> {
    // First check env vars (for backward compatibility with web)
    const envKey = this.getEnvKey(provider as ApiKeyProvider);
    if (envKey) return envKey;

    // Fall back to localStorage
    return localStorage.getItem(`${STORAGE_PREFIX}${provider}`);
  }

  async setApiKey(provider: string, key: string): Promise<boolean> {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${provider}`, key);
      return true;
    } catch {
      return false;
    }
  }

  async deleteApiKey(provider: string): Promise<boolean> {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${provider}`);
      return true;
    } catch {
      return false;
    }
  }

  async getAllApiKeys(): Promise<Record<string, string | null>> {
    const keys: Record<string, string | null> = {};
    for (const provider of API_KEY_PROVIDERS) {
      keys[provider] = await this.getApiKey(provider);
    }
    return keys;
  }

  private getEnvKey(provider: ApiKeyProvider): string | undefined {
    switch (provider) {
      case 'openai': return import.meta.env.VITE_OPENAI_API_KEY;
      case 'anthropic': return import.meta.env.VITE_ANTHROPIC_API_KEY;
      case 'google': return import.meta.env.VITE_GOOGLE_API_KEY;
      case 'xai': return import.meta.env.VITE_XAI_API_KEY;
    }
  }
}
