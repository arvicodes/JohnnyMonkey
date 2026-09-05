/** Note als Anzeige-String (wie in der HÜ-/KA-Auswertung). */
export function examGradeLabelFromPoints(achieved: number, total: number): { numeric: number; label: string } {
  if (!total || total <= 0) return { numeric: 0, label: '-' };
  const percentage = (achieved / total) * 100;
  let grade: number;
  let label: string;
  if (percentage >= 95.0) {
    grade = 1.0;
    label = '1+';
  } else if (percentage >= 90.0) {
    grade = 1.3;
    label = '1-';
  } else if (percentage >= 85.0) {
    grade = 1.7;
    label = '2+';
  } else if (percentage >= 80.0) {
    grade = 2.0;
    label = '2';
  } else if (percentage >= 75.0) {
    grade = 2.3;
    label = '2-';
  } else if (percentage >= 70.0) {
    grade = 2.7;
    label = '3+';
  } else if (percentage >= 65.0) {
    grade = 3.0;
    label = '3';
  } else if (percentage >= 60.0) {
    grade = 3.3;
    label = '3-';
  } else if (percentage >= 55.0) {
    grade = 3.7;
    label = '4+';
  } else if (percentage >= 50.0) {
    grade = 4.0;
    label = '4';
  } else if (percentage >= 45.0) {
    grade = 4.3;
    label = '4-';
  } else if (percentage >= 40.0) {
    grade = 4.7;
    label = '5+';
  } else if (percentage >= 35.0) {
    grade = 5.0;
    label = '5';
  } else if (percentage >= 20.0) {
    grade = 5.3;
    label = '5-';
  } else {
    grade = 6.0;
    label = '6';
  }
  return { numeric: grade, label };
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
