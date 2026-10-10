import { examBaseGitPath } from './examVersionPaths';
import { teacherIdFromStorage } from './lessonExamBeacon';

const STORAGE_KEY = 'jmExamCorrectionTaskDoneV1';

function normalizeExamPath(filePath: string): string {
  const base = examBaseGitPath(filePath) || filePath;
  return (base || '').replace(/\\/g, '/').replace(/\/+$/, '').trim().toLowerCase();
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
    /* ignore */
  }
}

function storageKey(filePath: string, taskNum: string): string {
  const teacherId = teacherIdFromStorage() || 'anon';
  return `${teacherId}::${normalizeExamPath(filePath)}::${taskNum}`;
}

/** z. B. Aufgabe 2 + Feld a2b → „2b“ (Teilaufgabe in aufgabenweiser Korrektur). */
export function examTaskCorrectionDoneId(taskNum: string, fieldId?: string): string {
  const tn = String(taskNum || '').trim();
  if (!tn) return '';
  const fid = String(fieldId || '').trim();
  if (!fid) return tn;
  const m = fid.match(/^a\d+([a-z])$/i);
  if (m) return `${tn}${m[1].toLowerCase()}`;
  return fid;
}

export function isExamTaskCorrectionDone(filePath: string, taskNum: string): boolean {
  if (!filePath.trim() || !taskNum.trim()) return false;
  return Boolean(readMap()[storageKey(filePath, taskNum)]);
}

export function setExamTaskCorrectionDone(
  filePath: string,
  taskNum: string,
  done: boolean,
): void {
  if (!filePath.trim() || !taskNum.trim()) return;
  const map = readMap();
  const key = storageKey(filePath, taskNum);
  if (done) map[key] = true;
  else delete map[key];
  writeMap(map);
}
