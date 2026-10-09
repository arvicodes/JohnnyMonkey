/** Gemeinsame Texte & Notentabelle für EPO-Noten-Arbeitsblatt (digital). */

import {
  gradeTableForMaxPoints,
  minPointsThresholdForTotalOnScale,
  pointsOnScaleToGradeTendency,
} from './gradeScale';
import { EPO_NO_VARIANT_ID, EPO_VARIANT2_ID } from './epoNotenVariantPresets';

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

/** Klassen 5a / 5c — Standard ist Note (umschaltbar). */
export function epoGroupUsesNoteByDefault(groupName: string | undefined | null): boolean {
  if (!groupName?.trim()) return false;
  const n = groupName.trim().toLowerCase();
  return /\b5a\b/.test(n) || /\b5c\b/.test(n);
}

/** Informatik, Stammkurs u. ä. — immer MSS-Punkte 0–15 (nicht umschaltbar). */
export function epoGroupUsesMssPoints(groupName: string | undefined | null): boolean {
  if (!groupName?.trim()) return false;
  if (epoGroupUsesNoteByDefault(groupName)) return false;
  const n = groupName.trim().toLowerCase();
  if (n.includes('stammkurs')) return true;
  if (n.includes('informatik')) return true;
  return false;
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
  usesRasterForStudent?: (entry: EpoNotenEntry) => boolean,
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
  const rasterA = usesRasterForStudent ? usesRasterForStudent(a) : true;
  const rasterB = usesRasterForStudent ? usesRasterForStudent(b) : true;
  const pendA =
    !pa && liveA && Boolean(studentEpoPendingKind(a, liveA, { usesRaster: rasterA }));
  const pendB =
    !pb && liveB && Boolean(studentEpoPendingKind(b, liveB, { usesRaster: rasterB }));
  const fertA = !pa && liveA && !pendA;
  const fertB = !pb && liveB && !pendB;
  if (fertA !== fertB) return fertA ? -1 : 1;
  if (pendA !== pendB) return pendA ? -1 : 1;

  return a.studentName.localeCompare(b.studentName, 'de');
}

export type EpoNotenEntry = {
  studentId: string;
  /** Lerngruppe (Speicherung pro Runde; im Lehrer-Detail) */
  groupId?: string;
  studentName: string;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  /** Lehrkraft: keine Selbsteinschätzung — nur Lehrer-Raster */
  withoutSelfAssessment?: boolean;
  /** Lehrkraft: nur Note/Punkte + Begründung, kein Raster */
  teacherGradeOnly?: boolean;
  teacherJustification?: string;
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
  /** Lehrkraft: SuS muss keine Ziele eintragen */
  goalsWaived?: boolean;
  /** SuS-Raster bei Selbsteinschätzung (false = nur Note/Text) */
  selfUsesRaster?: boolean;
};

/** SuS muss noch etwas in einer freigeschalteten Runde erledigen. */
export type StudentEpoPendingKind = 'self' | 'goals';

export function studentEpoPendingKind(
  entry: Pick<
    EpoNotenEntry,
    | 'studentSubmittedAt'
    | 'teacherReleasedAt'
    | 'goalsSubmittedAt'
    | 'withoutSelfAssessment'
    | 'teacherGradeOnly'
    | 'goalsWaived'
  >,
  roundPublished: boolean,
  options?: { usesRaster?: boolean; goalsWaived?: boolean },
): StudentEpoPendingKind | null {
  if (!roundPublished) return null;
  const usesRaster = options?.usesRaster !== false;
  const goalsWaived = options?.goalsWaived ?? Boolean(entry.goalsWaived);
  if (
    usesRaster &&
    !entry.studentSubmittedAt &&
    !entry.withoutSelfAssessment &&
    !entry.teacherGradeOnly
  ) {
    return 'self';
  }
  if (entry.teacherReleasedAt && !entry.goalsSubmittedAt && !goalsWaived) return 'goals';
  return null;
}

export type EpoGroupWorkflow = 'standard' | 'teacher_raster' | 'self_no_raster' | 'teacher_only';

