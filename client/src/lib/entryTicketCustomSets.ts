import {
  entryTicketHasContent,
  entryTicketHasText,
  normalizeEntryTicketFieldValue,
} from './entryTicketRichText';
import { apiGet } from './api';

/** Eigene Entry-Ticket-Fragensätze: ein Set pro Reihe, Fragen pro Stunde, localStorage. */

export type EntryTicketCustomTask = {
  id: string;
  category: string;
  prompt: string;
  solution: string;
};

/** Fragen zu einer einzelnen Stunde innerhalb einer Reihe. */
export type EntryTicketLessonSection = {
  id: string;
  /** Anzeigename, z. B. „01.01 KI sucht Mensch“. */
  lessonName: string;
  /** Optionaler Ordnerpfad oder Schlüssel zur Zuordnung. */
  lessonKey?: string;
  /** Themenblock, z. B. „01 Basiswissen“. */
  topicName?: string;
  tasks: EntryTicketCustomTask[];
};

export type EntryTicketCustomSet = {
  id: EntryTicketCustomSetId;
  /** Name der Reihe / des Fragensets. */
  name: string;
  /** Optionaler Pfad zum Reihen-Ordner. */
  reihePath?: string;
  /** Persönliche Lehrer-Notizen (nicht ans Signal / SuS). */
  notes?: string;
  lessons: EntryTicketLessonSection[];
};

export const CUSTOM_SETS_STORAGE_KEY = 'entry-ticket-custom-question-sets-v2';
/** Altformat (flach tasks[]) — wird beim Laden migriert. */
const CUSTOM_SETS_STORAGE_KEY_V1 = 'entry-ticket-custom-question-sets-v1';
export const CUSTOM_SET_ID_PREFIX = 'c_' as const;

/** ID eines eigenen Fragensatzes (`c_…`). */
export type EntryTicketCustomSetId = `${typeof CUSTOM_SET_ID_PREFIX}${string}`;

export function isCustomEntryTicketSetId(value: unknown): value is EntryTicketCustomSetId {
  return typeof value === 'string' && value.startsWith(CUSTOM_SET_ID_PREFIX) && value.length > CUSTOM_SET_ID_PREFIX.length;
}

export function makeCustomEntryTicketSetId(): EntryTicketCustomSetId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${CUSTOM_SET_ID_PREFIX}${crypto.randomUUID()}`;
  }
  return `${CUSTOM_SET_ID_PREFIX}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeEntryTicketEntityId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

function parseTask(raw: unknown): EntryTicketCustomTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const prompt = typeof q.prompt === 'string' ? normalizeEntryTicketFieldValue(q.prompt) : '';
  const solution = typeof q.solution === 'string' ? normalizeEntryTicketFieldValue(q.solution) : '';
  if (!entryTicketHasContent(prompt) || !entryTicketHasContent(solution)) return null;
  return {
    id: typeof q.id === 'string' && q.id ? q.id : makeEntryTicketEntityId('q'),
    category: typeof q.category === 'string' && q.category.trim() ? q.category.trim() : 'Eigen',
    prompt,
    solution,
  };
}

function parseLessonSection(raw: unknown): EntryTicketLessonSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const lessonName =
    (typeof row.lessonName === 'string' && row.lessonName.trim()) ||
    (typeof row.name === 'string' && row.name.trim()) ||
    '';
  if (!lessonName) return null;
  const tasksRaw = Array.isArray(row.tasks) ? row.tasks : [];
  const tasks = tasksRaw.map(parseTask).filter((t): t is EntryTicketCustomTask => Boolean(t));
  return {
    id: typeof row.id === 'string' && row.id ? row.id : makeEntryTicketEntityId('ls'),
    lessonName,
    lessonKey: typeof row.lessonKey === 'string' && row.lessonKey.trim() ? normalizePath(row.lessonKey) : undefined,
    topicName: typeof row.topicName === 'string' && row.topicName.trim() ? row.topicName.trim() : undefined,
    tasks,
  };
}

