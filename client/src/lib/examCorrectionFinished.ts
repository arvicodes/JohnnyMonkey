import { teacherIdFromStorage } from './lessonExamBeacon';

const STORAGE_KEY = 'jmExamCorrectionFinishedV1';

function normalizeExamPath(filePath: string): string {
  return (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim().toLowerCase();
}

function readMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function storageKeyForPath(filePath: string): string {
  const teacherId = teacherIdFromStorage() || 'anon';
  return `${teacherId}::${normalizeExamPath(filePath)}`;
}

export function isExamCorrectionFinished(filePath: string): boolean {
  if (!filePath.trim()) return false;
  const map = readMap();
  return Boolean(map[storageKeyForPath(filePath)]);
}

export function setExamCorrectionFinished(filePath: string, finished: boolean): void {
  if (!filePath.trim()) return;
  const map = readMap();
  const key = storageKeyForPath(filePath);
  if (finished) map[key] = true;
  else delete map[key];
  writeMap(map);
}
