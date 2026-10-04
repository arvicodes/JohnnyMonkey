/**
 * Gemeinsamer Cache für /api/file-system-paths/read — weniger doppelte Vollbaum-Scans.
 */

import { parseReadApiChildren } from './wochenaufgabenFolder';

const TTL_MS = 90_000;

function normPath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
}

type CacheEntry = { expires: number; data: unknown };
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(path: string, recursive: boolean): string {
  return `${normPath(path)}|${recursive ? 'r' : 's'}`;
}

export function invalidateFsDirectoryCache(pathPrefix?: string): void {
  if (!pathPrefix) {
    cache.clear();
    inflight.clear();
    return;
  }
  const prefix = normPath(pathPrefix);
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export async function fetchFsDirectory(
  folderPath: string,
  recursive = true,
  timeoutMs = 120_000,
): Promise<unknown> {
  const folder = normPath(folderPath);
  if (!folder) return null;
  const key = cacheKey(folder, recursive);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.data;

  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(
          `/api/file-system-paths/read?path=${encodeURIComponent(folder)}&recursive=${recursive ? 'true' : 'false'}`,
          {
            cache: 'default',
            headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
            signal: controller.signal,
          },
        );
        if (!res.ok) return null;
        const data = await res.json();
        cache.set(key, { data, expires: Date.now() + TTL_MS });
        return data;
      } finally {
        window.clearTimeout(timer);
        inflight.delete(key);
      }
    })();
    inflight.set(key, pending);
  }
  return pending;
}

export type FsTreeNode = {
  name?: string;
  path?: string;
  type?: string;
  children?: FsTreeNode[];
};

export function fsDirectoryChildren(data: unknown): FsTreeNode[] {
  const fromHelper = parseReadApiChildren(data) as FsTreeNode[];
  if (fromHelper.length) return fromHelper;
  if (!data || typeof data !== 'object') return [];
  const row = data as {
    children?: FsTreeNode[];
    root?: { children?: FsTreeNode[] };
    items?: FsTreeNode[];
  };
  if (Array.isArray(row.children)) return row.children;
  const rootChildren = row.root?.children;
  if (Array.isArray(rootChildren)) return rootChildren;
  if (Array.isArray(row.items)) return row.items;
  if (Array.isArray(row.root)) return row.root as FsTreeNode[];
  return [];
}

/** Mehrere gleichzeitige async Jobs, begrenzte Parallelität. */
export async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  const n = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await worker(items[i], i);
      }
    }),
  );
  return results;
}
