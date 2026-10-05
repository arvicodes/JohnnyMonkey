import { examTypeFromFileName } from './examLibraryUi';
import { removeNearWhiteBackgroundFromFile, removeNearWhiteBackgroundFromUrl } from './presentationRemoveWhiteBg';

export const EXAM_LIBRARY_ICON_IMAGE_PREFIX = 'img:';
export const EXAM_LIBRARY_WHITE_BG_VERSION = 1;

const LEGACY_STORAGE_KEY = 'jm-exam-library-icons-v1';

function canonicalExamIconKey(filePath: string): string {
  let p = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
  if (p.startsWith('git-intern/')) {
    p = p.slice('git-intern/'.length);
  } else if (p.startsWith('/git-intern/')) {
    p = p.slice('/git-intern/'.length);
  } else if (p.startsWith('J-M-Reihen/')) {
    p = p.slice('J-M-Reihen/'.length);
  }
  return p.toLowerCase();
}

export function examIconStorageKey(filePath: string): string {
  return canonicalExamIconKey(filePath);
}

export function defaultExamLibraryIcon(fileName: string): string {
  switch (examTypeFromFileName(fileName)) {
    case 'KA':
      return '📝';
    case 'HU':
      return '✏️';
    case 'QZ':
      return '⚡';
    case 'KU':
      return '📘';
    default:
      return '📄';
  }
}

export function isExamLibraryImageIcon(value: string | undefined | null): boolean {
  return Boolean(value && value.startsWith(EXAM_LIBRARY_ICON_IMAGE_PREFIX));
}

/** URL für read-image (kleine Vorschaubilder in der Bibliothek). */
export function examLibraryIconImageSrc(iconValue: string, maxEdge?: number): string {
  const pathPart = iconValue.slice(EXAM_LIBRARY_ICON_IMAGE_PREFIX.length).replace(/^\/+/, '');
  const fp = pathPart.startsWith('git-intern/')
    ? pathPart
    : pathPart.startsWith('J-M-Reihen/')
      ? `git-intern/${pathPart.slice('J-M-Reihen/'.length)}`
      : `git-intern/${pathPart}`;
  const maxPart =
    maxEdge != null && Number.isFinite(maxEdge) && maxEdge > 0 ? `&max=${maxEdge}` : '';
  return `/api/file-system-paths/read-image?filePath=${encodeURIComponent(fp)}${maxPart}`;
}

function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-login-code': localStorage.getItem('loginCode') || '',
  };
}

/** Icons vom Server (Lehrkraft). */
export async function fetchExamLibraryIconsFromServer(): Promise<Record<string, string>> {
  try {
    const res = await fetch('/api/file-system-paths/exam-library-icons', {
      headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
      credentials: 'include',
    });
    if (!res.ok) return loadLegacyLocalIconsMap();
    const data = (await res.json()) as {
      icons?: Record<string, string>;
      whiteBgVersion?: number;
    };
    const serverIcons = data.icons && typeof data.icons === 'object' ? data.icons : {};
    let merged = await syncLegacyIconsToServer(serverIcons);
    const whiteBgVersion = typeof data.whiteBgVersion === 'number' ? data.whiteBgVersion : 0;
    if (whiteBgVersion < EXAM_LIBRARY_WHITE_BG_VERSION) {
      merged = await migrateExamLibraryImageIconsWhiteBackground(merged);
    }
    return merged;
  } catch {
    return loadLegacyLocalIconsMap();
  }
}

async function migrateExamLibraryImageIconsWhiteBackground(
  icons: Record<string, string>,
): Promise<Record<string, string>> {
  const entries = Object.entries(icons).filter(([, v]) => isExamLibraryImageIcon(v));
  if (!entries.length) {
    await markExamLibraryWhiteBgProcessedOnServer();
    return icons;
  }
  let current = { ...icons };
  for (const [examKey, iconVal] of entries) {
    try {
      const url = examLibraryIconImageSrc(iconVal, 768);
      const { file, removedRatio } = await removeNearWhiteBackgroundFromUrl(url, 'exam-icon', {
        maxEdge: 768,
        tolerance: 48,
      });
      if (removedRatio < 0.002) continue;
      const assetPath = iconVal.slice(EXAM_LIBRARY_ICON_IMAGE_PREFIX.length);
      current = await overwriteExamLibraryIconAssetOnServer(examKey, assetPath, file);
    } catch {
      /* Einzelnes Icon überspringen */
    }
  }
  await markExamLibraryWhiteBgProcessedOnServer();
  return current;
}