/** Fester Block vor der ersten Stunde — allgemeine Karten ohne Stundenbezug. */
export const ENTRY_TICKET_GENERAL_LESSON_NAME = 'Allgemein';
export const ENTRY_TICKET_GENERAL_LESSON_KEY = '__allgemein__';

/** Parkplatz: Kopien einzelner Karten, die nicht in den Spiel-Pool der Stunde gehen. */
export const ENTRY_TICKET_LATER_LESSON_NAME = 'Für später';
export const ENTRY_TICKET_LATER_LESSON_KEY = '__fuer_spaeter__';

export function isGeneralLessonSection(lesson: EntryTicketLessonSection): boolean {
  if (lesson.lessonKey === ENTRY_TICKET_GENERAL_LESSON_KEY) return true;
  const name = (lesson.lessonName || '').trim().toLowerCase();
  return name === 'allgemein' || name === 'allgemeines';
}

export function isLaterLessonSection(lesson: EntryTicketLessonSection): boolean {
  if (lesson.lessonKey === ENTRY_TICKET_LATER_LESSON_KEY) return true;
  const name = (lesson.lessonName || '').trim().toLowerCase();
  return name === 'für später' || name === 'fuer spaeter' || name === 'für spaeter';
}

function isFolderBoundLessonSection(lesson: EntryTicketLessonSection): boolean {
  const key = (lesson.lessonKey || '').trim();
  return Boolean(key) && !key.startsWith('__');
}

/**
 * Extra-Blöcke ohne Stundenordner (z. B. „Wissen aus der 11“) — zählen immer zum Spiel-Pool,
 * analog zu „Allgemein“. Sonst sortiert localeCompare sie hinter 01.05 … und der Pool ist leer.
 */
export function isUnboundPriorLessonSection(lesson: EntryTicketLessonSection): boolean {
  if (isLaterLessonSection(lesson) || isGeneralLessonSection(lesson)) return false;
  return !isFolderBoundLessonSection(lesson);
}

export function createGeneralLessonSection(tasks: EntryTicketCustomTask[] = []): EntryTicketLessonSection {
  return {
    id: makeEntryTicketEntityId('ls'),
    lessonName: ENTRY_TICKET_GENERAL_LESSON_NAME,
    lessonKey: ENTRY_TICKET_GENERAL_LESSON_KEY,
    topicName: ENTRY_TICKET_GENERAL_LESSON_NAME,
    tasks,
  };
}

export function createLaterLessonSection(tasks: EntryTicketCustomTask[] = []): EntryTicketLessonSection {
  return {
    id: makeEntryTicketEntityId('ls'),
    lessonName: ENTRY_TICKET_LATER_LESSON_NAME,
    lessonKey: ENTRY_TICKET_LATER_LESSON_KEY,
    topicName: ENTRY_TICKET_LATER_LESSON_NAME,
    tasks,
  };
}

function normalizeGeneralSection(lesson: EntryTicketLessonSection): EntryTicketLessonSection {
  return {
    ...lesson,
    lessonName: ENTRY_TICKET_GENERAL_LESSON_NAME,
    lessonKey: ENTRY_TICKET_GENERAL_LESSON_KEY,
    topicName: ENTRY_TICKET_GENERAL_LESSON_NAME,
  };
}

function normalizeLaterSection(lesson: EntryTicketLessonSection): EntryTicketLessonSection {
  return {
    ...lesson,
    lessonName: ENTRY_TICKET_LATER_LESSON_NAME,
    lessonKey: ENTRY_TICKET_LATER_LESSON_KEY,
    topicName: ENTRY_TICKET_LATER_LESSON_NAME,
  };
}

function isNormalizedGeneralSection(lesson: EntryTicketLessonSection): boolean {
  return (
    lesson.lessonKey === ENTRY_TICKET_GENERAL_LESSON_KEY &&
    lesson.topicName === ENTRY_TICKET_GENERAL_LESSON_NAME &&
    lesson.lessonName === ENTRY_TICKET_GENERAL_LESSON_NAME
  );
}

