/** Einstellungen beim Prüfungsstart (Client ↔ API). */

export type ExamGroupStudent = { id: string; name: string };

export type ExamBeaconGroupConfig = {
  studentIds?: string[];
  versionCount?: 1 | 2 | 3;
  versionAssignments?: Record<string, string>;
  /** 1 = Standard, 2 = A1/A2 ($$ / $$$). */
  formulationVariantCount?: 1 | 2;
  formulationVariantAssignments?: Record<string, string>;
  /** Nachschrift für kranke SuS (Korrekturmodus). */
  makeupSession?: boolean;
};

export const FORMULATION_VARIANT_LABELS = ['A1', 'A2'] as const;

export function formulationLettersForCount(count: 1 | 2): string[] {
  return count === 2 ? ['1', '2'] : [];
}

export function formulationLetterLabel(letter: string): string {
  if (letter === '1') return 'A1';
  if (letter === '2') return 'A2';
  return letter;
}

export type ExamStartPayloadConfig = {
  byGroup: Record<string, ExamBeaconGroupConfig>;
};

export const EXAM_VARIANT_LETTER_POOL = ['A', 'B', 'C'] as const;

export function variantLettersForCount(count: 1 | 2 | 3): string[] {
  return EXAM_VARIANT_LETTER_POOL.slice(0, count);
}

export function emptyGroupExamConfig(): ExamBeaconGroupConfig {
  return {
    versionCount: 1,
    versionAssignments: {},
    formulationVariantCount: 1,
    formulationVariantAssignments: {},
  };
}

export function buildExamStartPayload(
  groupIds: string[],
  perGroup: Record<string, ExamBeaconGroupConfig>,
): ExamStartPayloadConfig {
  const byGroup: Record<string, ExamBeaconGroupConfig> = {};
  for (const gid of groupIds) {
    byGroup[gid] = perGroup[gid] || emptyGroupExamConfig();
  }
  return { byGroup };
}

export function autoDistributeVersions(
  studentIds: string[],
  letters: string[],
  beaconSeed: string,
): Record<string, string> {
  const pool = letters.length ? letters : ['A'];
  const out: Record<string, string> = {};
  studentIds.forEach((sid, i) => {
    out[sid] = pool[i % pool.length];
  });
  return out;
}
