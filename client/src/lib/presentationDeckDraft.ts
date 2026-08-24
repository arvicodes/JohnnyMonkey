import type { PresentationDeck } from './presentationDeck';

const DB_NAME = 'johnnyMonkeyPresentationDrafts_v1';
const STORE = 'drafts';

export type PresentationDeckDraft = {
  lessonPath: string;
  deck: PresentationDeck;
  savedAt: number;
};

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
        db.createObjectStore(STORE, { keyPath: 'lessonPath' });
      }
    };
  });
}

export async function putPresentationDeckDraft(
  lessonPath: string,
  deck: PresentationDeck,
): Promise<void> {
  if (!lessonPath || !deck?.slides?.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({
      lessonPath,
      deck,
      savedAt: Date.now(),
    } satisfies PresentationDeckDraft);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB draft write failed'));
    };
  });
}

export async function readPresentationDeckDraft(
  lessonPath: string,
): Promise<PresentationDeckDraft | null> {
  if (!lessonPath) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(lessonPath);
    req.onsuccess = () => {
      const row = (req.result as PresentationDeckDraft | undefined) ?? null;
      resolve(row?.deck?.slides?.length ? row : null);
    };
    req.onerror = () => reject(req.error ?? new Error('IndexedDB draft read failed'));
    tx.oncomplete = () => db.close();
  });
}

export async function clearPresentationDeckDraft(lessonPath: string): Promise<void> {
  if (!lessonPath) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(lessonPath);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IndexedDB draft clear failed'));
    };
  });
}

/** Entwurf ist neuer als die zuletzt gespeicherte Datei — nach Absturz/Tab-Schließen wiederherstellen. */
export function isDraftNewerThanDeck(
  draft: PresentationDeckDraft,
  deck: PresentationDeck,
): boolean {
  const serverAt = Date.parse(deck.updatedAt || '') || 0;
  const draftSlides = draft.deck?.slides?.length ?? 0;
  if (draftSlides < 1) return false;
  return draft.savedAt > serverAt + 400;
}
