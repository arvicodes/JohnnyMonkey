import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findUserByLoginCode } from '../utils/loginCodeCrypto';
import { stripMiddleNames } from '../utils/webUntisStudentList';
import {
  EPO_VARIANTS_PATH,
  createVariantFromBase,
  normalizeVariantSheet,
  parseVariantsStore,
  DEFAULT_EPO_VARIANT_ID,
  effectiveEpoVariantIdForGroup,
  resolveVariant,
  type EpoNotenVariantsStore,
} from '../lib/epoNotenVariants';
import { EPO_NO_VARIANT_ID, EPO_VARIANT2_ID, EPO_VARIANT2_WEIGHTED_PRESET } from '../lib/epoNotenVariantPresets';
import { epoRoundedPoints } from '../lib/epoNotenScoring';
import { pointsOnScaleToGradeTendency } from '../lib/gradeScale';
import { integrateReleasedEpoRoundIntoGradingSchema } from '../lib/epoNotenGradingSchemaIntegrate';

const prisma = new PrismaClient();

const INDEX_PATH = '__epo_noten_index__';
const roundDataPath = (roundId: string) => `__epo_noten_e_${roundId}__`;
const groupActivePath = (groupId: string) => `__epo_noten_g_${groupId}__`;

const CATEGORY_COUNT = 5;

const EPO_NOTEN_MAX_POINTS = 15;

const gradeFromTotalPoints = (total: number): string =>
  pointsOnScaleToGradeTendency(total, EPO_NOTEN_MAX_POINTS);

/** Wie Client: -1 = noch nicht gewählt, 0–3 = gewählt */
const normalizeCategoryScores = (raw: unknown): number[] => {
  const base = Array.isArray(raw) ? raw : [];
  return Array.from({ length: CATEGORY_COUNT }, (_, i) => {
    const n = Number(base[i]);
    if (!Number.isFinite(n) || n < 0) return -1;
    return Math.min(3, Math.max(0, Math.round(n)));
  });
};

const sumCategoryScores = (scores: number[]) =>
  scores.reduce((a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0), 0);

const allCategoriesSelected = (scores: number[]) =>
  normalizeCategoryScores(scores).every((s) => s >= 0);

const rasterResultFromTotal = (mode: AssessmentMode, total: number): string => {
  const t = Math.max(0, Math.min(15, Math.round(total)));
  if (mode === 'mss') return String(t);
  return gradeFromTotalPoints(t);
};

type EpoNotenEntry = {
  studentId: string;
  /** Lerngruppe innerhalb der Runde (getrennte Einträge pro Kurs) */
  groupId?: string;
  studentName: string;
  /** Nur in API-Antworten (aus User), nicht in gespeicherten Round-Entries */
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  suggestedGrade?: string;
  suggestedGradeMode?: 'note' | 'mss';
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
  /** Lehrkraft: SuS liefert keine Selbsteinschätzung (nur Lehrer-Raster) */
  withoutSelfAssessment?: boolean;
  /** Lehrkraft: nur Note/Punkte + Begründung */
  teacherGradeOnly?: boolean;
  teacherJustification?: string;
  selfUsesRaster?: boolean;
};

type AssessmentMode = 'note' | 'mss';

type EpoGroupWorkflow = 'standard' | 'teacher_raster' | 'self_no_raster' | 'teacher_only';

type EpoNotenGroupMeta = {
  publishedAt?: string | null;
  completedAt?: string | null;
  schemaIntegratedAt?: string | null;
  selfAssessmentEnabled?: boolean;
  teacherRasterEnabled?: boolean;
  goalsEnabled?: boolean;
  selfAssessmentOnly?: boolean;
  workflow?: EpoGroupWorkflow;
};

const groupWorkflow = (payload: EpoNotenRoundPayload, groupId: string): EpoGroupWorkflow => {
  const w = payload.groupMeta?.[groupId]?.workflow;
  if (w === 'teacher_raster' || w === 'self_no_raster' || w === 'teacher_only') return w;
  if (payload.groupMeta?.[groupId]?.selfAssessmentOnly) return 'self_no_raster';
  return 'standard';
};

const groupSelfAssessmentOnly = (payload: EpoNotenRoundPayload, groupId: string): boolean =>
  groupWorkflow(payload, groupId) === 'self_no_raster';

const groupTeacherUsesRaster = (payload: EpoNotenRoundPayload, groupId: string): boolean => {
  const m = payload.groupMeta?.[groupId];
  if (m?.teacherRasterEnabled === false) return false;
  if (m?.selfAssessmentEnabled === false && m?.teacherRasterEnabled !== true) return false;
  if (groupWorkflow(payload, groupId) === 'teacher_only') return false;
  const variantId = payload.variantIdByGroup?.[groupId] ?? payload.variantId;
  return variantId != null && variantId !== EPO_NO_VARIANT_ID;
};

const effectiveTeacherGrade = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  entry: EpoNotenEntry,
  mode: AssessmentMode,
  weightsPercent?: number[] | null,
): string => {
  const trimmed = entry.teacherGrade?.trim();
  if (trimmed) return trimmed;
  if (!groupTeacherUsesRaster(payload, groupId)) return '';
  const scores = normalizeCategoryScores(entry.teacherScores);
  if (!allCategoriesSelected(scores)) return '';
  return rasterResultFromTotal(mode, epoRoundedPoints(scores, weightsPercent));
};

type PriorEpoGradeDto = {
  roundTitle: string;
  roundDate: string;
  grade: string;
  assessmentMode: AssessmentMode;
};

const priorEpoGradesForGroup = async (
  teacherId: string,
  currentRoundId: string,
  groupId: string,
  groups: { id: string; name: string; students: { id: string }[] }[],
): Promise<Record<string, PriorEpoGradeDto[]>> => {
  const index = await loadTeacherIndex(teacherId);
  const chron = [...index.rounds]
    .filter((r) => r.groupIds.includes(groupId))
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.createdAt.localeCompare(b.createdAt);
    });
  const curIdx = chron.findIndex((r) => r.id === currentRoundId);
  if (curIdx <= 0) return {};

  const groupName = groups.find((g) => g.id === groupId)?.name;
  const out: Record<string, PriorEpoGradeDto[]> = {};

  for (const meta of chron.slice(0, curIdx)) {
    const payload = await loadRound(teacherId, meta.id);
    if (!payload) continue;
    const variantCats = await roundCategoryTexts(teacherId, payload, groupId);
    const mode = assessmentModeForGroup(payload, groupId, groupName);
    const group = groups.find((g) => g.id === groupId);
    if (!group) continue;
    for (const s of group.students) {
      const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
      const entry = findEntry(payload, s.id, groupId, gidsInRound);
      if (!entry) continue;
      const grade = effectiveTeacherGrade(payload, groupId, entry, mode, variantCats.categoryWeightsPercent);
      if (!grade.trim()) continue;
      const list = out[s.id] ?? [];
      list.push({
        roundTitle: payload.title,
        roundDate: payload.date,
        grade,
        assessmentMode: mode,
      });
      out[s.id] = list;
    }
  }
  return out;
};

const entryRequiresStudentSelf = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  entry: EpoNotenEntry | null,
): boolean => {
  if (entry?.withoutSelfAssessment || entry?.teacherGradeOnly) return false;
  const gm = payload.groupMeta?.[groupId];
  if (gm?.selfAssessmentEnabled === false) return false;
  if (groupWorkflow(payload, groupId) === 'teacher_only') return false;
  return true;
};

const entryStudentUsesSelfRaster = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  entry: EpoNotenEntry | null,
  useRaster: boolean,
): boolean => {
  if (!entryRequiresStudentSelf(payload, groupId, entry)) return false;
  if (!useRaster) return false;
  if (entry?.selfUsesRaster === false) return false;
  if (entry?.selfUsesRaster === true) return true;
  const gm = payload.groupMeta?.[groupId];
  const wf = groupWorkflow(payload, groupId);
  if (wf === 'self_no_raster' || wf === 'teacher_only') return false;
  if (gm?.teacherRasterEnabled === false) return false;
  return true;
};

type EpoJaFlags = { self: boolean; raster: boolean; goals: boolean };

const applyGroupEpoFeaturesToStudents = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  flags: EpoJaFlags,
  groups: { id: string; students: { id: string; name: string }[] }[],
) => {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (!payload.variantIdByGroup || typeof payload.variantIdByGroup !== 'object') {
    payload.variantIdByGroup = {};
  }
  if (!flags.self && !flags.raster) {
    payload.variantIdByGroup[groupId] = EPO_NO_VARIANT_ID;
  } else if (flags.raster) {
    const cur = payload.variantIdByGroup[groupId];
    if (!cur || cur === EPO_NO_VARIANT_ID) {
      payload.variantIdByGroup[groupId] = EPO_VARIANT2_ID;
    }
  } else {
    payload.variantIdByGroup[groupId] = EPO_NO_VARIANT_ID;
  }
  const fields = {
    withoutSelfAssessment: !flags.self,
    teacherGradeOnly: !flags.self && !flags.raster,
    goalsWaived: !flags.goals,
    selfUsesRaster: flags.self && flags.raster ? true : flags.self && !flags.raster ? false : undefined,
  };
  for (const s of group.students) {
    const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
    const existing = findEntry(payload, s.id, groupId, gidsInRound);
    if (existing?.goalsSubmittedAt) continue;
    const keepRasterScores = flags.raster || Boolean(existing?.teacherReleasedAt);
    const entry: EpoNotenEntry = {
      studentId: s.id,
      groupId,
      studentName: stripMiddleNames(s.name),
      suggestedGrade: existing?.suggestedGrade,
      suggestedGradeMode: existing?.suggestedGradeMode,
      justification: existing?.justification,
      selfScores: existing?.selfScores,
      selfGradeFromTable: existing?.selfGradeFromTable,
      studentSubmittedAt: existing?.studentSubmittedAt ?? null,
      teacherScores: keepRasterScores ? existing?.teacherScores : undefined,
      teacherGrade: existing?.teacherGrade ?? '',
      teacherReleasedAt: existing?.teacherReleasedAt ?? null,
      goal: existing?.goal,
      goalAction: existing?.goalAction,
      goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
      teacherJustification: existing?.teacherJustification,
      ...fields,
    };
    upsertEntry(payload, entry);
  }
};

