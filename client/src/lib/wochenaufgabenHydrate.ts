/** Lädt vorhandene Wochenaufgaben-Ordner — legt sie nicht automatisch an. */

import { saveJsonFile } from './presentationDeck';
import { ensureWochenaufgabeDeck } from './wochenaufgabenPresentation';
import {
  WochenaufgabenFsNode,
  WOCHENAUFGABEN_AKTIV_FILE,
  defaultWochenaufgabenFolderPath,
  folderPathBasename,
  isWochenaufgabenFolderName,
  parseReadApiChildren,
} from './wochenaufgabenFolder';

function norm(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export type WochenaufgabenContentsPatch = Record<string, WochenaufgabenFsNode[]>;

/** Patch in assignedFolderContents-State mergen (nur definierte Arrays). */
export function mergeWochenaufgabenContentsPatch(
  prev: Record<string, any[]>,
  patch: WochenaufgabenContentsPatch,
): Record<string, any[]> {
  const next = { ...prev };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) next[key] = value;
  }
  return next;
}

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

/** Findet einen vorhandenen Wochenaufgaben-Ordner und lädt die Unterordner. */
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
    if (!nested) return { patch: {}, wochenPath: null };
    wochenPath = norm(String(nested.path || `${normFolder}/${nested.name || 'Wochenaufgaben'}`));
    existingChildren = Array.isArray(nested.children) ? nested.children : [];
  }

  if (!wochenPath) return { patch: {}, wochenPath: null };

  const cacheKey = `${groupId}:${wochenPath}`;
  const parentKey = `${groupId}:${normFolder}`;

  try {
    if (existingChildren.length === 0) {
      existingChildren = await readFolder(wochenPath, true);
    }

    const loaded = existingChildren.length > 0 ? existingChildren : await readFolder(wochenPath, true);
    const patch: WochenaufgabenContentsPatch = {
      [cacheKey]: loaded,
    };

    if (parentKey !== cacheKey && items.length > 0) {
      patch[parentKey] = items.map((item) =>
        item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || ''))
          ? { ...item, path: item.path || wochenPath, children: loaded }
          : item,
      );
    }

    return { patch, wochenPath };
  } catch (error) {
    console.error('Wochenaufgaben-Ordner laden fehlgeschlagen:', error);
    return { patch: {}, wochenPath };
  }
}

/** Hängt Wochenaufgaben an eine Reihe (Marker + erster nummerierter Ordner). */
export async function addWochenaufgabenToReihe(reihePath: string): Promise<string> {
  const waPath = defaultWochenaufgabenFolderPath(reihePath);
  await saveJsonFile(waPath, WOCHENAUFGABEN_AKTIV_FILE, {
    enabled: true,
    addedAt: new Date().toISOString(),
  });
  await ensureWochenaufgabeDeck(`${waPath}/1`);
  return waPath;
}
