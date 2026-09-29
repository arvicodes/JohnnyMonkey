/** Gemeinsame Texte & Notentabelle für EPO-Noten-Arbeitsblatt (digital). */

import {
  gradeTableForMaxPoints,
  minPointsThresholdForTotalOnScale,
  pointsOnScaleToGradeTendency,
} from './gradeScale';

export const EPO_NOTEN_CATEGORY_COUNT = 5;
export const EPO_NOTEN_MAX_POINTS = 15;

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

/** Punkte (0–15) → Schulnote (Prozentregel auf 15-Punkte-Skala). */
export const EPO_NOTEN_POINTS_TO_GRADE: { minPoints: number; grade: string }[] =
  gradeTableForMaxPoints(EPO_NOTEN_MAX_POINTS).map((row) => ({
    minPoints: row.minPoints,
    grade: row.grade,
  }));

export function sumCategoryScores(scores: number[] | undefined | null): number {
  if (!Array.isArray(scores)) return 0;
  return scores.reduce((a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0), 0);
}

export function epoWeightsAreValid(weights: number[] | null | undefined): boolean {
  return (
    Array.isArray(weights) &&
    weights.length === EPO_NOTEN_CATEGORY_COUNT &&
    weights.every((w) => Number.isFinite(w) && w > 0) &&
    Math.round(weights.reduce((a, b) => a + b, 0)) === 100
  );
}

/** Gesamtpunkte 0–15; mit Gewichtung aus der Variante, sonst Summe der Raster (0–3 je Zeile). */
export function epoPointsFromScores(
  scores: number[] | undefined | null,
  weightsPercent?: number[] | null,
): number {
  const s = normalizeCategoryScores(scores);
  if (!epoWeightsAreValid(weightsPercent)) {
    return sumCategoryScores(s);
  }
  let total = 0;
  for (let i = 0; i < EPO_NOTEN_CATEGORY_COUNT; i++) {
    const sc = s[i] >= 0 ? s[i] : 0;
    total += (sc / 3) * (weightsPercent![i] / 100) * 15;
  }
  return total;
}

export function epoRoundedPoints(
  scores: number[] | undefined | null,
  weightsPercent?: number[] | null,
): number {
  return Math.max(0, Math.min(15, Math.round(epoPointsFromScores(scores, weightsPercent))));
}

export function formatEpoPointsDisplay(
  scores: number[] | undefined | null,
  weightsPercent?: number[] | null,
): string {
  const raw = epoPointsFromScores(scores, weightsPercent);
  if (epoWeightsAreValid(weightsPercent)) {
    const rounded = Math.round(raw * 10) / 10;
    return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
  }
  return String(Math.round(raw));
}

export function allCategoriesSelected(scores: number[] | undefined | null): boolean {
  if (!Array.isArray(scores) || scores.length < EPO_NOTEN_CATEGORY_COUNT) return false;
  return scores.every((s) => Number.isFinite(s) && s >= 0 && s <= 3);
}

export function emptyCategoryScores(): number[] {
  return Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, () => -1);
}

export function gradeFromTotalPoints(total: number): string {
  return pointsOnScaleToGradeTendency(total, EPO_NOTEN_MAX_POINTS);
}

export function minPointsThresholdForTotal(total: number): number {
  return minPointsThresholdForTotalOnScale(total, EPO_NOTEN_MAX_POINTS);
}

export function normalizeCategoryScores(raw: unknown): number[] {
  const base = Array.isArray(raw) ? raw : [];
  return Array.from({ length: EPO_NOTEN_CATEGORY_COUNT }, (_, i) => {
    const n = Number(base[i]);
    if (!Number.isFinite(n) || n < 0) return -1;
    return Math.min(3, Math.max(0, Math.round(n)));
  });
}

export type EpoNotenSuggestedGradeMode = 'note' | 'mss';
export type EpoNotenAssessmentMode = EpoNotenSuggestedGradeMode;

