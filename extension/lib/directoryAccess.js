import { deleteHandle, getHandle, storeHandle } from './handleVault.js';

const ROOT_DIRECTORY_HANDLE_KEY = 'rootDirectoryHandle';

export class HandlePermissionError extends Error {
  constructor(message = 'Read/write permission was not granted for the stored directory handle.') {
    super(message);
    this.name = 'HandlePermissionError';
  }
}

export async function ensureReadWritePermission(directoryHandle) {
  if (!directoryHandle) {
    return false;
  }

  const options = { mode: 'readwrite' };

  if (typeof directoryHandle.queryPermission === 'function') {
    const permission = await directoryHandle.queryPermission(options);
    if (permission === 'granted') {
      return true;
    }
    if (permission === 'denied') {
      return false;
    }
  }

  if (typeof directoryHandle.requestPermission === 'function') {
    const permission = await directoryHandle.requestPermission(options);
    return permission === 'granted';
  }

  return false;
}

export async function storeRootDirectoryHandle(directoryHandle) {
  if (!directoryHandle) {
    await deleteHandle(ROOT_DIRECTORY_HANDLE_KEY);
    return;
  }

  await storeHandle(ROOT_DIRECTORY_HANDLE_KEY, directoryHandle);
}

export async function restoreRootDirectoryHandle() {
  const directoryHandle = await getHandle(ROOT_DIRECTORY_HANDLE_KEY);
  if (!directoryHandle) {
    return null;
  }

  const hasPermission = await ensureReadWritePermission(directoryHandle);
  if (!hasPermission) {
    await deleteHandle(ROOT_DIRECTORY_HANDLE_KEY);
    throw new HandlePermissionError();
  }

  return directoryHandle;
}

export async function clearRootDirectoryHandle() {
  await deleteHandle(ROOT_DIRECTORY_HANDLE_KEY);
}