function isNormalizedLaterSection(lesson: EntryTicketLessonSection): boolean {
  return (
    lesson.lessonKey === ENTRY_TICKET_LATER_LESSON_KEY &&
    lesson.topicName === ENTRY_TICKET_LATER_LESSON_NAME &&
    lesson.lessonName === ENTRY_TICKET_LATER_LESSON_NAME
  );
}

/** Stellt sicher, dass „Allgemein“ existiert und vor allen Stunden steht. */
export function ensureGeneralLessonSection(set: EntryTicketCustomSet): EntryTicketCustomSet {
  const idx = set.lessons.findIndex(isGeneralLessonSection);
  if (idx === 0) {
    const g = set.lessons[0];
    if (isNormalizedGeneralSection(g)) return set;
    return { ...set, lessons: [normalizeGeneralSection(g), ...set.lessons.slice(1)] };
  }
  if (idx > 0) {
    const lessons = [...set.lessons];
    const [g] = lessons.splice(idx, 1);
    return { ...set, lessons: [normalizeGeneralSection(g), ...lessons] };
  }
  return {
    ...set,
    lessons: [createGeneralLessonSection(), ...set.lessons],
  };
}

/** Stellt sicher, dass „Für später“ existiert und nach allen Stunden steht. */
export function ensureLaterLessonSection(set: EntryTicketCustomSet): EntryTicketCustomSet {
  const idx = set.lessons.findIndex(isLaterLessonSection);
  const last = set.lessons.length - 1;
  if (idx >= 0 && idx === last) {
    const g = set.lessons[idx];
    if (isNormalizedLaterSection(g)) return set;
    return { ...set, lessons: [...set.lessons.slice(0, idx), normalizeLaterSection(g)] };
  }
  if (idx >= 0) {
    const lessons = [...set.lessons];
    const [g] = lessons.splice(idx, 1);
    return { ...set, lessons: [...lessons, normalizeLaterSection(g)] };
  }
  return {
    ...set,
    lessons: [...set.lessons, createLaterLessonSection()],
  };
}

/** Allgemein zuerst, „Für später“ zuletzt. */
export function ensureSpecialLessonSections(set: EntryTicketCustomSet): EntryTicketCustomSet {
  return ensureLaterLessonSection(ensureGeneralLessonSection(set));
}

function taskCopyKey(task: Pick<EntryTicketCustomTask, 'prompt' | 'solution'>): string {
  return `${normalizeEntryTicketFieldValue(task.prompt)}\n${normalizeEntryTicketFieldValue(task.solution)}`;
}

export function laterSectionContainsTask(
  set: EntryTicketCustomSet,
  task: Pick<EntryTicketCustomTask, 'prompt' | 'solution'>,
): boolean {
  const later = set.lessons.find(isLaterLessonSection);
  if (!later) return false;
  const key = taskCopyKey(task);
  return later.tasks.some((t) => taskCopyKey(t) === key);
}

/**
 * Kopiert Karten (neue IDs) nach „Für später“. Originale bleiben.
 * Bereits vorhandene gleiche Frage/Antwort werden übersprungen.
 */
export function copyTasksToLaterSection(
  set: EntryTicketCustomSet,
  tasks: EntryTicketCustomTask[],
): EntryTicketCustomSet {
  const ensured = ensureSpecialLessonSections(set);
  if (tasks.length === 0) return ensured;
  const laterIdx = ensured.lessons.findIndex(isLaterLessonSection);
  if (laterIdx < 0) return ensured;
  const later = ensured.lessons[laterIdx];
  const seen = new Set(later.tasks.map(taskCopyKey));
  const copies: EntryTicketCustomTask[] = [];
  for (const task of tasks) {
    const key = taskCopyKey(task);
    if (seen.has(key)) continue;
    seen.add(key);
    copies.push(createCustomTask(task.prompt, task.solution, ENTRY_TICKET_LATER_LESSON_NAME));
  }
  if (copies.length === 0) return ensured;
  const lessons = ensured.lessons.map((l, i) =>
    i === laterIdx ? { ...l, tasks: [...l.tasks, ...copies] } : l,
  );
  return { ...ensured, lessons };
}