export function epoGroupWorkflow(
  round: { groupMeta?: Record<string, EpoNotenGroupMeta> },
  groupId: string,
): EpoGroupWorkflow {
  const w = round.groupMeta?.[groupId]?.workflow;
  if (w === 'teacher_raster' || w === 'self_no_raster' || w === 'teacher_only') return w;
  if (round.groupMeta?.[groupId]?.selfAssessmentOnly) return 'self_no_raster';
  return 'standard';
}

export function epoEffectiveVariantIdForGroup(
  round: { variantId?: string | null; variantIdByGroup?: Record<string, string> },
  groupId: string,
): string | null {
  const per = round.variantIdByGroup?.[groupId];
  if (per === EPO_NO_VARIANT_ID || per === '') return null;
  if (per && String(per).trim()) return String(per).trim();
  const roundDefault = round.variantId?.trim();
  if (roundDefault === EPO_NO_VARIANT_ID) return null;
  if (roundDefault && roundDefault !== 'default') return roundDefault;
  return EPO_VARIANT2_ID;
}

/** SuS: Raster im Selbst-Wizard (nicht Vorgabe-Note allein). */
/** SuS: Lehrer-Raster nach Freigabe anzeigen (auch „Nur Lehrerraster“ / oS). */
export function epoStudentShowsTeacherRasterDetail(
  usesRaster: boolean,
  entry: Pick<EpoNotenEntry, 'teacherReleasedAt' | 'teacherGradeOnly'> | null | undefined,
): boolean {
  if (!usesRaster || !entry) return false;
  if (entry.teacherGradeOnly) return false;
  return Boolean(entry.teacherReleasedAt);
}

export function epoStudentUsesSelfRaster(
  round: {
    variantId?: string | null;
    variantIdByGroup?: Record<string, string>;
    groupMeta?: Record<string, EpoNotenGroupMeta>;
  },
  groupId: string,
  entry?: Pick<EpoNotenEntry, 'withoutSelfAssessment' | 'teacherGradeOnly' | 'selfUsesRaster'> | null,
): boolean {
  if (entry?.withoutSelfAssessment || entry?.teacherGradeOnly) return false;
  if (entry?.selfUsesRaster === false) return false;
  if (!epoGroupUsesRaster(round, groupId)) return false;
  const m = round.groupMeta?.[groupId];
  if (m?.selfAssessmentEnabled === false) return false;
  if (entry?.selfUsesRaster === true) return true;
  const workflow = epoGroupWorkflow(round, groupId);
  if (workflow === 'self_no_raster' || workflow === 'teacher_only') return false;
  if (m?.teacherRasterEnabled === false) return false;
  return true;
}

/** Lehrkraft: Bewertungsraster anzeigen. */
export function epoTeacherUsesRaster(
  round: {
    variantId?: string | null;
    variantIdByGroup?: Record<string, string>;
    groupMeta?: Record<string, EpoNotenGroupMeta>;
  },
  groupId: string,
): boolean {
  const m = round.groupMeta?.[groupId];
  if (m?.teacherRasterEnabled === false) return false;
  if (m?.selfAssessmentEnabled === false && m?.teacherRasterEnabled !== true) return false;
  if (epoGroupWorkflow(round, groupId) === 'teacher_only') return false;
  return epoGroupUsesRaster(round, groupId);
}

export function epoGroupUsesRaster(
  round: {
    variantId?: string | null;
    variantIdByGroup?: Record<string, string>;
    groupMeta?: Record<string, EpoNotenGroupMeta>;
  },
  groupId: string,
): boolean {
  const m = round.groupMeta?.[groupId];
  if (m?.teacherRasterEnabled === false && m?.selfAssessmentEnabled !== true) return false;
  if (m?.teacherRasterEnabled === false && m?.selfAssessmentEnabled === false) return false;
  return epoEffectiveVariantIdForGroup(round, groupId) !== null;
}

