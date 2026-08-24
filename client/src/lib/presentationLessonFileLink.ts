/**
 * Verknüpfungen von Folientext zu lokalen Dateien (Stundenordner oder andere Ordner).
 * Liefert App-URLs, die in neuem Tab öffnen (wie Materialzeile / PDF-Viewer).
 */

export type LessonFolderFsItem = {
  type: string;
  name: string;
  path: string;
  children?: LessonFolderFsItem[];
};

export const PRESENTATION_FILE_BROWSER_ROOT = 'J-M-Reihen';

/** Deck-/Editor-Hilfsdateien nicht in der Link-Liste anbieten. */
export function isLinkableLessonFileName(name: string): boolean {
  const n = (name || '').toLowerCase();
  if (!n || n.startsWith('.')) return false;
  if (n.endsWith('.deck.json')) return false;
  if (n.endsWith('.annotations.json')) return false;
  if (n.endsWith('.play-variants.json')) return false;
  if (/\.deck(\.|$)/i.test(n)) return false;
  if (n.endsWith('.bak') || n.includes('.bak-')) return false;
  return true;
}

export function flattenLessonFolderFiles(
  items: LessonFolderFsItem[] | undefined | null,
  out: LessonFolderFsItem[] = [],
): LessonFolderFsItem[] {
  if (!items?.length) return out;
  for (const item of items) {
    if (item.type === 'file') {
      if (isLinkableLessonFileName(item.name)) out.push(item);
    } else if (item.children?.length) {
      flattenLessonFolderFiles(item.children, out);
    }
  }
  return out;
}

function parseDirectoryChildren(content: unknown): LessonFolderFsItem[] {
  const data = content as {
    root?: { children?: LessonFolderFsItem[] };
    items?: LessonFolderFsItem[];
    children?: LessonFolderFsItem[];
  };
  if (data?.root?.children) return data.root.children;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.children)) return data.children;
  if (Array.isArray(content)) return content as LessonFolderFsItem[];
  return [];
}

function normalizeFsPath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Relativer Anzeigename unter einem Basisordner. */
export function lessonFileDisplayLabel(filePath: string, basePath: string): string {
  const file = normalizeFsPath(filePath);
  const base = normalizeFsPath(basePath);
  if (base && file.startsWith(`${base}/`)) return file.slice(base.length + 1);
  return file.split('/').pop() || file;
}

export function parentFolderPath(folderPath: string): string | null {
  const folder = normalizeFsPath(folderPath);
  if (!folder || folder === PRESENTATION_FILE_BROWSER_ROOT) return null;
  const idx = folder.lastIndexOf('/');
  if (idx <= 0) return PRESENTATION_FILE_BROWSER_ROOT;
  const parent = folder.slice(0, idx);
  if (!parent.startsWith(PRESENTATION_FILE_BROWSER_ROOT)) return PRESENTATION_FILE_BROWSER_ROOT;
  return parent;
}

/** Startordner für den Browser: Eltern des Stundenordners, sonst J-M-Reihen. */
export function defaultBrowseStartPath(lessonPath?: string): string {
  const lesson = normalizeFsPath(lessonPath || '');
  if (!lesson) return PRESENTATION_FILE_BROWSER_ROOT;
  return parentFolderPath(lesson) || PRESENTATION_FILE_BROWSER_ROOT;
}

/**
 * Sichere App-URL für eine lokale Datei (öffnet in neuem Tab).
 */
export function presentationLessonFileHref(filePath: string, fileName?: string): string {
  const path = normalizeFsPath(filePath);
  if (!path) return '';
  const name = (fileName || path.split('/').pop() || '').trim();
  const ext = (name.split('.').pop() || '').toLowerCase();

  if (ext === 'pdf') {
    return `/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(path)}`;
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(ext)) {
    return `/api/file-system-paths/read-image?filePath=${encodeURIComponent(path)}`;
  }
  if (ext === 'docx') {
    return `/folien-editor?filePath=${encodeURIComponent(path)}&fileName=${encodeURIComponent(name || 'dokument.docx')}&source=docx`;
  }
  if (ext === 'pptx' || ext === 'ppt') {
    return `/folien-editor?filePath=${encodeURIComponent(path)}&fileName=${encodeURIComponent(name || 'folien.pptx')}&source=pptx`;
  }
  if (ext === 'wb') {
    const wbName = name.replace(/\.wb$/i, '');
    return `/whiteboard?loadFile=${encodeURIComponent(path)}&filename=${encodeURIComponent(wbName)}`;
  }
  if (ext === 'html' || ext === 'htm') {
    return `/api/file-system-paths/read-html?filePath=${encodeURIComponent(path)}`;
  }
  return `/api/file-system-paths/download?filePath=${encodeURIComponent(path)}`;
}

async function fetchDirectoryChildren(
  folderPath: string,
  recursive: boolean,
): Promise<LessonFolderFsItem[]> {
  const folder = normalizeFsPath(folderPath);
  if (!folder) return [];
  const res = await fetch(
    `/api/file-system-paths/read?path=${encodeURIComponent(folder)}&recursive=${recursive ? 'true' : 'false'}&t=${Date.now()}`,
    {
      cache: 'no-cache',
      headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
    },
  );
  if (!res.ok) throw new Error(`Ordner konnte nicht geladen werden (${res.status})`);
  return parseDirectoryChildren(await res.json());
}

export async function fetchLessonFolderLinkableFiles(
  lessonPath: string,
): Promise<LessonFolderFsItem[]> {
  const folder = normalizeFsPath(lessonPath);
  if (!folder) return [];
  const children = await fetchDirectoryChildren(folder, true);
  const files = flattenLessonFolderFiles(children);
  files.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
  return files;
}

export type FolderBrowseListing = {
  folders: LessonFolderFsItem[];
  files: LessonFolderFsItem[];
};

/** Eine Ebene: Unterordner + verknüpfbare Dateien (für Ordner-Browser). */
export async function fetchFolderBrowseListing(folderPath: string): Promise<FolderBrowseListing> {
  const children = await fetchDirectoryChildren(folderPath, false);
  const folders: LessonFolderFsItem[] = [];
  const files: LessonFolderFsItem[] = [];
  for (const item of children) {
    if (item.type === 'directory' || item.type === 'folder') {
      folders.push(item);
    } else if (item.type === 'file' && isLinkableLessonFileName(item.name)) {
      files.push(item);
    }
  }
  const byName = (a: LessonFolderFsItem, b: LessonFolderFsItem) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base', numeric: true });
  folders.sort(byName);
  files.sort(byName);
  return { folders, files };
}
