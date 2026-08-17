/** Zentraler Wochenaufgaben-Ordner neben den Reihen (z. B. MSS 12 LK/Wochenaufgaben). */

import {
  LESSON_PRESENTATION_PDF_EDITED,
  LESSON_PRESENTATION_PDF_ORIGINAL,
} from './presentationLessonAssets';

export const WOCHENAUFGABEN_COLOR = '#ffb74d';
export const WOCHENAUFGABEN_TEXT_COLOR = '#ef6c00';
export const WOCHENAUFGABEN_BG = '#fff8e1';
export const WOCHENAUFGABEN_BORDER = '#ffe0b2';
export const WOCHENAUFGABEN_BOX_BG = '#fafbfd';
export const WOCHENAUFGABEN_BOX_BORDER = '#e8eaf0';

export function wochenaufgabePdfFileCandidates(lessonPath: string): { path: string; name: string }[] {
  const base = normalizePath(lessonPath);
  return [
    { path: `${base}/${LESSON_PRESENTATION_PDF_EDITED}`, name: LESSON_PRESENTATION_PDF_EDITED },
    { path: `${base}/${LESSON_PRESENTATION_PDF_ORIGINAL}`, name: LESSON_PRESENTATION_PDF_ORIGINAL },
  ];
}

export async function resolveWochenaufgabePdfFile(
  lessonPath: string,
): Promise<{ path: string; name: string } | null> {
  for (const candidate of wochenaufgabePdfFileCandidates(lessonPath)) {
    try {
      const res = await fetch(
        `/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(candidate.path)}`,
        { method: 'HEAD' },
      );
      if (res.ok) return candidate;
    } catch {
      /* next */
    }
  }
  return null;
}

export type WochenaufgabenFsNode = {
  name?: string;
  path?: string;
  type?: string;
  children?: WochenaufgabenFsNode[];
  [key: string]: unknown;
};

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

function normalizeFolderLabel(name: string): string {
  return (name || '').trim().toLowerCase().normalize('NFC');
}

export function isWochenaufgabenFolderName(name: string): boolean {
  return /wochenaufgaben?/.test(normalizeFolderLabel(name));
}

/** Technische Ordner (Grafiken, versteckte) — nicht im Dashboard-Baum anzeigen. */
export function isPresentationInternalFolderName(name: string): boolean {
  const n = (name || '').trim();
  if (!n || n.startsWith('.')) return true;
  return normalizeFolderLabel(n) === 'grafiken';
}

/** Ordner/Dateien für die Baum-Vorschau filtern (Wochenaufgaben, Grafiken, nummerierte WA). */
export function filterVisibleFolderChildren(items: WochenaufgabenFsNode[] | undefined): WochenaufgabenFsNode[] {
  return (Array.isArray(items) ? items : [])
    .filter((item) => {
      if (item?.type !== 'directory') return true;
      const name = String(item.name || '');
      if (isWochenaufgabenFolderName(name)) return false;
      if (isNumberedWochenaufgabeName(name)) return false;
      if (isPresentationInternalFolderName(name)) return false;
      return true;
    })
    .map((item) => {
      if (item?.type === 'directory' && Array.isArray(item.children)) {
        return { ...item, children: filterVisibleFolderChildren(item.children) };
      }
      return item;
    });
}

export function isNumberedWochenaufgabeName(name: string): boolean {
  return /^\d+$/.test((name || '').trim());
}

/** Technische Ordner (Grafiken, Backups) — nicht im Dashboard anzeigen. */
export function isPresentationInternalFolderName(name: string): boolean {
  const n = (name || '').trim();
  if (!n || n.startsWith('.')) return true;
  return normalizeFolderLabel(n) === 'grafiken';
}

export function filterVisibleFolderChildren(children: WochenaufgabenFsNode[] | undefined): WochenaufgabenFsNode[] {
  return (Array.isArray(children) ? children : []).filter((item) => {
    if (item?.type === 'directory' && isPresentationInternalFolderName(String(item.name || ''))) return false;
    if (item?.type === 'directory' && isNumberedWochenaufgabeName(String(item.name || ''))) return false;
    return true;
  });
}

export function isNumberedWochenaufgabePath(path: string): boolean {
  const parts = normalizePath(path).split('/').filter(Boolean);
  const idx = parts.findIndex((seg) => isWochenaufgabenFolderName(seg));
  if (idx < 0) return false;
  return isNumberedWochenaufgabeName(parts[idx + 1] || '');
}

export function numberedWochenaufgabeDirs(children: WochenaufgabenFsNode[] | undefined): WochenaufgabenFsNode[] {
  return (Array.isArray(children) ? children : [])
    .filter((item) => item?.type === 'directory' && isNumberedWochenaufgabeName(String(item.name || '')))
    .sort((a, b) => Number(a.name) - Number(b.name));
}

export function nextWochenaufgabeNumber(children: WochenaufgabenFsNode[] | undefined): number {
  const nums = numberedWochenaufgabeDirs(children).map((item) => Number(item.name));
  if (nums.length === 0) return 1;
  return Math.max(...nums) + 1;
}

export function folderPathBasename(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  return parts[parts.length - 1] || path;
}

/** Standard-Ort: Wochenaufgaben als Unterordner der Reihe. */
export function defaultWochenaufgabenFolderPath(reihePath: string): string {
  return `${normalizePath(reihePath)}/Wochenaufgaben`;
}

export type WochenaufgabenDisplayBlock = {
  parentPath: string;
  children: WochenaufgabenFsNode[];
};

/**
 * Block für die Dashboard-Box — immer sichtbar bei zugeordneten Reihen,
 * auch wenn der Ordner noch nicht existiert (dann leere Liste + „+“).
 */
