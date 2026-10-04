/**
 * Kurzzeit-Cache für rekursive Verzeichnis-Lesevorgänge (entlastet Event-Loop bei vielen Tabs).
 */

const TTL_MS = 60_000;
const MAX_ENTRIES = 80;

type Entry = { expires: number; payload: unknown };

const store = new Map<string, Entry>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (v.expires <= now) store.delete(k);
  }
  while (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first === undefined) break;
    store.delete(first);
  }
}

export function directoryReadCacheKey(filePath: string, recursive: boolean): string {
  const p = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
  return `${p}|${recursive ? '1' : '0'}`;
}

export function getDirectoryReadCache(key: string): unknown | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return hit.payload;
}

export function setDirectoryReadCache(key: string, payload: unknown): void {
  prune();
  store.set(key, { payload, expires: Date.now() + TTL_MS });
}

export function invalidateDirectoryReadCache(pathPrefix?: string): void {
  if (!pathPrefix) {
    store.clear();
    return;
  }
  const prefix = pathPrefix.replace(/\\/g, '/').replace(/\/+$/, '').trim();
  for (const key of store.keys()) {
    if (key.startsWith(`${prefix}|`)) store.delete(key);
  }
}
