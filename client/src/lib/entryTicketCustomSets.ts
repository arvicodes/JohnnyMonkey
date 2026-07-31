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
  const prompt = typeof q.prompt === 'string' ? q.prompt : '';
  const solution = typeof q.solution === 'string' ? q.solution : '';
  if (!prompt || !solution) return null;
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

/** Altformat `{ id, name, tasks[] }` → eine Stunden-Sektion „Allgemein“. */
function migrateV1Set(raw: Record<string, unknown>): EntryTicketCustomSet | null {
  const id = typeof raw.id === 'string' ? raw.id : '';
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!isCustomEntryTicketSetId(id) || !name) return null;
  if (Array.isArray(raw.lessons)) {
    const lessons = raw.lessons.map(parseLessonSection).filter((l): l is EntryTicketLessonSection => Boolean(l));
    return {
      id,
      name,
      reihePath: typeof raw.reihePath === 'string' ? normalizePath(raw.reihePath) : undefined,
      lessons,
    };
  }
  const tasksRaw = Array.isArray(raw.tasks) ? raw.tasks : [];
  const tasks = tasksRaw.map(parseTask).filter((t): t is EntryTicketCustomTask => Boolean(t));
  return {
    id,
    name,
    reihePath: typeof raw.reihePath === 'string' ? normalizePath(raw.reihePath) : undefined,
    lessons:
      tasks.length > 0
        ? [
            {
              id: makeEntryTicketEntityId('ls'),
              lessonName: 'Allgemein',
              tasks,
            },
          ]
        : [],
  };
}

function parseCustomSet(raw: unknown): EntryTicketCustomSet | null {
  if (!raw || typeof raw !== 'object') return null;
  return migrateV1Set(raw as Record<string, unknown>);
}

export function loadCustomEntryTicketSets(): EntryTicketCustomSet[] {
  try {
    const rawV2 = localStorage.getItem(CUSTOM_SETS_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map(parseCustomSet).filter((s): s is EntryTicketCustomSet => Boolean(s));
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

/** Findet die Stunden-Sektion, die zum aktuellen lessonPath passt. */
export function findLessonSectionIndex(set: EntryTicketCustomSet, lessonPath: string | null | undefined): number {
  if (!lessonPath) return -1;
  const want = normalizePath(lessonPath);
  const wantName = lessonFolderName(want);
  const byKey = set.lessons.findIndex((l) => {
    if (!l.lessonKey) return false;
    const key = normalizePath(l.lessonKey);
    return key === want || key.endsWith(`/${wantName}`) || lessonFolderName(key) === wantName;
  });
  if (byKey >= 0) return byKey;
  return set.lessons.findIndex((l) => l.lessonName.trim() === wantName || lessonFolderName(l.lessonName) === wantName);
}

/**
 * Play-Pool: alle Fragen aus Stunden *vor* der aktuellen (kumulativ).
 * Ohne lessonPath oder ohne Treffer → alle Fragen des Sets.
 */
export function cumulativeTasksBeforeLesson(
  set: EntryTicketCustomSet,
  lessonPath: string | null | undefined,
): EntryTicketCustomTask[] {
  const idx = findLessonSectionIndex(set, lessonPath);
  if (idx < 0) {
    return flattenCustomSetTasks(set);
  }
  return set.lessons.slice(0, idx).flatMap((l) => l.tasks);
}

export function createEmptyCustomSet(name: string, reihePath?: string): EntryTicketCustomSet {
  return {
    id: makeCustomEntryTicketSetId(),
    name: name.trim() || 'Neues Fragenset',
    reihePath: reihePath ? normalizePath(reihePath) : undefined,
    lessons: [],
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
    prompt: prompt.trim(),
    solution: solution.trim(),
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
    const prompt = trimmed.slice(0, sep).trim();
    const solution = trimmed.slice(sep + 1).trim();
    if (!prompt || !solution) continue;
    out.push({ prompt, solution });
  }
  return out;
}

