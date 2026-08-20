import { apiGet } from './api';
import {
  findCustomSetForLessonPath,
  isCustomEntryTicketSetId,
  loadCustomEntryTicketSets,
  type EntryTicketCustomSet,
  type EntryTicketCustomSetId,
} from './entryTicketCustomSets';

/** Klassenstufen für EntryTicket-Fragensets (mathematische Minikarten). */
export type EntryTicketGradeBand = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/**
 * Wie in EntryTicketPage: Klassenstufen + Inf-Kursbänder + eigene Fragensätze (`c_…`).
 * URL-Parameter: grade=7|inf11|… bzw. grade=c_….
 */
export type EntryTicketPlanBand = EntryTicketGradeBand | 'inf11' | 'inf12' | 'inf13' | EntryTicketCustomSetId;

export function parseEntryTicketPlanBand(value: unknown): EntryTicketPlanBand {
  if (isCustomEntryTicketSetId(value)) return value;
  if (value === 'inf11' || value === 'inf12' || value === 'inf13') return value;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n >= 5 && n <= 13) return n as EntryTicketGradeBand;
  return 7;
}

export function formatEntryTicketPlanBandLabel(
  band: EntryTicketPlanBand | undefined | null,
  customNameById?: Record<string, string>,
): string {
  if (band === undefined || band === null) return 'Klasse 7';
  if (band === 'inf11') return 'Inf 11';
  if (band === 'inf12') return 'Inf 12';
  if (band === 'inf13') return 'Inf 13';
  if (isCustomEntryTicketSetId(band)) {
    return customNameById?.[band] ?? 'Eigenes Fragenset';
  }
  return `Klasse ${band}`;
}

export const ENTRY_TICKET_PLAN_GRADE_OPTIONS: { value: string; label: string }[] = [
  ...([5, 6, 7, 8, 9, 10, 11, 12, 13] as const).map((n) => ({ value: String(n), label: `Klasse ${n}` })),
  { value: 'inf11', label: 'Inf 11' },
  { value: 'inf12', label: 'Inf 12' },
  { value: 'inf13', label: 'Inf 13' },
];

/** Eigene Fragensätze oben, dann feste Bänder (für Stundenplan-Select). */
export function getEntryTicketPlanGradeOptions(): { value: string; label: string }[] {
  const custom = loadCustomEntryTicketSets().map((s) => ({
    value: s.id,
    label: `${s.name} (${s.lessons.length} Std.)`,
  }));
  return [...custom, ...ENTRY_TICKET_PLAN_GRADE_OPTIONS];
}

/**
 * Klassenstufe 5–13 aus Gruppennamen ableiten (z. B. "7a", "Klasse 10", "MS2 9b").
 * Erste passende Zahl in der Reihenfolge der übergebenen Namen. Sonst 7.
 */
export function gradeFromGroupNames(names: string[]): EntryTicketGradeBand {
  for (const name of names) {
    const matches = name.match(/\d+/g);
    if (!matches) continue;
    for (const raw of matches) {
      const n = parseInt(raw, 10);
      if (n >= 5 && n <= 13) return n as EntryTicketGradeBand;
    }
  }
  return 7;
}

/**
 * Entry-Ticket-Band aus Gruppennamen: Informatik-Gruppen → inf11/12/13, sonst Zahlenstufe.
 */
export function entryTicketBandFromGroupNames(names: string[]): EntryTicketPlanBand {
  for (const name of names) {
    const n = (name || '').trim();
    if (!n) continue;
    if (/informatik|\binf\b/i.test(n)) {
      if (/\b13\b/.test(n) || /gk\s*13/i.test(n) || /lk\s*13/i.test(n)) return 'inf13';
      if (/\b12\b/.test(n) || /gk\s*12/i.test(n) || /lk\s*12/i.test(n)) return 'inf12';
      if (/\b11\b/.test(n) || /gk\s*11/i.test(n) || /lk\s*11/i.test(n)) return 'inf11';
    }
  }
  return gradeFromGroupNames(names);
}

