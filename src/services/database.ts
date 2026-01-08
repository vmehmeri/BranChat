import initSqlJs, { Database } from 'sql.js';
import { Conversation, Message, Branch, Model, MODELS, Attachment } from '@/types/chat';
import { isElectron } from '@/services/keychain';

const DB_STORAGE_KEY = 'branchat_db';
const IDB_DB_NAME = 'BranChatDB';
const IDB_STORE_NAME = 'database';

let db: Database | null = null;

// IndexedDB helpers for web storage
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const idb = (event.target as IDBOpenDBRequest).result;
      if (!idb.objectStoreNames.contains(IDB_STORE_NAME)) {
        idb.createObjectStore(IDB_STORE_NAME);
      }
    };
  });
}

async function readFromIndexedDB(): Promise<Uint8Array | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.get(DB_STORAGE_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        idb.close();
        resolve(request.result || null);
      };
    });
  } catch (error) {
    console.error('Failed to read from IndexedDB:', error);
    return null;
  }
}

async function writeToIndexedDB(data: Uint8Array): Promise<boolean> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.put(data, DB_STORAGE_KEY);
      request.onerror = () => {
        idb.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        idb.close();
        resolve(true);
      };
    });
  } catch (error) {
    console.error('Failed to write to IndexedDB:', error);
    return false;
  }
}

async function clearIndexedDB(): Promise<boolean> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = idb.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.delete(DB_STORAGE_KEY);
      request.onerror = () => {
        idb.close();
        reject(request.error);
      };
      request.onsuccess = () => {
        idb.close();
        resolve(true);
      };
    });
  } catch (error) {
    console.error('Failed to clear IndexedDB:', error);
    return false;
  }
}

// Load database from appropriate storage
async function loadDatabaseData(): Promise<Uint8Array | null> {
  if (isElectron()) {
    // Electron: read from file system
    const data = await window.electronAPI!.database.read();
    if (data) {
      return new Uint8Array(data);
    }
    return null;
  } else {
    // Web: try IndexedDB first, fall back to localStorage for migration
    const idbData = await readFromIndexedDB();
    if (idbData) {
      return idbData;
    }

    // Check localStorage for legacy data and migrate
    const legacyData = localStorage.getItem(DB_STORAGE_KEY);
    if (legacyData) {
      console.log('Migrating database from localStorage to IndexedDB...');
      try {
        const uint8Array = new Uint8Array(
          atob(legacyData)
            .split('')
            .map((c) => c.charCodeAt(0))
        );
        // Save to IndexedDB
        await writeToIndexedDB(uint8Array);
        // Remove from localStorage
        localStorage.removeItem(DB_STORAGE_KEY);
        console.log('Migration complete');
        return uint8Array;
      } catch (error) {
        console.error('Migration failed:', error);
        localStorage.removeItem(DB_STORAGE_KEY);
      }
    }
    return null;
  }
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  // Try to load existing database
  const savedData = await loadDatabaseData();
  if (savedData) {
    try {
      db = new SQL.Database(savedData);

      // Validate schema - check if required tables exist
      const tableCheck = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'"
      );
      if (tableCheck.length === 0 || tableCheck[0].values.length === 0) {
        // Schema is invalid/incomplete - recreate database
        console.warn('Database schema invalid, recreating...');
        db.close();
        db = new SQL.Database();
        createTables(db);
        saveDatabase();
      }
    } catch (error) {
      console.error('Failed to load database, creating new one:', error);
      db = new SQL.Database();
      createTables(db);
    }
  } else {
    db = new SQL.Database();
    createTables(db);
  }

  return db;
}

function createTables(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      starred INTEGER NOT NULL DEFAULT 0
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      parent_id TEXT,
      model_id TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      name TEXT NOT NULL,
      root_message_id TEXT NOT NULL,
      is_collapsed INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      model_id TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS branch_messages (
      id TEXT PRIMARY KEY,
      branch_id TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      model_id TEXT,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS message_branches (
      message_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      PRIMARY KEY (message_id, branch_id),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
    )
  `);

  // Note: 'data' column is nullable - blob data is stored separately in blob store
  database.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      message_type TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data TEXT,
      size INTEGER NOT NULL
    )
  `);
}

