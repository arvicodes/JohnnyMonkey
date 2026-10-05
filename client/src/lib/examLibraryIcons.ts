import { examTypeFromFileName } from './examLibraryUi';

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
    const data = (await res.json()) as { icons?: Record<string, string> };
    const serverIcons = data.icons && typeof data.icons === 'object' ? data.icons : {};
    return syncLegacyIconsToServer(serverIcons);
  } catch {
    return loadLegacyLocalIconsMap();
  }
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

/** @deprecated Nur noch für Tests — Server ist Quelle der Wahrheit. */
export function loadExamLibraryIconsMap(): Record<string, string> {
  return loadLegacyLocalIconsMap();
}