/** Live-Play: Frage/Lösung einer Karte im Fragenset speichern (ohne Seed-Reset). */
export function patchCustomSetTaskContent(
  set: EntryTicketCustomSet,
  taskId: string,
  patch: { prompt: string; solution: string },
): EntryTicketCustomSet {
  if (!taskId) return set;
  let changed = false;
  const lessons = set.lessons.map((lesson) => {
    let lessonChanged = false;
    const tasks = lesson.tasks.map((t) => {
      if (t.id !== taskId) return t;
      lessonChanged = true;
      changed = true;
      return { ...t, prompt: patch.prompt, solution: patch.solution };
    });
    return lessonChanged ? { ...lesson, tasks } : lesson;
  });
  return changed ? { ...set, lessons } : set;
}

export function copyTaskIdsToLaterSection(
  set: EntryTicketCustomSet,
  lessonId: string,
  taskIds: string[],
): EntryTicketCustomSet {
  const lesson = set.lessons.find((l) => l.id === lessonId);
  if (!lesson || isLaterLessonSection(lesson) || taskIds.length === 0) {
    return ensureSpecialLessonSections(set);
  }
  const want = new Set(taskIds);
  return copyTasksToLaterSection(
    set,
    lesson.tasks.filter((t) => want.has(t.id)),
  );
}

/** Altformat `{ id, name, tasks[] }` → eine Stunden-Sektion „Allgemein“. */
function migrateV1Set(raw: Record<string, unknown>): EntryTicketCustomSet | null {
  const id = typeof raw.id === 'string' ? raw.id : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!isCustomEntryTicketSetId(id) || !name) return null;
  if (Array.isArray(raw.lessons)) {
    const lessons = raw.lessons.map(parseLessonSection).filter((l): l is EntryTicketLessonSection => Boolean(l));
    return ensureSpecialLessonSections({
      id,
      name,
      reihePath: typeof raw.reihePath === 'string' ? normalizePath(raw.reihePath) : undefined,
      notes:
        typeof raw.notes === 'string' && raw.notes.trim()
          ? raw.notes.replace(/\r\n/g, '\n').slice(0, 4000)
          : undefined,
      lessons,
    });
  }
  const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks = tasksRaw.map(parseTask).filter((t): t is EntryTicketCustomTask => Boolean(t));
  return ensureSpecialLessonSections({
    id,
    name,
    reihePath: typeof raw.reihePath === 'string' ? normalizePath(raw.reihePath) : undefined,
    notes:
      typeof raw.notes === 'string' && raw.notes.trim()
        ? raw.notes.replace(/\r\n/g, '\n').slice(0, 4000)
        : undefined,
    lessons: tasks.length > 0 ? [createGeneralLessonSection(tasks)] : [],
  });
}

function parseCustomSet(raw: unknown): EntryTicketCustomSet | null {
  if (!raw || typeof raw !== 'object') return null;
  return migrateV1Set(raw as Record<string, unknown>);
}

function setsNeedSpecialPersist(before: EntryTicketCustomSet[], after: EntryTicketCustomSet[]): boolean {
  if (before.length !== after.length) return true;
  for (let i = 0; i < after.length; i += 1) {
    const a = before[i];
    const b = after[i];
    if (!a || a.id !== b.id) return true;
    if (a.lessons.length !== b.lessons.length) return true;
    if (!b.lessons[0] || !isGeneralLessonSection(b.lessons[0])) return true;
    if (!a.lessons[0] || a.lessons[0].lessonKey !== b.lessons[0].lessonKey) return true;
    const last = b.lessons[b.lessons.length - 1];
    if (!last || !isLaterLessonSection(last)) return true;
    const prevLast = a.lessons[a.lessons.length - 1];
    if (!prevLast || prevLast.lessonKey !== last.lessonKey) return true;
  }
  return false;
}