export function resolveWochenaufgabenDisplayBlock(
  groupId: string,
  folderPath: string,
  mergedItems: WochenaufgabenFsNode[],
  contents: Record<string, WochenaufgabenFsNode[] | undefined>,
): WochenaufgabenDisplayBlock {
  const normFolder = normalizePath(folderPath);
  const base = folderPathBasename(normFolder);

  if (isWochenaufgabenFolderName(base)) {
    return {
      parentPath: normFolder,
      children: contents[`${groupId}:${normFolder}`] || mergedItems,
    };
  }

  const fromTree = resolveWochenaufgabenBlock(groupId, folderPath, mergedItems, contents);
  if (fromTree) {
    return {
      parentPath: fromTree.parentPath,
      children:
        contents[`${groupId}:${fromTree.parentPath}`] ||
        fromTree.children ||
        [],
    };
  }

  const defaultPath = defaultWochenaufgabenFolderPath(normFolder);
  return {
    parentPath: defaultPath,
    children: contents[`${groupId}:${defaultPath}`] || [],
  };
}

export function folderPathParent(path: string): string | null {
  const n = normalizePath(path);
  const idx = n.lastIndexOf('/');
  if (idx <= 0) return null;
  return n.slice(0, idx);
}

export function isWochenaufgabenFolderPath(path: string): boolean {
  return normalizePath(path)
    .split('/')
    .some((seg) => isWochenaufgabenFolderName(seg));
}

function cloneNode(node: WochenaufgabenFsNode): WochenaufgabenFsNode {
  return {
    ...node,
    children: Array.isArray(node.children) ? node.children.map(cloneNode) : node.children,
  };
}

function injectWochenaufgabenChild(
  children: WochenaufgabenFsNode[],
  wochenNode: WochenaufgabenFsNode,
): WochenaufgabenFsNode[] {
  if (children.some((c) => c?.type === 'directory' && isWochenaufgabenFolderName(String(c.name || '')))) {
    return children;
  }
  return [cloneNode(wochenNode), ...children];
}

function moveWochenaufgabenToTop(items: WochenaufgabenFsNode[]): WochenaufgabenFsNode[] {
  const existing = items.find(
    (item) => item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || '')),
  );
  if (!existing) return items;
  const rest = items.filter((item) => item !== existing);
  return [cloneNode(existing), ...rest];
}

/**
 * Wochenaufgaben nur einmal ganz oben — nicht in jede Reihe spiegeln.
 */
export function mergeWochenaufgabenIntoFolderTree(
  items: WochenaufgabenFsNode[],
  folderPath: string,
  siblingWochenNode?: WochenaufgabenFsNode | null,
): WochenaufgabenFsNode[] {
  const list = Array.isArray(items) ? items : [];
  const folderName = folderPathBasename(folderPath);
  if (isWochenaufgabenFolderName(folderName)) return list;

  const existing = list.find(
    (item) => item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || '')),
  );
  if (existing) return moveWochenaufgabenToTop(list);

  if (!siblingWochenNode) return list;
  return injectWochenaufgabenChild(list, siblingWochenNode);
}

export function resolveWochenaufgabenBlock(
  groupId: string,
  folderPath: string,
  mergedItems: WochenaufgabenFsNode[],
  contents: Record<string, WochenaufgabenFsNode[] | undefined>,
): { parentPath: string; children: WochenaufgabenFsNode[] } | null {
  const normFolder = normalizePath(folderPath);
  if (isWochenaufgabenFolderName(folderPathBasename(normFolder))) {
    return {
      parentPath: normFolder,
      children: contents[`${groupId}:${normFolder}`] || mergedItems,
    };
  }
  const node = mergedItems.find(
    (item) => item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || '')),
  );
  if (!node) return null;
  const parentPath = normalizePath(String(node.path || `${normFolder}/${node.name || 'Wochenaufgaben'}`));
  return {
    parentPath,
    children: contents[`${groupId}:${parentPath}`] || (Array.isArray(node.children) ? node.children : []),
  };
}

/** Wochenaufgaben-Ordner aus Baumliste ausblenden (eigene Box oben). */
export function stripWochenaufgabenFolderFromTree(items: WochenaufgabenFsNode[]): WochenaufgabenFsNode[] {
  return (Array.isArray(items) ? items : []).filter(
    (item) => !(item?.type === 'directory' && isWochenaufgabenFolderName(String(item.name || ''))),
  );
}

export function findCachedWochenaufgabenSibling(
  groupId: string,
  folderPath: string,
  contents: Record<string, WochenaufgabenFsNode[] | undefined>,
): WochenaufgabenFsNode | null {
  const parent = folderPathParent(folderPath);
  if (!parent || isWochenaufgabenFolderName(folderPathBasename(folderPath))) return null;
  const prefix = `${groupId}:`;
  for (const [key, children] of Object.entries(contents)) {
    if (!key.startsWith(prefix)) continue;
    const path = key.slice(prefix.length);
    const name = folderPathBasename(path);
    if (folderPathParent(path) !== parent) continue;
    if (!isWochenaufgabenFolderName(name)) continue;
    return {
      name,
      path,
      type: 'directory',
      children: Array.isArray(children) ? children : [],
    };
  }
  return null;
}

export function parseReadApiChildren(payload: unknown): WochenaufgabenFsNode[] {
  if (!payload || typeof payload !== 'object') return [];
  const row = payload as { root?: { children?: WochenaufgabenFsNode[] }; items?: WochenaufgabenFsNode[] };
  const rootChildren = row.root?.children;
  if (Array.isArray(rootChildren)) return rootChildren;
  if (Array.isArray(row.items)) return row.items;
  return [];
}
