import {
  scoreToGradeNumeric,
  scoreToGradeTendency,
  tendencyToAsciiLabel,
} from './gradeScale';

/** Note aus erreichten Punkten — app-weite Prozentregel (alle Skalen). */
export function examGradeLabelForCorrection(achieved: number, maxPoints: number): string {
  return tendencyToAsciiLabel(scoreToGradeTendency(achieved, maxPoints));
}

export function examGradeNumericForCorrection(achieved: number, maxPoints: number): number {
  return scoreToGradeNumeric(achieved, maxPoints);
}

export function examGradeLabelFromPoints(
  achieved: number,
  total: number,
): { numeric: number; label: string } {
  if (!total || total <= 0) return { numeric: 0, label: '-' };
  const tendency = scoreToGradeTendency(achieved, total);
  return {
    numeric: scoreToGradeNumeric(achieved, total),
    label: tendencyToAsciiLabel(tendency),
  };
}

export function formatExamGradeNumber(grade: number): string {
  if (!Number.isFinite(grade) || grade <= 0) return '-';
  const map: Record<string, string> = {
    '1': '1',
    '1.0': '1',
    '1.3': '1-',
    '1.7': '2+',
    '2': '2',
    '2.0': '2',
    '2.3': '2-',
    '2.7': '3+',
    '3': '3',
    '3.0': '3',
    '3.3': '3-',
    '3.7': '4+',
    '4': '4',
    '4.0': '4',
    '4.3': '4-',
    '4.7': '5+',
    '5': '5',
    '5.0': '5',
    '5.3': '5-',
    '6': '6',
    '6.0': '6',
  };
  const key = String(Math.round(grade * 10) / 10);
  return map[key] || String(grade).replace('.', ',');
}

/** Klassenschnitt als Dezimalnote mit einer Nachkommastelle (z. B. 2,3). */
export function formatExamClassAverageDecimal(avgNumeric: number): string {
  if (!Number.isFinite(avgNumeric) || avgNumeric <= 0) return '–';
  return (Math.round(avgNumeric * 10) / 10).toFixed(1).replace('.', ',');
}