const applyGroupWorkflowToStudents = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  workflow: EpoGroupWorkflow,
  groups: { id: string; students: { id: string; name: string }[] }[],
) => {
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (!payload.variantIdByGroup || typeof payload.variantIdByGroup !== 'object') {
    payload.variantIdByGroup = {};
  }
  if (workflow === 'teacher_only') {
    payload.variantIdByGroup[groupId] = EPO_NO_VARIANT_ID;
  } else {
    const cur = payload.variantIdByGroup[groupId];
    if (!cur || cur === EPO_NO_VARIANT_ID) {
      payload.variantIdByGroup[groupId] = EPO_VARIANT2_ID;
    }
  }
  for (const s of group.students) {
    const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
    const existing = findEntry(payload, s.id, groupId, gidsInRound);
    if (existing?.goalsSubmittedAt) continue;
    const entry: EpoNotenEntry = {
      studentId: s.id,
      groupId,
      studentName: stripMiddleNames(s.name),
      suggestedGrade: existing?.suggestedGrade,
      suggestedGradeMode: existing?.suggestedGradeMode,
      justification: existing?.justification,
      selfScores: existing?.selfScores,
      selfGradeFromTable: existing?.selfGradeFromTable,
      studentSubmittedAt: existing?.studentSubmittedAt ?? null,
      teacherScores: existing?.teacherScores,
      teacherGrade: existing?.teacherGrade,
      teacherReleasedAt: existing?.teacherReleasedAt ?? null,
      goal: existing?.goal,
      goalAction: existing?.goalAction,
      goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
      withoutSelfAssessment: workflow === 'teacher_raster',
      teacherGradeOnly: workflow === 'teacher_only',
      goalsWaived: workflow === 'self_no_raster' || workflow === 'teacher_only',
      teacherJustification: existing?.teacherJustification,
    };
    if (workflow === 'standard') {
      entry.withoutSelfAssessment = false;
      entry.teacherGradeOnly = false;
      entry.goalsWaived = Boolean(existing?.goalsWaived);
    }
    upsertEntry(payload, entry);
  }
};

const entryGoalsWaived = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  entry: EpoNotenEntry | null | undefined,
): boolean =>
  Boolean(entry?.goalsWaived) ||
  groupSelfAssessmentOnly(payload, groupId) ||
  payload.groupMeta?.[groupId]?.goalsEnabled === false;

type EpoNotenRoundPayload = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  assessmentModeByGroup?: Record<string, AssessmentMode>;
  /** Pro Lerngruppe: Freigabe und „Kurs fertig“ (Lehrkraft) */
  groupMeta?: Record<string, EpoNotenGroupMeta>;
  /** Variantenzettel (Kategorietexte) — Fallback wenn pro Gruppe nichts gesetzt */
  variantId?: string | null;
  variantIdByGroup?: Record<string, string>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries: EpoNotenEntry[];
};

const usesPerGroupPublish = (payload: EpoNotenRoundPayload): boolean => {
  const meta = payload.groupMeta;
  if (!meta || typeof meta !== 'object') return false;
  return Object.entries(meta).some(
    ([gid, m]) => payload.groupIds.includes(gid) && Boolean(m?.publishedAt),
  );
};

const isGroupPublishedForStudents = (payload: EpoNotenRoundPayload, groupId: string): boolean => {
  if (!payload.groupIds.includes(groupId)) return false;
  const gm = payload.groupMeta?.[groupId];
  if (gm?.publishedAt) return true;
  if (usesPerGroupPublish(payload)) return false;
  return Boolean(payload.publishedAt);
};

const ensureGroupMeta = (payload: EpoNotenRoundPayload): Record<string, EpoNotenGroupMeta> => {
  if (!payload.groupMeta || typeof payload.groupMeta !== 'object') payload.groupMeta = {};
  return payload.groupMeta;
};

const markGroupsPublished = (payload: EpoNotenRoundPayload, groupIds: string[], publishedAt: string) => {
  const meta = ensureGroupMeta(payload);
  for (const gid of groupIds) {
    meta[gid] = { ...meta[gid], publishedAt };
  }
};

const clearAllGroupPublishMeta = (payload: EpoNotenRoundPayload) => {
  const meta = ensureGroupMeta(payload);
  for (const gid of payload.groupIds) {
    if (meta[gid]) meta[gid] = { ...meta[gid], publishedAt: null };
  }
};

const normalizeAssessmentModes = (
  payload: EpoNotenRoundPayload,
  groupNamesById?: Map<string, string>,
): Record<string, AssessmentMode> => {
  const raw = payload.assessmentModeByGroup && typeof payload.assessmentModeByGroup === 'object'
    ? payload.assessmentModeByGroup
    : {};
  const modes: Record<string, AssessmentMode> = {};
  for (const gid of payload.groupIds) {
    const gName = groupNamesById?.get(gid);
    if (epoGroupUsesMssPoints(gName)) {
      modes[gid] = 'mss';
      continue;
    }
    modes[gid] = raw[gid] === 'mss' ? 'mss' : 'note';
  }
  return modes;
};

const assessmentModeForGroup = (
  payload: EpoNotenRoundPayload,
  groupId: string,
  groupName?: string | null,
): AssessmentMode => {
  if (epoGroupUsesMssPoints(groupName)) return 'mss';
  return normalizeAssessmentModes(payload)[groupId] === 'mss' ? 'mss' : 'note';
};

type EpoNotenIndexPayload = {
  version: 1;
  rounds: Array<{
    id: string;
    title: string;
    date: string;
    groupIds: string[];
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  activeByGroup: Record<string, string>;
};

type GroupActiveRef = {
  roundId: string;
  title: string;
  date: string;
  publishedAt: string;
};

const emptyIndex = (): EpoNotenIndexPayload => ({
  version: 1,
  rounds: [],
  activeByGroup: {},
});

const parseIndex = (raw: string | null | undefined): EpoNotenIndexPayload => {
  if (!raw) return emptyIndex();
  try {
    const parsed = JSON.parse(raw) as EpoNotenIndexPayload;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.rounds)) return emptyIndex();
    if (!parsed.activeByGroup || typeof parsed.activeByGroup !== 'object') parsed.activeByGroup = {};
    return parsed;
  } catch {
    return emptyIndex();
  }
};

const parseRound = (raw: string | null | undefined): EpoNotenRoundPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EpoNotenRoundPayload;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.title !== 'string') return null;
    if (!Array.isArray(parsed.entries)) parsed.entries = [];
    if (!Array.isArray(parsed.groupIds)) parsed.groupIds = [];
    if (!parsed.groupMeta || typeof parsed.groupMeta !== 'object') parsed.groupMeta = {};
    if (parsed.variantId != null && typeof parsed.variantId !== 'string') parsed.variantId = null;
    if (!parsed.variantIdByGroup || typeof parsed.variantIdByGroup !== 'object') parsed.variantIdByGroup = {};
    parsed.assessmentModeByGroup = normalizeAssessmentModes(parsed);
    return parsed;
  } catch {
    return null;
  }
};