async function markExamLibraryWhiteBgProcessedOnServer(): Promise<void> {
  try {
    await fetch('/api/file-system-paths/exam-library-icons/white-bg-done', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ version: EXAM_LIBRARY_WHITE_BG_VERSION }),
    });
  } catch {
    /* ignore */
  }
}

async function overwriteExamLibraryIconAssetOnServer(
  examIconKey: string,
  assetGitPath: string,
  pngFile: File,
): Promise<Record<string, string>> {
  const fd = new FormData();
  fd.append('examIconKey', examIconKey);
  fd.append('assetPath', assetGitPath);
  fd.append('image', pngFile);
  const res = await fetch('/api/file-system-paths/exam-library-icons/overwrite-asset', {
    method: 'POST',
    headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
    credentials: 'include',
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    icons?: Record<string, string>;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Icon-Datei konnte nicht aktualisiert werden');
  }
  return data.icons && typeof data.icons === 'object' ? data.icons : {};
}

function loadLegacyLocalIconsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v !== 'string' || !v.trim()) continue;
      const key = String(k)
        .replace(/^j-m-reihen\//i, '')
        .replace(/^git-intern\//i, '')
        .toLowerCase();
      out[key] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

async function syncLegacyIconsToServer(server: Record<string, string>): Promise<Record<string, string>> {
  const legacy = loadLegacyLocalIconsMap();
  const pending = Object.entries(legacy).filter(([k]) => !server[k]);
  if (!pending.length) return server;
  let merged = { ...server };
  for (const [relKey, emoji] of pending) {
    try {
      merged = await saveExamLibraryIconToServer(`git-intern/${relKey}`, emoji);
    } catch {
      break;
    }
  }
  return merged;
}

export function getExamLibraryIcon(
  filePath: string,
  fileName: string,
  map?: Record<string, string>,
): string {
  const key = canonicalExamIconKey(filePath);
  const icons = map ?? {};
  const custom = icons[key];
  if (custom && custom.trim()) return custom.trim();
  return defaultExamLibraryIcon(fileName);
}

export async function saveExamLibraryIconToServer(
  filePath: string,
  emoji: string | null,
): Promise<Record<string, string>> {
  const res = await fetch('/api/file-system-paths/exam-library-icons', {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ filePath, emoji: emoji ?? null }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    icons?: Record<string, string>;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Icon konnte nicht gespeichert werden');
  }
  const icons = data.icons && typeof data.icons === 'object' ? data.icons : {};
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return icons;
}

export async function uploadExamLibraryIconImageToServer(
  filePath: string,
  imageFile: File,
): Promise<{ icons: Record<string, string>; icon: string }> {
  const { file: stripped } = await removeNearWhiteBackgroundFromFile(imageFile, {
    maxEdge: 768,
    tolerance: 48,
  });
  const fd = new FormData();
  fd.append('filePath', filePath);
  fd.append('image', stripped);
  const res = await fetch('/api/file-system-paths/exam-library-icons/upload', {
    method: 'POST',
    headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
    credentials: 'include',
    body: fd,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    icons?: Record<string, string>;
    icon?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || 'Bild-Icon konnte nicht gespeichert werden');
  }
  const icons = data.icons && typeof data.icons === 'object' ? data.icons : {};
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  const icon =
    typeof data.icon === 'string' && data.icon.trim()
      ? data.icon.trim()
      : getExamLibraryIcon(filePath, imageFile.name, icons);
  return { icons, icon };
}

/** @deprecated Nur noch für Tests — Server ist Quelle der Wahrheit. */
export function loadExamLibraryIconsMap(): Record<string, string> {
  return loadLegacyLocalIconsMap();
}
