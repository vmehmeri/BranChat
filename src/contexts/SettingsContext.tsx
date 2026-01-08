import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { MODELS } from '@/types/chat';
import { isElectron } from '@/services/keychain';

const SETTINGS_STORAGE_KEY = 'branchat_settings';

export interface AppSettings {
  compactMode: boolean;
  defaultModelId: string;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleCompactMode: () => void;
  setDefaultModelId: (modelId: string) => void;
}

const defaultSettings: AppSettings = {
  compactMode: false,
  defaultModelId: MODELS[0].id,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const isInitialMount = useRef(true);

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      let saved: string | null = null;

      if (isElectron() && window.electronAPI?.settings) {
        // Load from Electron file storage
        saved = await window.electronAPI.settings.read();
      } else {
        // Load from localStorage for web
        saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      }

      if (saved) {
        try {
          setSettings({ ...defaultSettings, ...JSON.parse(saved) });
        } catch {
          setSettings(defaultSettings);
        }
      }
      setIsLoaded(true);
    }

    loadSettings();
  }, []);

  // Save settings whenever they change (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const data = JSON.stringify(settings);

    if (isElectron() && window.electronAPI?.settings) {
      // Save to Electron file storage
      window.electronAPI.settings.write(data);
    } else {
      // Save to localStorage for web
      localStorage.setItem(SETTINGS_STORAGE_KEY, data);
    }
  }, [settings, isLoaded]);

  // Apply compact mode class to document
  useEffect(() => {
    if (settings.compactMode) {
      document.documentElement.classList.add('compact');
    } else {
      document.documentElement.classList.remove('compact');
    }
  }, [settings.compactMode]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const toggleCompactMode = useCallback(() => {
    setSettings(prev => ({ ...prev, compactMode: !prev.compactMode }));
  }, []);

  const setDefaultModelId = useCallback((modelId: string) => {
    setSettings(prev => ({ ...prev, defaultModelId: modelId }));
  }, []);

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSettings,
      toggleCompactMode,
      setDefaultModelId,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
