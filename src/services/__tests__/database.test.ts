import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock sql.js before importing database module
const mockRun = vi.fn();
const mockExec = vi.fn(() => []);
const mockClose = vi.fn();
const mockExport = vi.fn(() => new Uint8Array([1, 2, 3]));

class MockDatabase {
  run = mockRun;
  exec = mockExec;
  close = mockClose;
  export = mockExport;

  constructor(_data?: Uint8Array) {
    // Constructor can accept optional data parameter
  }
}

vi.mock('sql.js', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      Database: MockDatabase,
    })
  ),
}));

// Mock isElectron
vi.mock('@/services/keychain', () => ({
  isElectron: vi.fn(() => false),
}));

// Mock IndexedDB
const mockIDBStore: Record<string, unknown> = {};

interface MockRequest {
  result: unknown;
  onsuccess: ((e: { target: MockRequest }) => void) | null;
  onerror: (() => void) | null;
}

const createMockRequest = (result: unknown): MockRequest => {
  const request: MockRequest = {
    result,
    onsuccess: null,
    onerror: null,
  };
  // Simulate async success immediately
  queueMicrotask(() => {
    if (request.onsuccess) {
      request.onsuccess({ target: request });
    }
  });
  return request;
};

const mockObjectStore = {
  get: vi.fn((key: string) => createMockRequest(mockIDBStore[key] ?? null)),
  put: vi.fn((data: unknown, key: string) => {
    mockIDBStore[key] = data;
    return createMockRequest(undefined);
  }),
  delete: vi.fn((key: string) => {
    delete mockIDBStore[key];
    return createMockRequest(undefined);
  }),
};

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
};

const mockIDB = {
  transaction: vi.fn(() => mockTransaction),
  close: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(() => true),
  },
  createObjectStore: vi.fn(),
};

interface MockOpenRequest extends MockRequest {
  onupgradeneeded: ((e: { target: MockOpenRequest }) => void) | null;
}

const mockIndexedDB = {
  open: vi.fn(() => {
    const request: MockOpenRequest = {
      result: mockIDB,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };
    // Simulate async success
    queueMicrotask(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request });
      }
    });
    return request;
  }),
};

Object.defineProperty(global, 'indexedDB', { value: mockIndexedDB, writable: true });

import {
  initDatabase,
  getAllConversations,
  saveConversation,
  deleteConversation,
  deleteBranch,
  saveDatabase,
  clearAllData,
} from '../database';
import type { Conversation, Message, Branch } from '@/types/chat';
import { MODELS } from '@/types/chat';

