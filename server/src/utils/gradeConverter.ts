import {
  GRADE_TENDENCY_TO_NUMERIC,
  gradeRangeLabelForTendency,
  percentageToGradeNumeric,
  percentageToGradeTendency,
  percentageToMSSPoints as mssFromPercent,
  type GradeTendency,
} from '../lib/gradeScale';

/** @deprecated Alias — nutze percentageToGradeNumeric */
export function percentageToGrade(percentage: number): number {
  return percentageToGradeNumeric(percentage);
}

export function percentageToMSSPoints(percentage: number): number {
  return mssFromPercent(percentage);
}

export function mssPointsToPercentage(mssPoints: number): number {
  const map: Record<number, number> = {
    15: 95,
    14: 90,
    13: 85,
    12: 80,
    11: 75,
    10: 70,
    9: 65,
    8: 60,
    7: 55,
    6: 50,
    5: 45,
    4: 40,
    3: 30,
    2: 20,
    0: 0,
  };
  const k = Math.max(0, Math.min(15, Math.round(mssPoints)));
  return map[k] ?? 0;
}

const numericToTendency = (g: number): GradeTendency => {
  const entries = Object.entries(GRADE_TENDENCY_TO_NUMERIC) as [GradeTendency, number][];
  let best: GradeTendency = '6';
  let bestDist = Infinity;
  for (const [t, n] of entries) {
    const d = Math.abs(n - g);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
};

export function mssPointsToGermanGrade(mssPoints: number): number {
  const pct = mssPointsToPercentage(mssPoints);
  return percentageToGradeNumeric(pct);
}

const TENDENCY_TO_MSS: Record<GradeTendency, number> = {
  '1': 15,
  '1−': 14,
  '2+': 13,
  '2': 12,
  '2−': 11,
  '3+': 10,
  '3': 9,
  '3−': 8,
  '4+': 7,
  '4': 6,
  '4−': 5,
  '5+': 4,
  '5': 3,
  '5−': 2,
  '6': 0,
};

export function germanGradeToMSSPoints(germanGrade: number): number {
  return TENDENCY_TO_MSS[numericToTendency(germanGrade)] ?? 0;
}

export function getGradeRange(grade: number): string {
  return gradeRangeLabelForTendency(numericToTendency(grade));
}

export function getMSSPointsRange(mssPoints: number): string {
  const pct = mssPointsToPercentage(mssPoints);
  const t = percentageToGradeTendency(pct);
  return gradeRangeLabelForTendency(t);
}

export function calculateMSSWeightedAverage(grades: { grade: number; weight: number }[]): number {
  if (grades.length === 0) return 0;
  const validGrades = grades.filter((g) => g.grade !== null && g.grade !== undefined);
  if (validGrades.length === 0) return 0;
  const totalWeight = validGrades.reduce((sum, g) => sum + g.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = validGrades.reduce((sum, g) => sum + g.grade * g.weight, 0);
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export function calculateGermanWeightedAverage(grades: { grade: number; weight: number }[]): number {
  return calculateMSSWeightedAverage(grades);
}

export { percentageToGradeTendency, scoreToGradeTendency } from '../lib/gradeScale';
