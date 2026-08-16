/** Lädt / erstellt Wochenaufgaben-Ordner und seedet nummerierte Decks. */

import { ensureWochenaufgabeDeck, INITIAL_WOCHENAUFGABE_NUMBERS } from './wochenaufgabenPresentation';
import {
  WochenaufgabenFsNode,
  defaultWochenaufgabenFolderPath,
  folderPathBasename,
  isWochenaufgabenFolderName,
  numberedWochenaufgabeDirs,
  parseReadApiChildren,
} from './wochenaufgabenFolder';

function norm(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export type WochenaufgabenContentsPatch = Record<string, WochenaufgabenFsNode[] | undefined>;

export type HydrateWochenaufgabenResult = {
  patch: WochenaufgabenContentsPatch;
  wochenPath: string | null;
};

async function readFolder(path: string, recursive = false): Promise<WochenaufgabenFsNode[]> {
  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(path)}&recursive=${recursive}&t=${Date.now()}`,
    { cache: 'no-cache', headers: { 'Cache-Control': 'no-cache' } },
  );
  if (!res.ok) return [];
  return parseReadApiChildren(await res.json());
}

/** Findet oder legt Wochenaufgaben-Ordner an und lädt nummerierte Unterordner. */
export async function hydrateWochenaufgabenFolderContents(
  groupId: string,
  folderPath: string,
  items: WochenaufgabenFsNode[],
): Promise<HydrateWochenaufgabenResult> {
  const normFolder = norm(folderPath);
  const base = folderPathBasename(normFolder);
  let wochenPath = '';
  let existingChildren: WochenaufgabenFsNode[] = [];

  if (isWochenaufgabenFolderName(base)) {
    wochenPath = normFolder;
    existingChildren = items;
  } else {
    const nested = items.find(
      (item) => item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || '')),
    );
    if (nested) {
      wochenPath = norm(String(nested.path || `${normFolder}/${nested.name || 'Wochenaufgaben'}`));
      existingChildren = Array.isArray(nested.children) ? nested.children : [];
    } else {
      const parent = normFolder.split('/').slice(0, -1).join('/');
      if (parent) {
        const siblings = await readFolder(parent, false);
        const wochen = siblings.find(
          (item) => item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || '')),
        );
        if (wochen) {
          wochenPath = norm(String(wochen.path || `${parent}/${wochen.name || 'Wochenaufgaben'}`));
        }
      }
      if (!wochenPath) {
        wochenPath = defaultWochenaufgabenFolderPath(normFolder);
      }
    }
  }

  if (!wochenPath) return { patch: {}, wochenPath: null };

  const cacheKey = `${groupId}:${wochenPath}`;
  const parentKey = `${groupId}:${normFolder}`;

  try {
    if (existingChildren.length === 0) {
      existingChildren = await readFolder(wochenPath, true);
    }

    const have = new Set(numberedWochenaufgabeDirs(existingChildren).map((item) => Number(item.name)));
    for (const n of INITIAL_WOCHENAUFGABE_NUMBERS) {
      if (have.has(n)) continue;
      await ensureWochenaufgabeDeck(`${wochenPath}/${n}`);
    }

    const seeded = await readFolder(wochenPath, true);
    const patch: WochenaufgabenContentsPatch = { [cacheKey]: seeded };

    if (parentKey !== cacheKey && items.length > 0) {
      patch[parentKey] = items.map((item) =>
        item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || ''))
          ? { ...item, path: item.path || wochenPath, children: seeded }
          : item,
      );
    }

    return { patch, wochenPath };
  } catch (error) {
    console.error('Wochenaufgaben-Ordner laden fehlgeschlagen:', error);
    return { patch: {}, wochenPath };
  }
}
