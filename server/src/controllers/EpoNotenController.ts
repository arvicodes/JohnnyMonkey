import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findUserByLoginCode } from '../utils/loginCodeCrypto';

const prisma = new PrismaClient();

const INDEX_PATH = '__epo_noten_index__';
const roundDataPath = (roundId: string) => `__epo_noten_e_${roundId}__`;
const groupActivePath = (groupId: string) => `__epo_noten_g_${groupId}__`;

const CATEGORY_COUNT = 5;

const GRADE_TABLE: { minPoints: number; grade: string }[] = [
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

const gradeFromTotalPoints = (total: number): string => {
  const t = Math.max(0, Math.min(15, Math.round(total)));
  const table = [...GRADE_TABLE].sort((a, b) => b.minPoints - a.minPoints);
  for (const row of table) {
    if (t >= row.minPoints) return row.grade;
  }
  return '5';
};

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

const effectiveTeacherGrade = (entry: EpoNotenEntry, mode: AssessmentMode): string => {
  const trimmed = entry.teacherGrade?.trim();
  if (trimmed) return trimmed;
  const scores = normalizeCategoryScores(entry.teacherScores);
  if (!allCategoriesSelected(scores)) return '';
  return rasterResultFromTotal(mode, sumCategoryScores(scores));
};

type EpoNotenEntry = {
  studentId: string;
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
};

type AssessmentMode = 'note' | 'mss';

type EpoNotenRoundPayload = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  assessmentModeByGroup?: Record<string, AssessmentMode>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  entries: EpoNotenEntry[];
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

const loadRound = async (teacherId: string, roundId: string) =>
  parseRound(await readRow(teacherId, roundDataPath(roundId)));

const saveRound = async (teacherId: string, data: EpoNotenRoundPayload) => {
  data.updatedAt = new Date().toISOString();
  await writeRow(teacherId, roundDataPath(data.id), JSON.stringify(data));
  return data;
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

const epoGroupUsesMssPoints = (groupName: string | undefined | null): boolean => {
  if (!groupName?.trim()) return false;
  const n = groupName.trim().toLowerCase();
  if (!n.includes('informatik')) return false;
  return /\bgk\s*11\b/.test(n);
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

const findEntry = (round: EpoNotenRoundPayload, studentId: string) =>
  round.entries.find((e) => e.studentId === studentId) ?? null;

const upsertEntry = (round: EpoNotenRoundPayload, entry: EpoNotenEntry) => {
  const rest = round.entries.filter((e) => e.studentId !== entry.studentId);
  rest.push(entry);
  round.entries = rest;
};

type ResolvedRound = {
  teacherId: string;
  teacherName: string;
  roundId: string;
  payload: EpoNotenRoundPayload;
  groupId: string;
  groupName: string;
  isActiveForGroup: boolean;
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

      for (const g of teacherGroups) {
        if (!payload.groupIds.includes(g.id)) continue;

        const entry = findEntry(payload, studentId);
        const hasHistory =
          Boolean(entry?.studentSubmittedAt) ||
          Boolean(entry?.teacherReleasedAt) ||
          Boolean(entry?.goalsSubmittedAt);
        const publishedForGroup = Boolean(payload.publishedAt) && payload.groupIds.includes(g.id);

        if (!publishedForGroup && !hasHistory) continue;

        const key = `${meta.id}:${g.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const isActiveForGroup =
          Boolean(payload.publishedAt) && index.activeByGroup[g.id] === meta.id;

        results.push({
          teacherId,
          teacherName: g.teacher.name,
          roundId: meta.id,
          payload,
          groupId: g.id,
          groupName: g.name,
          isActiveForGroup,
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

const studentSessionDto = (resolved: ResolvedRound, studentId: string) => {
  const entry = findEntry(resolved.payload, studentId);
  const published = Boolean(resolved.payload.publishedAt);
  const isActive = resolved.isActiveForGroup;
  const teacherReleased = Boolean(entry?.teacherReleasedAt);
  const studentSubmitted = Boolean(entry?.studentSubmittedAt);
  const goalsSubmitted = Boolean(entry?.goalsSubmittedAt);
  const needsSelfAssessment = isActive && published && !studentSubmitted;
  const needsGoals = isActive && teacherReleased && !goalsSubmitted;
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
          return { ...meta, stats, activeGroups };
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
      const roundPublished = Boolean(round.publishedAt);

      const students: EpoNotenEntry[] = [];
      for (const g of groups) {
        if (!round.groupIds.includes(g.id)) continue;
        for (const s of g.students) {
          const existing = findEntry(round, s.id);
          const row = existing ?? {
            studentId: s.id,
            studentName: s.name,
          };
          students.push({
            ...row,
            studentId: s.id,
            studentName: s.name,
            avatarEmoji: s.avatarEmoji,
            avatarUrl: s.avatarUrl,
            groupId: g.id,
          } as EpoNotenEntry & { groupId: string });
        }
      }

      const byId = new Map(students.map((s) => [s.studentId, s]));
      type EntryWithGroup = EpoNotenEntry & { groupId?: string };
      const merged = [...byId.values()].sort((a, b) => {
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
          if (passive || !roundPublished) return false;
          if (!e.studentSubmittedAt) return true;
          if (e.teacherReleasedAt && !e.goalsSubmittedAt) return true;
          return false;
        };
        const pendA = pend(ea, pa);
        const pendB = pend(eb, pb);
        if (pendA !== pendB) return pendA ? -1 : 1;
        return ea.studentName.localeCompare(eb.studentName, 'de');
      });

      return res.json({ round, students: merged, stats: roundStats(round) });
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

      const next: EpoNotenRoundPayload = {
        ...existing,
        title,
        date: typeof req.body?.date === 'string' ? req.body.date.trim() : existing.date,
        groupIds,
        assessmentModeByGroup,
      };

      await saveRound(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      if (next.publishedAt) {
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

        const resolved = roundIdQ
          ? all.find((r) => r.roundId === roundIdQ) || all[0]
          : all[0];

        const myEntry = findEntry(resolved.payload, user.id);
        const canEditSelf =
          resolved.isActiveForGroup &&
          Boolean(resolved.payload.publishedAt) &&
          !myEntry?.teacherReleasedAt;
        const canEditGoals =
          resolved.isActiveForGroup && Boolean(myEntry?.teacherReleasedAt) && !myEntry?.goalsSubmittedAt;

        return res.json({
          sessions: all.map((r) => studentSessionDto(r, user.id)),
          round: {
            id: resolved.roundId,
            title: resolved.payload.title,
            date: resolved.payload.date,
            publishedAt: resolved.payload.publishedAt,
            groupId: resolved.groupId,
            groupName: resolved.groupName,
            assessmentMode: assessmentModeForGroup(resolved.payload, resolved.groupId, resolved.groupName),
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

      const allRounds = await resolveStudentRounds(user.id);
      if (!teacherId || !roundId) {
        const first = roundId ? allRounds.find((r) => r.roundId === roundId) : allRounds[0];
        if (!first?.payload?.publishedAt) {
          return res.status(404).json({ error: 'Keine freigegebene EPO-Runde' });
        }
        teacherId = first.teacherId;
        roundId = first.roundId;
      }

      const resolvedRound = allRounds.find((r) => r.roundId === roundId && r.teacherId === teacherId);
      if (!resolvedRound?.isActiveForGroup) {
        return res.status(403).json({ error: 'Diese EPO-Runde ist nicht mehr aktiv' });
      }

      const payload = await loadRound(teacherId, roundId);
      if (!payload?.publishedAt) {
        return res.status(403).json({ error: 'EPO-Runde ist nicht freigegeben' });
      }

      const existing = findEntry(payload, user.id);
      if (existing?.teacherReleasedAt) {
        return res.status(403).json({ error: 'Bewertung bereits freigegeben — keine Änderung mehr möglich' });
      }

      const selfScores = normalizeCategoryScores(req.body?.selfScores);
      const total = sumCategoryScores(selfScores);

      const mode = assessmentModeForGroup(
        payload,
        resolvedRound.groupId,
        resolvedRound.groupName,
      );
      const selfGradeFromTable =
        typeof req.body?.selfGradeFromTable === 'string' && req.body.selfGradeFromTable.trim()
          ? req.body.selfGradeFromTable.trim()
          : rasterResultFromTotal(mode, total);

      const suggestedGradeMode = mode;

      const entry: EpoNotenEntry = {
        studentId: user.id,
        studentName: user.name,
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

      if (!teacherId || !roundId) {
        const first = (await resolveStudentRounds(user.id))[0];
        if (!first) return res.status(404).json({ error: 'Keine EPO-Runde' });
        teacherId = first.teacherId;
        roundId = first.roundId;
      }

      const payload = await loadRound(teacherId, roundId);
      if (!payload) return res.status(404).json({ error: 'Runde nicht gefunden' });

      const existing = findEntry(payload, user.id);
      if (!existing?.teacherReleasedAt) {
        return res.status(403).json({ error: 'Lehrerbewertung noch nicht freigegeben' });
      }

      const goal = typeof req.body?.goal === 'string' ? req.body.goal.trim() : '';
      const goalAction = typeof req.body?.goalAction === 'string' ? req.body.goalAction.trim() : '';
      if (!goal || !goalAction) {
        return res.status(400).json({ error: 'Ziel und Handlung sind erforderlich' });
      }

      const entry: EpoNotenEntry = {
        ...existing,
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

      const existing = findEntry(payload, studentId);
      const teacherScores = normalizeCategoryScores(req.body?.teacherScores);
      const total = sumCategoryScores(teacherScores);
      const computed = gradeFromTotalPoints(total);
      const teacherGrade =
        typeof req.body?.teacherGrade === 'string' ? req.body.teacherGrade.trim() : existing?.teacherGrade ?? '';

      const entry: EpoNotenEntry = {
        studentId,
        studentName: student.name,
        suggestedGrade: existing?.suggestedGrade,
        suggestedGradeMode: existing?.suggestedGradeMode,
        justification: existing?.justification,
        selfScores: existing?.selfScores,
        selfGradeFromTable: existing?.selfGradeFromTable,
        studentSubmittedAt: existing?.studentSubmittedAt ?? null,
        teacherScores,
        teacherGrade,
        teacherReleasedAt: existing?.teacherReleasedAt ?? null,
        goal: existing?.goal,
        goalAction: existing?.goalAction,
        goalsSubmittedAt: existing?.goalsSubmittedAt ?? null,
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
      const studentToGroup = new Map<string, string>();
      for (const g of groups) {
        if (!payload.groupIds.includes(g.id)) continue;
        for (const s of g.students) {
          studentToGroup.set(s.id, g.id);
        }
      }

      const now = new Date().toISOString();
      let count = 0;

      for (const entry of payload.entries) {
        if (entry.teacherReleasedAt) continue;
        const entryGroupId = studentToGroup.get(entry.studentId);
        if (groupId && entryGroupId !== groupId) continue;
        if (!all && studentIds.length > 0 && !studentIds.includes(entry.studentId)) continue;

        const mode = entryGroupId
          ? assessmentModeForGroup(payload, entryGroupId, groupNameById.get(entryGroupId))
          : 'note';
        const grade = effectiveTeacherGrade(entry, mode);
        if (!grade) continue;
        entry.teacherGrade = grade;
        entry.teacherReleasedAt = now;
        count += 1;
      }

      await saveRound(user.id, payload);
      return res.json({ success: true, releasedCount: count });
    } catch (error) {
      console.error('EpoNoten release error:', error);
      return res.status(500).json({ error: 'Fehler bei der Freigabe' });
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
        payload.entries = payload.entries.filter((e) => !studentIds.has(e.studentId));
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