export function loadCustomEntryTicketSets(): EntryTicketCustomSet[] {
  try {
    const rawV2 = localStorage.getItem(CUSTOM_SETS_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (!Array.isArray(parsed)) return [];
      const loaded = parsed.map(parseCustomSet).filter((s): s is EntryTicketCustomSet => Boolean(s));
      const ensured = loaded.map(ensureSpecialLessonSections);
      if (setsNeedSpecialPersist(loaded, ensured)) {
        saveCustomEntryTicketSets(ensured);
      }
      return ensured;
    }
    const rawV1 = localStorage.getItem(CUSTOM_SETS_STORAGE_KEY_V1);
    if (!rawV1) return [];
    const parsed = JSON.parse(rawV1) as unknown;
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed.map(parseCustomSet).filter((s): s is EntryTicketCustomSet => Boolean(s));
    if (migrated.length > 0) {
      saveCustomEntryTicketSets(migrated);
    }
    return migrated;
  } catch {
    return [];
  }
}

export function saveCustomEntryTicketSets(sets: EntryTicketCustomSet[]): void {
  try {
    localStorage.setItem(CUSTOM_SETS_STORAGE_KEY, JSON.stringify(sets));
  } catch {
    // ignore quota / private mode
  }
}

export function countCustomSetTasks(set: EntryTicketCustomSet): number {
  return set.lessons.reduce((n, lesson) => n + lesson.tasks.length, 0);
}

export function flattenCustomSetTasks(set: EntryTicketCustomSet): EntryTicketCustomTask[] {
  return set.lessons.flatMap((l) => l.tasks);
}

function lessonFolderName(lessonPathOrKey: string): string {
  const n = normalizePath(lessonPathOrKey);
  return n.split('/').pop() || n;
}

/**
 * Reihen-Ordner aus Stundenpfad, z. B. „…/11-04 KI/01 Basiswissen/01.01 …“ → „…/11-04 KI“.
 * Erkennt „11-04 …“ / „12-01 Matrizen“-Segmente.
 */
export function seriesFolderPathFromLessonPath(lessonPath: string | null | undefined): string | null {
  const want = normalizePath(lessonPath || '');
  if (!want) return null;
  const absolute = want.startsWith('/');
  const parts = want.split('/').filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const seg = parts[i];
    if (
      /^\d{1,2}[-–\s]\d{2}(?:\b|\s|$)/.test(seg) ||
      /Matrizen/i.test(seg) ||
      /^(?:klasse|mathe|m)\s*\d{1,2}$/i.test(seg)
    ) {
      const joined = parts.slice(0, i + 1).join('/');
      return absolute ? `/${joined}` : joined;
    }
  }
  return null;
}

/** „Mathe 5“ / „M5“ / „Klasse 5“ aus Set-Namen oder Pfadsegment. */
export function klasseNumberFromEntryTicketLabel(label: string | null | undefined): string | null {
  const m = String(label || '').trim().match(/^(?:mathe|m|klasse)\s*0*(\d{1,2})$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 5 || n > 13) return null;
  return String(n);
}

function klasseNumberFromLessonPath(lessonPath: string): string | null {
  const parts = normalizePath(lessonPath).split('/').filter(Boolean);
  for (const seg of parts) {
    const n = klasseNumberFromEntryTicketLabel(seg);
    if (n) return n;
  }
  return null;
}

function pathUnderSeries(path: string, seriesRoot: string): boolean {
  const p = normalizePath(path);
  const root = normalizePath(seriesRoot);
  if (!p || !root) return false;
  return p === root || p.startsWith(`${root}/`);
}

