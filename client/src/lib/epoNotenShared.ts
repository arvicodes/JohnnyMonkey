/** Gemeinsame Texte & Notentabelle für EPO-Noten-Arbeitsblatt (digital). */

export const EPO_NOTEN_CATEGORY_COUNT = 5;

export const EPO_NOTEN_STUDENT_CATEGORIES: string[] = [
  'Ich trage häufig mit qualitativ passenden (nicht notwendigerweise richtigen!) Beiträgen zum Unterricht bei.',
  'Ich konzentriere meine Aufmerksamkeit im Unterricht auf das Thema und höre konzentriert, ohne Ablenkungen von/durch Nachbarn, den Beiträgen anderer zu.',
  'In eigenen Arbeitsphasen beginne ich zügig, und arbeite konzentriert und strukturiert bis zum Ende.',
  'Mein Material habe ich dabei, bereit und meine Hausaufgaben sind erledigt und liegen vor. Ich schreib ordentlich mit.',
  'Ich verhalte mich im Unterricht angemessen ruhig, melde mich, wenn ich etwas sagen möchte und spreche nur, wenn ich an der Reihe bin.',
];

export const EPO_NOTEN_TEACHER_CATEGORIES: string[] = [
  'Du trägst häufig mit qualitativ passenden (nicht notwendigerweise richtigen!) Beiträgen zum Unterricht bei.',
  'Du konzentrierst deine Aufmerksamkeit im Unterricht auf das Thema und hörst konzentriert, ohne Ablenkungen von/durch Nachbarn, den Beiträgen anderer zu.',
  'In eigenen Arbeitsphasen beginnst du zügig, und arbeitest konzentriert und strukturiert bis zum Ende.',
  'Dein Material hast du dabei, bereit und deine Hausaufgaben sind erledigt und liegen vor. Du schreibst ordentlich mit.',
  'Du verhältst dich im Unterricht angemessen ruhig, meldest dich, wenn du etwas sagen möchtest und sprichst nur, wenn du an der Reihe bist.',
];

/** Punkte (0–15) → Schulnote (typische EPO-Tabelle, max. 15 Punkte). */
export const EPO_NOTEN_POINTS_TO_GRADE: { minPoints: number; grade: string }[] = [
  { minPoints: 14, grade: '1' },
  { minPoints: 13, grade: '1−' },
  { minPoints: 12, grade: '2+' },
  { minPoints: 11, grade: '2' },
  { minPoints: 10, grade: '2−' },
  { minPoints: 9, grade: '3+' },
  { minPoints: 8, grade: '3' },
  { minPoints: 7, grade: '3−' },
  { minPoints: 6, grade: '4+' },
  { minPoints: 5, grade: '4' },
  { minPoints: 4, grade: '4−' },
  { minPoints: 3, grade: '5+' },
  { minPoints: 0, grade: '5' },
];

export function sumCategoryScores(scores: number[] | undefined | null): number {
  if (!Array.isArray(scores)) return 0;
  return scores.reduce((a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0), 0);
}

export function allCategoriesSelected(scores: number[] | undefined | null): boolean {
  if (!Array.isArray(scores) || scores.length < EPO_NOTEN_CATEGORY_COUNT) return false;
  return scores.every((s) => Number.isFinite(s) && s >= 0 && s <= 3);
}

export function emptyCategoryScores(): number[] {
  return Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, () => -1);
}

const pointsGradeRowsDesc = () =>
  [...EPO_NOTEN_POINTS_TO_GRADE].sort((a, b) => b.minPoints - a.minPoints);

export function gradeFromTotalPoints(total: number): string {
  const t = Math.max(0, Math.min(15, Math.round(total)));
  for (const row of pointsGradeRowsDesc()) {
    if (t >= row.minPoints) return row.grade;
  }
  return '5';
}

export function minPointsThresholdForTotal(total: number): number {
  const t = Math.max(0, Math.min(15, Math.round(total)));
  for (const row of pointsGradeRowsDesc()) {
    if (t >= row.minPoints) return row.minPoints;
  }
  return 0;
}

export function normalizeCategoryScores(raw: unknown): number[] {
  const base = Array.isArray(raw) ? raw : [];
  return Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, (_, i) => {
    const n = Number(base[i]);
    if (!Number.isFinite(n) || n < 0) return -1;
    return Math.min(3, Math.max(0, Math.round(n)));
  });
}

export type EpoNotenEntry = {
  studentId: string;
  studentName: string;
  suggestedGrade?: string;
  justification?: string;
  selfScores?: number[];
  selfGradeFromTable?: string;
  studentSubmittedAt?: string | null;
  teacherScores?: number[];
  teacherGrade?: string;
  teacherReleasedAt?: string | null;
  goal?: string;
  goalAction?: string;
  goalsSubmittedAt?: string | null;
};

export type EpoNotenRound = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries: EpoNotenEntry[];
};

export type EpoNotenStudentSession = {
  id: string;
  title: string;
  date: string;
  groupId: string;
  groupName: string;
  publishedAt: string | null;
  teacherReleased: boolean;
  studentSubmitted: boolean;
  goalsSubmitted: boolean;
  needsSelfAssessment: boolean;
  needsGoals: boolean;
};