/** Informatik GK 11 (und gleich benannte Kurse) — immer MSS-Punkte 0–15. */
export function epoGroupUsesMssPoints(groupName: string | undefined | null): boolean {
  if (!groupName?.trim()) return false;
  const n = groupName.trim().toLowerCase();
  if (!n.includes('informatik')) return false;
  return /\bgk\s*11\b/.test(n);
}

export function defaultAssessmentModeForGroup(
  groupName: string | undefined | null,
): EpoNotenAssessmentMode {
  return epoGroupUsesMssPoints(groupName) ? 'mss' : 'note';
}

export function assessmentModeForGroup(
  round: { assessmentModeByGroup?: Record<string, EpoNotenAssessmentMode> } | null | undefined,
  groupId: string,
  groupName?: string | null,
): EpoNotenAssessmentMode {
  if (epoGroupUsesMssPoints(groupName)) return 'mss';
  return round?.assessmentModeByGroup?.[groupId] === 'mss' ? 'mss' : 'note';
}

/** Ergebnis aus Kategorie-Raster — abhängig vom Gruppen-Modus (Note oder MSS-Punkte). */
export function rasterResultFromTotal(mode: EpoNotenAssessmentMode, total: number): string {
  const t = Math.max(0, Math.min(15, Math.round(total)));
  if (mode === 'mss') return String(t);
  return gradeFromTotalPoints(t);
}

/** SuS-Kurzüberblick: eine große Zeile (bei MSS keine doppelte Zahl + „MSS-Pkt.“). */
export function epoSummaryHeadline(
  mode: EpoNotenAssessmentMode,
  gradeOrPoints: string,
  rasterPoints: number,
): string {
  if (mode === 'mss') {
    const n = gradeOrPoints.trim() || String(Math.max(0, Math.min(15, Math.round(rasterPoints))));
    return `${n} MSS-Pkt.`;
  }
  const g = gradeOrPoints.trim();
  return g || rasterResultFromTotal('note', rasterPoints);
}

/** Zweite Zeile nur im Noten-Modus (Punkte im Raster). */
export function epoSummarySubline(mode: EpoNotenAssessmentMode, rasterPoints: number): string | null {
  if (mode === 'mss') return null;
  return `${rasterPoints} Pkt. im Raster`;
}

export function isValidSuggestedGrade(mode: EpoNotenSuggestedGradeMode, value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (mode === 'mss') {
    if (!/^\d{1,2}$/.test(v)) return false;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 15;
  }
  return v.length > 0;
}

export function formatSuggestedGradeDisplay(
  mode: EpoNotenSuggestedGradeMode | undefined,
  value: string | undefined,
): string {
  const v = (value || '').trim();
  if (!v) return '—';
  if (mode === 'mss') return `${v} MSS-Pkt.`;
  return v;
}

/** SuS-Selbsteinschätzung als MSS-Zahl (auch wenn früher als Note gespeichert). */
export function studentSelfMssPoints(
  entry: Pick<EpoNotenEntry, 'suggestedGrade' | 'selfScores' | 'selfGradeFromTable'>,
): number | null {
  const sg = (entry.suggestedGrade || '').trim();
  if (sg && isValidSuggestedGrade('mss', sg)) return Number(sg);
  const tbl = (entry.selfGradeFromTable || '').trim();
  if (/^\d{1,2}$/.test(tbl)) {
    const n = Number(tbl);
    if (Number.isInteger(n) && n >= 0 && n <= 15) return n;
  }
  const scores = normalizeCategoryScores(entry.selfScores);
  if (allCategoriesSelected(scores)) {
    return epoRoundedPoints(scores);
  }
  return null;
}

export function studentSelfAssessmentDisplay(
  entry: Pick<EpoNotenEntry, 'suggestedGrade' | 'selfScores' | 'selfGradeFromTable'>,
  mode: EpoNotenAssessmentMode,
): string {
  if (mode === 'mss') {
    const pts = studentSelfMssPoints(entry);
    return pts != null ? `${pts} MSS-Pkt.` : formatSuggestedGradeDisplay('mss', entry.suggestedGrade);
  }
  return formatSuggestedGradeDisplay('note', entry.suggestedGrade);
}

