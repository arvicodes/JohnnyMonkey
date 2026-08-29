import {
  entryTicketHasContent,
  entryTicketHasText,
  normalizeEntryTicketFieldValue,
} from './entryTicketRichText';
import { parseEntryTicketInkMap } from './entryTicketPlayInk';
import type { PresentationStroke } from './presentationDeck';
import { apiGet } from './api';

/** Eigene Entry-Ticket-Fragensätze: ein Set pro Reihe, Fragen pro Stunde, localStorage. */

export type EntryTicketCustomTask = {
  id: string;
  category: string;
  prompt: string;
  solution: string;
};

/** Fragen zu einer einzelnen Stunde innerhalb einer Reihe. */
export type EntryTicketCoveredLesson = {
  lessonName: string;
  lessonKey?: string;
};

export type EntryTicketLessonSection = {
  id: string;
  /** Anzeigename, z. B. „01.01 KI sucht Mensch“. */
  lessonName: string;
  /** Optionaler Ordnerpfad oder Schlüssel zur Zuordnung. */
  lessonKey?: string;
  /** Themenblock, z. B. „01 Basiswissen“. */
  topicName?: string;
  /**
   * Option: diese Kategorie steht für mehrere Folien-Unterkapitel.
   * Karten liegen nur hier, nicht mehr auf den einzelnen Stunden.
   */
  covers?: EntryTicketCoveredLesson[];
  tasks: EntryTicketCustomTask[];
};

export type EntryTicketCustomSet = {
  id: EntryTicketCustomSetId;
  /** Name der Reihe / des Fragensets. */
  name: string;
  /** Erster / älterer Reihen-Pfad (Kompatibilität). */
  reihePath?: string;
  /** Zugeordnete Unterrichtsreihen (mehrere möglich). */
  reihePaths?: string[];
  /** Persönliche Lehrer-Notizen (nicht ans Signal / SuS). */
  notes?: string;
  /** Play-/Lösungsfolie-Stiftstriche, sofort gespeichert. */
  playInkByKey?: Record<string, PresentationStroke[]>;
  lessons: EntryTicketLessonSection[];
};

function parseReihePathList(raw: unknown, fallback?: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return;
    const p = normalizePath(value);
    if (!p || seen.has(p)) return;
    seen.add(p);
    out.push(p);
  };
  if (Array.isArray(raw)) {
    for (const item of raw) add(item);
  }
  add(fallback);
  return out;
}

/** Alle zugeordneten Unterrichtsreihen (reihePaths + Legacy-reihePath). */
export function customSetReihePaths(
  set: Pick<EntryTicketCustomSet, 'reihePath' | 'reihePaths'> | null | undefined,
): string[] {
  if (!set) return [];
  return parseReihePathList(set.reihePaths, set.reihePath);
}

export function withCustomSetReihePaths(
  set: EntryTicketCustomSet,
  paths: string[],
): EntryTicketCustomSet {
  const unique = parseReihePathList(paths);
  return {
    ...set,
    reihePath: unique[0],
    reihePaths: unique.length > 0 ? unique : undefined,
  };
}

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

/** Folien-Unterkapitel am Stundenpfad: `…/01 Basiswissen#01.09 Neutrales Element`. */
export const ENTRY_TICKET_SECTION_KEY_SEP = '#';

export function splitLessonSectionKey(raw: string): { path: string; section: string | null } {
  const n = normalizePath(raw);
  const i = n.indexOf(ENTRY_TICKET_SECTION_KEY_SEP);
  if (i > 0 && i < n.length - 1) {
    return { path: n.slice(0, i), section: n.slice(i + 1).trim() || null };
  }
  return { path: n, section: null };
}