function normalizeLessonPathKey(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Feste Zuordnung Unterrichtsreihe (Pfadsegment) → Fragenset-Name,
 * falls kein Set über lessonPath/reihePath gefunden wird.
 * z. B. Matrizen-Ordner → Analysis-Set (Reihenpfad kann abweichen).
 */
const SERIES_PATH_TO_SET_NAME: { pathTest: RegExp; setNameTests: RegExp[] }[] = [
  {
    pathTest: /(?:^|\/)Klasse\s*5(?:\/|$)/i,
    setNameTests: [/^Mathe\s*5$/i, /Klasse\s*5/i, /^M\s*5$/i],
  },
  {
    pathTest: /(?:^|\/)11[-–\s]?04[^/]*\bKI\b/i,
    setNameTests: [/11[-–\s]?04.*\bKI\b/i, /^KI$/i, /\bKI\b/i],
  },
  {
    pathTest: /Matrizen/i,
    setNameTests: [/\bAnalysis\b/i, /^Analysis$/i, /^lk\s*mathe$/i, /^mathe\s*lk$/i],
  },
];

function pickCustomSetByNameHints(
  sets: EntryTicketCustomSet[],
  nameTests: RegExp[],
): EntryTicketCustomSet | null {
  for (const test of nameTests) {
    const hit = sets.find((s) => test.test((s.name || '').trim()));
    if (hit) return hit;
  }
  return null;
}

/**
 * Default-Fragenset für eine Stunde: zuerst Set mit passender Stunde/Reihe,
 * dann Pfad-Hinweise (11-04 KI → KI-Set, Matrizen → Analysis), sonst Fallback.
 */
export function resolveEntryTicketBandForLessonPath(
  lessonPath: string | null | undefined,
  fallback: EntryTicketPlanBand = 7,
  sets?: EntryTicketCustomSet[],
): EntryTicketPlanBand {
  const path = normalizeLessonPathKey(lessonPath || '');
  if (!path) return fallback;

  const list = sets ?? loadCustomEntryTicketSets();
  const byPath = findCustomSetForLessonPath(path, list);
  if (byPath) return byPath.id;

  for (const hint of SERIES_PATH_TO_SET_NAME) {
    if (!hint.pathTest.test(path)) continue;
    const byName = pickCustomSetByNameHints(list, hint.setNameTests);
    if (byName) return byName.id;
  }

  return fallback;
}

/** Zugewiesenes Entry-Ticket-Fragenset aus dem Stundenplan (z. B. „Mathe 5“). */
export function assignedEntryTicketGradeFromInstructions(
  byPath: Record<string, { lessonPlan?: Array<{ type?: string; grade?: unknown }> }>,
  lessonPath: string,
): EntryTicketPlanBand | null {
  const want = normalizeLessonPathKey(lessonPath);
  if (!want) return null;
  const content =
    byPath[lessonPath] ||
    Object.entries(byPath).find(([k]) => normalizeLessonPathKey(k) === want)?.[1] ||
    Object.entries(byPath).find(([k]) => {
      const nk = normalizeLessonPathKey(k);
      return nk && (want.startsWith(`${nk}/`) || nk.startsWith(`${want}/`));
    })?.[1];
  const plan = content?.lessonPlan;
  if (!Array.isArray(plan)) return null;
  const item = plan.find((p) => p?.type === 'entry-ticket');
  if (item?.grade == null || item.grade === '') return null;
  return parseEntryTicketPlanBand(item.grade);
}

export async function fetchAssignedEntryTicketGrade(
  lessonPath: string | null | undefined,
): Promise<EntryTicketPlanBand | null> {
  const path = (lessonPath || '').trim();
  if (!path) return null;
  const teacherId = typeof window !== 'undefined' ? localStorage.getItem('teacherId') : null;
  if (!teacherId) return null;
  try {
    const res = await apiGet(`/api/lesson-instructions/teacher/${encodeURIComponent(teacherId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { lessonPlan?: Array<{ type?: string; grade?: unknown }> }>;
    if (!data || typeof data !== 'object') return null;
    return assignedEntryTicketGradeFromInstructions(data, path);
  } catch {
    return null;
  }
}
