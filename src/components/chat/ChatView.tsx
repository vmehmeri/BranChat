import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useApiKeys } from '@/contexts/ApiKeyContext';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { BranchPanel } from './BranchPanel';
import { ModelSelector } from './ModelSelector';
import { streamChatMessage, getSupportedMimeTypes, supportsAttachments } from '@/services/llm';
import { useToast } from '@/hooks/use-toast';
import { Message, Attachment } from '@/types/chat';
import { isElectron } from '@/services/keychain';

const BRANCH_MIN_WIDTH = 250;
const BRANCH_MAX_WIDTH = 600;
const BRANCH_DEFAULT_WIDTH = 400;

// Throttle interval for streaming updates (ms)
const STREAM_UPDATE_THROTTLE_MS = 50;

export function ChatView() {
  const {
    activeConversation,
    activeBranches,
    selectedModel,
    setSelectedModel,
    addMessage,
    updateMessageContent,
    editMessage,
    createBranch,
    openBranch,
    closeBranch,
    addMessageToBranch,
    updateBranchMessageContent,
    createConversation,
    setBranchModel,
    deleteBranch,
    webSearchEnabled,
    setWebSearchEnabled,
  } = useChat();
  const { profile } = useUserProfile();
  const { apiKeys } = useApiKeys();

  // Track loading state per conversation/branch to avoid blocking UI when switching
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [loadingBranchId, setLoadingBranchId] = useState<string | null>(null);

  // AbortController refs to cancel pending requests when switching conversations
  const abortControllerRef = useRef<AbortController | null>(null);
  const branchAbortControllerRef = useRef<AbortController | null>(null);

  // Derive isLoading based on whether the active conversation is the one loading
  const isLoading = loadingConversationId === activeConversation?.id;
  const [branchWidths, setBranchWidths] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(activeConversation?.messages.length ?? 0);
  const { toast } = useToast();

  // Throttled streaming update refs
  const streamContentRef = useRef<string>('');
  const streamLastUpdateRef = useRef<number>(0);
  const streamUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create a throttled stream callback that batches updates
  const createThrottledStreamCallback = useCallback((
    messageId: string,
    conversationId: string,
    updateFn: (msgId: string, content: string, convId?: string) => void,
    abortSignal: AbortSignal
  ) => {
    // Reset refs for new stream
    streamContentRef.current = '';
    streamLastUpdateRef.current = 0;
    if (streamUpdateTimeoutRef.current) {
      clearTimeout(streamUpdateTimeoutRef.current);
      streamUpdateTimeoutRef.current = null;
    }

    return (chunk: string, done: boolean) => {
      if (abortSignal.aborted) return;

      if (done) {
        // Final update - flush any remaining content
        if (streamUpdateTimeoutRef.current) {
          clearTimeout(streamUpdateTimeoutRef.current);
          streamUpdateTimeoutRef.current = null;
        }
        if (streamContentRef.current) {
          updateFn(messageId, streamContentRef.current, conversationId);
        }
        return;
      }

      // Accumulate content
      streamContentRef.current += chunk;
      const now = Date.now();

      // Throttle updates
      if (now - streamLastUpdateRef.current >= STREAM_UPDATE_THROTTLE_MS) {
        streamLastUpdateRef.current = now;
        updateFn(messageId, streamContentRef.current, conversationId);
      } else if (!streamUpdateTimeoutRef.current) {
        // Schedule a deferred update to ensure content is eventually shown
        streamUpdateTimeoutRef.current = setTimeout(() => {
          streamUpdateTimeoutRef.current = null;
          if (!abortSignal.aborted && streamContentRef.current) {
            streamLastUpdateRef.current = Date.now();
            updateFn(messageId, streamContentRef.current, conversationId);
          }
        }, STREAM_UPDATE_THROTTLE_MS);
      }
    };
  }, []);

  // Throttled refs for branch streaming (separate from main conversation)
  const branchStreamContentRef = useRef<string>('');
  const branchStreamLastUpdateRef = useRef<number>(0);
  const branchStreamUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create a throttled stream callback for branch updates
  const createThrottledBranchCallback = useCallback((
    branchId: string,
    messageId: string,
    updateFn: (branchId: string, msgId: string, content: string) => void
  ) => {
    // Reset refs for new stream
    branchStreamContentRef.current = '';
    branchStreamLastUpdateRef.current = 0;
    if (branchStreamUpdateTimeoutRef.current) {
      clearTimeout(branchStreamUpdateTimeoutRef.current);
      branchStreamUpdateTimeoutRef.current = null;
    }

    return (chunk: string, done: boolean) => {
      if (done) {
        // Final update - flush any remaining content
        if (branchStreamUpdateTimeoutRef.current) {
          clearTimeout(branchStreamUpdateTimeoutRef.current);
          branchStreamUpdateTimeoutRef.current = null;
        }
        if (branchStreamContentRef.current) {
          updateFn(branchId, messageId, branchStreamContentRef.current);
        }
        return;
      }

      // Accumulate content
      branchStreamContentRef.current += chunk;
      const now = Date.now();

      // Throttle updates
      if (now - branchStreamLastUpdateRef.current >= STREAM_UPDATE_THROTTLE_MS) {
        branchStreamLastUpdateRef.current = now;
        updateFn(branchId, messageId, branchStreamContentRef.current);
      } else if (!branchStreamUpdateTimeoutRef.current) {
        // Schedule a deferred update to ensure content is eventually shown
        branchStreamUpdateTimeoutRef.current = setTimeout(() => {
          branchStreamUpdateTimeoutRef.current = null;
          if (branchStreamContentRef.current) {
            branchStreamLastUpdateRef.current = Date.now();
            updateFn(branchId, messageId, branchStreamContentRef.current);
          }
        }, STREAM_UPDATE_THROTTLE_MS);
      }
    };
  }, []);

  // Get width for a branch, defaulting to BRANCH_DEFAULT_WIDTH
  const getBranchWidth = useCallback((branchId: string) => {
    return branchWidths[branchId] ?? BRANCH_DEFAULT_WIDTH;
  }, [branchWidths]);

  // Handle branch resize
  const handleBranchResize = useCallback((branchId: string, delta: number) => {
    setBranchWidths(prev => {
      const currentWidth = prev[branchId] ?? BRANCH_DEFAULT_WIDTH;
      const newWidth = Math.min(BRANCH_MAX_WIDTH, Math.max(BRANCH_MIN_WIDTH, currentWidth + delta));
      return { ...prev, [branchId]: newWidth };
    });
  }, []);

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
    const currentCount = activeConversation?.messages.length ?? 0;
    const messageCountChanged = currentCount !== prevMessageCountRef.current;
    prevMessageCountRef.current = currentCount;

    // Always scroll for new messages, or during streaming if near bottom
    if (messageCountChanged || (isLoading && isNearBottomRef.current)) {
      messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? 'instant' : 'smooth' });
    }
  }, [activeConversation?.messages, isLoading]);

  // Cancel pending requests when switching conversations
  useEffect(() => {
    // When conversation changes, abort any pending main conversation request
    // but let the streaming continue in the background for the old conversation
    // The abort is handled in handleSend when a new request is made
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (branchAbortControllerRef.current) {
        branchAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    let conv = activeConversation;
    if (!conv) {
      conv = createConversation();
    }

    // Capture conversation ID immediately to avoid closure issues
    const conversationId = conv.id;

    // Only cancel if there's an existing request for the SAME conversation
    // (user sending another message before previous response completes)
    // Don't cancel requests for other conversations - let them complete in background
    if (loadingConversationId === conversationId && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    const userMessage = addMessage(content, 'user', null, conversationId, attachments);
    setLoadingConversationId(conversationId);

    // Create placeholder assistant message
    const assistantMessage = addMessage('', 'assistant', null, conversationId);

    try {
      const messageHistory: Message[] = [...conv.messages, userMessage];

      // Use throttled callback to reduce state updates during streaming
      const onChunk = createThrottledStreamCallback(
        assistantMessage.id,
        conversationId,
        updateMessageContent,
        abortSignal
      );

      await streamChatMessage(messageHistory, selectedModel, profile.bio, onChunk, apiKeys, { webSearchEnabled: webSearchEnabled && selectedModel.supportsWebSearch });
    } catch (error) {
      // Don't show error if request was aborted (user switched conversations)
      if (abortSignal.aborted) return;
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'API Error',
        description: errorMessage,
        variant: 'destructive',
      });
      updateMessageContent(assistantMessage.id, 'Error: Failed to get response', conversationId);
    } finally {
      // Only clear loading state if this is still the active request
      if (!abortSignal.aborted) {
        setLoadingConversationId(null);
      }
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation) return;

    const conversationId = activeConversation.id;

    // Only cancel if there's an existing request for the SAME conversation
    if (loadingConversationId === conversationId && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    editMessage(messageId, newContent);
    setLoadingConversationId(conversationId);

    // Create placeholder assistant message
    const assistantMessage = addMessage('', 'assistant', null, conversationId);

    try {
      const msgIndex = activeConversation.messages.findIndex(m => m.id === messageId);
      const messagesUpToEdit = activeConversation.messages.slice(0, msgIndex);
      const editedMessage: Message = {
        ...activeConversation.messages[msgIndex],
        content: newContent,
      };
      const messageHistory: Message[] = [...messagesUpToEdit, editedMessage];

      // Use throttled callback to reduce state updates during streaming
      const onChunk = createThrottledStreamCallback(
        assistantMessage.id,
        conversationId,
        updateMessageContent,
        abortSignal
      );

      await streamChatMessage(messageHistory, selectedModel, profile.bio, onChunk, apiKeys, { webSearchEnabled: webSearchEnabled && selectedModel.supportsWebSearch });
    } catch (error) {
      if (abortSignal.aborted) return;
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'API Error',
        description: errorMessage,
        variant: 'destructive',
      });
      updateMessageContent(assistantMessage.id, 'Error: Failed to get response', conversationId);
    } finally {
      if (!abortSignal.aborted) {
        setLoadingConversationId(null);
      }
    }
  };

  const handleBranchSend = (branchId: string) => async (content: string, attachments?: Attachment[]) => {
    if (!activeConversation) return;

    const branch = activeBranches.find(b => b.id === branchId);
    if (!branch) return;

    addMessageToBranch(branchId, content, 'user', attachments);
    setLoadingBranchId(branchId);

    // Create placeholder assistant message in branch and capture its ID
    const assistantMsgId = addMessageToBranch(branchId, '', 'assistant');

    try {
      const rootMsgIndex = activeConversation.messages.findIndex(m => m.id === branch.rootMessageId);
      const contextMessages = activeConversation.messages.slice(0, rootMsgIndex + 1);
      const branchMessages = branch.messages;
      const newUserMessage: Message = {
        id: `temp-${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date(),
        parentId: null,
        branchIds: [],
        attachments,
      };

      const messageHistory: Message[] = [...contextMessages, ...branchMessages, newUserMessage];
      const branchModel = branch.model || selectedModel;

      // Use throttled callback to reduce state updates during streaming
      const onChunk = createThrottledBranchCallback(branchId, assistantMsgId, updateBranchMessageContent);

      await streamChatMessage(messageHistory, branchModel, profile.bio, onChunk, apiKeys, { webSearchEnabled: webSearchEnabled && branchModel.supportsWebSearch });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'API Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingBranchId(null);
    }
  };

  const handleBranch = (messageId: string) => {
    createBranch(messageId);
  };

  const handleGenerateResponse = async (branch: typeof activeBranches[0]) => {
    if (!activeConversation) return;

    const rootMessage = activeConversation.messages.find(m => m.id === branch.rootMessageId);
    if (!rootMessage || rootMessage.role !== 'user') return;

    setLoadingBranchId(branch.id);

    // Create placeholder assistant message in branch and capture its ID
    const assistantMsgId = addMessageToBranch(branch.id, '', 'assistant');

    try {
      const rootMsgIndex = activeConversation.messages.findIndex(m => m.id === branch.rootMessageId);
      const messageHistory = activeConversation.messages.slice(0, rootMsgIndex + 1);
      const branchModel = branch.model || selectedModel;

      // Use throttled callback to reduce state updates during streaming
      const onChunk = createThrottledBranchCallback(branch.id, assistantMsgId, updateBranchMessageContent);

      await streamChatMessage(messageHistory, branchModel, profile.bio, onChunk, apiKeys, { webSearchEnabled: webSearchEnabled && branchModel.supportsWebSearch });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'API Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingBranchId(null);
    }
  };

  const handleBranchEditMessage = async (branchId: string, messageId: string, newContent: string) => {
    if (!activeConversation) return;

    const branch = activeBranches.find(b => b.id === branchId);
    if (!branch) return;

    editMessage(messageId, newContent, branchId);
    setLoadingBranchId(branchId);

    // Create placeholder assistant message in branch and capture its ID
    const assistantMsgId = addMessageToBranch(branchId, '', 'assistant');

    try {
      const rootMsgIndex = activeConversation.messages.findIndex(m => m.id === branch.rootMessageId);
      const contextMessages = activeConversation.messages.slice(0, rootMsgIndex + 1);

      const branchMsgIndex = branch.messages.findIndex(m => m.id === messageId);
      const branchMessagesUpToEdit = branch.messages.slice(0, branchMsgIndex);
      const editedMessage: Message = {
        ...branch.messages[branchMsgIndex],
        content: newContent,
      };

      const messageHistory: Message[] = [...contextMessages, ...branchMessagesUpToEdit, editedMessage];
      const branchModel = branch.model || selectedModel;

      // Use throttled callback to reduce state updates during streaming
      const onChunk = createThrottledBranchCallback(branchId, assistantMsgId, updateBranchMessageContent);

      await streamChatMessage(messageHistory, branchModel, profile.bio, onChunk, apiKeys, { webSearchEnabled: webSearchEnabled && branchModel.supportsWebSearch });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'API Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingBranchId(null);
    }
  };

  // Toggle web search handler
  const handleWebSearchToggle = () => {
    setWebSearchEnabled(!webSearchEnabled);
  };

  if (!activeConversation) {
    return (
      <div className="flex flex-col h-full">
        {/* Draggable header area for Electron - with gap for hamburger menu */}
        <div
          className="h-12 shrink-0 flex"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* Left spacer for hamburger menu / traffic lights - NOT draggable */}
          <div
            className={`shrink-0 lg:hidden ${isElectron() ? 'w-28' : 'w-14'}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          />
        </div>
        <div className="flex-1 flex items-center justify-center p-8 -mt-12">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-2">Welcome to BranChat</h1>
            <p className="text-muted-foreground mb-6">
              Start a conversation and branch off at any point to explore different directions.
              Your ideas can grow like a tree.
            </p>
            <div className="flex justify-center">
              <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
            </div>
          </div>
        </div>
        <div className="p-4 max-w-3xl mx-auto w-full">
          <ChatInput
            onSend={handleSend}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={handleWebSearchToggle}
            supportsWebSearch={selectedModel.supportsWebSearch}
            supportedMimeTypes={getSupportedMimeTypes(selectedModel.provider)}
            supportsFileAttachments={supportsAttachments(selectedModel.provider)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - draggable with no-drag zones for interactive elements */}
        <div
          className="flex items-center justify-between px-4 py-1.5 border-b"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          {/* Left spacer for hamburger menu / traffic lights - NOT draggable */}
          <div
            className={`shrink-0 lg:hidden ${isElectron() ? 'w-28' : 'w-14'}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          />
          {/* Title */}
          <h2 className="font-semibold truncate flex-1 lg:flex-none" style={{ paddingLeft: '0.5rem' }}>
            {activeConversation.title}
          </h2>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4"
        >
          <div className="max-w-3xl mx-auto">
            {activeConversation.messages.map((message, index) => {
              // Skip rendering empty assistant messages (streaming placeholders)
              const isLastMessage = index === activeConversation.messages.length - 1;
              const isEmptyAssistant = message.role === 'assistant' && message.content === '';
              if (isLastMessage && isEmptyAssistant && isLoading) {
                return null;
              }

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  branches={activeConversation.branches}
                  onBranch={handleBranch}
                  onOpenBranch={openBranch}
                  onEdit={handleEditMessage}
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

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
            </div>
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading}
              webSearchEnabled={webSearchEnabled}
              onWebSearchToggle={handleWebSearchToggle}
              supportsWebSearch={selectedModel.supportsWebSearch}
              supportedMimeTypes={getSupportedMimeTypes(selectedModel.provider)}
              supportsFileAttachments={supportsAttachments(selectedModel.provider)}
            />
          </div>
        </div>
      </div>

      {/* Branch panels */}
      {activeBranches.map((branch) => (
        <BranchPanel
          key={branch.id}
          branch={branch}
          parentMessages={activeConversation.messages}
          onClose={() => closeBranch(branch.id)}
          onDelete={() => deleteBranch(branch.id)}
          onSend={handleBranchSend(branch.id)}
          onModelChange={(model) => setBranchModel(branch.id, model)}
          onGenerateResponse={() => handleGenerateResponse(branch)}
          onEditMessage={(msgId, content) => handleBranchEditMessage(branch.id, msgId, content)}
          isLoading={loadingBranchId === branch.id}
          width={getBranchWidth(branch.id)}
          onResize={(delta) => handleBranchResize(branch.id, delta)}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={handleWebSearchToggle}
        />
      ))}
    </div>
  );
}