const parseGroupRef = (raw: string | null | undefined): GroupActiveRef | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GroupActiveRef;
    if (!parsed?.roundId || !parsed.publishedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const getUserByLoginCode = async (req: Request) => {
  const raw = req.headers['x-login-code'] as string | undefined;
  if (!String(raw ?? '').trim()) return null;
  return findUserByLoginCode(prisma, raw);
};

const readRow = async (teacherId: string, lessonPath: string) => {
  const row = await prisma.teacherLessonInstruction.findUnique({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
    select: { content: true },
  });
  return row?.content ?? null;
};

const writeRow = async (teacherId: string, lessonPath: string, content: string) => {
  await prisma.teacherLessonInstruction.upsert({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
    create: { teacherId, lessonPath, content },
    update: { content },
  });
};

const deleteRow = async (teacherId: string, lessonPath: string) => {
  await prisma.teacherLessonInstruction.deleteMany({
    where: { teacherId, lessonPath },
  });
};

const loadTeacherIndex = async (teacherId: string) => parseIndex(await readRow(teacherId, INDEX_PATH));

const saveIndex = async (teacherId: string, index: EpoNotenIndexPayload) => {
  await writeRow(teacherId, INDEX_PATH, JSON.stringify(index));
};

const loadRound = async (teacherId: string, roundId: string) => {
  const round = parseRound(await readRow(teacherId, roundDataPath(roundId)));
  if (!round) return null;
  const groups = await loadTeacherGroupsWithStudents(teacherId);
  if (normalizeMultiGroupEntries(round, groups)) {
    await saveRound(teacherId, round);
  }
  return round;
};

const saveRound = async (teacherId: string, data: EpoNotenRoundPayload) => {
  data.updatedAt = new Date().toISOString();
  await writeRow(teacherId, roundDataPath(data.id), JSON.stringify(data));
  return data;
};

const loadVariantsStore = async (teacherId: string) =>
  parseVariantsStore(await readRow(teacherId, EPO_VARIANTS_PATH));

const saveVariantsStore = async (teacherId: string, store: EpoNotenVariantsStore) => {
  await writeRow(teacherId, EPO_VARIANTS_PATH, JSON.stringify(store));
};

const roundCategoryTexts = async (
  teacherId: string,
  payload: EpoNotenRoundPayload,
  groupId?: string | null,
) => {
  const effectiveId = effectiveEpoVariantIdForGroup(payload, groupId);
  if (!effectiveId) {
    return {
      variantId: null,
      variantName: null,
      useRaster: false,
      categoryTitles: [] as string[],
      categoryWeightsPercent: undefined as number[] | undefined,
      studentCategories: [] as string[],
      teacherCategories: [] as string[],
    };
  }
  const store = await loadVariantsStore(teacherId);
  const variant = resolveVariant(store, effectiveId);
  return {
    variantId: variant.id,
    variantName: variant.name,
    useRaster: true,
    categoryTitles: variant.categoryTitles,
    categoryWeightsPercent: variant.categoryWeightsPercent,
    studentCategories: variant.studentCategories,
    teacherCategories: variant.teacherCategories,
  };
};

const syncIndexEntry = (index: EpoNotenIndexPayload, data: EpoNotenRoundPayload) => {
  const entry = {
    id: data.id,
    title: data.title,
    date: data.date,
    groupIds: data.groupIds,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  const i = index.rounds.findIndex((r) => r.id === data.id);
  if (i >= 0) index.rounds[i] = entry;
  else index.rounds.push(entry);
  index.rounds.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

const loadTeacherGroupsWithStudents = async (teacherId: string) =>
  prisma.learningGroup.findMany({
    where: { teacherId },
    select: {
      id: true,
      name: true,
      passiveStudentIds: true,
      students: {
        where: { role: 'STUDENT' },
        select: { id: true, name: true, avatarEmoji: true, avatarUrl: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

const parsePassiveStudentIds = (raw: string | null | undefined): string[] => {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id) => String(id)).filter(Boolean);
  } catch {
    return [];
  }
};

const epoGroupUsesNoteByDefault = (groupName: string | undefined | null): boolean => {
  if (!groupName?.trim()) return false;
  const n = groupName.trim().toLowerCase();
  return /\b5a\b/.test(n) || /\b5c\b/.test(n);
};

const epoGroupUsesMssPoints = (groupName: string | undefined | null): boolean => {
  if (!groupName?.trim()) return false;
  if (epoGroupUsesNoteByDefault(groupName)) return false;
  const n = groupName.trim().toLowerCase();
  if (n.includes('stammkurs')) return true;
  if (n.includes('informatik')) return true;
  return false;
};

const defaultAssessmentModeForGroupName = (groupName: string | undefined | null): AssessmentMode =>
  epoGroupUsesMssPoints(groupName) ? 'mss' : 'note';

const syncPublishedGroups = async (
  teacherId: string,
  data: EpoNotenRoundPayload,
  groupIds: string[],
  index: EpoNotenIndexPayload,
  ownedGroupIds: string[],
) => {
  const publishedAt = data.publishedAt || new Date().toISOString();
  const ref: GroupActiveRef = {
    roundId: data.id,
    title: data.title,
    date: data.date,
    publishedAt,
  };
  const refJson = JSON.stringify(ref);

  for (const gid of groupIds) {
    await writeRow(teacherId, groupActivePath(gid), refJson);
    index.activeByGroup[gid] = data.id;
  }

  const ownedSet = new Set(ownedGroupIds);
  for (const gid of ownedGroupIds) {
    if (!ownedSet.has(gid)) continue;
    if (groupIds.includes(gid)) continue;
    if (index.activeByGroup[gid] !== data.id) continue;
    delete index.activeByGroup[gid];
    const scoped = parseGroupRef(await readRow(teacherId, groupActivePath(gid)));
    if (scoped?.roundId === data.id) {
      await deleteRow(teacherId, groupActivePath(gid));
    }
  }
};

const clearPublishedGroups = async (
  teacherId: string,
  roundId: string,
  index: EpoNotenIndexPayload,
  ownedGroupIds: string[],
) => {
  for (const gid of ownedGroupIds) {
    if (index.activeByGroup[gid] !== roundId) continue;
    delete index.activeByGroup[gid];
    const scoped = parseGroupRef(await readRow(teacherId, groupActivePath(gid)));
    if (scoped?.roundId === roundId) {
      await deleteRow(teacherId, groupActivePath(gid));
    }
  }
};

const groupIdsForStudentInRound = (
  round: EpoNotenRoundPayload,
  studentId: string,
  teacherGroups: { id: string; students: { id: string }[] }[],
): string[] =>
  round.groupIds.filter((gid) => {
    const g = teacherGroups.find((x) => x.id === gid);
    return g?.students.some((s) => s.id === studentId);
  });

const findEntry = (
  round: EpoNotenRoundPayload,
  studentId: string,
  groupId: string,
  studentGroupIdsInRound?: string[],
): EpoNotenEntry | null => {
  const scoped = round.entries.find((e) => e.studentId === studentId && e.groupId === groupId);
  if (scoped) return scoped;
  const legacy = round.entries.find((e) => e.studentId === studentId && !e.groupId);
  if (!legacy) return null;
  const gids = studentGroupIdsInRound ?? [];
  const hasScopedForStudent = round.entries.some(
    (e) => e.studentId === studentId && Boolean(e.groupId),
  );
  if (hasScopedForStudent) return null;
  if (gids.length !== 1 || gids[0] !== groupId) return null;
  return legacy;
};

const blankScopedEntryForGroup = (
  studentId: string,
  groupId: string,
  studentName: string,
  flagsFrom?: EpoNotenEntry | null,
): EpoNotenEntry => ({
  studentId,
  groupId,
  studentName,
  studentSubmittedAt: null,
  goalsSubmittedAt: null,
  teacherReleasedAt: null,
  teacherGrade: '',
  withoutSelfAssessment: flagsFrom?.withoutSelfAssessment,
  teacherGradeOnly: flagsFrom?.teacherGradeOnly,
  goalsWaived: flagsFrom?.goalsWaived,
  selfUsesRaster: flagsFrom?.selfUsesRaster,
});

/** Legacy entries without groupId must not be shared across multiple courses in one round. */
const normalizeMultiGroupEntries = (
  round: EpoNotenRoundPayload,
  groups: { id: string; students: { id: string; name: string }[] }[],
): boolean => {
  let changed = false;
  const gidsByStudent = new Map<string, string[]>();

  for (const gid of round.groupIds) {
    const group = groups.find((g) => g.id === gid);
    if (!group) continue;
    for (const s of group.students) {
      const list = gidsByStudent.get(s.id) ?? [];
      if (!list.includes(gid)) list.push(gid);
      gidsByStudent.set(s.id, list);
    }
  }

  for (const [studentId, gids] of gidsByStudent) {
    const ordered = [...gids].sort((a, b) => round.groupIds.indexOf(a) - round.groupIds.indexOf(b));
    const legacy = round.entries.find((e) => e.studentId === studentId && !e.groupId);

    if (legacy) {
      round.entries = round.entries.filter((e) => !(e.studentId === studentId && !e.groupId));
      changed = true;
      const hasScoped = round.entries.some((e) => e.studentId === studentId && e.groupId);
      if (!hasScoped) {
        const primary = ordered[0];
        if (primary) upsertEntry(round, { ...legacy, groupId: primary });
        const flagsSource = { ...legacy, groupId: primary };
        for (const gid of ordered.slice(1)) {
          upsertEntry(round, blankScopedEntryForGroup(studentId, gid, legacy.studentName, flagsSource));
        }
      }
    }

    if (ordered.length <= 1) continue;

    const name =
      round.entries.find((e) => e.studentId === studentId)?.studentName ??
      stripMiddleNames(
        groups.flatMap((g) => g.students).find((s) => s.id === studentId)?.name ?? '',
      );
    const template = round.entries.find((e) => e.studentId === studentId && e.groupId);
    for (const gid of ordered) {
      if (round.entries.some((e) => e.studentId === studentId && e.groupId === gid)) continue;
      upsertEntry(round, blankScopedEntryForGroup(studentId, gid, name, template));
      changed = true;
    }
  }

  return changed;
};

const upsertEntry = (round: EpoNotenRoundPayload, entry: EpoNotenEntry) => {
  const gid = entry.groupId;
  round.entries = round.entries.filter((e) => {
    if (e.studentId !== entry.studentId) return true;
    if (gid) {
      if (e.groupId === gid) return false;
      if (!e.groupId) return false;
      return true;
    }
    return !e.groupId;
  });
  round.entries.push(entry);
};

type ResolvedRound = {
  teacherId: string;
  teacherName: string;
  roundId: string;
  payload: EpoNotenRoundPayload;
  groupId: string;
  groupName: string;
  isActiveForGroup: boolean;
  studentGroupIdsInRound: string[];
};

const resolveStudentRounds = async (studentId: string): Promise<ResolvedRound[]> => {
  const groups = await prisma.learningGroup.findMany({
    where: { students: { some: { id: studentId } } },
    select: {
      id: true,
      name: true,
      teacherId: true,
      teacher: { select: { id: true, name: true } },
    },
  });
  if (groups.length === 0) return [];

  const results: ResolvedRound[] = [];
  const seen = new Set<string>();

  const byTeacher = new Map<string, typeof groups>();
  for (const g of groups) {
    const list = byTeacher.get(g.teacherId) ?? [];
    list.push(g);
    byTeacher.set(g.teacherId, list);
  }

  for (const [teacherId, teacherGroups] of byTeacher) {
    const index = await loadTeacherIndex(teacherId);

    for (const meta of index.rounds) {
      const payload = await loadRound(teacherId, meta.id);
      if (!payload) continue;

      const studentGidsInRound = teacherGroups
        .filter((tg) => payload.groupIds.includes(tg.id))
        .map((tg) => tg.id);

      for (const g of teacherGroups) {
        if (!payload.groupIds.includes(g.id)) continue;

        const entry = findEntry(payload, studentId, g.id, studentGidsInRound);
        const hasHistory =
          Boolean(entry?.studentSubmittedAt) ||
          Boolean(entry?.teacherReleasedAt) ||
          Boolean(entry?.goalsSubmittedAt);
        const publishedForGroup = isGroupPublishedForStudents(payload, g.id);

        if (!publishedForGroup && !hasHistory) continue;

        const key = `${meta.id}:${g.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const groupCompleted = Boolean(payload.groupMeta?.[g.id]?.completedAt);
        const isActiveForGroup =
          isGroupPublishedForStudents(payload, g.id) &&
          index.activeByGroup[g.id] === meta.id &&
          !groupCompleted;

        results.push({
          teacherId,
          teacherName: g.teacher.name,
          roundId: meta.id,
          payload,
          groupId: g.id,
          groupName: g.name,
          isActiveForGroup,
          studentGroupIdsInRound: studentGidsInRound,
        });
      }
    }
  }

  results.sort((a, b) => (a.payload.updatedAt < b.payload.updatedAt ? 1 : -1));
  return results;
};

const roundStats = (round: EpoNotenRoundPayload) => {
  let submitted = 0;
  let graded = 0;
  let released = 0;
  let goals = 0;
  for (const e of round.entries) {
    if (e.studentSubmittedAt) submitted += 1;
    if (e.teacherGrade) graded += 1;
    if (e.teacherReleasedAt) released += 1;
    if (e.goalsSubmittedAt) goals += 1;
  }
  return { submitted, graded, released, goals };
};

const studentSessionDto = (
  resolved: ResolvedRound,
  studentId: string,
  studentGroupIdsInRound: string[],
) => {
  const entry = findEntry(
    resolved.payload,
    studentId,
    resolved.groupId,
    studentGroupIdsInRound,
  );
  const published = isGroupPublishedForStudents(resolved.payload, resolved.groupId);
  const isActive = resolved.isActiveForGroup;
  const teacherReleased = Boolean(entry?.teacherReleasedAt);
  const studentSubmitted = Boolean(entry?.studentSubmittedAt);
  const goalsSubmitted = Boolean(entry?.goalsSubmittedAt);
  const usesRaster = effectiveEpoVariantIdForGroup(resolved.payload, resolved.groupId) !== null;
  const goalsWaived = entryGoalsWaived(resolved.payload, resolved.groupId, entry);
  const noteOnlyFlow = Boolean(entry?.teacherGradeOnly || !usesRaster);
  const selfPartDone =
    Boolean(entry?.teacherGradeOnly) ||
    Boolean(entry?.withoutSelfAssessment) ||
    !usesRaster ||
    studentSubmitted;
  const goalsPartDone = noteOnlyFlow || goalsWaived || goalsSubmitted;
  const workflowComplete = teacherReleased && selfPartDone && goalsPartDone;
  const needsSelfAssessment =
    isActive &&
    published &&
    !teacherReleased &&
    usesRaster &&
    !studentSubmitted &&
    !entry?.withoutSelfAssessment &&
    !entry?.teacherGradeOnly;
  const needsGoals =
    isActive &&
    teacherReleased &&
    !goalsPartDone &&
    !noteOnlyFlow;
  const actionRequired = needsSelfAssessment || needsGoals;
  return {
    id: resolved.roundId,
    title: resolved.payload.title,
    date: resolved.payload.date,
    groupId: resolved.groupId,
    groupName: resolved.groupName,
    assessmentMode: assessmentModeForGroup(resolved.payload, resolved.groupId, resolved.groupName),
    publishedAt: resolved.payload.publishedAt,
    isActive,
    isArchived: !isActive,
    actionRequired,
    teacherReleased,
    studentSubmitted,
    goalsSubmitted,
    needsSelfAssessment,
    needsGoals,
  };
};

export class EpoNotenController {
  static async list(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const index = await loadTeacherIndex(user.id);
      const groups = await loadTeacherGroupsWithStudents(user.id);

      const items = await Promise.all(
        index.rounds.map(async (meta) => {
          const round = await loadRound(user.id, meta.id);
          const stats = round ? roundStats(round) : { submitted: 0, graded: 0, released: 0, goals: 0 };
          const activeGroups = groups
            .filter((g) => index.activeByGroup[g.id] === meta.id)
            .map((g) => ({ id: g.id, name: g.name }));
          return {
            ...meta,
            stats,
            activeGroups,
            variantId: round?.variantId ?? null,
            groupMeta: round?.groupMeta ?? {},
          };
        }),
      );

      return res.json({
        rounds: items,
        groups: groups.map((g) => ({
          id: g.id,
          name: g.name,
          studentCount: g.students.length,
          passiveStudentIds: parsePassiveStudentIds(g.passiveStudentIds),
          students: g.students.map((s) => ({ id: s.id, name: s.name })),
        })),
      });
    } catch (error) {
      console.error('EpoNoten list error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const round = await loadRound(user.id, roundId);
      if (!round) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
      round.assessmentModeByGroup = normalizeAssessmentModes(round, groupNameById);

      const passiveByGroup = new Map(
        groups.map((g) => [g.id, new Set(parsePassiveStudentIds(g.passiveStudentIds))]),
      );
      const groupIdQ = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
      const categoryGroupId =
        groupIdQ && round.groupIds.includes(groupIdQ) ? groupIdQ : round.groupIds[0] ?? null;
      const categories = await roundCategoryTexts(user.id, round, categoryGroupId);

      const students: EpoNotenEntry[] = [];
      for (const g of groups) {
        if (!round.groupIds.includes(g.id)) continue;
        for (const s of g.students) {
          const gidsInRound = groupIdsForStudentInRound(round, s.id, groups);
          const existing = findEntry(round, s.id, g.id, gidsInRound);
          const selfOnlyDefault = groupSelfAssessmentOnly(round, g.id);
          const row = existing ?? {
            studentId: s.id,
            studentName: stripMiddleNames(s.name),
            groupId: g.id,
            ...(selfOnlyDefault ? { goalsWaived: true } : {}),
          };
          students.push({
            ...row,
            studentId: s.id,
            studentName: stripMiddleNames(s.name),
            groupId: g.id,
            avatarEmoji: s.avatarEmoji,
            avatarUrl: s.avatarUrl,
          } as EpoNotenEntry & { groupId: string });
        }
      }

      type EntryWithGroup = EpoNotenEntry & { groupId?: string };
      const merged = [...students].sort((a, b) => {
        const ea = a as EntryWithGroup;
        const eb = b as EntryWithGroup;
        const passiveIds = (gid: string | undefined) => {
          if (!gid) return new Set<string>();
          return passiveByGroup.get(gid) ?? new Set<string>();
        };
        const pa = ea.groupId ? passiveIds(ea.groupId).has(ea.studentId) : false;
        const pb = eb.groupId ? passiveIds(eb.groupId).has(eb.studentId) : false;
        if (pa !== pb) return pa ? 1 : -1;
        const pend = (e: EntryWithGroup, passive: boolean) => {
          const gid = e.groupId;
          const groupLive = gid ? isGroupPublishedForStudents(round, gid) : Boolean(round.publishedAt);
          if (passive || !groupLive) return false;
          const usesRaster = gid ? effectiveEpoVariantIdForGroup(round, gid) !== null : false;
          const waived = entryGoalsWaived(round, gid ?? '', e);
          if (usesRaster && !e.studentSubmittedAt && !e.withoutSelfAssessment && !e.teacherGradeOnly) {
            return true;
          }
          if (e.teacherReleasedAt && !e.goalsSubmittedAt && !waived) return true;
          return false;
        };
        const liveA = ea.groupId
          ? isGroupPublishedForStudents(round, ea.groupId)
          : Boolean(round.publishedAt);
        const liveB = eb.groupId
          ? isGroupPublishedForStudents(round, eb.groupId)
          : Boolean(round.publishedAt);
        const pendA = pend(ea, pa);
        const pendB = pend(eb, pb);
        const fertA = !pa && liveA && !pendA;
        const fertB = !pb && liveB && !pendB;
        if (fertA !== fertB) return fertA ? -1 : 1;
        if (pendA !== pendB) return pendA ? -1 : 1;
        return ea.studentName.localeCompare(eb.studentName, 'de');
      });

      const priorEpoGrades: Record<string, PriorEpoGradeDto[]> = {};
      for (const gid of round.groupIds) {
        const partial = await priorEpoGradesForGroup(user.id, roundId, gid, groups);
        for (const [studentId, items] of Object.entries(partial)) {
          priorEpoGrades[`${studentId}:${gid}`] = items;
        }
      }

      return res.json({
        round,
        students: merged,
        stats: roundStats(round),
        priorEpoGrades,
        variantId: categories.variantId,
        variantName: categories.variantName,
        useRaster: categories.useRaster,
        categoryTitles: categories.categoryTitles,
        categoryWeightsPercent: categories.categoryWeightsPercent,
        studentCategories: categories.studentCategories,
        teacherCategories: categories.teacherCategories,
      });
    } catch (error) {
      console.error('EpoNoten getById error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));
      const groupIds = Array.isArray(req.body?.groupIds)
        ? (req.body.groupIds as string[]).map((g) => String(g).trim()).filter((id) => ownedIds.has(id))
        : [];

      const now = new Date().toISOString();
      const id = randomUUID();
      const variantIdRaw =
        typeof req.body?.variantId === 'string' ? req.body.variantId.trim() : '';
      const store = await loadVariantsStore(user.id);
      let roundVariantId: string | null = EPO_VARIANT2_ID;
      if (variantIdRaw && variantIdRaw !== EPO_NO_VARIANT_ID) {
        roundVariantId = resolveVariant(store, variantIdRaw).id;
      } else if (variantIdRaw === EPO_NO_VARIANT_ID) {
        roundVariantId = null;
      }

      const data: EpoNotenRoundPayload = {
        id,
        title,
        date: typeof req.body?.date === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10),
        groupIds,
        assessmentModeByGroup: Object.fromEntries(
          groupIds.map((gid) => {
            const g = owned.find((x) => x.id === gid);
            return [gid, defaultAssessmentModeForGroupName(g?.name)];
          }),
        ),
        groupMeta: {},
        variantId: roundVariantId,
        publishedAt: null,
        entries: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveRound(user.id, data);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, data);
      await saveIndex(user.id, index);

      return res.json({ success: true, round: data });
    } catch (error) {
      console.error('EpoNoten create error:', error);
      return res.status(500).json({ error: 'Fehler beim Erstellen' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const existing = await loadRound(user.id, roundId);
      if (!existing) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));
      const groupNameById = new Map(owned.map((g) => [g.id, g.name]));

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      let groupIds = existing.groupIds;
      if (Array.isArray(req.body?.groupIds)) {
        groupIds = (req.body.groupIds as string[]).map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
      }

      let assessmentModeByGroup = normalizeAssessmentModes({ ...existing, groupIds }, groupNameById);
      if (req.body?.assessmentModeByGroup && typeof req.body.assessmentModeByGroup === 'object') {
        const patch = req.body.assessmentModeByGroup as Record<string, unknown>;
        for (const gid of groupIds) {
          const v = patch[gid];
          if (v === 'mss' || v === 'note') assessmentModeByGroup[gid] = v;
        }
      }
      for (const gid of groupIds) {
        if (epoGroupUsesMssPoints(groupNameById.get(gid))) {
          assessmentModeByGroup[gid] = 'mss';
        }
      }

      let variantId = existing.variantId ?? null;
      if (typeof req.body?.variantId === 'string') {
        const store = await loadVariantsStore(user.id);
        variantId = resolveVariant(store, req.body.variantId.trim()).id;
      }

      const next: EpoNotenRoundPayload = {
        ...existing,
        title,
        date: typeof req.body?.date === 'string' ? req.body.date.trim() : existing.date,
        groupIds,
        assessmentModeByGroup,
        variantId,
      };

      await saveRound(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      const bodyKeys = Object.keys(req.body ?? {});
      const onlyVariantPatch = bodyKeys.length === 1 && bodyKeys[0] === 'variantId';
      if (next.publishedAt && !onlyVariantPatch) {
        await syncPublishedGroups(user.id, next, next.groupIds, index, owned.map((g) => g.id));
      }
      await saveIndex(user.id, index);

      return res.json({ success: true, round: next });
    } catch (error) {
      console.error('EpoNoten update error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async publishById(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const existing = await loadRound(user.id, roundId);
      if (!existing) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));

      let groupIds = existing.groupIds;
      if (Array.isArray(req.body?.groupIds) && req.body.groupIds.length > 0) {
        groupIds = (req.body.groupIds as string[]).map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
      }
      if (groupIds.length === 0) {
        return res.status(400).json({
          error: 'Mindestens eine Lerngruppe auswählen (Häkchen bei der Gruppe setzen, dann freischalten).',
        });
      }

      const publishedAt = new Date().toISOString();
      const next: EpoNotenRoundPayload = {
        ...existing,
        groupIds,
        publishedAt,
      };
      markGroupsPublished(next, groupIds, publishedAt);

      await saveRound(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      await syncPublishedGroups(user.id, next, groupIds, index, owned.map((g) => g.id));
      await saveIndex(user.id, index);

      return res.json({
        success: true,
        publishedAt,
        roundId,
        groupIds,
        groupNames: owned.filter((g) => groupIds.includes(g.id)).map((g) => g.name),
      });
    } catch (error) {
      console.error('EpoNoten publish error:', error);
      return res.status(500).json({ error: 'Fehler beim Freigeben' });
    }
  }

  /** Einzelnen Kurs freischalten (und ggf. zur Runde hinzufügen) */
  static async publishGroupById(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      if (!groupId) return res.status(400).json({ error: 'groupId fehlt' });

      const existing = await loadRound(user.id, roundId);
      if (!existing) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const group = owned.find((g) => g.id === groupId);
      if (!group) return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });

      const publishedAt = new Date().toISOString();
      const next: EpoNotenRoundPayload = { ...existing };
      if (!next.groupIds.includes(groupId)) {
        next.groupIds = [...next.groupIds, groupId];
        next.assessmentModeByGroup = normalizeAssessmentModes(next);
        next.assessmentModeByGroup[groupId] = defaultAssessmentModeForGroupName(group.name);
      }
      if (!next.publishedAt) next.publishedAt = publishedAt;
      markGroupsPublished(next, [groupId], publishedAt);

      await saveRound(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      await syncPublishedGroups(user.id, next, [groupId], index, owned.map((g) => g.id));
      await saveIndex(user.id, index);

      return res.json({ success: true, publishedAt, groupId, round: next });
    } catch (error) {
      console.error('EpoNoten publishGroup error:', error);
      return res.status(500).json({ error: 'Fehler beim Freigeben' });
    }
  }

  /** Kurs als „fertig“ markieren (Lehrkraft) */
  static async patchGroupMeta(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      if (!groupId) return res.status(400).json({ error: 'groupId fehlt' });

      const existing = await loadRound(user.id, roundId);
      if (!existing) return res.status(404).json({ error: 'Runde nicht gefunden' });
      if (!existing.groupIds.includes(groupId)) {
        return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
      }

      const meta = ensureGroupMeta(existing);
      const prev = meta[groupId] ?? {};
      if (typeof req.body?.completed === 'boolean') {
        const completedAt = req.body.completed ? new Date().toISOString() : null;
        meta[groupId] = {
          ...prev,
          completedAt,
          ...(req.body.completed ? { publishedAt: null } : {}),
        };
      }
      if (typeof req.body?.variantId === 'string') {
        const raw = req.body.variantId.trim();
        if (!existing.variantIdByGroup || typeof existing.variantIdByGroup !== 'object') {
          existing.variantIdByGroup = {};
        }
        if (!raw || raw === EPO_NO_VARIANT_ID) {
          existing.variantIdByGroup[groupId] = EPO_NO_VARIANT_ID;
        } else {
          const store = await loadVariantsStore(user.id);
          existing.variantIdByGroup[groupId] = resolveVariant(store, raw).id;
        }
      }
      if (typeof req.body?.workflow === 'string') {
        const wf = req.body.workflow as EpoGroupWorkflow;
        const allowed: EpoGroupWorkflow[] = [
          'standard',
          'teacher_raster',
          'self_no_raster',
          'teacher_only',
        ];
        if (!allowed.includes(wf)) {
          return res.status(400).json({ error: 'Ungültiger workflow' });
        }
        meta[groupId] = {
          ...meta[groupId] ?? prev,
          workflow: wf === 'standard' ? undefined : wf,
          selfAssessmentOnly: wf === 'self_no_raster',
        };
        const groups = await loadTeacherGroupsWithStudents(user.id);
        applyGroupWorkflowToStudents(existing, groupId, wf, groups);
      }
      const bodyFeatures = req.body?.epoFeatures;
      if (bodyFeatures && typeof bodyFeatures === 'object') {
        const flags: EpoJaFlags = {
          self: bodyFeatures.self !== false,
          raster: bodyFeatures.raster !== false,
          goals: bodyFeatures.goals !== false,
        };
        meta[groupId] = {
          ...meta[groupId] ?? prev,
          selfAssessmentEnabled: flags.self,
          teacherRasterEnabled: flags.raster,
          goalsEnabled: flags.goals,
          workflow: undefined,
          selfAssessmentOnly: flags.self && !flags.raster && !flags.goals,
        };
        const groups = await loadTeacherGroupsWithStudents(user.id);
        applyGroupEpoFeaturesToStudents(existing, groupId, flags, groups);
      }
      if (typeof req.body?.active === 'boolean') {
        if (req.body.active) {
          if (meta[groupId]?.completedAt || prev.completedAt) {
            return res.status(400).json({ error: 'Kurs ist fertig — „aktiv“ ist deaktiviert.' });
          }
          const publishedAt = new Date().toISOString();
          meta[groupId] = { ...meta[groupId] ?? prev, publishedAt };
          markGroupsPublished(existing, [groupId], publishedAt);
          const owned = await loadTeacherGroupsWithStudents(user.id);
          const index = await loadTeacherIndex(user.id);
          syncIndexEntry(index, existing);
          await syncPublishedGroups(user.id, existing, [groupId], index, owned.map((g) => g.id));
          await saveIndex(user.id, index);
        } else {
          meta[groupId] = { ...prev, publishedAt: null };
        }
      }

      await saveRound(user.id, existing);
      return res.json({ success: true, groupMeta: meta[groupId], round: existing });
    } catch (error) {
      console.error('EpoNoten patchGroupMeta error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async listVariants(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });
      const store = await loadVariantsStore(user.id);
      return res.json(store);
    } catch (error) {
      console.error('EpoNoten listVariants error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  static async saveVariant(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const variantId = String(req.params.variantId || '').trim();
      if (!variantId) return res.status(400).json({ error: 'variantId fehlt' });
      if (variantId === DEFAULT_EPO_VARIANT_ID || variantId === EPO_VARIANT2_ID) {
        return res.status(400).json({ error: 'Eingebaute Varianten sind fest vorgegeben' });
      }

      const store = await loadVariantsStore(user.id);
      const idx = store.variants.findIndex((v) => v.id === variantId);
      if (idx < 0) return res.status(404).json({ error: 'Variante nicht gefunden' });

      const cur = store.variants[idx]!;
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : cur.name;
      const studentCategories = Array.isArray(req.body?.studentCategories)
        ? req.body.studentCategories
        : cur.studentCategories;
      const teacherCategories = Array.isArray(req.body?.teacherCategories)
        ? req.body.teacherCategories
        : cur.teacherCategories;
      const categoryTitles = Array.isArray(req.body?.categoryTitles)
        ? req.body.categoryTitles
        : cur.categoryTitles;
      const categoryWeightsPercent = Array.isArray(req.body?.categoryWeightsPercent)
        ? req.body.categoryWeightsPercent
        : cur.categoryWeightsPercent;

      store.variants[idx] = normalizeVariantSheet({
        id: cur.id,
        name: name || cur.name,
        categoryTitles,
        categoryWeightsPercent,
        studentCategories,
        teacherCategories,
      });

      await saveVariantsStore(user.id, store);
      return res.json({ success: true, variant: store.variants[idx] });
    } catch (error) {
      console.error('EpoNoten saveVariant error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async createVariant(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const template =
        typeof req.body?.template === 'string' ? req.body.template.trim() : '';
      const name =
        typeof req.body?.name === 'string'
          ? req.body.name.trim()
          : template === 'variant2'
            ? EPO_VARIANT2_WEIGHTED_PRESET.name
            : 'Neue Variante';
      const copyFromId =
        typeof req.body?.copyFromId === 'string' ? req.body.copyFromId.trim() : undefined;
      const store = await loadVariantsStore(user.id);
      const variant =
        template === 'variant2'
          ? normalizeVariantSheet({
              id: EPO_VARIANT2_ID,
              name: EPO_VARIANT2_WEIGHTED_PRESET.name,
              ...EPO_VARIANT2_WEIGHTED_PRESET,
            })
          : createVariantFromBase(store, name, copyFromId);
      store.variants.push(variant);
      await saveVariantsStore(user.id, store);
      return res.json({ success: true, variant });
    } catch (error) {
      console.error('EpoNoten createVariant error:', error);
      return res.status(500).json({ error: 'Fehler beim Erstellen' });
    }
  }

  static async deleteVariant(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const variantId = String(req.params.variantId || '').trim();
      if (!variantId || variantId === DEFAULT_EPO_VARIANT_ID || variantId === EPO_VARIANT2_ID) {
        return res.status(400).json({ error: 'Eingebaute Varianten können nicht gelöscht werden' });
      }

      const store = await loadVariantsStore(user.id);
      const before = store.variants.length;
      store.variants = store.variants.filter((v) => v.id !== variantId);
      if (store.variants.length === before) {
        return res.status(404).json({ error: 'Variante nicht gefunden' });
      }
      await saveVariantsStore(user.id, store);
      return res.json({ success: true });
    } catch (error) {
      console.error('EpoNoten deleteVariant error:', error);
      return res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }

  static async unpublishById(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const existing = await loadRound(user.id, roundId);
      if (!existing) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const next: EpoNotenRoundPayload = { ...existing, publishedAt: null };
      clearAllGroupPublishMeta(next);

      await saveRound(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      await clearPublishedGroups(user.id, roundId, index, owned.map((g) => g.id));
      await saveIndex(user.id, index);

      return res.json({ success: true });
    } catch (error) {
      console.error('EpoNoten unpublish error:', error);
      return res.status(500).json({ error: 'Fehler beim Zurücknehmen' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const index = await loadTeacherIndex(user.id);
      index.rounds = index.rounds.filter((r) => r.id !== roundId);
      for (const [gid, rid] of Object.entries(index.activeByGroup)) {
        if (rid === roundId) delete index.activeByGroup[gid];
      }
      await saveIndex(user.id, index);
      await deleteRow(user.id, roundDataPath(roundId));

      const owned = await loadTeacherGroupsWithStudents(user.id);
      for (const g of owned) {
        const ref = parseGroupRef(await readRow(user.id, groupActivePath(g.id)));
        if (ref?.roundId === roundId) await deleteRow(user.id, groupActivePath(g.id));
      }

      return res.json({ success: true });
    } catch (error) {
      console.error('EpoNoten remove error:', error);
      return res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }

  static async getCurrent(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      if (user.role === 'STUDENT') {
        const roundIdQ = typeof req.query.roundId === 'string' ? req.query.roundId.trim() : '';
        const groupIdQ = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
        const all = await resolveStudentRounds(user.id);

        if (all.length === 0) {
          const groups = await prisma.learningGroup.findMany({
            where: { students: { some: { id: user.id } } },
            select: { teacherId: true, teacher: { select: { name: true } } },
            take: 1,
          });
          if (groups.length === 0) return res.status(404).json({ error: 'Keine Lerngruppe gefunden' });
          return res.json({
            sessions: [],
            round: null,
            myEntry: null,
            teacherId: groups[0].teacherId,
            teacherName: groups[0].teacher.name,
          });
        }

        let resolved: ResolvedRound | undefined;
        if (roundIdQ && groupIdQ) {
          resolved = all.find((r) => r.roundId === roundIdQ && r.groupId === groupIdQ);
        } else if (roundIdQ) {
          resolved = all.find((r) => r.roundId === roundIdQ);
        } else if (groupIdQ) {
          resolved = all.find((r) => r.groupId === groupIdQ);
        } else {
          resolved = all[0];
        }

        if (!resolved) {
          const groups = await prisma.learningGroup.findMany({
            where: { students: { some: { id: user.id } } },
            select: { teacherId: true, teacher: { select: { name: true } } },
            take: 1,
          });
          return res.json({
            sessions: all.map((r) => studentSessionDto(r, user.id, r.studentGroupIdsInRound)),
            round: null,
            myEntry: null,
            canEditSelf: false,
            canEditGoals: false,
            teacherId: groups[0]?.teacherId ?? '',
            teacherName: groups[0]?.teacher.name ?? '',
            roundId: roundIdQ || null,
          });
        }

        const myEntry = findEntry(
          resolved.payload,
          user.id,
          resolved.groupId,
          resolved.studentGroupIdsInRound,
        );
        const categories = await roundCategoryTexts(
          resolved.teacherId,
          resolved.payload,
          resolved.groupId,
        );
        const groupPublished = isGroupPublishedForStudents(resolved.payload, resolved.groupId);
        const studentSelfRaster = entryStudentUsesSelfRaster(
          resolved.payload,
          resolved.groupId,
          myEntry,
          categories.useRaster,
        );
        const selfRequired = entryRequiresStudentSelf(resolved.payload, resolved.groupId, myEntry);
        const canEditSelf =
          groupPublished &&
          selfRequired &&
          !myEntry?.studentSubmittedAt;
        const canEditGoals =
          resolved.isActiveForGroup &&
          Boolean(myEntry?.teacherReleasedAt) &&
          !myEntry?.goalsSubmittedAt &&
          !entryGoalsWaived(resolved.payload, resolved.groupId, myEntry);

        return res.json({
          sessions: all.map((r) => studentSessionDto(r, user.id, r.studentGroupIdsInRound)),
          round: {
            id: resolved.roundId,
            title: resolved.payload.title,
            date: resolved.payload.date,
            publishedAt: groupPublished ? resolved.payload.groupMeta?.[resolved.groupId]?.publishedAt ?? resolved.payload.publishedAt : null,
            groupId: resolved.groupId,
            groupName: resolved.groupName,
            assessmentMode: assessmentModeForGroup(resolved.payload, resolved.groupId, resolved.groupName),
            studentCategories: categories.studentCategories,
            teacherCategories: categories.teacherCategories,
            categoryTitles: categories.categoryTitles,
            categoryWeightsPercent: categories.categoryWeightsPercent,
            variantId: categories.variantId,
            useRaster: categories.useRaster,
            selfAssessmentOnly: groupSelfAssessmentOnly(resolved.payload, resolved.groupId),
            workflow: groupWorkflow(resolved.payload, resolved.groupId),
            studentUsesSelfRaster: studentSelfRaster,
          },
          myEntry,
          canEditSelf,
          canEditGoals,
          teacherId: resolved.teacherId,
          teacherName: resolved.teacherName,
          roundId: resolved.roundId,
        });
      }

      const index = await loadTeacherIndex(user.id);
      const groups = await loadTeacherGroupsWithStudents(user.id);
      return res.json({
        teacherId: user.id,
        roundCount: index.rounds.length,
        publishedCount: index.rounds.filter((r) => r.publishedAt).length,
        groupCount: groups.length,
      });
    } catch (error) {
      console.error('EpoNoten getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  static async submitSelf(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Nur Schüler' });

      let teacherId = typeof req.body?.teacherId === 'string' ? req.body.teacherId.trim() : '';
      let roundId = typeof req.body?.roundId === 'string' ? req.body.roundId.trim() : '';
      let groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';

      const allRounds = await resolveStudentRounds(user.id);
      if (!teacherId || !roundId) {
        const first = roundId
          ? groupId
            ? allRounds.find((r) => r.roundId === roundId && r.groupId === groupId)
            : allRounds.find((r) => r.roundId === roundId)
          : groupId
            ? allRounds.find((r) => r.groupId === groupId)
            : allRounds[0];
        if (!first || !isGroupPublishedForStudents(first.payload, first.groupId)) {
          return res.status(404).json({ error: 'Keine freigegebene EPO-Runde' });
        }
        teacherId = first.teacherId;
        roundId = first.roundId;
        groupId = groupId || first.groupId;
      }

      const resolvedRound = allRounds.find(
        (r) =>
          r.roundId === roundId &&
          r.teacherId === teacherId &&
          (!groupId || r.groupId === groupId),
      );
      const payload = await loadRound(teacherId, roundId);
      if (!payload) {
        return res.status(404).json({ error: 'Runde nicht gefunden' });
      }
      const submitGroupId = resolvedRound?.groupId ?? groupId;
      if (!submitGroupId || !isGroupPublishedForStudents(payload, submitGroupId)) {
        return res.status(403).json({ error: 'EPO-Runde ist nicht freigegeben' });
      }

      const groups = await loadTeacherGroupsWithStudents(teacherId);
      const gidsInRound = groupIdsForStudentInRound(payload, user.id, groups);
      const existing = findEntry(payload, user.id, submitGroupId, gidsInRound);
      if (existing?.studentSubmittedAt) {
        return res.status(403).json({ error: 'Selbsteinschätzung bereits abgegeben — keine Änderung mehr möglich' });
      }
      if (existing?.withoutSelfAssessment || existing?.teacherGradeOnly) {
        return res.status(403).json({ error: 'Für dich ist keine Selbsteinschätzung vorgesehen' });
      }

      const variantCats = await roundCategoryTexts(teacherId, payload, submitGroupId);
      const selfRequired = entryRequiresStudentSelf(payload, submitGroupId, existing);
      if (!selfRequired) {
        return res.status(403).json({ error: 'Für diese Runde ist keine Selbsteinschätzung vorgesehen' });
      }
      const studentSelfRaster = entryStudentUsesSelfRaster(
        payload,
        submitGroupId,
        existing,
        variantCats.useRaster,
      );

      const selfScores = normalizeCategoryScores(req.body?.selfScores);
      const total = epoRoundedPoints(selfScores, variantCats.categoryWeightsPercent);

      const submitGroup = groups.find((g) => g.id === submitGroupId);
      const mode = assessmentModeForGroup(
        payload,
        submitGroupId,
        resolvedRound?.groupName ?? submitGroup?.name,
      );
      const selfGradeFromTable =
        typeof req.body?.selfGradeFromTable === 'string' && req.body.selfGradeFromTable.trim()
          ? req.body.selfGradeFromTable.trim()
          : rasterResultFromTotal(mode, total);

      const suggestedGradeMode = mode;

      const entry: EpoNotenEntry = {
        studentId: user.id,
        groupId: submitGroupId,
        studentName: stripMiddleNames(user.name),
        suggestedGrade: typeof req.body?.suggestedGrade === 'string' ? req.body.suggestedGrade.trim() : '',
        suggestedGradeMode,
        justification: typeof req.body?.justification === 'string' ? req.body.justification.trim() : '',
        selfScores,
        selfGradeFromTable,
        studentSubmittedAt: new Date().toISOString(),
        teacherScores: existing?.teacherScores,
        teacherGrade: existing?.teacherGrade,
        teacherReleasedAt: existing?.teacherReleasedAt ?? null,
        goal: existing?.goal,
        goalAction: existing?.goalAction,
        goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
        goalsWaived: existing?.goalsWaived,
        withoutSelfAssessment: existing?.withoutSelfAssessment,
        teacherGradeOnly: existing?.teacherGradeOnly,
        teacherJustification: existing?.teacherJustification,
      };

      upsertEntry(payload, entry);
      await saveRound(teacherId, payload);

      return res.json({ success: true, entry, totalPoints: total, selfGradeFromTable });
    } catch (error) {
      console.error('EpoNoten submitSelf error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async submitGoals(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Nur Schüler' });

      let teacherId = typeof req.body?.teacherId === 'string' ? req.body.teacherId.trim() : '';
      let roundId = typeof req.body?.roundId === 'string' ? req.body.roundId.trim() : '';
      let groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';

      const allRounds = await resolveStudentRounds(user.id);
      if (!teacherId || !roundId) {
        const first = allRounds[0];
        if (!first) return res.status(404).json({ error: 'Keine EPO-Runde' });
        teacherId = first.teacherId;
        roundId = first.roundId;
        groupId = first.groupId;
      }

      const resolved = allRounds.find(
        (r) =>
          r.roundId === roundId &&
          r.teacherId === teacherId &&
          (!groupId || r.groupId === groupId),
      );
      if (!resolved) return res.status(404).json({ error: 'EPO-Runde nicht gefunden' });
      groupId = resolved.groupId;

      const payload = await loadRound(teacherId, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const groups = await loadTeacherGroupsWithStudents(teacherId);
      const gidsInRound = groupIdsForStudentInRound(payload, user.id, groups);
      const existing = findEntry(payload, user.id, groupId, gidsInRound);
      if (!existing?.teacherReleasedAt) {
        return res.status(403).json({ error: 'Lehrerbewertung noch nicht freigegeben' });
      }
      if (existing?.goalsWaived) {
        return res.status(403).json({ error: 'Für dich sind keine Ziele erforderlich' });
      }

      const goal = typeof req.body?.goal === 'string' ? req.body.goal.trim() : '';
      const goalAction = typeof req.body?.goalAction === 'string' ? req.body.goalAction.trim() : '';
      if (!goal || !goalAction) {
        return res.status(400).json({ error: 'Ziel und Handlung sind erforderlich' });
      }

      const entry: EpoNotenEntry = {
        ...existing,
        groupId,
        goal,
        goalAction,
        goalsSubmittedAt: new Date().toISOString(),
      };

      upsertEntry(payload, entry);
      await saveRound(teacherId, payload);

      return res.json({ success: true, entry });
    } catch (error) {
      console.error('EpoNoten submitGoals error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async saveTeacherEntry(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const studentId = String(req.params.studentId || '').trim();
      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const student = groups.flatMap((g) => g.students).find((s) => s.id === studentId);
      if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });

      const groupIdBody = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      const studentGroupsInRound = groupIdsForStudentInRound(payload, studentId, groups);
      let entryGroupId = groupIdBody && payload.groupIds.includes(groupIdBody) ? groupIdBody : '';
      if (!entryGroupId || !studentGroupsInRound.includes(entryGroupId)) {
        if (studentGroupsInRound.length === 1) entryGroupId = studentGroupsInRound[0];
        else if (!entryGroupId) {
          return res.status(400).json({ error: 'groupId ist erforderlich (SuS in mehreren Kursen dieser Runde)' });
        }
      }

      const existing = findEntry(payload, studentId, entryGroupId, studentGroupsInRound);
      const teacherScores = normalizeCategoryScores(req.body?.teacherScores);
      const variantCats = await roundCategoryTexts(user.id, payload, entryGroupId);
      const total = epoRoundedPoints(teacherScores, variantCats.categoryWeightsPercent);
      const computed = gradeFromTotalPoints(total);
      const teacherGrade =
        typeof req.body?.teacherGrade === 'string' ? req.body.teacherGrade.trim() : existing?.teacherGrade ?? '';
      let withoutSelfAssessment = Boolean(existing?.withoutSelfAssessment);
      if (typeof req.body?.withoutSelfAssessment === 'boolean') {
        withoutSelfAssessment = req.body.withoutSelfAssessment;
      }
      let teacherGradeOnly = Boolean(existing?.teacherGradeOnly);
      if (typeof req.body?.teacherGradeOnly === 'boolean') {
        teacherGradeOnly = req.body.teacherGradeOnly;
      }
      let goalsWaived = Boolean(existing?.goalsWaived);
      if (typeof req.body?.goalsWaived === 'boolean') {
        goalsWaived = req.body.goalsWaived;
      }
      let selfUsesRaster = existing?.selfUsesRaster;
      if (typeof req.body?.selfUsesRaster === 'boolean') {
        selfUsesRaster = req.body.selfUsesRaster;
      }
      const teacherJustification =
        typeof req.body?.teacherJustification === 'string'
          ? req.body.teacherJustification.trim()
          : existing?.teacherJustification ?? '';
      const revokeRelease = req.body?.revokeRelease === true;

      const entry: EpoNotenEntry = {
        studentId,
        groupId: entryGroupId,
        studentName: stripMiddleNames(student.name),
        suggestedGrade: existing?.suggestedGrade,
        suggestedGradeMode: existing?.suggestedGradeMode,
        justification: existing?.justification,
        selfScores: existing?.selfScores,
        selfGradeFromTable: existing?.selfGradeFromTable,
        studentSubmittedAt: existing?.studentSubmittedAt ?? null,
        teacherScores,
        teacherGrade,
        teacherReleasedAt: revokeRelease ? null : existing?.teacherReleasedAt ?? null,
        goal: existing?.goal,
        goalAction: existing?.goalAction,
        goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
        goalsWaived,
        withoutSelfAssessment: teacherGradeOnly ? false : withoutSelfAssessment,
        teacherGradeOnly,
        teacherJustification,
        selfUsesRaster,
      };

      upsertEntry(payload, entry);
      await saveRound(user.id, payload);

      return res.json({ success: true, entry, totalPoints: total, computedGrade: computed });
    } catch (error) {
      console.error('EpoNoten saveTeacherEntry error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async releaseToStudents(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const all = Boolean(req.body?.all);
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      const studentIds = Array.isArray(req.body?.studentIds)
        ? (req.body.studentIds as string[]).map((id) => String(id).trim()).filter(Boolean)
        : [];

      if (!all && !groupId && studentIds.length === 0) {
        return res.status(400).json({ error: 'studentIds, groupId oder all erforderlich' });
      }

      if (groupId && !payload.groupIds.includes(groupId)) {
        return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
      }

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const groupNameById = new Map(groups.map((g) => [g.id, g.name]));
      const studentToGroups = new Map<string, string[]>();
      for (const g of groups) {
        if (!payload.groupIds.includes(g.id)) continue;
        for (const s of g.students) {
          const list = studentToGroups.get(s.id) ?? [];
          list.push(g.id);
          studentToGroups.set(s.id, list);
        }
      }

      const now = new Date().toISOString();
      let count = 0;
      const groupsToIntegrate = new Set<string>();

      for (const entry of payload.entries) {
        const gids = studentToGroups.get(entry.studentId) ?? [];
        const entryGroupId =
          entry.groupId ?? (gids.length === 1 ? gids[0] : null);
        if (!entryGroupId) continue;
        if (groupId && entryGroupId !== groupId) continue;
        if (!all && studentIds.length > 0 && !studentIds.includes(entry.studentId)) continue;

        const variantCats = await roundCategoryTexts(user.id, payload, entryGroupId ?? null);
        const mode = entryGroupId
          ? assessmentModeForGroup(payload, entryGroupId, groupNameById.get(entryGroupId))
          : 'note';
        const grade = effectiveTeacherGrade(payload, entryGroupId, entry, mode, variantCats.categoryWeightsPercent);
        if (!grade) continue;
        if (
          entryRequiresStudentSelf(payload, entryGroupId, entry) &&
          !entry.studentSubmittedAt
        ) {
          continue;
        }
        entry.teacherGrade = grade;
        entry.teacherReleasedAt = now;
        count += 1;
        groupsToIntegrate.add(entryGroupId);
      }

      await saveRound(user.id, payload);

      for (const gid of groupsToIntegrate) {
        const group = groups.find((g) => g.id === gid);
        if (!group) continue;
        const mode = assessmentModeForGroup(payload, gid, groupNameById.get(gid));
        try {
          await integrateReleasedEpoRoundIntoGradingSchema(prisma, {
            groupId: gid,
            roundTitle: payload.title,
            assessmentMode: mode,
            entries: payload.entries,
            studentIdsInGroup: group.students.map((s) => s.id),
          });
        } catch (integrateErr) {
          console.warn('EPO auto integrate grading schema failed for group', gid, integrateErr);
        }
      }

      return res.json({ success: true, releasedCount: count });
    } catch (error) {
      console.error('EpoNoten release error:', error);
      return res.status(500).json({ error: 'Fehler bei der Freigabe' });
    }
  }

  /** Lehrkraft: ganze Lerngruppe auf „Nur Note“ (oder zurück auf Standard) */
  static async bulkGradeOnlyForGroup(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      const enabled = req.body?.enabled !== false;

      if (!groupId) return res.status(400).json({ error: 'groupId erforderlich' });

      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });
      if (!payload.groupIds.includes(groupId)) {
        return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
      }

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });

      let updatedCount = 0;
      let skippedCount = 0;

      for (const s of group.students) {
        const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
        const existing = findEntry(payload, s.id, groupId, gidsInRound);
        if (existing?.studentSubmittedAt || existing?.teacherReleasedAt) {
          skippedCount += 1;
          continue;
        }
        const entry: EpoNotenEntry = {
          studentId: s.id,
          groupId,
          studentName: stripMiddleNames(s.name),
          suggestedGrade: existing?.suggestedGrade,
          suggestedGradeMode: existing?.suggestedGradeMode,
          justification: existing?.justification,
          selfScores: existing?.selfScores,
          selfGradeFromTable: existing?.selfGradeFromTable,
          studentSubmittedAt: existing?.studentSubmittedAt ?? null,
          teacherScores: existing?.teacherScores,
          teacherGrade: existing?.teacherGrade,
          teacherReleasedAt: existing?.teacherReleasedAt ?? null,
          goal: existing?.goal,
          goalAction: existing?.goalAction,
          goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
          goalsWaived: existing?.goalsWaived,
          withoutSelfAssessment: enabled ? false : Boolean(existing?.withoutSelfAssessment),
          teacherGradeOnly: enabled,
          teacherJustification: existing?.teacherJustification,
        };
        upsertEntry(payload, entry);
        updatedCount += 1;
      }

      if (enabled) {
        if (!payload.variantIdByGroup || typeof payload.variantIdByGroup !== 'object') {
          payload.variantIdByGroup = {};
        }
        payload.variantIdByGroup[groupId] = EPO_NO_VARIANT_ID;
      }

      await saveRound(user.id, payload);
      return res.json({ success: true, updatedCount, skippedCount, enabled });
    } catch (error) {
      console.error('EpoNoten bulkGradeOnlyForGroup error:', error);
      return res.status(500).json({ error: 'Fehler beim Setzen' });
    }
  }

  /** Lehrkraft: ganze Lerngruppe „Keine Ziele nötig“ */
  static async bulkGoalsWaivedForGroup(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      const waived = req.body?.waived !== false;

      if (!groupId) return res.status(400).json({ error: 'groupId erforderlich' });

      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });
      if (!payload.groupIds.includes(groupId)) {
        return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
      }

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });

      let updatedCount = 0;
      let skippedCount = 0;

      for (const s of group.students) {
        const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
        const existing = findEntry(payload, s.id, groupId, gidsInRound);
        if (existing?.goalsSubmittedAt) {
          skippedCount += 1;
          continue;
        }
        const entry: EpoNotenEntry = {
          studentId: s.id,
          groupId,
          studentName: stripMiddleNames(s.name),
          suggestedGrade: existing?.suggestedGrade,
          suggestedGradeMode: existing?.suggestedGradeMode,
          justification: existing?.justification,
          selfScores: existing?.selfScores,
          selfGradeFromTable: existing?.selfGradeFromTable,
          studentSubmittedAt: existing?.studentSubmittedAt ?? null,
          teacherScores: existing?.teacherScores,
          teacherGrade: existing?.teacherGrade,
          teacherReleasedAt: existing?.teacherReleasedAt ?? null,
          goal: existing?.goal,
          goalAction: existing?.goalAction,
          goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
          goalsWaived: waived,
          withoutSelfAssessment: existing?.withoutSelfAssessment,
          teacherGradeOnly: existing?.teacherGradeOnly,
          teacherJustification: existing?.teacherJustification,
        };
        upsertEntry(payload, entry);
        updatedCount += 1;
      }

      await saveRound(user.id, payload);
      return res.json({ success: true, updatedCount, skippedCount, waived });
    } catch (error) {
      console.error('EpoNoten bulkGoalsWaivedForGroup error:', error);
      return res.status(500).json({ error: 'Fehler beim Setzen' });
    }
  }

  /** Lehrkraft: ganze Lerngruppe „Nur Einschätzung“ (Teil 1, keine Ziele) */
  static async bulkSelfAssessmentOnlyForGroup(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      if (!groupId) return res.status(400).json({ error: 'groupId erforderlich' });

      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });
      if (!payload.groupIds.includes(groupId)) {
        return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
      }

      const meta = ensureGroupMeta(payload);
      meta[groupId] = { ...meta[groupId], selfAssessmentOnly: true };

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });

      let updatedCount = 0;
      let skippedCount = 0;

      for (const s of group.students) {
        const gidsInRound = groupIdsForStudentInRound(payload, s.id, groups);
        const existing = findEntry(payload, s.id, groupId, gidsInRound);
        if (existing?.goalsSubmittedAt) {
          skippedCount += 1;
          continue;
        }
        const entry: EpoNotenEntry = {
          studentId: s.id,
          groupId,
          studentName: stripMiddleNames(s.name),
          suggestedGrade: existing?.suggestedGrade,
          suggestedGradeMode: existing?.suggestedGradeMode,
          justification: existing?.justification,
          selfScores: existing?.selfScores,
          selfGradeFromTable: existing?.selfGradeFromTable,
          studentSubmittedAt: existing?.studentSubmittedAt ?? null,
          teacherScores: existing?.teacherScores,
          teacherGrade: existing?.teacherGrade,
          teacherReleasedAt: existing?.teacherReleasedAt ?? null,
          goal: existing?.goal,
          goalAction: existing?.goalAction,
          goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
          goalsWaived: true,
          withoutSelfAssessment: false,
          teacherGradeOnly: false,
          teacherJustification: existing?.teacherJustification,
        };
        upsertEntry(payload, entry);
        updatedCount += 1;
      }

      await saveRound(user.id, payload);
      return res.json({ success: true, updatedCount, skippedCount, selfAssessmentOnly: true });
    } catch (error) {
      console.error('EpoNoten bulkSelfAssessmentOnlyForGroup error:', error);
      return res.status(500).json({ error: 'Fehler beim Setzen' });
    }
  }

  /** Freigegebene EPO-Noten einer Lerngruppe ins Notenschema übernehmen (Kategorie = Rundentitel). */
  static async integrateGradingSchema(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
      if (!groupId) return res.status(400).json({ error: 'groupId erforderlich' });

      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });
      if (!payload.groupIds.includes(groupId)) {
        return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
      }

      const groups = await loadTeacherGroupsWithStudents(user.id);
      const group = groups.find((g) => g.id === groupId);
      if (!group) return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });

      const mode = assessmentModeForGroup(payload, groupId, group.name);
      const result = await integrateReleasedEpoRoundIntoGradingSchema(prisma, {
        groupId,
        roundTitle: payload.title,
        assessmentMode: mode,
        entries: payload.entries,
        studentIdsInGroup: group.students.map((s) => s.id),
      });

      if (!result) {
        return res.status(400).json({ error: 'Für diese Lerngruppe gibt es noch kein Notenschema.' });
      }
      if (result.count === 0) {
        return res.status(400).json({
          error: 'Keine freigegebenen Noten zum Übertragen (Note eintragen und freigeben).',
        });
      }

      const meta = ensureGroupMeta(payload);
      meta[groupId] = {
        ...meta[groupId],
        schemaIntegratedAt: new Date().toISOString(),
      };
      payload.groupMeta = meta;
      await saveRound(user.id, payload);

      return res.json({
        success: true,
        count: result.count,
        categoryName: result.categoryName,
        schemaId: result.schemaId,
      });
    } catch (error) {
      console.error('EpoNoten integrateGradingSchema error:', error);
      return res.status(500).json({ error: 'Fehler beim Übertragen ins Notenschema' });
    }
  }

  /** Lehrkraft: Einträge löschen (ganze Runde oder eine Lerngruppe) */
  static async resetAllEntries(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const roundId = String(req.params.id || '').trim();
      const payload = await loadRound(user.id, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';

      if (groupId) {
        if (!payload.groupIds.includes(groupId)) {
          return res.status(400).json({ error: 'Diese Lerngruppe gehört nicht zu dieser Runde' });
        }
        const groups = await loadTeacherGroupsWithStudents(user.id);
        const group = groups.find((g) => g.id === groupId);
        if (!group) return res.status(400).json({ error: 'Lerngruppe nicht gefunden' });
        const studentIds = new Set(group.students.map((s) => s.id));
        const before = payload.entries.length;
        payload.entries = payload.entries.filter((e) => {
          if (!studentIds.has(e.studentId)) return true;
          if (e.groupId === groupId) return false;
          if (!e.groupId) {
            const gids = groupIdsForStudentInRound(payload, e.studentId, groups);
            if (gids.length === 1 && gids[0] === groupId) return false;
          }
          return true;
        });
        const removed = before - payload.entries.length;
        await saveRound(user.id, payload);
        return res.json({ success: true, removedCount: removed, groupId });
      }

      const removed = payload.entries.length;
      payload.entries = [];
      await saveRound(user.id, payload);

      return res.json({ success: true, removedCount: removed });
    } catch (error) {
      console.error('EpoNoten resetAllEntries error:', error);
      return res.status(500).json({ error: 'Fehler beim Zurücksetzen' });
    }
  }
}
