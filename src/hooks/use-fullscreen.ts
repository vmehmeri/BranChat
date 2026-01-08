import { useState, useEffect } from 'react';
import { isElectron } from '@/services/keychain';

export function useFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isElectron() || !window.electronAPI?.onFullscreenChange) {
      return;
    }

    const cleanup = window.electronAPI.onFullscreenChange((fullscreen) => {
      setIsFullscreen(fullscreen);
    });

    return cleanup;
  }, []);

  return isFullscreen;
}
