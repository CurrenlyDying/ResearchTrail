import { HandlePermissionError, restoreRootDirectoryHandle } from './directoryAccess.js';

const ROOT_DIRECTORY_META_KEY = 'rootDirectoryMeta';

function promisifyChromeStorageGet(storage, key) {
  return new Promise((resolve) => {
    if (!storage || typeof storage.get !== 'function') {
      resolve(undefined);
      return;
    }

    storage.get(key, (items) => {
      if (chrome?.runtime?.lastError) {
        resolve(undefined);
        return;
      }
      resolve(items?.[key]);
    });
  });
}

function promisifyChromeStorageRemove(storage, key) {
  return new Promise((resolve) => {
    if (!storage || typeof storage.remove !== 'function') {
      resolve();
      return;
    }

    storage.remove(key, () => {
      resolve();
    });
  });
}

export default class ProjectStorage {
  constructor({ localStorage } = {}) {
    this.localStorage = localStorage ?? chrome?.storage?.local ?? null;
    this.rootDirectoryHandle = null;
    this.rootDirectoryMeta = null;
  }

  async load() {
    try {
      const restoredHandle = await restoreRootDirectoryHandle();
      if (restoredHandle) {
        this.rootDirectoryHandle = restoredHandle;
        if (!this.rootDirectoryMeta) {
          this.rootDirectoryMeta = await promisifyChromeStorageGet(this.localStorage, ROOT_DIRECTORY_META_KEY);
        }
        return restoredHandle;
      }

      this.rootDirectoryHandle = null;
      return null;
    } catch (error) {
      if (error instanceof HandlePermissionError) {
        this.rootDirectoryHandle = null;
        this.rootDirectoryMeta = null;
        await promisifyChromeStorageRemove(this.localStorage, ROOT_DIRECTORY_META_KEY);
        return null;
      }

      throw error;
    }
  }
}

