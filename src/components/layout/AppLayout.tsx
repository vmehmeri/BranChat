import React, { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { ResizableHandle } from '@/components/ui/resizable-handle';
import { isElectron } from '@/services/keychain';
import { useFullscreen } from '@/hooks/use-fullscreen';

interface AppLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 500;
const SIDEBAR_DEFAULT_WIDTH = 288; // 18rem = w-72
const SIDEBAR_WIDTH_KEY = 'branch-chat-sidebar-width';
const LG_BREAKPOINT = 1024;

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const isFullscreen = useFullscreen();
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
  });

  // Track viewport size for responsive behavior
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= LG_BREAKPOINT);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(prev => {
      const newWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, prev + delta));
      return newWidth;
    });
  }, []);

  const handleResizeEnd = useCallback(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Save on unmount if changed
  useEffect(() => {
    return () => {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
    };
  }, [sidebarWidth]);

  return (
    <div className="h-screen bg-background overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        width={sidebarWidth}
      />

      {/* Resize handle for sidebar (desktop only) */}
      {isDesktop && (
        <div
          className="fixed top-0 bottom-0 z-50"
          style={{ left: sidebarWidth }}
        >
          <ResizableHandle
            onResize={handleSidebarResize}
            onResizeEnd={handleResizeEnd}
            className="h-full"
          />
        </div>
      )}

      <main
        className="h-screen flex flex-col transition-[padding] duration-100"
        style={{ paddingLeft: isDesktop ? sidebarWidth : 0 }}
      >
        {/* Draggable region for Electron window (when not fullscreen) */}
        {isElectron() && !isFullscreen && (
          <div
            className="h-6 w-full shrink-0 bg-muted border-b"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          />
        )}
        <div className="flex-1 min-h-0 pt-1">
          {children}
        </div>
      </main>
    </div>
  );
}
