/** Stunden, die schon einmal per Play gehalten wurden (gelber Rand am Play-Button). */

const STORAGE_KEY = 'jm-played-lessons-v1';

function normalizeLessonPath(p: string): string {
  return String(p ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

export function playedLessonKey(groupId: string, lessonPath: string): string {
  return `${groupId}::${normalizeLessonPath(lessonPath)}`;
}

export function loadPlayedLessonKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => String(x)).filter(Boolean);
  } catch {
    return [];
  }
}

export function savePlayedLessonKeys(keys: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(keys.filter(Boolean))]));
  } catch {
    /* ignore */
  }
}

export function markLessonPlayed(groupId: string, lessonPath: string): string[] {
  if (!groupId || !lessonPath) return loadPlayedLessonKeys();
  const next = [...new Set([...loadPlayedLessonKeys(), playedLessonKey(groupId, lessonPath)])];
  savePlayedLessonKeys(next);
  return next;
}

export function mergePlayedLessonKeys(extra: string[]): string[] {
  const next = [...new Set([...loadPlayedLessonKeys(), ...extra.filter(Boolean)])];
  savePlayedLessonKeys(next);
  return next;
}
