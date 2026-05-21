import type { StorySite } from './storySitesStorage';

const DB_NAME = 'johnnyMonkeyStorySites_v1';
const STORE = 'sites';
export const LEGACY_LS_KEY = 'johnnyMonkey_storySites_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nicht verfügbar'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function readAllSitesFromDb(): Promise<unknown[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as unknown[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
    tx.oncomplete = () => db.close();
  });
}

export async function putSiteInDb(site: StorySite): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(site);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB put failed'));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

export async function deleteSiteFromDb(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB delete failed'));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
}

export function readLegacyLocalStorageRaw(): string | null {
  try {
    return localStorage.getItem(LEGACY_LS_KEY);
  } catch {
    return null;
  }
}

export function clearLegacyLocalStorage(): void {
  try {
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    /* ignore */
  }
}