export function studentSelfSummaryHeadline(
  entry: Pick<EpoNotenEntry, 'suggestedGrade' | 'selfScores' | 'selfGradeFromTable'>,
  mode: EpoNotenAssessmentMode,
): string {
  const selfPts = sumCategoryScores(entry.selfScores);
  if (mode === 'mss') {
    const mss = studentSelfMssPoints(entry);
    const value = mss != null ? String(mss) : entry.selfGradeFromTable || '';
    return epoSummaryHeadline('mss', value, selfPts);
  }
  return epoSummaryHeadline(
    'note',
    entry.selfGradeFromTable || rasterResultFromTotal('note', selfPts),
    selfPts,
  );
}

export function compareEpoStudentListOrder(
  a: EpoNotenEntry,
  b: EpoNotenEntry,
  roundPublished: boolean,
  passiveStudentIds: ReadonlySet<string> | string[],
  liveForStudent?: (entry: EpoNotenEntry) => boolean,
): number {
  const passive = (id: string) => {
    if (Array.isArray(passiveStudentIds)) return passiveStudentIds.includes(id);
    return passiveStudentIds.has(id);
  };
  const pa = passive(a.studentId);
  const pb = passive(b.studentId);
  if (pa !== pb) return pa ? 1 : -1;

  const liveA = liveForStudent ? liveForStudent(a) : roundPublished;
  const liveB = liveForStudent ? liveForStudent(b) : roundPublished;
  const pendA = !pa && Boolean(studentEpoPendingKind(a, liveA));
  const pendB = !pb && Boolean(studentEpoPendingKind(b, liveB));
  if (pendA !== pendB) return pendA ? -1 : 1;

  return a.studentName.localeCompare(b.studentName, 'de');
}

