const DB_NAME = 'researchTrailHandleVault';
const STORE_NAME = 'handles';

const indexedDBInstance = globalThis.indexedDB || globalThis.webkitIndexedDB || globalThis.mozIndexedDB || globalThis.msIndexedDB;
const memoryFallback = new Map();

function openDatabase() {
  if (!indexedDBInstance) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBInstance.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB handle vault.'));
  });
}

async function runTransaction(mode, action) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    let request;
    try {
      request = action(store);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    transaction.onerror = () => reject(transaction.error ?? request?.error ?? new Error('IndexedDB transaction failed.'));
  });
}

export async function storeHandle(key, handle) {
  if (!indexedDBInstance) {
    if (handle === undefined) {
      memoryFallback.delete(key);
    } else {
      memoryFallback.set(key, handle);
    }
    return;
  }

  if (handle === undefined) {
    await runTransaction('readwrite', (store) => store.delete(key));
    return;
  }

  await runTransaction('readwrite', (store) => store.put(handle, key));
}

export async function getHandle(key) {
  if (!indexedDBInstance) {
    return memoryFallback.get(key) ?? null;
  }

  const result = await runTransaction('readonly', (store) => store.get(key));
  return result ?? null;
}

export async function deleteHandle(key) {
  if (!indexedDBInstance) {
    memoryFallback.delete(key);
    return;
  }

  await runTransaction('readwrite', (store) => store.delete(key));
}

export async function clearVault() {
  if (!indexedDBInstance) {
    memoryFallback.clear();
    return;
  }

  await runTransaction('readwrite', (store) => store.clear());
}
