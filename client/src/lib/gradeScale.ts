/**
 * App-weite Regel: Prozent → Schulnote mit Tendenz.
 * (Identisch zu server/src/lib/gradeScale.ts — bei Änderungen beide Dateien anpassen.)
 */

export type GradeTendency =
  | '1'
  | '1−'
  | '2+'
  | '2'
  | '2−'
  | '3+'
  | '3'
  | '3−'
  | '4+'
  | '4'
  | '4−'
  | '5+'
  | '5'
  | '5−'
  | '6';

export const GRADE_PERCENT_BANDS: { minPercent: number; grade: GradeTendency }[] = [
  { minPercent: 95, grade: '1' },
  { minPercent: 90, grade: '1−' },
  { minPercent: 85, grade: '2+' },
  { minPercent: 80, grade: '2' },
  { minPercent: 75, grade: '2−' },
  { minPercent: 70, grade: '3+' },
  { minPercent: 65, grade: '3' },
  { minPercent: 60, grade: '3−' },
  { minPercent: 55, grade: '4+' },
  { minPercent: 50, grade: '4' },
  { minPercent: 45, grade: '4−' },
  { minPercent: 40, grade: '5+' },
  { minPercent: 30, grade: '5' },
  { minPercent: 20, grade: '5−' },
  { minPercent: 0, grade: '6' },
];

export const GRADE_TENDENCY_TO_NUMERIC: Record<GradeTendency, number> = {
  '1': 1.0,
  '1−': 1.3,
  '2+': 1.7,
  '2': 2.0,
  '2−': 2.3,
  '3+': 2.7,
  '3': 3.0,
  '3−': 3.3,
  '4+': 3.7,
  '4': 4.0,
  '4−': 4.3,
  '5+': 4.7,
  '5': 5.0,
  '5−': 5.3,
  '6': 6.0,
};

export function clampPercent(percentage: number): number {
  if (!Number.isFinite(percentage)) return 0;
  return Math.max(0, Math.min(100, percentage));
}

export function percentageToGradeTendency(percentage: number): GradeTendency {
  const p = clampPercent(percentage);
  for (const row of GRADE_PERCENT_BANDS) {
    if (p >= row.minPercent) return row.grade;
  }
  return '6';
}

export function percentageToGradeNumeric(percentage: number): number {
  return GRADE_TENDENCY_TO_NUMERIC[percentageToGradeTendency(percentage)];
}

export function scoreToGradeTendency(achieved: number, maxPoints: number): GradeTendency {
  if (!Number.isFinite(maxPoints) || maxPoints <= 0) return '6';
  const pct = (achieved / maxPoints) * 100;
  return percentageToGradeTendency(pct);
}

export function scoreToGradeNumeric(achieved: number, maxPoints: number): number {
  return GRADE_TENDENCY_TO_NUMERIC[scoreToGradeTendency(achieved, maxPoints)];
}

export function pointsOnScaleToGradeTendency(points: number, maxPoints: number): GradeTendency {
  const t = Math.max(0, Math.min(maxPoints, Math.round(points)));
  return scoreToGradeTendency(t, maxPoints);
}

export function minPointsOnScaleForTendency(grade: GradeTendency, maxPoints: number): number {
  const band = GRADE_PERCENT_BANDS.find((b) => b.grade === grade);
  if (!band || maxPoints <= 0) return 0;
  if (band.minPercent <= 0) return 0;
  return Math.min(maxPoints, Math.ceil((maxPoints * band.minPercent) / 100));
}

export function gradeTableForMaxPoints(maxPoints: number): { minPoints: number; grade: GradeTendency }[] {
  const rows = GRADE_PERCENT_BANDS.filter((b) => b.grade !== '6').map((b) => ({
    minPoints: minPointsOnScaleForTendency(b.grade, maxPoints),
    grade: b.grade,
  }));
  rows.push({ minPoints: 0, grade: '6' });
  const byMin = new Map<number, GradeTendency>();
  for (const r of rows) {
    if (!byMin.has(r.minPoints)) byMin.set(r.minPoints, r.grade);
  }
  return [...byMin.entries()]
    .map(([minPoints, grade]) => ({ minPoints, grade }))
    .sort((a, b) => b.minPoints - a.minPoints);
}

export function minPointsThresholdForTotalOnScale(total: number, maxPoints: number): number {
  const grade = pointsOnScaleToGradeTendency(total, maxPoints);
  return minPointsOnScaleForTendency(grade, maxPoints);
}

export function percentageToMSSPoints(percentage: number): number {
  const p = clampPercent(percentage);
  if (p >= 95) return 15;
  if (p >= 90) return 14;
  if (p >= 85) return 13;
  if (p >= 80) return 12;
  if (p >= 75) return 11;
  if (p >= 70) return 10;
  if (p >= 65) return 9;
  if (p >= 60) return 8;
  if (p >= 55) return 7;
  if (p >= 50) return 6;
  if (p >= 45) return 5;
  if (p >= 40) return 4;
  if (p >= 30) return 3;
  if (p >= 20) return 2;
  return 0;
}

export function tendencyToAsciiLabel(grade: GradeTendency): string {
  return grade.replace(/−/g, '-');
}

export function gradeRangeLabelForTendency(grade: GradeTendency): string {
  const idx = GRADE_PERCENT_BANDS.findIndex((b) => b.grade === grade);
  if (idx < 0) return 'unbekannt';
  const min = GRADE_PERCENT_BANDS[idx].minPercent;
  if (idx === 0) return `${min} – 100 %`;
  const upper = GRADE_PERCENT_BANDS[idx - 1].minPercent;
  return `${min} – unter ${upper} %`;
}

/** Für Punkt-Skalen in Tooltips (Prozentgrenzen wie in der App-Regel). */
export function gradePercentDisplayRanges(): {
  grade: GradeTendency;
  label: string;
  minPercent: number;
  maxPercent: number;
}[] {
  return GRADE_PERCENT_BANDS.map((band, idx) => ({
    grade: band.grade,
    label: tendencyToAsciiLabel(band.grade),
    minPercent: band.minPercent,
    maxPercent: idx === 0 ? 100 : GRADE_PERCENT_BANDS[idx - 1].minPercent,
  }));
}
