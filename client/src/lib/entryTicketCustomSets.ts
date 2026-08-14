import {
  entryTicketHasContent,
  entryTicketHasText,
  normalizeEntryTicketFieldValue,
} from './entryTicketRichText';

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

export function isGeneralLessonSection(lesson: EntryTicketLessonSection): boolean {
  if (lesson.lessonKey === ENTRY_TICKET_GENERAL_LESSON_KEY) return true;
  const name = (lesson.lessonName || '').trim().toLowerCase();
  return name === 'allgemein' || name === 'allgemeines';
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

/** Stellt sicher, dass „Allgemein“ existiert und vor allen Stunden steht. */
export function ensureGeneralLessonSection(set: EntryTicketCustomSet): EntryTicketCustomSet {
  const idx = set.lessons.findIndex(isGeneralLessonSection);
  if (idx === 0) {
    const g = set.lessons[0];
    // Schlüssel/Topic nachziehen, falls ältere Sets nur den Namen hatten
    if (
      g.lessonKey === ENTRY_TICKET_GENERAL_LESSON_KEY &&
      g.topicName === ENTRY_TICKET_GENERAL_LESSON_NAME &&
      g.lessonName === ENTRY_TICKET_GENERAL_LESSON_NAME
    ) {
      return set;
    }
    const normalized: EntryTicketLessonSection = {
      ...g,
      lessonName: ENTRY_TICKET_GENERAL_LESSON_NAME,
      lessonKey: ENTRY_TICKET_GENERAL_LESSON_KEY,
      topicName: ENTRY_TICKET_GENERAL_LESSON_NAME,
    };
    return { ...set, lessons: [normalized, ...set.lessons.slice(1)] };
  }
  if (idx > 0) {
    const lessons = [...set.lessons];
    const [g] = lessons.splice(idx, 1);
    const normalized: EntryTicketLessonSection = {
      ...g,
      lessonName: ENTRY_TICKET_GENERAL_LESSON_NAME,
      lessonKey: ENTRY_TICKET_GENERAL_LESSON_KEY,
      topicName: ENTRY_TICKET_GENERAL_LESSON_NAME,
    };
    return { ...set, lessons: [normalized, ...lessons] };
  }
  return {
    ...set,
    lessons: [createGeneralLessonSection(), ...set.lessons],
  };
}

/** Altformat `{ id, name, tasks[] }` → eine Stunden-Sektion „Allgemein“. */
function migrateV1Set(raw: Record<string, unknown>): EntryTicketCustomSet | null {
  const id = typeof raw.id === 'string' ? raw.id : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!isCustomEntryTicketSetId(id) || !name) return null;
  if (Array.isArray(raw.lessons)) {
    const lessons = raw.lessons.map(parseLessonSection).filter((l): l is EntryTicketLessonSection => Boolean(l));
    return ensureGeneralLessonSection({
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
  return ensureGeneralLessonSection({
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

function setsNeedGeneralPersist(before: EntryTicketCustomSet[], after: EntryTicketCustomSet[]): boolean {
  if (before.length !== after.length) return true;
  for (let i = 0; i < after.length; i += 1) {
    const a = before[i];
    const b = after[i];
    if (!a || a.id !== b.id) return true;
    if (a.lessons.length !== b.lessons.length) return true;
    if (!b.lessons[0] || !isGeneralLessonSection(b.lessons[0])) return true;
    if (!a.lessons[0] || a.lessons[0].lessonKey !== b.lessons[0].lessonKey) return true;
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
      const ensured = loaded.map(ensureGeneralLessonSection);
      if (setsNeedGeneralPersist(loaded, ensured)) {
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
    if (/^\d{1,2}[-–\s]\d{2}(?:\b|\s|$)/.test(seg) || /Matrizen/i.test(seg)) {
      const joined = parts.slice(0, i + 1).join('/');
      return absolute ? `/${joined}` : joined;
    }
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
  }
  return null;
}

/**
 * Fragensets vom Server laden und in localStorage cachen (TeacherDashboard / Defaults).
 */
export async function fetchAndCacheCustomEntryTicketSets(): Promise<EntryTicketCustomSet[]> {
  const local = loadCustomEntryTicketSets();
  try {
    const res = await fetch('/api/entry-ticket/custom-sets', { credentials: 'include' });
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
    const merged = Array.from(byId.values()).map(ensureGeneralLessonSection);
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

/** Stunden einer Reihe in Ordner-/Pfad-Reihenfolge; „Allgemein“ immer zuerst. */
export function sortLessonsChronologically(
  lessons: EntryTicketLessonSection[],
): EntryTicketLessonSection[] {
  return [...lessons].sort((a, b) => {
    const aG = isGeneralLessonSection(a);
    const bG = isGeneralLessonSection(b);
    if (aG && !bG) return -1;
    if (!aG && bG) return 1;
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
    return lessons.flatMap((l) => l.tasks);
  }

  const wantName = lessonFolderName(want);
  // Aktuelle Stunde am Ordnernamen ausrichten — auch wenn sie noch keine Sektion im Set hat.
  // „Allgemein“ zählt immer als vor der ersten Stunde (auch wenn localeCompare sonst anders sortiert).
  return lessons
    .filter((l) => {
      if (isGeneralLessonSection(l)) return true;
      if (lessonMatchesPath(l, want)) return false;
      return compareLessonSortKeys(lessonSortKey(l), wantName) < 0;
    })
    .flatMap((l) => l.tasks);
}

export function createEmptyCustomSet(name: string, reihePath?: string): EntryTicketCustomSet {
  return {
    id: makeCustomEntryTicketSetId(),
    name: name.trim() || 'Neues Fragenset',
    reihePath: reihePath ? normalizePath(reihePath) : undefined,
    lessons: [createGeneralLessonSection()],
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

