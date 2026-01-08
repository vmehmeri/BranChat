/**
 * Attachment Blob Store
 *
 * Stores attachment blob data separately from the main database.
 * - Web: Uses IndexedDB
 * - Electron: Uses filesystem via IPC
 *
 * This separation allows React state and database to hold only
 * lightweight references, dramatically reducing memory and I/O
 * during streaming updates.
 */

import { BlobEntry } from './types';
import { isElectron } from '@/services/keychain';

const IDB_DB_NAME = 'BranChatBlobStore';
const IDB_STORE_NAME = 'blobs';
const IDB_VERSION = 1;

// IndexedDB instance (web only)
let idbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize IndexedDB for web blob storage.
 */
function initIndexedDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;

  idbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_VERSION);

    request.onerror = () => {
      console.error('Failed to open blob store IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
      }
    };
  });

  return idbPromise;
}

/**
 * Save a blob to storage.
 */
export async function saveBlob(id: string, data: string): Promise<void> {
  const entry: BlobEntry = {
    id,
    data,
    createdAt: Date.now(),
  };

  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: save to filesystem
    await window.electronAPI.blobs.save(id, data);
  } else {
    // Web: save to IndexedDB
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => {
        console.error('Failed to save blob:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * Load a blob from storage.
 * Returns null if blob not found.
 */
export async function loadBlob(id: string): Promise<string | null> {
  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: load from filesystem
    return await window.electronAPI.blobs.load(id);
  } else {
    // Web: load from IndexedDB
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        console.error('Failed to load blob:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        const entry = request.result as BlobEntry | undefined;
        resolve(entry?.data ?? null);
      };
    });
  }
}

/**
 * Delete a blob from storage.
 */
export async function deleteBlob(id: string): Promise<void> {
  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: delete from filesystem
    await window.electronAPI.blobs.delete(id);
  } else {
    // Web: delete from IndexedDB
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        console.error('Failed to delete blob:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * Delete multiple blobs at once.
 */
export async function deleteBlobs(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: delete from filesystem
    await Promise.all(ids.map(id => window.electronAPI!.blobs!.delete(id)));
  } else {
    // Web: batch delete from IndexedDB
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);

      let completed = 0;
      let hasError = false;

      for (const id of ids) {
        const request = store.delete(id);
        request.onerror = () => {
          if (!hasError) {
            hasError = true;
            console.error('Failed to delete blob:', request.error);
            reject(request.error);
          }
        };
        request.onsuccess = () => {
          completed++;
          if (completed === ids.length && !hasError) {
            resolve();
          }
        };
      }
    });
  }
}

/**
 * Check if a blob exists in storage.
 */
export async function hasBlob(id: string): Promise<boolean> {
  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: check filesystem
    return await window.electronAPI.blobs.exists(id);
  } else {
    // Web: check IndexedDB
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.count(id);

      request.onerror = () => {
        console.error('Failed to check blob existence:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        resolve(request.result > 0);
      };
    });
  }
}

/**
 * Get all blob IDs in storage.
 * Useful for garbage collection.
 */
export async function getAllBlobIds(): Promise<string[]> {
  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: list from filesystem
    return await window.electronAPI.blobs.list();
  } else {
    // Web: list from IndexedDB
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.getAllKeys();

      request.onerror = () => {
        console.error('Failed to list blob IDs:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        resolve(request.result as string[]);
      };
    });
  }
}

/**
 * Clear all blobs from storage.
 * Use with caution - primarily for testing or data reset.
 */
export async function clearAllBlobs(): Promise<void> {
  if (isElectron() && window.electronAPI?.blobs) {
    // Electron: clear filesystem blobs
    const ids = await window.electronAPI.blobs.list();
    await Promise.all(ids.map(id => window.electronAPI!.blobs!.delete(id)));
  } else {
    // Web: clear IndexedDB store
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(IDB_STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        console.error('Failed to clear blob store:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }
}