/** Findet die Stunden-Sektion, die zum aktuellen lessonPath passt (Index in `set.lessons`). */
export function findLessonSectionIndex(set: EntryTicketCustomSet, lessonPath: string | null | undefined): number {
  if (!lessonPath) return -1;
  return set.lessons.findIndex((l) => lessonMatchesPath(l, lessonPath));
}

/**
 * Fragenset zur Stunde: zuerst Set mit passender Stunden-Sektion,
 * sonst Set dessen Reihen-Pfad Präfix des lessonPath ist,
 * sonst Set mit Stunden unter demselben Reihen-Ordner (z. B. neue Stunde in 11-04 KI).
 */
export function findCustomSetForLessonPath(
  lessonPath: string | null | undefined,
  sets?: EntryTicketCustomSet[],
): EntryTicketCustomSet | null {
  if (!lessonPath?.trim()) return null;
  const list = sets ?? loadCustomEntryTicketSets();
  const withLesson = list.find((s) => findLessonSectionIndex(s, lessonPath) >= 0);
  if (withLesson) return withLesson;
  const want = normalizePath(lessonPath);
  const byReihePath = list.find((s) => {
    const rp = s.reihePath ? normalizePath(s.reihePath) : '';
    return Boolean(rp) && (want === rp || want.startsWith(`${rp}/`));
  });
  if (byReihePath) return byReihePath;

  const seriesRoot = seriesFolderPathFromLessonPath(want);
  if (seriesRoot) {
    const bySibling = list.find((s) =>
      s.lessons.some((l) => {
        const key = l.lessonKey ? normalizePath(l.lessonKey) : '';
        return key ? pathUnderSeries(key, seriesRoot) : false;
      }),
    );
    if (bySibling) return bySibling;
    const seriesName = seriesRoot.split('/').pop() || '';
    const bySeriesName = list.find((s) => {
      const setKlasse = klasseNumberFromEntryTicketLabel(s.name);
      const pathKlasse = klasseNumberFromEntryTicketLabel(seriesName);
      if (setKlasse && pathKlasse) return setKlasse === pathKlasse;
      return normalizeFolderLabel(s.name) === normalizeFolderLabel(seriesName);
    });
    if (bySeriesName) return bySeriesName;
  }

  const pathKlasse = klasseNumberFromLessonPath(want);
  if (pathKlasse) {
    const byKlasseName = list.find((s) => klasseNumberFromEntryTicketLabel(s.name) === pathKlasse);
    if (byKlasseName) return byKlasseName;
  }
  return null;
}

