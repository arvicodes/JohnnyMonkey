import { examAnswerScoreFraction } from './examMcPartialScore';

const HU_KI_MSS_RE = /hu_ki\s*mss\s*(11|13)\.html$/i;

export function isHuKiMssExamPath(filePath: string): boolean {
  const base = (filePath || '').replace(/\\/g, '/').trim().split('/').pop() || '';
  return HU_KI_MSS_RE.test(base);
}

const TASK1_FIELDS = new Set(
  'abcdefghijklm'.split('').map((c) => `a1${c}`),
);

function normWf(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/WAHR.*/, 'W')
    .replace(/FALSCH.*/, 'F');
}

export function huKiWfRowPoints(expected: unknown, student: unknown): number {
  const stud = normWf(student);
  if (!stud) return 0;
  const expList = Array.isArray(expected) ? expected : [expected];
  const exp = normWf(expList[0]);
  if (!exp) return 0;
  return stud === exp ? 1 : -1;
}

function normSortStep(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.;]+$/g, '');
}

function splitSortPipe(raw: unknown): string[] {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  return s
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function huKiSortTaskPoints(expected: unknown, student: unknown, maxPts = 2): number {
  const studentSteps = splitSortPipe(student).map(normSortStep);
  if (!studentSteps.length) return 0;
  const solutions = Array.isArray(expected) ? expected : [expected];
  let bestMatch = 0;
  for (const sol of solutions) {
    const correctSteps = splitSortPipe(sol).map(normSortStep);
    if (!correctSteps.length) continue;
    let match = 0;
    for (let i = 0; i < correctSteps.length; i++) {
      if (i < studentSteps.length && studentSteps[i] === correctSteps[i]) match += 1;
    }
    const frac = match / correctSteps.length;
    if (frac > bestMatch) bestMatch = frac;
  }
  if (bestMatch >= 1 - 1e-9) return maxPts;
  if (bestMatch >= 0.5 - 1e-9) return maxPts / 2;
  return 0;
}

export function huKiFieldAutoPoints(
  examPath: string,
  fieldId: string,
  expected: unknown,
  student: unknown,
  maxPts: number,
): number | null {
  if (!isHuKiMssExamPath(examPath)) return null;
  const id = fieldId.toLowerCase();
  if (TASK1_FIELDS.has(id)) {
    return huKiWfRowPoints(expected, student);
  }
  if (id === 'a2a') {
    return huKiSortTaskPoints(expected, student, maxPts);
  }
  if (id === 'a2b') {
    const frac = examAnswerScoreFraction(expected, student);
    return Math.max(0, maxPts * frac);
  }
  return null;
}

export function huKiTask1FieldIds(fieldIds: string[]): string[] {
  return fieldIds.filter((id) => TASK1_FIELDS.has(id.toLowerCase()));
}