export type EpoNotenEntry = {
  studentId: string;
  studentName: string;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  /** Nur in Lehrer-Detail: Lerngruppe des SuS in dieser Runde */
  groupId?: string;
  suggestedGrade?: string;
  suggestedGradeMode?: EpoNotenSuggestedGradeMode;
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

/** SuS muss noch etwas in einer freigeschalteten Runde erledigen. */
export type StudentEpoPendingKind = 'self' | 'goals';

export function studentEpoPendingKind(
  entry: Pick<EpoNotenEntry, 'studentSubmittedAt' | 'teacherReleasedAt' | 'goalsSubmittedAt'>,
  roundPublished: boolean,
): StudentEpoPendingKind | null {
  if (!roundPublished) return null;
  if (!entry.studentSubmittedAt) return 'self';
  if (entry.teacherReleasedAt && !entry.goalsSubmittedAt) return 'goals';
  return null;
}

export function studentEpoPendingDetail(kind: StudentEpoPendingKind): string {
  return kind === 'self' ? 'Selbsteinschätzung' : 'Ziele';
}

/** Lehrer-Raster noch nicht bewertet (inkl. ältere „alles 0“-Platzhalter). */
export function teacherRasterIsUnset(entry: {
  teacherScores?: number[];
  teacherGrade?: string;
}): boolean {
  const t = normalizeCategoryScores(entry.teacherScores);
  if (t.every((s) => s < 0)) return true;
  if (t.every((s) => s === 0) && !entry.teacherGrade?.trim()) return true;
  return false;
}

export function selfScoresForTeacherDefault(entry: EpoNotenEntry): number[] | null {
  if (!entry.studentSubmittedAt) return null;
  const self = normalizeCategoryScores(entry.selfScores);
  if (!self.some((s) => s >= 0)) return null;
  return self;
}

/** Lehrer-Raster: gespeicherte Werte oder — wenn leer — SuS-Selbsteinschätzung. */
export function teacherFormScoresFromEntry(entry: EpoNotenEntry | undefined): number[] {
  if (!entry) return emptyCategoryScores();
  const fromSelf = selfScoresForTeacherDefault(entry);
  const saved = normalizeCategoryScores(entry.teacherScores);
  if (!teacherRasterIsUnset(entry)) {
    if (saved.every((s) => s === 0) && fromSelf && fromSelf.some((s) => s > 0)) {
      return fromSelf;
    }
    return saved;
  }
  if (fromSelf) return fromSelf;
  return saved;
}

export function shouldPrefillTeacherFromSelf(entry: EpoNotenEntry): boolean {
  const fromSelf = selfScoresForTeacherDefault(entry);
  if (!fromSelf) return false;
  if (teacherRasterIsUnset(entry)) return true;
  const saved = normalizeCategoryScores(entry.teacherScores);
  return saved.every((s) => s === 0) && fromSelf.some((s) => s > 0) && !entry.teacherReleasedAt;
}

export function teacherFormGradeFromEntry(
  entry: EpoNotenEntry | undefined,
  mode: EpoNotenAssessmentMode,
  weightsPercent?: number[] | null,
): string {
  if (!entry) return '';
  if (entry.teacherGrade?.trim()) return entry.teacherGrade.trim();
  if (!entry.studentSubmittedAt) return '';
  const scores = teacherFormScoresFromEntry(entry);
  if (allCategoriesSelected(scores)) {
    return rasterResultFromTotal(mode, epoRoundedPoints(scores, weightsPercent));
  }
  if (entry.suggestedGrade?.trim()) return entry.suggestedGrade.trim();
  if (entry.selfGradeFromTable?.trim()) return entry.selfGradeFromTable.trim();
  return '';
}

export type EpoNotenGroupMeta = {
  publishedAt?: string | null;
  completedAt?: string | null;
};

export type EpoNotenVariantSheet = {
  id: string;
  name: string;
  categoryTitles?: string[];
  categoryWeightsPercent?: number[];
  studentCategories: string[];
  teacherCategories: string[];
};

const usesPerGroupEpoPublish = (round: {
  groupIds: string[];
  groupMeta?: Record<string, EpoNotenGroupMeta>;
}): boolean => {
  const meta = round.groupMeta;
  if (!meta) return false;
  return Object.entries(meta).some(
    ([gid, m]) => round.groupIds.includes(gid) && Boolean(m?.publishedAt),
  );
};

/** SuS/Lehrkraft: Ist dieser Kurs für die Runde freigeschaltet? */
export function isEpoGroupPublished(
  round: {
    publishedAt: string | null;
    groupIds: string[];
    groupMeta?: Record<string, EpoNotenGroupMeta>;
  },
  groupId: string,
): boolean {
  if (!round.groupIds.includes(groupId)) return false;
  const gm = round.groupMeta?.[groupId];
  if (gm?.publishedAt) return true;
  if (usesPerGroupEpoPublish(round)) return false;
  return Boolean(round.publishedAt);
}

export function isEpoGroupCompleted(
  round: { groupMeta?: Record<string, EpoNotenGroupMeta> },
  groupId: string,
): boolean {
  return Boolean(round.groupMeta?.[groupId]?.completedAt);
}

export type EpoNotenRound = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  /** Note vs. MSS-Punkte (0–15) — pro Lerngruppe, legt die Lehrkraft fest */
  assessmentModeByGroup?: Record<string, EpoNotenAssessmentMode>;
  groupMeta?: Record<string, EpoNotenGroupMeta>;
  variantId?: string | null;
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
  /** Note vs. MSS — von der Lehrkraft für diese Gruppe festgelegt */
  assessmentMode?: EpoNotenAssessmentMode;
  publishedAt: string | null;
  /** Aktuell freigeschaltete Runde für diese Gruppe */
  isActive: boolean;
  isArchived: boolean;
  actionRequired: boolean;
  teacherReleased: boolean;
  studentSubmitted: boolean;
  goalsSubmitted: boolean;
  needsSelfAssessment: boolean;
  needsGoals: boolean;
};
