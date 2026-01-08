import React, { useRef, useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, GitBranch, Trash2 } from 'lucide-react';
import { Branch, Message, Model, Attachment } from '@/types/chat';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { ResizableHandle } from '@/components/ui/resizable-handle';
import { supportsAttachments } from '@/services/llm';
import { cn } from '@/lib/utils';

interface BranchPanelProps {
  branch: Branch;
  parentMessages: Message[];
  onClose: () => void;
  onDelete: () => void;
  onSend: (message: string, attachments?: Attachment[]) => void;
  onModelChange: (model: Model) => void;
  onGenerateResponse: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  isLoading?: boolean;
  width?: number;
  onResize?: (delta: number) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: () => void;
}

export function BranchPanel({
  branch,
  parentMessages,
  onClose,
  onDelete,
  onSend,
  onModelChange,
  onGenerateResponse,
  onEditMessage,
  isLoading = false,
  width = 400,
  onResize,
  webSearchEnabled = false,
  onWebSearchToggle,
}: BranchPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(branch.messages.length);

  const rootMessageIndex = parentMessages.findIndex(m => m.id === branch.rootMessageId);
  const rootMessage = parentMessages[rootMessageIndex];
  const contextMessages = parentMessages.slice(0, rootMessageIndex + 1);

  // Track if user is near bottom
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const isNear = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    isNearBottomRef.current = isNear;
  };

  // Scroll on new messages or during streaming (if near bottom)
  useEffect(() => {
    const messageCountChanged = branch.messages.length !== prevMessageCountRef.current;
    prevMessageCountRef.current = branch.messages.length;

    // Always scroll for new messages, or during streaming if near bottom
    if (messageCountChanged || (isLoading && isNearBottomRef.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? 'instant' : 'smooth' });
    }
  }, [branch.messages, isLoading]);

  // Handle resize - negative delta because dragging left should increase width
  const handleResize = (delta: number) => {
    onResize?.(-delta);
  };

  return (
    <div className="flex h-full branch-panel-enter">
      {/* Resize handle */}
      {!isCollapsed && onResize && (
        <ResizableHandle onResize={handleResize} className="h-full" />
      )}

      <div
        className={cn(
          "flex flex-col h-full border-l transition-all duration-300",
          isCollapsed && "w-12"
        )}
        style={{
          borderColor: branch.color,
          width: isCollapsed ? undefined : width,
          minWidth: isCollapsed ? undefined : 250,
        }}
      >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 border-b"
        style={{ borderColor: branch.color }}
      >
        {!isCollapsed && (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: branch.color }}
              />
              <span className="font-medium text-sm truncate">{branch.name}</span>
              <ModelSelector 
                selectedModel={branch.model!} 
                onSelectModel={onModelChange}
                compact
              />
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete branch?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{branch.name}" and all its messages.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete branch
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
        
        {isCollapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 mx-auto"
            onClick={() => setIsCollapsed(false)}
          >
            <GitBranch className="h-4 w-4" style={{ color: branch.color }} />
          </Button>
        )}
      </div>

      {!isCollapsed && (
        <>
          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-1"
          >
            {/* Context from main conversation */}
            <div className="mb-4 pb-4 border-b border-dashed opacity-60">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                Context from main conversation
              </p>
              {contextMessages.slice(-3).map((message) => (
                <ChatMessage 
                  key={message.id} 
                  message={message}
                  isInBranch
                />
              ))}
            </div>

            {/* Branch messages */}
            {branch.messages.map((message, index) => {
              // Skip rendering empty assistant messages (streaming placeholders)
              const isLastMessage = index === branch.messages.length - 1;
              const isEmptyAssistant = message.role === 'assistant' && message.content === '';
              if (isLastMessage && isEmptyAssistant && isLoading) {
                return null;
              }

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isInBranch
                  branchColor={branch.color}
                  onEdit={(msgId, content) => onEditMessage(msgId, content)}
                />
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 py-4">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                </div>
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            {branch.messages.length === 0 && (
              <div className="text-center py-8">
                <GitBranch className="h-8 w-8 mx-auto mb-2 text-muted-foreground" style={{ color: branch.color }} />
                {rootMessage?.role === 'user' ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start this branch with a different model
                    </p>
                    <Button 
                      onClick={onGenerateResponse}
                      disabled={isLoading}
                      style={{ borderColor: branch.color }}
                      variant="outline"
                    >
                      {isLoading ? 'Generating...' : 'Generate Response'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start this branch with a new question
                  </p>
                )}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t" style={{ borderColor: `${branch.color}40` }}>
            <ChatInput
              onSend={onSend}
              isLoading={isLoading}
              placeholder={`Continue in ${branch.name}...`}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={onWebSearchToggle}
              supportsWebSearch={branch.model?.supportsWebSearch}
              supportsFileAttachments={branch.model ? supportsAttachments(branch.model.provider) : true}
            />
          </div>
        </>
      )}
      </div>
    </div>
  );
}