export function saveDatabase(): void {
  if (!db) return;

  try {
    const data = db.export();

    if (isElectron()) {
      // Electron: write to file system
      window.electronAPI!.database.write(Array.from(data)).catch((error) => {
        console.error('Failed to save database to file:', error);
      });
    } else {
      // Web: write to IndexedDB
      writeToIndexedDB(data).catch((error) => {
        console.error('Failed to save database to IndexedDB:', error);
      });
    }
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

export async function clearAllData(): Promise<boolean> {
  try {
    // Close the in-memory database
    if (db) {
      db.close();
      db = null;
    }

    if (isElectron()) {
      // Electron: delete the database file
      // We'll write an empty array to effectively clear it
      // A proper delete would need a new IPC handler
      return await window.electronAPI!.database.write([]);
    } else {
      // Web: clear from IndexedDB
      return await clearIndexedDB();
    }
  } catch (error) {
    console.error('Failed to clear all data:', error);
    return false;
  }
}

function getModelById(modelId: string): Model {
  return MODELS.find((m) => m.id === modelId) || MODELS[0];
}

function getAttachmentsForMessage(messageId: string, messageType: 'message' | 'branch_message'): Attachment[] {
  if (!db) return [];

  // Only load metadata - blob data is loaded lazily from blob store
  const attachmentRows = db.exec(
    `SELECT id, name, type, mime_type, size
     FROM attachments WHERE message_id = ? AND message_type = ?`,
    [messageId, messageType]
  );

  if (attachmentRows.length === 0) return [];

  return attachmentRows[0].values.map((row) => {
    const [id, name, type, mimeType, size] = row as [string, string, string, string, number];
    return {
      id,
      name,
      type: type as 'image' | 'document',
      mimeType,
      size,
      // Note: 'data' is not included - loaded lazily from blob store when needed
    };
  });
}

function saveAttachmentsForMessage(
  messageId: string,
  messageType: 'message' | 'branch_message',
  attachments: Attachment[] | undefined
): void {
  if (!db || !attachments || attachments.length === 0) return;

  // Save only metadata - blob data is stored separately in blob store
  for (const attachment of attachments) {
    db.run(
      `INSERT INTO attachments (id, message_id, message_type, name, type, mime_type, size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        attachment.id,
        messageId,
        messageType,
        attachment.name,
        attachment.type,
        attachment.mimeType,
        attachment.size,
      ]
    );
  }
}

export function getAllConversations(): Conversation[] {
  if (!db) return [];

  const conversations: Conversation[] = [];
  const convRows = db.exec('SELECT id, title, model_id, created_at, updated_at, starred FROM conversations ORDER BY updated_at DESC');

  if (convRows.length === 0) return [];

  for (const row of convRows[0].values) {
    const [id, title, modelId, createdAt, updatedAt, starred] = row as (string | number)[];

    // Get messages for this conversation
    const msgRows = db.exec(
      `SELECT id, content, role, timestamp, parent_id, model_id
       FROM messages WHERE conversation_id = ? ORDER BY timestamp`,
      [id]
    );

    const messages: Message[] = [];
    if (msgRows.length > 0) {
      for (const msgRow of msgRows[0].values) {
        const [msgId, content, role, timestamp, parentId, msgModelId] = msgRow as (string | null)[];

        // Get branch IDs for this message
        const branchRows = db.exec(
          'SELECT branch_id FROM message_branches WHERE message_id = ?',
          [msgId!]
        );
        const branchIds =
          branchRows.length > 0 ? branchRows[0].values.map((r) => r[0] as string) : [];

        // Get attachments for this message
        const attachments = getAttachmentsForMessage(msgId!, 'message');

        messages.push({
          id: msgId!,
          content: content!,
          role: role as 'user' | 'assistant',
          timestamp: new Date(timestamp!),
          parentId: parentId || null,
          branchIds,
          model: msgModelId ? getModelById(msgModelId) : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        });
      }
    }

    // Get branches for this conversation
    const branchRows = db.exec(
      `SELECT id, name, root_message_id, is_collapsed, color, created_at, model_id
       FROM branches WHERE conversation_id = ? ORDER BY created_at`,
      [id]
    );

    const branches: Branch[] = [];
    if (branchRows.length > 0) {
      for (const branchRow of branchRows[0].values) {
        const [branchId, name, rootMessageId, isCollapsed, color, branchCreatedAt, branchModelId] =
          branchRow as (string | number | null)[];

        // Get messages for this branch
        const branchMsgRows = db.exec(
          `SELECT id, content, role, timestamp, model_id
           FROM branch_messages WHERE branch_id = ? ORDER BY timestamp`,
          [branchId as string]
        );

        const branchMessages: Message[] = [];
        if (branchMsgRows.length > 0) {
          for (const bmRow of branchMsgRows[0].values) {
            const [bmId, bmContent, bmRole, bmTimestamp, bmModelId] = bmRow as (string | null)[];

            // Get attachments for this branch message
            const attachments = getAttachmentsForMessage(bmId!, 'branch_message');

            branchMessages.push({
              id: bmId!,
              content: bmContent!,
              role: bmRole as 'user' | 'assistant',
              timestamp: new Date(bmTimestamp!),
              parentId: null,
              branchIds: [],
              model: bmModelId ? getModelById(bmModelId) : undefined,
              attachments: attachments.length > 0 ? attachments : undefined,
            });
          }
        }

        branches.push({
          id: branchId as string,
          name: name as string,
          rootMessageId: rootMessageId as string,
          messages: branchMessages,
          isCollapsed: Boolean(isCollapsed),
          color: color as string,
          createdAt: new Date(branchCreatedAt as string),
          model: branchModelId ? getModelById(branchModelId as string) : undefined,
        });
      }
    }

    conversations.push({
      id: id as string,
      title: title as string,
      messages,
      branches,
      createdAt: new Date(createdAt as string),
      updatedAt: new Date(updatedAt as string),
      model: getModelById(modelId as string),
      starred: Boolean(starred),
    });
  }

  return conversations;
}

export function saveConversation(conversation: Conversation): void {
  if (!db) return;

  // Upsert conversation
  db.run(
    `INSERT OR REPLACE INTO conversations (id, title, model_id, created_at, updated_at, starred)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      conversation.id,
      conversation.title,
      conversation.model.id,
      conversation.createdAt.toISOString(),
      conversation.updatedAt.toISOString(),
      conversation.starred ? 1 : 0,
    ]
  );

  // Delete existing attachments for messages in this conversation
  db.run(
    `DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)`,
    [conversation.id]
  );

  // Delete existing messages and re-insert
  db.run('DELETE FROM messages WHERE conversation_id = ?', [conversation.id]);
  db.run('DELETE FROM message_branches WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)', [conversation.id]);

  for (const message of conversation.messages) {
    db.run(
      `INSERT INTO messages (id, conversation_id, content, role, timestamp, parent_id, model_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        conversation.id,
        message.content,
        message.role,
        message.timestamp.toISOString(),
        message.parentId,
        message.model?.id || null,
      ]
    );

    // Save attachments for this message
    saveAttachmentsForMessage(message.id, 'message', message.attachments);

    for (const branchId of message.branchIds) {
      db.run('INSERT OR IGNORE INTO message_branches (message_id, branch_id) VALUES (?, ?)', [
        message.id,
        branchId,
      ]);
    }
  }

  // Delete existing attachments for branch messages
  db.run(
    `DELETE FROM attachments WHERE message_id IN (SELECT id FROM branch_messages WHERE branch_id IN (SELECT id FROM branches WHERE conversation_id = ?))`,
    [conversation.id]
  );

  // Delete existing branches and re-insert
  db.run('DELETE FROM branch_messages WHERE branch_id IN (SELECT id FROM branches WHERE conversation_id = ?)', [conversation.id]);
  db.run('DELETE FROM branches WHERE conversation_id = ?', [conversation.id]);

  for (const branch of conversation.branches) {
    db.run(
      `INSERT INTO branches (id, conversation_id, name, root_message_id, is_collapsed, color, created_at, model_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        branch.id,
        conversation.id,
        branch.name,
        branch.rootMessageId,
        branch.isCollapsed ? 1 : 0,
        branch.color,
        branch.createdAt.toISOString(),
        branch.model?.id || null,
      ]
    );

    for (const message of branch.messages) {
      db.run(
        `INSERT INTO branch_messages (id, branch_id, content, role, timestamp, model_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          branch.id,
          message.content,
          message.role,
          message.timestamp.toISOString(),
          message.model?.id || null,
        ]
      );

      // Save attachments for this branch message
      saveAttachmentsForMessage(message.id, 'branch_message', message.attachments);
    }
  }

  saveDatabase();
}

export function deleteConversation(conversationId: string): void {
  if (!db) return;

  // Delete attachments for messages
  db.run(
    `DELETE FROM attachments WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)`,
    [conversationId]
  );
  // Delete attachments for branch messages
  db.run(
    `DELETE FROM attachments WHERE message_id IN (SELECT id FROM branch_messages WHERE branch_id IN (SELECT id FROM branches WHERE conversation_id = ?))`,
    [conversationId]
  );

  db.run('DELETE FROM message_branches WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)', [conversationId]);
  db.run('DELETE FROM branch_messages WHERE branch_id IN (SELECT id FROM branches WHERE conversation_id = ?)', [conversationId]);
  db.run('DELETE FROM branches WHERE conversation_id = ?', [conversationId]);
  db.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  db.run('DELETE FROM conversations WHERE id = ?', [conversationId]);

  saveDatabase();
}

export function deleteBranch(branchId: string): void {
  if (!db) return;

  // Delete attachments for branch messages
  db.run(
    `DELETE FROM attachments WHERE message_id IN (SELECT id FROM branch_messages WHERE branch_id = ?)`,
    [branchId]
  );

  // Delete branch messages
  db.run('DELETE FROM branch_messages WHERE branch_id = ?', [branchId]);

  // Delete message_branches junction entries
  db.run('DELETE FROM message_branches WHERE branch_id = ?', [branchId]);

  // Delete the branch itself
  db.run('DELETE FROM branches WHERE id = ?', [branchId]);

  saveDatabase();
}
