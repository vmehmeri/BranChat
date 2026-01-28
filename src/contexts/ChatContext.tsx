import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Message, Branch, Conversation, Model, MODELS, Attachment } from '@/types/chat';
import { initDatabase, getAllConversations, saveConversation, deleteConversation as dbDeleteConversation, deleteBranch as dbDeleteBranch } from '@/services/database';
import { deleteBlobs } from '@/services/attachments';
import { useSettings } from './SettingsContext';

// Debounce delay for database saves (ms)
const DB_SAVE_DEBOUNCE_MS = 1000;

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeBranches: Branch[];
  selectedModel: Model;
  isLoading: boolean;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (enabled: boolean) => void;
  setSelectedModel: (model: Model) => void;
  createConversation: () => Conversation;
  setActiveConversation: (id: string) => void;
  addMessage: (content: string, role: 'user' | 'assistant', parentId?: string | null, conversationId?: string, attachments?: Attachment[]) => Message;
  updateMessageContent: (messageId: string, content: string, conversationId?: string) => void;
  editMessage: (messageId: string, newContent: string, branchId?: string) => void;
  createBranch: (fromMessageId: string) => Branch;
  toggleBranchCollapse: (branchId: string) => void;
  openBranch: (branchId: string) => void;
  closeBranch: (branchId: string) => void;
  addMessageToBranch: (branchId: string, content: string, role: 'user' | 'assistant', attachments?: Attachment[]) => string;
  updateBranchMessageContent: (branchId: string, messageId: string, content: string) => void;
  deleteConversation: (id: string) => void;
  deleteBranch: (branchId: string) => void;
  setBranchModel: (branchId: string, model: Model) => void;
  clearAllConversations: () => void;
  toggleStar: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const BRANCH_COLORS = [
  'hsl(217 91% 60%)',
  'hsl(142 71% 45%)',
  'hsl(280 65% 60%)',
  'hsl(47 95% 55%)',
  'hsl(0 84% 60%)',
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeBranchIds, setActiveBranchIds] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model>(() => {
    return MODELS.find(m => m.id === settings.defaultModelId) || MODELS[0];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const isInitialized = useRef(false);

  // Track modified conversation IDs for debounced saving
  const modifiedConvIds = useRef<Set<string>>(new Set());
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save function - saves modified conversations after delay
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (modifiedConvIds.current.size === 0) return;

      const idsToSave = new Set(modifiedConvIds.current);
      modifiedConvIds.current.clear();

      // Get current conversations and save only modified ones
      setConversations(currentConvs => {
        for (const id of idsToSave) {
          const conv = currentConvs.find(c => c.id === id);
          if (conv) {
            saveConversation(conv);
          }
        }
        return currentConvs; // No state change, just using for access
      });
    }, DB_SAVE_DEBOUNCE_MS);
  }, []);

  // Mark conversation as modified and trigger debounced save
  const markModified = useCallback((convId: string) => {
    if (!isInitialized.current) return;
    modifiedConvIds.current.add(convId);
    debouncedSave();
  }, [debouncedSave]);

  // Update selected model when default model setting changes (only if no active conversation)
  useEffect(() => {
    if (!activeConversationId) {
      const defaultModel = MODELS.find(m => m.id === settings.defaultModelId) || MODELS[0];
      setSelectedModel(defaultModel);
    }
  }, [settings.defaultModelId, activeConversationId]);

  // Load conversations from database on mount
  useEffect(() => {
    async function loadData() {
      try {
        await initDatabase();
        const loadedConversations = getAllConversations();
        setConversations(loadedConversations);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setIsLoading(false);
        isInitialized.current = true;
      }
    }
    loadData();
  }, []);

  // Cleanup: flush pending saves on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Flush any pending saves immediately on unmount
        const currentModifiedIds = Array.from(modifiedConvIds.current);
        const currentModifiedSet = modifiedConvIds.current;
        for (const id of currentModifiedIds) {
          const conv = conversations.find(c => c.id === id);
          if (conv) {
            saveConversation(conv);
          }
        }
        currentModifiedSet.clear();
      }
    };
  }, [conversations]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  const activeBranches = activeConversation?.branches.filter(b => activeBranchIds.includes(b.id)) || [];

  const createConversation = useCallback(() => {
    // Use the currently selected model, not the default
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New Conversation',
      messages: [],
      branches: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: selectedModel,
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    setActiveBranchIds([]);
    markModified(newConversation.id);
    // Don't reset selectedModel - keep the user's selection
    return newConversation;
  }, [selectedModel, markModified]);

  const setActiveConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setActiveBranchIds([]);
  }, []);

  const addMessage = useCallback((content: string, role: 'user' | 'assistant', parentId?: string | null, conversationId?: string, attachments?: Attachment[]): Message => {
    const targetConvId = conversationId || activeConversationId;

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      role,
      timestamp: new Date(),
      parentId: parentId ?? null,
      branchIds: [],
      model: role === 'assistant' ? selectedModel : undefined,
      attachments,
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        const messages = [...conv.messages, newMessage];
        const title = conv.messages.length === 0 && role === 'user'
          ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
          : conv.title;
        return { ...conv, messages, title, updatedAt: new Date() };
      }
      return conv;
    }));

    if (targetConvId) markModified(targetConvId);
    return newMessage;
  }, [activeConversationId, selectedModel, markModified]);

  const updateMessageContent = useCallback((messageId: string, content: string, conversationId?: string) => {
    const targetConvId = conversationId || activeConversationId;
    if (!targetConvId) return;

    setConversations(prev => prev.map(conv => {
      if (conv.id === targetConvId) {
        return {
          ...conv,
          messages: conv.messages.map(msg =>
            msg.id === messageId ? { ...msg, content } : msg
          ),
        };
      }
      return conv;
    }));

    markModified(targetConvId);
  }, [activeConversationId, markModified]);

  const updateBranchMessageContent = useCallback((branchId: string, messageId: string, content: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          branches: conv.branches.map(b =>
            b.id === branchId
              ? {
                  ...b,
                  messages: b.messages.map(msg =>
                    msg.id === messageId ? { ...msg, content } : msg
                  ),
                }
              : b
          ),
        };
      }
      return conv;
    }));

    if (activeConversationId) markModified(activeConversationId);
  }, [activeConversationId, markModified]);

  const editMessage = useCallback((messageId: string, newContent: string, branchId?: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        if (branchId) {
          // Edit message in a branch
          return {
            ...conv,
            branches: conv.branches.map(b => {
              if (b.id === branchId) {
                const msgIndex = b.messages.findIndex(m => m.id === messageId);
                if (msgIndex !== -1) {
                  // Update the message and remove all subsequent messages
                  const updatedMessages = b.messages.slice(0, msgIndex);
                  updatedMessages.push({ ...b.messages[msgIndex], content: newContent });
                  return { ...b, messages: updatedMessages };
                }
              }
              return b;
            }),
            updatedAt: new Date()
          };
        } else {
          // Edit message in main conversation
          const msgIndex = conv.messages.findIndex(m => m.id === messageId);
          if (msgIndex !== -1) {
            // Update the message and remove all subsequent messages
            const updatedMessages = conv.messages.slice(0, msgIndex);
            updatedMessages.push({ ...conv.messages[msgIndex], content: newContent });
            return { ...conv, messages: updatedMessages, updatedAt: new Date() };
          }
        }
      }
      return conv;
    }));

    if (activeConversationId) markModified(activeConversationId);
  }, [activeConversationId, markModified]);

  const createBranch = useCallback((fromMessageId: string): Branch => {
    const conv = conversations.find(c => c.id === activeConversationId);
    const colorIndex = (conv?.branches.length || 0) % BRANCH_COLORS.length;

    // Check if the root message is from the user to auto-select a different model
    const rootMessage = conv?.messages.find(m => m.id === fromMessageId);
    let branchModel = selectedModel;

    if (rootMessage?.role === 'user') {
      // Find the model used for the response after this user message (if any)
      const msgIndex = conv?.messages.findIndex(m => m.id === fromMessageId) ?? -1;
      const responseAfter = conv?.messages[msgIndex + 1];
      const originalModel = responseAfter?.model || selectedModel;

      // Select a different model
      const otherModels = MODELS.filter(m => m.id !== originalModel.id);
      branchModel = otherModels[Math.floor(Math.random() * otherModels.length)] || selectedModel;
    }

    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      name: `Branch ${(conv?.branches.length || 0) + 1}`,
      rootMessageId: fromMessageId,
      messages: [],
      isCollapsed: false,
      color: BRANCH_COLORS[colorIndex],
      createdAt: new Date(),
      model: branchModel,
    };

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const updatedMessages = conv.messages.map(msg =>
          msg.id === fromMessageId
            ? { ...msg, branchIds: [...msg.branchIds, newBranch.id] }
            : msg
        );
        return {
          ...conv,
          messages: updatedMessages,
          branches: [...conv.branches, newBranch],
          updatedAt: new Date()
        };
      }
      return conv;
    }));

    setActiveBranchIds(prev => [...prev, newBranch.id]);
    if (activeConversationId) markModified(activeConversationId);
    return newBranch;
  }, [activeConversationId, conversations, selectedModel, markModified]);

  const toggleBranchCollapse = useCallback((branchId: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          branches: conv.branches.map(b =>
            b.id === branchId ? { ...b, isCollapsed: !b.isCollapsed } : b
          )
        };
      }
      return conv;
    }));

    if (activeConversationId) markModified(activeConversationId);
  }, [activeConversationId, markModified]);

  const openBranch = useCallback((branchId: string) => {
    setActiveBranchIds(prev => prev.includes(branchId) ? prev : [...prev, branchId]);
  }, []);

  const closeBranch = useCallback((branchId: string) => {
    setActiveBranchIds(prev => prev.filter(id => id !== branchId));
  }, []);

  const addMessageToBranch = useCallback((branchId: string, content: string, role: 'user' | 'assistant', attachments?: Attachment[]): string => {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const branch = conv.branches.find(b => b.id === branchId);
        const branchModel = branch?.model || selectedModel;

        const newMessage: Message = {
          id: messageId,
          content,
          role,
          timestamp: new Date(),
          parentId: null,
          branchIds: [],
          model: role === 'assistant' ? branchModel : undefined,
          attachments,
        };

        return {
          ...conv,
          branches: conv.branches.map(b =>
            b.id === branchId ? { ...b, messages: [...b.messages, newMessage] } : b
          ),
          updatedAt: new Date()
        };
      }
      return conv;
    }));

    if (activeConversationId) markModified(activeConversationId);
    return messageId;
  }, [activeConversationId, selectedModel, markModified]);

  const setBranchModel = useCallback((branchId: string, model: Model) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        return {
          ...conv,
          branches: conv.branches.map(b =>
            b.id === branchId ? { ...b, model } : b
          ),
          updatedAt: new Date()
        };
      }
      return conv;
    }));

    if (activeConversationId) markModified(activeConversationId);
  }, [activeConversationId, markModified]);

  const deleteConversation = useCallback((id: string) => {
    // Collect all attachment blob IDs before deleting
    const conversation = conversations.find(c => c.id === id);
    if (conversation) {
      const blobIds: string[] = [];

      // Collect from main messages
      for (const msg of conversation.messages) {
        if (msg.attachments) {
          blobIds.push(...msg.attachments.map(a => a.id));
        }
      }

      // Collect from branch messages
      for (const branch of conversation.branches) {
        for (const msg of branch.messages) {
          if (msg.attachments) {
            blobIds.push(...msg.attachments.map(a => a.id));
          }
        }
      }

      // Delete blobs asynchronously (don't block UI)
      if (blobIds.length > 0) {
        deleteBlobs(blobIds).catch(error => {
          console.error('Failed to delete attachment blobs:', error);
        });
      }
    }

    dbDeleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setActiveBranchIds([]);
    }
  }, [activeConversationId, conversations]);

  const deleteBranch = useCallback((branchId: string) => {
    // Find the conversation containing this branch
    const conversation = conversations.find(c =>
      c.branches.some(b => b.id === branchId)
    );
    if (!conversation) return;

    // Find the branch
    const branch = conversation.branches.find(b => b.id === branchId);
    if (!branch) return;

    // Collect attachment blob IDs from branch messages
    const blobIds: string[] = [];
    for (const msg of branch.messages) {
      if (msg.attachments) {
        blobIds.push(...msg.attachments.map(a => a.id));
      }
    }

    // Delete blobs asynchronously (don't block UI)
    if (blobIds.length > 0) {
      deleteBlobs(blobIds).catch(error => {
        console.error('Failed to delete branch attachment blobs:', error);
      });
    }

    // Delete from database
    dbDeleteBranch(branchId);

    // Update state:
    // 1. Remove branch from conversation.branches
    // 2. Remove branch ID from source message's branchIds array
    setConversations(prev => prev.map(conv => {
      if (conv.id === conversation.id) {
        return {
          ...conv,
          messages: conv.messages.map(msg =>
            msg.branchIds.includes(branchId)
              ? { ...msg, branchIds: msg.branchIds.filter(id => id !== branchId) }
              : msg
          ),
          branches: conv.branches.filter(b => b.id !== branchId),
          updatedAt: new Date(),
        };
      }
      return conv;
    }));

    // Remove from active branches if currently open
    setActiveBranchIds(prev => prev.filter(id => id !== branchId));

    // Mark conversation as modified for debounced save
    markModified(conversation.id);
  }, [conversations, markModified]);

  const clearAllConversations = useCallback(async () => {
    // Collect all attachment blob IDs
    const blobIds: string[] = [];
    for (const conversation of conversations) {
      for (const msg of conversation.messages) {
        if (msg.attachments) {
          blobIds.push(...msg.attachments.map(a => a.id));
        }
      }
      for (const branch of conversation.branches) {
        for (const msg of branch.messages) {
          if (msg.attachments) {
            blobIds.push(...msg.attachments.map(a => a.id));
          }
        }
      }
    }

    // Delete all blobs asynchronously
    if (blobIds.length > 0) {
      deleteBlobs(blobIds).catch(error => {
        console.error('Failed to delete attachment blobs:', error);
      });
    }

    setConversations([]);
    setActiveConversationId(null);
    setActiveBranchIds([]);
  }, [conversations]);

  const toggleStar = useCallback((id: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === id) {
        return { ...conv, starred: !conv.starred };
      }
      return conv;
    }));

    markModified(id);
  }, [markModified]);

  const updateConversationTitle = useCallback((id: string, title: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id === id) {
        return { ...conv, title, updatedAt: new Date() };
      }
      return conv;
    }));

    markModified(id);
  }, [markModified]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      activeBranches,
      selectedModel,
      isLoading,
      webSearchEnabled,
      setWebSearchEnabled,
      setSelectedModel,
      createConversation,
      setActiveConversation,
      addMessage,
      updateMessageContent,
      editMessage,
      createBranch,
      toggleBranchCollapse,
      openBranch,
      closeBranch,
      addMessageToBranch,
      updateBranchMessageContent,
      deleteConversation,
      deleteBranch,
      setBranchModel,
      clearAllConversations,
      toggleStar,
      updateConversationTitle,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
