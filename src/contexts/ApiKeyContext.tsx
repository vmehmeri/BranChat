import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getKeychainService, ApiKeyProvider, API_KEY_PROVIDERS } from '@/services/keychain';

interface ApiKeyContextType {
  apiKeys: Record<ApiKeyProvider, string | null>;
  isLoading: boolean;
  getApiKey: (provider: ApiKeyProvider) => string | null;
  setApiKey: (provider: ApiKeyProvider, key: string) => Promise<boolean>;
  deleteApiKey: (provider: ApiKeyProvider) => Promise<boolean>;
  refreshApiKeys: () => Promise<void>;
  hasApiKey: (provider: ApiKeyProvider) => boolean;
}

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKeys, setApiKeys] = useState<Record<ApiKeyProvider, string | null>>({
    openai: null,
    anthropic: null,
    google: null,
    xai: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const keychain = getKeychainService();
      const keys = await keychain.getAllApiKeys();
      setApiKeys(keys as Record<ApiKeyProvider, string | null>);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshApiKeys();
  }, [refreshApiKeys]);

  const getApiKey = useCallback((provider: ApiKeyProvider): string | null => {
    return apiKeys[provider];
  }, [apiKeys]);

  const hasApiKey = useCallback((provider: ApiKeyProvider): boolean => {
    return !!apiKeys[provider];
  }, [apiKeys]);

  const setApiKey = useCallback(async (provider: ApiKeyProvider, key: string): Promise<boolean> => {
    try {
      const keychain = getKeychainService();
      const success = await keychain.setApiKey(provider, key);
      if (success) {
        setApiKeys(prev => ({ ...prev, [provider]: key }));
      }
      return success;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  }, []);

  const deleteApiKey = useCallback(async (provider: ApiKeyProvider): Promise<boolean> => {
    try {
      const keychain = getKeychainService();
      const success = await keychain.deleteApiKey(provider);
      if (success) {
        setApiKeys(prev => ({ ...prev, [provider]: null }));
      }
      return success;
    } catch (error) {
      console.error('Failed to delete API key:', error);
      return false;
    }
  }, []);

  return (
    <ApiKeyContext.Provider value={{
      apiKeys,
      isLoading,
      getApiKey,
      setApiKey,
      deleteApiKey,
      refreshApiKeys,
      hasApiKey,
    }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKeys() {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKeys must be used within an ApiKeyProvider');
  }
  return context;
}
