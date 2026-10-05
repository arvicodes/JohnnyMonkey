import { examTypeFromFileName } from './examLibraryUi';
import { removeNearWhiteBackgroundFromFile, removeNearWhiteBackgroundFromUrl } from './presentationRemoveWhiteBg';

export const EXAM_LIBRARY_ICON_IMAGE_PREFIX = 'img:';
export const EXAM_LIBRARY_WHITE_BG_VERSION = 2;

const LEGACY_STORAGE_KEY = 'jm-exam-library-icons-v1';

export type ExamLibraryIconTemplate = {
  savedAt: string;
  icons: Record<string, string>;
  byExamType: Partial<Record<'KA' | 'KU' | 'HU' | 'QZ', string>>;
};

export type ExamLibraryIconsLoadResult = {
  icons: Record<string, string>;
  template: ExamLibraryIconTemplate | null;
  customIconChoices: ExamLibraryCustomIconChoice[];
};

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
export async function fetchExamLibraryIconsFromServer(): Promise<ExamLibraryIconsLoadResult> {
  try {
    const res = await fetch('/api/file-system-paths/exam-library-icons', {
      headers: { 'x-login-code': localStorage.getItem('loginCode') || '' },
      credentials: 'include',
    });
    if (!res.ok) {
      return { icons: loadLegacyLocalIconsMap(), template: null, customIconChoices: [] };
    }
    const data = (await res.json()) as {
      icons?: Record<string, string>;
      whiteBgVersion?: number;
      iconTemplate?: ExamLibraryIconTemplate | null;
      customIconChoices?: ExamLibraryCustomIconChoice[];
    };
    const serverIcons = data.icons && typeof data.icons === 'object' ? data.icons : {};
    let merged = await syncLegacyIconsToServer(serverIcons);
    const whiteBgVersion = typeof data.whiteBgVersion === 'number' ? data.whiteBgVersion : 0;
    if (whiteBgVersion < EXAM_LIBRARY_WHITE_BG_VERSION) {
      merged = await migrateExamLibraryImageIconsWhiteBackground(merged);
    }
    const template =
      data.iconTemplate && typeof data.iconTemplate === 'object' ? data.iconTemplate : null;
    const customIconChoices = Array.isArray(data.customIconChoices)
      ? data.customIconChoices.filter(
          (c) => c && typeof c.value === 'string' && typeof c.label === 'string',
        )
      : listExamLibraryCustomIconChoices(merged, template);
    return { icons: merged, template, customIconChoices };
  } catch {
    return { icons: loadLegacyLocalIconsMap(), template: null, customIconChoices: [] };
  }
}

export async function saveExamLibraryIconTemplateToServer(): Promise<{
  icons: Record<string, string>;
  iconTemplate: ExamLibraryIconTemplate;
}> {
  const res = await fetch('/api/file-system-paths/exam-library-icons/save-template', {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    icons?: Record<string, string>;
    iconTemplate?: ExamLibraryIconTemplate;
  };
  if (!res.ok || !data.iconTemplate) {
    throw new Error(data.error || 'Icon-Vorlage konnte nicht gespeichert werden');
  }
  return {
    icons: data.icons && typeof data.icons === 'object' ? data.icons : {},
    iconTemplate: data.iconTemplate,
  };
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
      const { file } = await removeNearWhiteBackgroundFromUrl(url, 'exam-icon', {
        maxEdge: 768,
        tolerance: 48,
      });
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
      const saved = await saveExamLibraryIconToServer(`git-intern/${relKey}`, emoji);
      merged = saved.icons;
    } catch {
      break;
    }
  }
  return merged;
}

export type ExamLibraryCustomIconChoice = {
  value: string;
  label: string;
};

function labelFromExamPath(examPath: string): string {
  const file = examPath.split('/').pop() || 'Icon';
  return file.replace(/\.html?$/i, '').replace(/^((ka|ku|hu|hü|qz)_)/i, '').trim() || file;
}

/** Neues Bild sofort in „Eigene“ (Fallback wenn API noch keine Liste liefert). */
export function upsertExamLibraryCustomIconChoice(
  choices: ExamLibraryCustomIconChoice[],
  iconValue: string,
  label: string,
): ExamLibraryCustomIconChoice[] {
  const value = iconValue.trim();
  if (!value || !isExamLibraryImageIcon(value)) return choices;
  const next = choices.filter((c) => c.value !== value);
  next.push({ value, label: label.trim() || 'Icon' });
  return next.sort((a, b) => a.label.localeCompare(b.label, 'de'));
}
export function listExamLibraryCustomIconChoices(
  iconMap: Record<string, string>,
  _template: ExamLibraryIconTemplate | null,
): ExamLibraryCustomIconChoice[] {
  const byValue = new Map<string, string>();
  for (const [examPath, raw] of Object.entries(iconMap)) {
    const value = raw?.trim();
    if (!value || !isExamLibraryImageIcon(value)) continue;
    if (byValue.has(value)) continue;
    byValue.set(value, labelFromExamPath(examPath));
  }
  return [...byValue.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

export function getExamLibraryIcon(
  filePath: string,
  fileName: string,
  map?: Record<string, string>,
  template?: ExamLibraryIconTemplate | null,
): string {
  const key = canonicalExamIconKey(filePath);
  const icons = map ?? {};
  const custom = icons[key];
  if (custom && custom.trim()) return custom.trim();
  const fromPath = template?.icons?.[key];
  if (fromPath && fromPath.trim()) return fromPath.trim();
  const t = examTypeFromFileName(fileName);
  if (t) {
    const fromType = template?.byExamType?.[t];
    if (fromType && fromType.trim()) return fromType.trim();
  }
  return defaultExamLibraryIcon(fileName);
}

function parseCustomIconChoices(raw: unknown): ExamLibraryCustomIconChoice[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is ExamLibraryCustomIconChoice =>
      Boolean(c) &&
      typeof (c as ExamLibraryCustomIconChoice).value === 'string' &&
      typeof (c as ExamLibraryCustomIconChoice).label === 'string',
  );
}

export async function saveExamLibraryIconToServer(
  filePath: string,
  emoji: string | null,
): Promise<{ icons: Record<string, string>; customIconChoices: ExamLibraryCustomIconChoice[] }> {
  const res = await fetch('/api/file-system-paths/exam-library-icons', {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ filePath, emoji: emoji ?? null }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    icons?: Record<string, string>;
    customIconChoices?: ExamLibraryCustomIconChoice[];
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
  return {
    icons,
    customIconChoices: parseCustomIconChoices(data.customIconChoices),
  };
}

export async function uploadExamLibraryIconImageToServer(
  filePath: string,
  imageFile: File,
): Promise<{
  icons: Record<string, string>;
  icon: string;
  customIconChoices: ExamLibraryCustomIconChoice[];
}> {
  let uploadFile = imageFile;
  try {
    uploadFile = (await removeNearWhiteBackgroundFromFile(imageFile, { maxEdge: 768, tolerance: 48 })).file;
  } catch {
    /* Weißentfernung optional — Original hochladen */
  }
  const fd = new FormData();
  fd.append('filePath', filePath);
  fd.append('image', uploadFile);
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
    customIconChoices?: ExamLibraryCustomIconChoice[];
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
  return {
    icons,
    icon,
    customIconChoices: parseCustomIconChoices(data.customIconChoices),
  };
}

/** @deprecated Nur noch für Tests — Server ist Quelle der Wahrheit. */
export function loadExamLibraryIconsMap(): Record<string, string> {
  return loadLegacyLocalIconsMap();
}