function normalizeFolderLabel(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Fragensets vom Server laden und in localStorage cachen (TeacherDashboard / Defaults).
 */
export async function fetchAndCacheCustomEntryTicketSets(): Promise<EntryTicketCustomSet[]> {
  const local = loadCustomEntryTicketSets();
  try {
    const res = await apiGet('/api/entry-ticket/custom-sets');
    if (!res.ok) return local;
    const data = (await res.json()) as { sets?: unknown };
    const remoteRaw = Array.isArray(data.sets) ? data.sets : [];
    const remote = remoteRaw
      .map(parseCustomSet)
      .filter((s): s is EntryTicketCustomSet => Boolean(s));
    if (remote.length === 0) return local;

    const byId = new Map(local.map((s) => [s.id, s] as const));
    for (const s of remote) {
      const prev = byId.get(s.id);
      if (!prev || countCustomSetTasks(s) >= countCustomSetTasks(prev)) {
        byId.set(s.id, {
          ...s,
          // reihePath / notes aus lokalem Stand behalten, falls Server sie weglässt
          reihePath: s.reihePath || prev?.reihePath,
          notes: s.notes ?? prev?.notes,
        });
      }
    }
    const merged = Array.from(byId.values()).map(ensureSpecialLessonSections);
    saveCustomEntryTicketSets(merged);
    return merged;
  } catch {
    return local;
  }
}

/** Sortierschlüssel: Ordnername der Stunde (01.01 …), egal ob voller Pfad oder Anzeigename. */
function lessonSortKey(lesson: EntryTicketLessonSection): string {
  return lessonFolderName(lesson.lessonKey || lesson.lessonName || '');
}

function compareLessonSortKeys(a: string, b: string): number {
  return a.localeCompare(b, 'de', { numeric: true });
}

/** Stunden einer Reihe in Ordner-/Pfad-Reihenfolge; „Allgemein“ zuerst, „Für später“ zuletzt. */
export function sortLessonsChronologically(
  lessons: EntryTicketLessonSection[],
): EntryTicketLessonSection[] {
  return [...lessons].sort((a, b) => {
    const aG = isGeneralLessonSection(a);
    const bG = isGeneralLessonSection(b);
    if (aG && !bG) return -1;
    if (!aG && bG) return 1;
    const aL = isLaterLessonSection(a);
    const bL = isLaterLessonSection(b);
    if (aL && !bL) return 1;
    if (!aL && bL) return -1;
    const aU = isUnboundPriorLessonSection(a);
    const bU = isUnboundPriorLessonSection(b);
    if (aU && !bU) return -1;
    if (!aU && bU) return 1;
    return compareLessonSortKeys(lessonSortKey(a), lessonSortKey(b));
  });
}

function lessonMatchesPath(lesson: EntryTicketLessonSection, lessonPath: string): boolean {
  const want = normalizePath(lessonPath);
  const wantName = lessonFolderName(want);
  if (lesson.lessonKey) {
    const key = normalizePath(lesson.lessonKey);
    if (key === want || key.endsWith(`/${wantName}`) || lessonFolderName(key) === wantName) {
      return true;
    }
  }
  return lesson.lessonName.trim() === wantName || lessonFolderName(lesson.lessonName) === wantName;
}

/**
 * Play-Pool: alle Fragen aus *allen* Stunden vor der aktuellen (kumulativ), nie die aktuelle.
 * Vergleich über chronologischen Ordnernamen (01.01 < 01.02 …), unabhängig von Editor-Reihenfolge.
 * Ohne lessonPath: gesamtes Set (z. B. freies Spielen ohne Stundenkontext).
 */
export function cumulativeTasksBeforeLesson(
  set: EntryTicketCustomSet,
  lessonPath: string | null | undefined,
): EntryTicketCustomTask[] {
  const lessons = sortLessonsChronologically(set.lessons);
  if (lessons.length === 0) return [];

  const want = lessonPath ? normalizePath(lessonPath) : '';
  if (!want) {
    return lessons.filter((l) => !isLaterLessonSection(l)).flatMap((l) => l.tasks);
  }

  const wantName = lessonFolderName(want);
  // Aktuelle Stunde am Ordnernamen ausrichten — auch wenn sie noch keine Sektion im Set hat.
  // „Allgemein“ zählt immer als vor der ersten Stunde (auch wenn localeCompare sonst anders sortiert).
  return lessons
    .filter((l) => {
      if (isLaterLessonSection(l)) return false;
      if (isGeneralLessonSection(l) || isUnboundPriorLessonSection(l)) return true;
      if (lessonMatchesPath(l, want)) return false;
      return compareLessonSortKeys(lessonSortKey(l), wantName) < 0;
    })
    .flatMap((l) => l.tasks);
}

function lessonMatchKey(lessonName: string, lessonKey?: string): string {
  return lessonFolderName(lessonKey || lessonName)
    .trim()
    .toLowerCase()
    .normalize('NFC');
}

/**
 * Stundenordner der Reihe in ein bestehendes Set mergen.
 * Vorhandene Karten bleiben; fehlende Stunden (z. B. Klasse 5: 1.0 / 1.1 / …) werden ergänzt.
 */
export function mergeDiscoveredLessonsIntoSet(
  set: EntryTicketCustomSet,
  discovered: {
    reihePath: string | null;
    lessons: Array<{ lessonName: string; lessonKey: string; topicName?: string }>;
  },
): EntryTicketCustomSet {
  const ensured = ensureSpecialLessonSections(set);
  let changed = false;
  let reihePath = ensured.reihePath;
  if (discovered.reihePath && reihePath !== discovered.reihePath) {
    reihePath = discovered.reihePath;
    changed = true;
  }
  if (discovered.lessons.length === 0) {
    return changed ? { ...ensured, reihePath } : set;
  }

  const general = ensured.lessons.filter(isGeneralLessonSection);
  const later = ensured.lessons.filter(isLaterLessonSection);
  const middle = ensured.lessons.filter((l) => !isGeneralLessonSection(l) && !isLaterLessonSection(l));
  const byKey = new Map(middle.map((l) => [lessonMatchKey(l.lessonName, l.lessonKey), l] as const));
  const mergedMiddle: EntryTicketLessonSection[] = [];
  const seen = new Set<string>();

  for (const d of discovered.lessons) {
    const key = lessonMatchKey(d.lessonName, d.lessonKey);
    seen.add(key);
    const prev = byKey.get(key);
    if (!prev) {
      mergedMiddle.push(createLessonSection(d.lessonName, d.lessonKey, d.topicName));
      changed = true;
      continue;
    }
    let row = prev;
    if (d.lessonKey && prev.lessonKey !== d.lessonKey) {
      row = { ...row, lessonKey: d.lessonKey };
      changed = true;
    }
    if (d.topicName && prev.topicName !== d.topicName) {
      row = { ...row, topicName: d.topicName };
      changed = true;
    }
    if (d.lessonName && prev.lessonName !== d.lessonName) {
      row = { ...row, lessonName: d.lessonName };
      changed = true;
    }
    mergedMiddle.push(row);
  }
  for (const l of middle) {
    if (!seen.has(lessonMatchKey(l.lessonName, l.lessonKey))) mergedMiddle.push(l);
  }

  if (!changed) return set;
  return ensureSpecialLessonSections({
    ...ensured,
    reihePath,
    lessons: [...general, ...mergedMiddle, ...later],
  });
}

export function createEmptyCustomSet(name: string, reihePath?: string): EntryTicketCustomSet {
  return {
    id: makeCustomEntryTicketSetId(),
    name: name.trim() || 'Neues Fragenset',
    reihePath: reihePath ? normalizePath(reihePath) : undefined,
    lessons: [createGeneralLessonSection(), createLaterLessonSection()],
  };
}

export function createLessonSection(
  lessonName: string,
  lessonKey?: string,
  topicName?: string,
): EntryTicketLessonSection {
  return {
    id: makeEntryTicketEntityId('ls'),
    lessonName: lessonName.trim() || 'Neue Stunde',
    lessonKey: lessonKey ? normalizePath(lessonKey) : undefined,
    topicName: topicName?.trim() || undefined,
    tasks: [],
  };
}

export function createCustomTask(prompt: string, solution: string, category = 'Eigen'): EntryTicketCustomTask {
  return {
    id: makeEntryTicketEntityId('q'),
    category,
    prompt: normalizeEntryTicketFieldValue(prompt),
    solution: normalizeEntryTicketFieldValue(solution),
  };
}

/**
 * Liste → Karten: eine Zeile pro Karte, Frage und Antwort durch `;` getrennt.
 * Beispiel:
 *   Was ist KI?; Künstliche Intelligenz
 *   Turing-Test?; Mensch vs. Maschine
 */
export function parseEntryTicketCardList(raw: string): Array<{ prompt: string; solution: string }> {
  const lines = (raw || '').split(/\r?\n/);
  const out: Array<{ prompt: string; solution: string }> = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sep = trimmed.indexOf(';');
    if (sep < 0) continue;
    const prompt = normalizeEntryTicketFieldValue(trimmed.slice(0, sep));
    const solution = normalizeEntryTicketFieldValue(trimmed.slice(sep + 1));
    if (!entryTicketHasText(prompt) || !entryTicketHasText(solution)) continue;
    out.push({ prompt, solution });
  }
  return out;
}

