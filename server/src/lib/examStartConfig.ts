/** Einstellungen beim Prüfungsstart (pro Lerngruppe, in LessonExamBeacon.configJson). */

export type ExamBeaconGroupConfig = {
  /** Wenn gesetzt: nur diese SuS sehen den Beacon. Leer = alle der Gruppe. */
  studentIds?: string[];
  /** 1–3: wie viele Prüfungsversionen (A/B/C) aktiv sind. */
  versionCount?: 1 | 2 | 3;
  /** Manuelle Zuweisung SuS → Versionsbuchstabe. */
  versionAssignments?: Record<string, string>;
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
  if (!ids?.length) return true;
  return ids.includes(studentId);
}
