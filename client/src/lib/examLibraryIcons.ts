import { examTypeFromFileName } from './examLibraryUi';

const STORAGE_KEY = 'jm-exam-library-icons-v1';

function canonicalExamIconKey(filePath: string): string {
  let p = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
  if (p.startsWith('git-intern/')) p = `J-M-Reihen/${p.slice('git-intern/'.length)}`;
  if (p.startsWith('/git-intern/')) p = `J-M-Reihen/${p.slice('/git-intern/'.length)}`;
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

export function loadExamLibraryIconsMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

export function getExamLibraryIcon(
  filePath: string,
  fileName: string,
  map?: Record<string, string>,
): string {
  const key = canonicalExamIconKey(filePath);
  const icons = map ?? loadExamLibraryIconsMap();
  const custom = icons[key];
  if (custom && custom.trim()) return custom.trim();
  return defaultExamLibraryIcon(fileName);
}

export function setExamLibraryIcon(filePath: string, emoji: string): void {
  const key = canonicalExamIconKey(filePath);
  const map = loadExamLibraryIconsMap();
  map[key] = emoji.trim() || defaultExamLibraryIcon(filePath.split('/').pop() || '');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function clearExamLibraryIcon(filePath: string): void {
  const key = canonicalExamIconKey(filePath);
  const map = loadExamLibraryIconsMap();
  delete map[key];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