describe('database', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock schema check to return valid table
    mockExec.mockReturnValue([{ values: [['conversations']] }]);
    // Clear IDB store
    for (const key in mockIDBStore) {
      delete mockIDBStore[key];
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initDatabase', () => {
    it('creates tables on fresh initialization', async () => {
      // Mock fresh database scenario - no existing data, empty schema check
      mockExec.mockReturnValueOnce([]); // First call: schema check returns empty (no tables)

      const db = await initDatabase();

      expect(db).toBeDefined();
      expect(mockRun).toHaveBeenCalled();
      // Should create tables
      const createTableCalls = mockRun.mock.calls.filter((call) =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE TABLE')
      );
      expect(createTableCalls.length).toBeGreaterThan(0);
    });

    it('returns cached database on subsequent calls', async () => {
      const db1 = await initDatabase();
      const db2 = await initDatabase();

      expect(db1).toBe(db2);
    });
  });

  describe('getAllConversations', () => {
    it('returns empty array when no conversations exist', async () => {
      await initDatabase();
      mockExec.mockReturnValue([]);

      const conversations = getAllConversations();

      expect(conversations).toEqual([]);
    });

    it('returns conversations with messages and branches', async () => {
      await initDatabase();

      // Mock conversation data
      mockExec
        .mockReturnValueOnce([
          {
            values: [
              ['conv-1', 'Test Conversation', 'gpt-4o', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 0],
            ],
          },
        ])
        .mockReturnValueOnce([
          {
            values: [
              ['msg-1', 'Hello', 'user', '2024-01-01T00:00:00.000Z', null, null],
            ],
          },
        ])
        .mockReturnValueOnce([{ values: [] }]) // branch IDs for message
        .mockReturnValueOnce([{ values: [] }]) // attachments for message
        .mockReturnValueOnce([{ values: [] }]); // branches

      const conversations = getAllConversations();

      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv-1');
      expect(conversations[0].title).toBe('Test Conversation');
      expect(conversations[0].messages).toHaveLength(1);
    });
  });

  describe('saveConversation', () => {
    it('inserts new conversation', async () => {
      await initDatabase();

      const conversation: Conversation = {
        id: 'conv-new',
        title: 'New Conversation',
        messages: [],
        branches: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        model: MODELS[0],
      };

      saveConversation(conversation);

      // Check that INSERT was called with conversation data
      const insertCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('INSERT OR REPLACE INTO conversations')
      );
      expect(insertCalls.length).toBeGreaterThan(0);
    });

    it('saves messages with attachments', async () => {
      await initDatabase();

      const message: Message = {
        id: 'msg-1',
        content: 'Hello',
        role: 'user',
        timestamp: new Date('2024-01-01'),
        parentId: null,
        branchIds: [],
        attachments: [
          {
            id: 'att-1',
            name: 'image.png',
            type: 'image',
            mimeType: 'image/png',
            size: 1024,
          },
        ],
      };

      const conversation: Conversation = {
        id: 'conv-with-attachments',
        title: 'With Attachments',
        messages: [message],
        branches: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        model: MODELS[0],
      };

      saveConversation(conversation);

      // Check that attachment was inserted
      const attachmentCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('INSERT INTO attachments')
      );
      expect(attachmentCalls.length).toBeGreaterThan(0);
    });

    it('saves branches with messages', async () => {
      await initDatabase();

      const branchMessage: Message = {
        id: 'branch-msg-1',
        content: 'Branch message',
        role: 'assistant',
        timestamp: new Date('2024-01-01'),
        parentId: null,
        branchIds: [],
      };

      const branch: Branch = {
        id: 'branch-1',
        name: 'Branch 1',
        rootMessageId: 'msg-1',
        messages: [branchMessage],
        isCollapsed: false,
        color: 'hsl(217 91% 60%)',
        createdAt: new Date('2024-01-01'),
      };

      const conversation: Conversation = {
        id: 'conv-with-branch',
        title: 'With Branch',
        messages: [
          {
            id: 'msg-1',
            content: 'Root',
            role: 'user',
            timestamp: new Date('2024-01-01'),
            parentId: null,
            branchIds: ['branch-1'],
          },
        ],
        branches: [branch],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        model: MODELS[0],
      };

      saveConversation(conversation);

      // Check that branch was inserted
      const branchCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('INSERT INTO branches')
      );
      expect(branchCalls.length).toBeGreaterThan(0);

      // Check that branch message was inserted
      const branchMsgCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('INSERT INTO branch_messages')
      );
      expect(branchMsgCalls.length).toBeGreaterThan(0);
    });
  });

  describe('deleteConversation', () => {
    it('deletes conversation and related data', async () => {
      await initDatabase();

      deleteConversation('conv-to-delete');

      // Check that DELETE was called for all related tables
      const deleteCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('DELETE FROM')
      );
      expect(deleteCalls.length).toBeGreaterThan(0);

      // Should delete from conversations table
      const convDeleteCalls = deleteCalls.filter((call) =>
        call[0].includes('DELETE FROM conversations')
      );
      expect(convDeleteCalls.length).toBeGreaterThan(0);
    });

    it('deletes attachments for conversation messages', async () => {
      await initDatabase();

      deleteConversation('conv-with-attachments');

      const attachmentDeleteCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('DELETE FROM attachments')
      );
      expect(attachmentDeleteCalls.length).toBeGreaterThan(0);
    });
  });

  describe('deleteBranch', () => {
    it('deletes branch and its messages', async () => {
      await initDatabase();

      deleteBranch('branch-to-delete');

      // Should delete branch messages
      const branchMsgDeleteCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('DELETE FROM branch_messages')
      );
      expect(branchMsgDeleteCalls.length).toBeGreaterThan(0);

      // Should delete from branches table
      const branchDeleteCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('DELETE FROM branches WHERE id')
      );
      expect(branchDeleteCalls.length).toBeGreaterThan(0);
    });

    it('deletes message_branches junction entries', async () => {
      await initDatabase();

      deleteBranch('branch-with-junction');

      const junctionDeleteCalls = mockRun.mock.calls.filter((call) =>
        call[0].includes('DELETE FROM message_branches')
      );
      expect(junctionDeleteCalls.length).toBeGreaterThan(0);
    });
  });

  describe('saveDatabase', () => {
    it('exports database to IndexedDB in web environment', async () => {
      await initDatabase();

      saveDatabase();

      expect(mockExport).toHaveBeenCalled();
    });
  });

  describe('clearAllData', () => {
    it('closes database and clears storage', async () => {
      await initDatabase();

      await clearAllData();

      expect(mockClose).toHaveBeenCalled();
    });
  });
});
