import { useState, useCallback, useRef } from 'react';
import { Settings, User, Menu, X, Shield, GitBranch } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { ConversationList } from '@/components/chat/ConversationList';
import { ConversationTreeView } from '@/components/chat/ConversationTreeView';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ResizableHandle } from '@/components/ui/resizable-handle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { isElectron } from '@/services/keychain';
import { useFullscreen } from '@/hooks/use-fullscreen';
import appIcon from '/icon.png';


const SPLIT_MIN_PERCENT = 20;
const SPLIT_MAX_PERCENT = 80;
const SPLIT_DEFAULT_PERCENT = 50;
const SPLIT_STORAGE_KEY = 'branch-chat-sidebar-split';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  width?: number;
}

export function Sidebar({ isOpen, onToggle, width = 288 }: SidebarProps) {
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isFullscreen = useFullscreen();
  const [splitPercent, setSplitPercent] = useState(() => {
    const saved = localStorage.getItem(SPLIT_STORAGE_KEY);
    return saved ? parseFloat(saved) : SPLIT_DEFAULT_PERCENT;
  });

  const handleSplitResize = useCallback((delta: number) => {
    if (!containerRef.current) return;
    const containerHeight = containerRef.current.offsetHeight;
    const deltaPercent = (delta / containerHeight) * 100;
    setSplitPercent(prev => {
      const newPercent = Math.min(SPLIT_MAX_PERCENT, Math.max(SPLIT_MIN_PERCENT, prev + deltaPercent));
      return newPercent;
    });
  }, []);

  const handleSplitResizeEnd = useCallback(() => {
    localStorage.setItem(SPLIT_STORAGE_KEY, splitPercent.toString());
  }, [splitPercent]);
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    deleteConversation,
    toggleStar
  } = useChat();
  const { profile, getDisplayName, getInitials } = useUserProfile();

  const navItems = [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Shield, label: 'Privacy', path: '/privacy' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full bg-sidebar border-r transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width }}
      >
        <div className="flex flex-col h-full">
          {/* Header - with extra top padding for macOS traffic lights in Electron (not in fullscreen) */}
          <div
            className="flex items-center justify-between p-4"
            style={{
              WebkitAppRegion: 'drag',
              paddingTop: isElectron() && !isFullscreen ? '2.5rem' : undefined
            } as React.CSSProperties}
          >
            <Link
              to="/"
              className="flex items-center gap-2"
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <img
                src={appIcon}
                alt="BranChat"
                className="h-8 w-8 rounded-lg dark:filter-none invert hue-rotate-180 dark:invert-0 dark:hue-rotate-0"
              />
              <span className="font-bold text-lg">BranChat</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onToggle}
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Separator />

          {/* Conversations */}
          <div ref={containerRef} className="flex-1 overflow-hidden flex flex-col min-h-0">
            {location.pathname === '/' ? (
              <>
                <div
                  className="min-h-0 overflow-hidden"
                  style={{ height: activeConversation ? `${splitPercent}%` : '100%' }}
                >
                  <ConversationList
                    conversations={conversations}
                    activeId={activeConversation?.id || null}
                    onSelect={setActiveConversation}
                    onCreate={createConversation}
                    onDelete={deleteConversation}
                    onToggleStar={toggleStar}
                  />
                </div>

                {activeConversation && (
                  <>
                    <ResizableHandle
                      direction="vertical"
                      onResize={handleSplitResize}
                      onResizeEnd={handleSplitResizeEnd}
                      className="w-full"
                    />
                    <div
                      className="min-h-0 overflow-y-auto"
                      style={{ height: `${100 - splitPercent}%` }}
                    >
                      <ConversationTreeView conversation={activeConversation} />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="p-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  asChild
                >
                  <Link to="/">
                    <GitBranch className="h-4 w-4" />
                    Back to Chat
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Navigation */}
          <nav className="p-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          <Separator />

          {/* User */}
          <div className="p-3">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/50 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile.photoUrl || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{getDisplayName()}</p>
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile toggle button - positioned after traffic lights in Electron */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "fixed z-50 lg:hidden",
          isOpen && "hidden",
          isElectron() ? "left-20 top-2" : "left-4"
        )}
        style={{
          WebkitAppRegion: 'no-drag',
          top: isElectron() ? undefined : '0.175rem'
        } as React.CSSProperties}
        onClick={onToggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
    </>
  );
}
