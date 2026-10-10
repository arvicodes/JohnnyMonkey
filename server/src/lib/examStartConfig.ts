/** Einstellungen beim Prüfungsstart (pro Lerngruppe, in LessonExamBeacon.configJson). */

export type ExamBeaconGroupConfig = {
  /** Wenn gesetzt: nur diese SuS sehen den Beacon. Leer = alle der Gruppe. */
  studentIds?: string[];
  /** 1–3: wie viele Prüfungsversionen (A/B/C) aktiv sind. */
  versionCount?: 1 | 2 | 3;
  /** Manuelle Zuweisung SuS → Versionsbuchstabe. */
  versionAssignments?: Record<string, string>;
  /** 1 = Standard ($$), 2 = Aufteilung A1/A2 ($$ / $$$ im Dollar-Code). */
  formulationVariantCount?: 1 | 2;
  /** SuS → „1“ (A1) oder „2“ (A2). */
  formulationVariantAssignments?: Record<string, string>;
  /** Nachschrift-Sitzung (kranke SuS). */
  makeupSession?: boolean;
};

export function parseExamBeaconGroupConfig(raw: string | null | undefined): ExamBeaconGroupConfig {
  if (!raw?.trim()) return {};
  try {
    const o = JSON.parse(raw) as ExamBeaconGroupConfig;
    if (!o || typeof o !== 'object') return {};
    return o;
  } catch {
    return {};
  }
}

export function normalizeVersionCount(n: unknown): 1 | 2 | 3 {
  const v = Number(n);
  if (v === 3) return 3;
  if (v === 2) return 2;
  return 1;
}

const DEFAULT_VARIANT_LETTERS = ['A', 'B', 'C'];

export function activeVersionLetters(
  allLetters: string[],
  versionCount: 1 | 2 | 3,
): string[] {
  const fromFile = [...new Set(allLetters.map((L) => L.trim().toUpperCase()).filter(Boolean))].sort();
  const pool = fromFile.length > 1 ? fromFile : DEFAULT_VARIANT_LETTERS;
  return pool.slice(0, versionCount);
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function resolveStudentVersionLetter(
  studentId: string,
  beaconId: string,
  letters: string[],
  assignments?: Record<string, string>,
): string {
  const pool = letters.length ? letters : ['A'];
  const manual = assignments?.[studentId]?.trim().toUpperCase();
  if (manual && pool.includes(manual)) return manual;
  const idx = hash32(`${studentId}|${beaconId}|exam-version-v1`) % pool.length;
  return pool[idx];
}

export function studentAllowedInBeacon(
  studentId: string,
  cfg: ExamBeaconGroupConfig,
): boolean {
  const ids = cfg.studentIds;
  if (ids === undefined) return true;
  if (!ids.length) return false;
  return ids.includes(studentId);
}

export function normalizeFormulationVariantCount(n: unknown): 1 | 2 {
  return Number(n) === 2 ? 2 : 1;
}

const FORMULATION_ALT_POOL = ['1', '2'] as const;

export function resolveStudentFormulationAlt(
  studentId: string,
  beaconId: string,
  count: 1 | 2,
  assignments?: Record<string, string>,
): string {
  if (count <= 1) return '0';
  const manual = assignments?.[studentId]?.trim();
  if (manual && (FORMULATION_ALT_POOL as readonly string[]).includes(manual)) return manual;
  const idx = hash32(`${studentId}|${beaconId}|exam-formulation-alt-v1`) % 2;
  return FORMULATION_ALT_POOL[idx];
}