export function epoGroupSelfAssessmentOnly(
  round: { groupMeta?: Record<string, EpoNotenGroupMeta> },
  groupId: string,
): boolean {
  return epoGroupWorkflow(round, groupId) === 'self_no_raster';
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

/** SuS hat eine Selbsteinschätzung abgegeben (nicht oS / nur Note). */
/** SuS: Selbsteinschätzungsformular bearbeitbar (unabhängig von versehentlicher Lehrer-Freigabe). */
export function epoStudentSelfFormEditable(
  entry: Pick<
    EpoNotenEntry,
    'studentSubmittedAt' | 'withoutSelfAssessment' | 'teacherGradeOnly' | 'teacherReleasedAt'
  > | null | undefined,
  noteOnlyFlow: boolean,
  canEditSelfFromApi: boolean,
): boolean {
  if (canEditSelfFromApi) return true;
  if (noteOnlyFlow || !entry) return false;
  if (entry.studentSubmittedAt) return false;
  if (entry.withoutSelfAssessment || entry.teacherGradeOnly) return false;
  return true;
}

export function studentHasSubmittedSelfAssessment(
  entry: Pick<EpoNotenEntry, 'studentSubmittedAt' | 'withoutSelfAssessment' | 'teacherGradeOnly'>,
): boolean {
  return (
    Boolean(entry.studentSubmittedAt) &&
    !entry.withoutSelfAssessment &&
    !entry.teacherGradeOnly
  );
}

export function selfScoresForTeacherDefault(entry: EpoNotenEntry): number[] | null {
  if (!entry.studentSubmittedAt) return null;
  const self = normalizeCategoryScores(entry.selfScores);
  if (!self.some((s) => s >= 0)) return null;
  return self;
}

/** Lehrer-Raster: gespeicherte Werte oder — wenn leer — SuS-Selbsteinschätzung. */
export function teacherFormScoresFromEntry(
  entry: EpoNotenEntry | undefined,
  usesTeacherRaster = true,
): number[] {
  if (!usesTeacherRaster) return emptyCategoryScores();
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
  usesTeacherRaster = true,
): string {
  if (!entry) return '';
  if (!usesTeacherRaster) {
    return entry.teacherGrade?.trim() ?? '';
  }
  if (entry.teacherGrade?.trim()) return entry.teacherGrade.trim();
  if (entry.teacherGradeOnly) return '';
  const scores = teacherFormScoresFromEntry(entry, true);
  if (allCategoriesSelected(scores)) {
    return rasterResultFromTotal(mode, epoRoundedPoints(scores, weightsPercent));
  }
  if (!entry.studentSubmittedAt && !entry.withoutSelfAssessment && !entry.teacherGradeOnly) return '';
  if (entry.suggestedGrade?.trim()) return entry.suggestedGrade.trim();
  if (entry.selfGradeFromTable?.trim()) return entry.selfGradeFromTable.trim();
  return '';
}

export type EpoNotenGroupMeta = {
  publishedAt?: string | null;
  completedAt?: string | null;
  schemaIntegratedAt?: string | null;
  selfAssessmentEnabled?: boolean;
  teacherRasterEnabled?: boolean;
  goalsEnabled?: boolean;
  /** @deprecated — nutze workflow: self_no_raster */
  selfAssessmentOnly?: boolean;
  workflow?: EpoGroupWorkflow;
};

/** Wert für das Varianten-Dropdown (inkl. „Kein Zettel“). */
export function epoVariantIdForGroup(
  round: { variantId?: string | null; variantIdByGroup?: Record<string, string> },
  groupId: string,
): string {
  return epoEffectiveVariantIdForGroup(round, groupId) ?? EPO_NO_VARIANT_ID;
}

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

/** Alle Lerngruppen der Runde auf „fertig“ gesetzt. */
export function isEpoRoundCompleted(round: {
  groupIds: string[];
  groupMeta?: Record<string, EpoNotenGroupMeta>;
}): boolean {
  if (!round.groupIds.length) return false;
  return round.groupIds.every((gid) => isEpoGroupCompleted(round, gid));
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
  variantIdByGroup?: Record<string, string>;
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