export function withLessonSectionPath(stundePath: string, sectionName?: string | null): string {
  const { path } = splitLessonSectionKey(stundePath);
  const section = (sectionName || '').trim();
  if (!path) return section;
  if (!section) return path;
  return `${path}${ENTRY_TICKET_SECTION_KEY_SEP}${section}`;
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

function parseCoveredLesson(raw: unknown): EntryTicketCoveredLesson | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const lessonName =
    (typeof row.lessonName === 'string' && row.lessonName.trim()) ||
    (typeof row.name === 'string' && row.name.trim()) ||
    '';
  if (!lessonName) return null;
  return {
    lessonName,
    lessonKey:
      typeof row.lessonKey === 'string' && row.lessonKey.trim()
        ? normalizePath(row.lessonKey)
        : undefined,
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
  const coversRaw = Array.isArray(row.covers) ? row.covers : [];
  const covers = coversRaw
    .map(parseCoveredLesson)
    .filter((c): c is EntryTicketCoveredLesson => Boolean(c));
  return {
    id: typeof row.id === 'string' && row.id ? row.id : makeEntryTicketEntityId('ls'),
    lessonName,
    lessonKey: typeof row.lessonKey === 'string' && row.lessonKey.trim() ? normalizePath(row.lessonKey) : undefined,
    topicName: typeof row.topicName === 'string' && row.topicName.trim() ? row.topicName.trim() : undefined,
    ...(covers.length >= 2 ? { covers } : {}),
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

/** LK: „Wissen aus der 11“ ist allgemeines Vorwissen, kein eigener Stundenblock. */
export function isWissen11LessonSection(lesson: EntryTicketLessonSection): boolean {
  const name = (lesson.lessonName || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return name === 'wissen aus der 11' || name === 'wissen 11' || name.startsWith('wissen aus der 11');
}

function isFolderBoundLessonSection(lesson: EntryTicketLessonSection): boolean {
  const key = (lesson.lessonKey || '').trim();
  if (key && !key.startsWith('__')) return true;
  return (lesson.covers || []).some((c) => Boolean((c.lessonKey || '').trim()) && !String(c.lessonKey).startsWith('__'));
}

export function isCombinedLessonSection(lesson: EntryTicketLessonSection): boolean {
  return (lesson.covers || []).length >= 2;
}

export function coveredLessonsOf(lesson: EntryTicketLessonSection): EntryTicketCoveredLesson[] {
  if (isCombinedLessonSection(lesson) && lesson.covers) return lesson.covers;
  return [
    {
      lessonName: lesson.lessonName,
      lessonKey: lesson.lessonKey,
    },
  ];
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

/** LK: Karten aus „Wissen aus der 11“ nach „Allgemein“ ziehen, Block entfernen. */
export function mergeWissen11IntoGeneral(set: EntryTicketCustomSet): EntryTicketCustomSet {
  const extra = set.lessons.filter(isWissen11LessonSection);
  if (extra.length === 0) return set;
  const rest = set.lessons.filter((l) => !isWissen11LessonSection(l));
  const withGeneral = ensureGeneralLessonSection({ ...set, lessons: rest });
  const generalIdx = withGeneral.lessons.findIndex(isGeneralLessonSection);
  if (generalIdx < 0) return withGeneral;
  const general = withGeneral.lessons[generalIdx];
  const seen = new Set(general.tasks.map(taskCopyKey));
  const added: EntryTicketCustomTask[] = [];
  for (const lesson of extra) {
    for (const task of lesson.tasks) {
      const key = taskCopyKey(task);
      if (seen.has(key)) continue;
      seen.add(key);
      added.push(task);
    }
  }
  if (added.length === 0 && rest.length === set.lessons.length - extra.length) {
    return withGeneral;
  }
  const lessons = withGeneral.lessons.map((l, i) =>
    i === generalIdx ? { ...l, tasks: [...l.tasks, ...added] } : l,
  );
  return { ...withGeneral, lessons };
}

/** Allgemein zuerst, „Für später“ zuletzt. */
export function ensureSpecialLessonSections(set: EntryTicketCustomSet): EntryTicketCustomSet {
  return ensureLaterLessonSection(ensureGeneralLessonSection(mergeWissen11IntoGeneral(set)));
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

/** Live-Play: Stiftstriche einer Fläche im Fragenset speichern (ohne Seed-Reset). */
export function patchCustomSetPlayInk(
  set: EntryTicketCustomSet,
  inkKey: string,
  strokes: PresentationStroke[],
): EntryTicketCustomSet {
  if (!inkKey) return set;
  const prev = set.playInkByKey ?? {};
  if (strokes.length === 0) {
    if (!prev[inkKey]) return set;
    const next = { ...prev };
    delete next[inkKey];
    return { ...set, playInkByKey: Object.keys(next).length > 0 ? next : undefined };
  }
  return { ...set, playInkByKey: { ...prev, [inkKey]: strokes } };
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
    const paths = parseReihePathList(
      raw.reihePaths,
      typeof raw.reihePath === 'string' ? raw.reihePath : undefined,
    );
    const playInkByKey = parseEntryTicketInkMap(raw.playInkByKey);
    return ensureSpecialLessonSections({
      id,
      name,
      reihePath: paths[0],
      reihePaths: paths.length > 0 ? paths : undefined,
      notes:
        typeof raw.notes === 'string' && raw.notes.trim()
          ? raw.notes.replace(/\r\n/g, '\n').slice(0, 4000)
          : undefined,
      ...(Object.keys(playInkByKey).length > 0 ? { playInkByKey } : {}),
      lessons,
    });
  }
  const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks = tasksRaw.map(parseTask).filter((t): t is EntryTicketCustomTask => Boolean(t));
  const paths = parseReihePathList(
    raw.reihePaths,
    typeof raw.reihePath === 'string' ? raw.reihePath : undefined,
  );
  const playInkByKey = parseEntryTicketInkMap(raw.playInkByKey);
  return ensureSpecialLessonSections({
    id,
    name,
    reihePath: paths[0],
    reihePaths: paths.length > 0 ? paths : undefined,
    notes:
      typeof raw.notes === 'string' && raw.notes.trim()
        ? raw.notes.replace(/\r\n/g, '\n').slice(0, 4000)
        : undefined,
    ...(Object.keys(playInkByKey).length > 0 ? { playInkByKey } : {}),
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

export const TICKETS_FROM_GIT_EVENT = 'johnny:tickets-from-git';

export async function replaceCustomSetsFromServer(): Promise<EntryTicketCustomSet[]> {
  try {
    const res = await apiGet('/api/entry-ticket/custom-sets');
    if (!res.ok) return loadCustomEntryTicketSets();
    const data = (await res.json()) as { sets?: unknown };
    const remote = (Array.isArray(data.sets) ? data.sets : [])
      .map(parseCustomSet)
      .filter((s): s is EntryTicketCustomSet => Boolean(s))
      .map(ensureSpecialLessonSections);
    if (remote.length === 0) return loadCustomEntryTicketSets();
    saveCustomEntryTicketSets(remote);
    return remote;
  } catch {
    return loadCustomEntryTicketSets();
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

function mergeTaskListsKeepExisting(
  primary: EntryTicketCustomTask[],
  extra: EntryTicketCustomTask[],
): EntryTicketCustomTask[] {
  if (extra.length === 0) return primary;
  const out = [...primary];
  const ids = new Set(primary.map((t) => t.id).filter(Boolean));
  const keys = new Set(primary.map(taskCopyKey));
  for (const t of extra) {
    if (t.id && ids.has(t.id)) continue;
    const key = taskCopyKey(t);
    if (keys.has(key)) continue;
    out.push(t);
    if (t.id) ids.add(t.id);
    keys.add(key);
  }
  return out;
}

function mergeLessonKeepExisting(
  primary: EntryTicketLessonSection,
  extra: EntryTicketLessonSection,
): EntryTicketLessonSection {
  const covers =
    (primary.covers && primary.covers.length >= 2 ? primary.covers : null) ||
    (extra.covers && extra.covers.length >= 2 ? extra.covers : undefined);
  return {
    ...primary,
    lessonKey: primary.lessonKey || extra.lessonKey,
    topicName: primary.topicName || extra.topicName,
    lessonName: primary.lessonName || extra.lessonName,
    ...(covers ? { covers } : {}),
    tasks: mergeTaskListsKeepExisting(primary.tasks, extra.tasks),
  };
}

/** Live-Stand behalten, fehlende Karten/Stunden vom anderen Stand ergänzen. */
export function mergeCustomSetsKeepExisting(
  primary: EntryTicketCustomSet,
  incoming: EntryTicketCustomSet,
): EntryTicketCustomSet {
  const lessons = [...primary.lessons];
  const indexByKey = new Map(
    lessons.map((l, i) => [lessonMatchKey(l.lessonName, l.lessonKey), i] as const),
  );
  for (const extra of incoming.lessons) {
    const key = lessonMatchKey(extra.lessonName, extra.lessonKey);
    const idx = indexByKey.get(key);
    if (idx == null) {
      indexByKey.set(key, lessons.length);
      lessons.push(extra);
      continue;
    }
    lessons[idx] = mergeLessonKeepExisting(lessons[idx], extra);
  }
  const paths = parseReihePathList(
    [...customSetReihePaths(primary), ...customSetReihePaths(incoming)],
  );
  return ensureSpecialLessonSections({
    ...primary,
    reihePath: paths[0] || primary.reihePath || incoming.reihePath,
    reihePaths: paths.length > 0 ? paths : undefined,
    notes: primary.notes ?? incoming.notes,
    lessons,
  });
}

export function mergeCustomSetListsKeepExisting(
  primary: EntryTicketCustomSet[],
  incoming: EntryTicketCustomSet[],
): EntryTicketCustomSet[] {
  const byId = new Map(primary.map((s) => [s.id, s] as const));
  for (const s of incoming) {
    const prev = byId.get(s.id);
    byId.set(s.id, prev ? mergeCustomSetsKeepExisting(prev, s) : s);
  }
  return Array.from(byId.values());
}

export function flattenCustomSetTasks(set: EntryTicketCustomSet): EntryTicketCustomTask[] {
  return set.lessons.flatMap((l) => l.tasks);
}

function lessonFolderName(lessonPathOrKey: string): string {
  const { path, section } = splitLessonSectionKey(lessonPathOrKey);
  if (section) return section;
  return path.split('/').pop() || path;
}

function folderNamesEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase().normalize('NFC') === b.trim().toLowerCase().normalize('NFC');
}

function stundePathOf(lessonPathOrKey: string): string {
  return splitLessonSectionKey(lessonPathOrKey).path;
}

/**
 * Reihen-Ordner aus Stundenpfad, z. B. „…/11-04 KI/01 Basiswissen/01.01 …“ → „…/11-04 KI“.
 * Erkennt „11-04 …“ / „12-01 Matrizen“-Segmente.
 */
export function seriesFolderPathFromLessonPath(lessonPath: string | null | undefined): string | null {
  const want = stundePathOf(lessonPath || '');
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
  const p = stundePathOf(path);
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
  const byReihePath = list.find((s) =>
    customSetReihePaths(s).some((rp) => want === rp || want.startsWith(`${rp}/`)),
  );
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
    if (remote.length === 0) return loadCustomEntryTicketSets();

    const json = data as { standPulled?: boolean };
    if (json.standPulled) {
      const replaced = remote.map(ensureSpecialLessonSections);
      saveCustomEntryTicketSets(replaced);
      return replaced;
    }

    // Nach dem Fetch noch einmal localStorage lesen: währenddessen können neue Karten
    // schon gespeichert worden sein. Der Live-Stand bleibt primär.
    const localNow = loadCustomEntryTicketSets();
    const merged = mergeCustomSetListsKeepExisting(localNow, remote).map(ensureSpecialLessonSections);
    saveCustomEntryTicketSets(merged);
    return merged;
  } catch {
    return local;
  }
}

/** Sortierschlüssel: Ordnername der Stunde (01.01 …), egal ob voller Pfad oder Anzeigename. */
function lessonSortKey(lesson: EntryTicketLessonSection): string {
  const first = lesson.covers?.[0];
  if (first) return lessonFolderName(first.lessonKey || first.lessonName || '');
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

export function lessonMatchesPath(lesson: EntryTicketLessonSection, lessonPath: string): boolean {
  const wantRaw = normalizePath(lessonPath);
  if (!wantRaw) return false;
  const { path: wantPath, section: wantSection } = splitLessonSectionKey(wantRaw);
  const wantStundeName = wantPath.split('/').pop() || wantPath;
  const wantLabel = wantSection || wantStundeName;

  if (lesson.lessonKey) {
    const key = normalizePath(lesson.lessonKey);
    const { path: keyPath, section: keySection } = splitLessonSectionKey(key);
    if (key === wantRaw) return true;
    const sameStunde =
      keyPath === wantPath ||
      (Boolean(wantStundeName) &&
        keyPath.endsWith(`/${wantStundeName}`) &&
        folderNamesEqual(keyPath.split('/').pop() || '', wantStundeName));
    if (sameStunde) {
      if (!wantSection) return true;
      if (keySection && folderNamesEqual(keySection, wantSection)) return true;
    }
    if (key.startsWith(`${wantPath}/`)) {
      if (!wantSection) return true;
      if (folderNamesEqual(lessonFolderName(key), wantSection)) return true;
    }
    if (folderNamesEqual(lessonFolderName(key), wantLabel)) return true;
  }
  if (isCombinedLessonSection(lesson)) {
    for (const cover of lesson.covers || []) {
      if (
        lessonMatchesPath(
          {
            ...lesson,
            lessonName: cover.lessonName,
            lessonKey: cover.lessonKey,
            covers: undefined,
          },
          lessonPath,
        )
      ) {
        return true;
      }
    }
  }
  return (
    folderNamesEqual(lesson.lessonName.trim(), wantLabel) ||
    folderNamesEqual(lessonFolderName(lesson.lessonName), wantLabel)
  );
}

/**
 * Play-Pool: frühere Stunden plus die aktuelle (kumulativ).
 * „Für später“ nie. Ohne lessonPath: gesamtes Set.
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
  return lessons
    .filter((l) => {
      if (isLaterLessonSection(l)) return false;
      if (isGeneralLessonSection(l) || isUnboundPriorLessonSection(l)) return true;
      if (lessonMatchesPath(l, want)) return true;
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

function coveredMatchKeysOf(lesson: EntryTicketLessonSection): string[] {
  return coveredLessonsOf(lesson).map((c) => lessonMatchKey(c.lessonName, c.lessonKey));
}

export function defaultCombinedLessonName(lessons: EntryTicketLessonSection[]): string {
  const ordered = sortLessonsChronologically(
    lessons.filter((l) => !isGeneralLessonSection(l) && !isLaterLessonSection(l)),
  );
  if (ordered.length === 0) return 'Zusammenfassung';
  if (ordered.length === 1) return ordered[0].lessonName;
  const first = ordered[0].lessonName.trim();
  const last = ordered[ordered.length - 1].lessonName.trim();
  const a = first.match(/^(\d+\.\d+)/);
  const b = last.match(/^(\d+\.\d+)/);
  if (a && b && a[1] !== b[1]) return `${a[1]}–${b[1]}`;
  if (a && b) return first;
  return `${first} · ${last}`;
}

function flattenCoveredLessons(lessons: EntryTicketLessonSection[]): EntryTicketCoveredLesson[] {
  const out: EntryTicketCoveredLesson[] = [];
  const seen = new Set<string>();
  for (const lesson of sortLessonsChronologically(lessons)) {
    for (const cover of coveredLessonsOf(lesson)) {
      const key = lessonMatchKey(cover.lessonName, cover.lessonKey);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        lessonName: cover.lessonName,
        lessonKey: cover.lessonKey,
      });
    }
  }
  return out;
}

/**
 * Mehrere Stunden zu einer Kategorie zusammenfassen.
 * Karten bleiben (IDs unverändert) und liegen nur noch auf der Zusammenfassung.
 */
export function combineLessonSections(
  set: EntryTicketCustomSet,
  lessonIds: string[],
  combinedName?: string,
): EntryTicketCustomSet {
  const idSet = new Set(lessonIds);
  const picked = sortLessonsChronologically(
    set.lessons.filter(
      (l) => idSet.has(l.id) && !isGeneralLessonSection(l) && !isLaterLessonSection(l),
    ),
  );
  if (picked.length < 2) return set;
  const covers = flattenCoveredLessons(picked);
  if (covers.length < 2) return set;
  const survivor: EntryTicketLessonSection = {
    ...picked[0],
    lessonName: (combinedName || '').trim() || defaultCombinedLessonName(picked),
    lessonKey: covers[0].lessonKey || picked[0].lessonKey,
    topicName: picked[0].topicName,
    covers,
    tasks: picked.reduce(
      (tasks, l) => mergeTaskListsKeepExisting(tasks, l.tasks),
      [] as EntryTicketCustomTask[],
    ),
  };
  const drop = new Set(picked.slice(1).map((l) => l.id));
  return ensureSpecialLessonSections({
    ...set,
    lessons: set.lessons
      .map((l) => (l.id === survivor.id ? survivor : l))
      .filter((l) => !drop.has(l.id)),
  });
}

/**
 * Zusammenfassung aufheben: einzelne Stunden wieder da, Karten bleiben bei der ersten.
 */
export function splitCombinedLessonSection(
  set: EntryTicketCustomSet,
  lessonId: string,
): EntryTicketCustomSet {
  const idx = set.lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) return set;
  const row = set.lessons[idx];
  const covers = row.covers || [];
  if (covers.length < 2) return set;
  const restored: EntryTicketLessonSection[] = covers.map((cover, i) => {
    if (i === 0) {
      const { covers: _covers, ...rest } = row;
      return {
        ...rest,
        lessonName: cover.lessonName,
        lessonKey: cover.lessonKey || rest.lessonKey,
        covers: undefined,
        tasks: row.tasks,
      };
    }
    return createLessonSection(cover.lessonName, cover.lessonKey, row.topicName);
  });
  const nextLessons = [...set.lessons];
  nextLessons.splice(idx, 1, ...restored);
  return ensureSpecialLessonSections({ ...set, lessons: nextLessons });
}

/**
 * Stundenordner der Reihe in ein bestehendes Set mergen.
 * Vorhandene Karten und nicht mehr gefundene Blöcke bleiben;
 * fehlende Folien-Unterkapitel werden ergänzt.
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
  const paths = customSetReihePaths(ensured);
  if (discovered.reihePath && paths.length === 0) {
    const n = normalizePath(discovered.reihePath);
    if (n) {
      paths.push(n);
      changed = true;
    }
  }
  const reihePath = paths[0] || ensured.reihePath;
  if (discovered.lessons.length === 0) {
    return changed ? { ...ensured, reihePath, reihePaths: paths.length > 0 ? paths : undefined } : set;
  }

  const general = ensured.lessons.filter(isGeneralLessonSection);
  const later = ensured.lessons.filter(isLaterLessonSection);
  const middle = ensured.lessons.filter((l) => !isGeneralLessonSection(l) && !isLaterLessonSection(l));
  const byKey = new Map<string, EntryTicketLessonSection>();
  for (const l of middle) {
    const key = lessonMatchKey(l.lessonName, l.lessonKey);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, l);
      continue;
    }
    byKey.set(key, mergeLessonKeepExisting(prev, l));
    changed = true;
  }
  const coveredKeys = new Set<string>();
  for (const l of middle) {
    if (!isCombinedLessonSection(l)) continue;
    for (const k of coveredMatchKeysOf(l)) coveredKeys.add(k);
  }
  const mergedMiddle: EntryTicketLessonSection[] = [];
  const seen = new Set<string>();

  for (const d of discovered.lessons) {
    const key = lessonMatchKey(d.lessonName, d.lessonKey);
    const prev = byKey.get(key);
    if (prev && isCombinedLessonSection(prev)) {
      for (const k of coveredMatchKeysOf(prev)) seen.add(k);
      mergedMiddle.push(prev);
      continue;
    }
    if (!prev && coveredKeys.has(key)) {
      seen.add(key);
      continue;
    }
    seen.add(key);
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
  for (const [key, l] of byKey) {
    if (!seen.has(key)) mergedMiddle.push(l);
  }

  if (!changed) return set;
  return ensureSpecialLessonSections({
    ...ensured,
    reihePath,
    reihePaths: paths.length > 0 ? paths : undefined,
    lessons: [...general, ...mergedMiddle, ...later],
  });
}

export function createEmptyCustomSet(name: string, reihePath?: string): EntryTicketCustomSet {
  const paths = reihePath ? parseReihePathList([reihePath]) : [];
  return {
    id: makeCustomEntryTicketSetId(),
    name: name.trim() || 'Neues Fragenset',
    reihePath: paths[0],
    reihePaths: paths.length > 0 ? paths : undefined,
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

