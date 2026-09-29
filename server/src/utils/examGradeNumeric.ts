import { scoreToGradeNumeric } from '../lib/gradeScale';

/** Notenwert (Dezimal) aus erreichten Punkten — app-weite Prozentregel. */
export function examGradeNumericFromPoints(achieved: number, maxPoints: number): number {
  if (!maxPoints || maxPoints <= 0) return 0;
  return scoreToGradeNumeric(achieved, maxPoints);
}
