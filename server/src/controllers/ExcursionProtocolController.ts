import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Legacy — wird bei Migration gelesen */
export const EXCURSION_PROTOCOL_LEGACY_PATH = '__excursion_protocol_active__';
const EXCURSION_INDEX_PATH = '__excursion_protocol_index__';
const excursionPathForGroup = (groupId: string) => `__excursion_protocol_g_${groupId}__`;
const excursionDataPath = (excursionId: string) => `__excursion_protocol_e_${excursionId}__`;

const DEFAULT_REFLECTION_QUESTIONS: [string, string, string] = [
  'Was habe ich heute gelernt oder neu kennengelernt?',
  'Was hat mir besonders gut gefallen – und warum?',
  'Was würde ich beim nächsten Mal anders machen oder noch genauer wissen wollen?',
];

const DEFAULT_RATING_CRITERIA = [
  'Organisation',
  'Inhalte & Lernangebot',
  'Gruppenstimmung',
  'Betreuung',
  'Gesamteindruck',
];

type ExcursionActivity = {
  content: string;
  imageDataUrl?: string;
  activityRating?: number;
};

type ExcursionReflection = {
  learned: string;
  highlight: string;
  openQuestion: string;
};

type ExcursionRating = {
  criterion: string;
  score: number;
};

type ExcursionProtocolSubmission = {
  studentId: string;
  studentName: string;
  activities: ExcursionActivity[];
  reflection: ExcursionReflection;
  ratings: ExcursionRating[];
  submittedAt: string;
};

type ExcursionDataPayload = {
  id: string;
  title: string;
  date: string;
  groupIds: string[];
  publishedAt: string | null;
  /** ISO-Datum: danach keine Bearbeitung abgegebener Protokolle mehr. null = unbegrenzt */
  editDeadline: string | null;
  reflectionQuestions: [string, string, string];
  ratingCriteria: string[];
  submissions: ExcursionProtocolSubmission[];
  createdAt: string;
  updatedAt: string;
};

type ExcursionIndexPayload = {
  version: 2;
  excursions: Array<{
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

type LegacySessionPayload = {
  title: string;
  date: string;
  publishedAt: string;
  reflectionQuestions: [string, string, string];
  ratingCriteria: string[];
  submissions: ExcursionProtocolSubmission[];
};

/** Pro Gruppe — wie Exit-Ticket; Schüler lesen diesen Pfad. */
type GroupPublishRef = {
  excursionId: string;
  title: string;
  date: string;
  publishedAt: string;
  reflectionQuestions: [string, string, string];
  ratingCriteria: string[];
};

const emptyIndex = (): ExcursionIndexPayload => ({
  version: 2,
  excursions: [],
  activeByGroup: {},
});

const parseIndex = (raw: string | null | undefined): ExcursionIndexPayload => {
  if (!raw) return emptyIndex();
  try {
    const parsed = JSON.parse(raw) as ExcursionIndexPayload;
    if (!parsed || parsed.version !== 2 || !Array.isArray(parsed.excursions)) return emptyIndex();
    if (!parsed.activeByGroup || typeof parsed.activeByGroup !== 'object') parsed.activeByGroup = {};
    return parsed;
  } catch {
    return emptyIndex();
  }
};

const parseGroupPublishRef = (raw: string | null | undefined): GroupPublishRef | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GroupPublishRef;
    if (!parsed || typeof parsed.excursionId !== 'string' || !parsed.publishedAt) return null;
    if (typeof parsed.title !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
};

const parseLegacyPayload = (raw: string | null | undefined): LegacySessionPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LegacySessionPayload;
    if (!parsed || typeof parsed.title !== 'string') return null;
    if (!Array.isArray(parsed.submissions)) parsed.submissions = [];
    if (!Array.isArray(parsed.ratingCriteria) || parsed.ratingCriteria.length === 0) {
      parsed.ratingCriteria = [...DEFAULT_RATING_CRITERIA];
    }
    if (!Array.isArray(parsed.reflectionQuestions) || parsed.reflectionQuestions.length !== 3) {
      parsed.reflectionQuestions = [...DEFAULT_REFLECTION_QUESTIONS];
    }
    return parsed;
  } catch {
    return null;
  }
};

const parseExcursionData = (raw: string | null | undefined): ExcursionDataPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExcursionDataPayload;
    if (!parsed || typeof parsed.id !== 'string' || typeof parsed.title !== 'string') return null;
    if (!Array.isArray(parsed.submissions)) parsed.submissions = [];
    if (!Array.isArray(parsed.groupIds)) parsed.groupIds = [];
    if (!Array.isArray(parsed.ratingCriteria) || parsed.ratingCriteria.length === 0) {
      parsed.ratingCriteria = [...DEFAULT_RATING_CRITERIA];
    }
    if (!Array.isArray(parsed.reflectionQuestions) || parsed.reflectionQuestions.length !== 3) {
      parsed.reflectionQuestions = [...DEFAULT_REFLECTION_QUESTIONS];
    }
    if (parsed.editDeadline !== null && parsed.editDeadline !== undefined && typeof parsed.editDeadline !== 'string') {
      parsed.editDeadline = null;
    }
    if (parsed.editDeadline === undefined) parsed.editDeadline = null;
    return parsed;
  } catch {
    return null;
  }
};

const getUserByLoginCode = async (req: Request) => {
  const raw = req.headers['x-login-code'] as string | undefined;
  const loginCode = typeof raw === 'string' ? raw.trim() : '';
  if (!loginCode) return null;
  let user = await prisma.user.findUnique({
    where: { loginCode },
    select: { id: true, name: true, role: true },
  });
  if (!user) {
    const rows = await prisma.$queryRaw<Array<{ id: string; name: string; role: string }>>(
      Prisma.sql`SELECT id, name, role FROM User WHERE lower(loginCode) = lower(${loginCode}) LIMIT 1`,
    );
    user = rows[0] ?? null;
  }
  return user;
};

const loadTeacherGroupsWithStudents = async (teacherId: string) =>
  prisma.learningGroup.findMany({
    where: { teacherId },
    select: {
      id: true,
      name: true,
      students: {
        where: { role: 'STUDENT' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

const countUniqueStudentsInGroups = (
  groups: Array<{ id: string; students: Array<{ id: string }> }>,
  groupIds: string[],
) => {
  const idSet = new Set(groupIds);
  const ids = new Set<string>();
  for (const g of groups) {
    if (groupIds.length > 0 && !idSet.has(g.id)) continue;
    for (const s of g.students) ids.add(s.id);
  }
  return ids.size;
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

const saveIndex = async (teacherId: string, index: ExcursionIndexPayload) => {
  await writeRow(teacherId, EXCURSION_INDEX_PATH, JSON.stringify(index));
};

const saveExcursion = async (teacherId: string, data: ExcursionDataPayload) => {
  data.updatedAt = new Date().toISOString();
  await writeRow(teacherId, excursionDataPath(data.id), JSON.stringify(data));
  return data;
};

const deleteRow = async (teacherId: string, lessonPath: string) => {
  await prisma.teacherLessonInstruction.deleteMany({
    where: { teacherId, lessonPath },
  });
};

/** Gruppenspezifische Freigabe schreiben (wie Exit-Ticket) + Index synchronisieren */
const syncPublishedGroups = async (
  teacherId: string,
  data: ExcursionDataPayload,
  groupIds: string[],
  index: ExcursionIndexPayload,
  ownedGroupIds: string[],
) => {
  const publishedAt = data.publishedAt || new Date().toISOString();
  const ref: GroupPublishRef = {
    excursionId: data.id,
    title: data.title,
    date: data.date,
    publishedAt,
    reflectionQuestions: data.reflectionQuestions,
    ratingCriteria: data.ratingCriteria,
  };
  const refJson = JSON.stringify(ref);

  for (const gid of groupIds) {
    await writeRow(teacherId, excursionPathForGroup(gid), refJson);
    index.activeByGroup[gid] = data.id;
  }

  const ownedSet = new Set(ownedGroupIds);
  for (const gid of ownedGroupIds) {
    if (groupIds.includes(gid)) continue;
    if (index.activeByGroup[gid] !== data.id) continue;
    delete index.activeByGroup[gid];
    const raw = await readRow(teacherId, excursionPathForGroup(gid));
    const scoped = parseGroupPublishRef(raw);
    const legacy = parseLegacyPayload(raw);
    if (scoped?.excursionId === data.id || legacy) {
      await deleteRow(teacherId, excursionPathForGroup(gid));
    }
  }
};

const loadExcursion = async (teacherId: string, excursionId: string) => {
  const raw = await readRow(teacherId, excursionDataPath(excursionId));
  return parseExcursionData(raw);
};

const syncIndexEntry = (index: ExcursionIndexPayload, data: ExcursionDataPayload) => {
  const entry = {
    id: data.id,
    title: data.title,
    date: data.date,
    groupIds: data.groupIds,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
  const i = index.excursions.findIndex((e) => e.id === data.id);
  if (i >= 0) index.excursions[i] = entry;
  else index.excursions.push(entry);
  index.excursions.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

/** Alte gruppenspezifische Zeilen → Index v2 */
const migrateLegacyIfNeeded = async (teacherId: string): Promise<ExcursionIndexPayload> => {
  let index = parseIndex(await readRow(teacherId, EXCURSION_INDEX_PATH));
  if (index.excursions.length > 0) return index;

  const groups = await prisma.learningGroup.findMany({
    where: { teacherId },
    select: { id: true },
  });

  const legacyByKey = new Map<string, { groupIds: string[]; payload: LegacySessionPayload }>();

  const ingestLegacy = (groupId: string | null, payload: LegacySessionPayload) => {
    if (!payload.publishedAt) return;
    const key = `${payload.title}::${payload.date}::${payload.publishedAt}`;
    const existing = legacyByKey.get(key);
    if (existing) {
      if (groupId) existing.groupIds.push(groupId);
      return;
    }
    legacyByKey.set(key, {
      groupIds: groupId ? [groupId] : groups.map((g) => g.id),
      payload,
    });
  };

  for (const g of groups) {
    const raw = await readRow(teacherId, excursionPathForGroup(g.id));
    const payload = parseLegacyPayload(raw);
    if (payload) ingestLegacy(g.id, payload);
  }

  const legacyActive = parseLegacyPayload(await readRow(teacherId, EXCURSION_PROTOCOL_LEGACY_PATH));
  if (legacyActive) ingestLegacy(null, legacyActive);

  if (legacyByKey.size === 0) return index;

  const now = new Date().toISOString();
  for (const { groupIds, payload } of legacyByKey.values()) {
    const id = randomUUID();
    const data: ExcursionDataPayload = {
      id,
      title: payload.title,
      date: payload.date,
      groupIds: [...new Set(groupIds)],
      publishedAt: payload.publishedAt,
      editDeadline: null,
      reflectionQuestions: payload.reflectionQuestions,
      ratingCriteria: payload.ratingCriteria,
      submissions: payload.submissions,
      createdAt: now,
      updatedAt: now,
    };
    await saveExcursion(teacherId, data);
    syncIndexEntry(index, data);
    for (const gid of data.groupIds) {
      index.activeByGroup[gid] = id;
    }
  }

  await saveIndex(teacherId, index);
  return index;
};

const loadTeacherIndex = async (teacherId: string) => migrateLegacyIfNeeded(teacherId);

type ResolvedExcursion = {
  teacherId: string;
  teacherName: string;
  excursionId: string;
  lessonPath: string;
  payload: ExcursionDataPayload;
  groupId: string;
  groupName: string;
};

const resolveExcursionForStudentGroup = async (
  teacherId: string,
  groupId: string,
): Promise<{ excursionId: string; publishedAt: string } | null> => {
  const raw = await readRow(teacherId, excursionPathForGroup(groupId));
  const scoped = parseGroupPublishRef(raw);
  if (scoped?.excursionId && scoped.publishedAt) {
    return { excursionId: scoped.excursionId, publishedAt: scoped.publishedAt };
  }

  const legacy = parseLegacyPayload(raw);
  if (legacy?.publishedAt) {
    const index = await loadTeacherIndex(teacherId);
    const excursionId = index.activeByGroup[groupId];
    if (excursionId) return { excursionId, publishedAt: legacy.publishedAt };
  }

  const index = await loadTeacherIndex(teacherId);
  const excursionId = index.activeByGroup[groupId];
  if (!excursionId) return null;

  const payload = await loadExcursion(teacherId, excursionId);
  if (!payload?.publishedAt) return null;
  if (payload.groupIds.length > 0 && !payload.groupIds.includes(groupId)) return null;
  return { excursionId, publishedAt: payload.publishedAt };
};

const resolveStudentExcursions = async (studentId: string): Promise<ResolvedExcursion[]> => {
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

  const results: ResolvedExcursion[] = [];
  const seen = new Set<string>();

  const byTeacher = new Map<string, typeof groups>();
  for (const g of groups) {
    const list = byTeacher.get(g.teacherId) ?? [];
    list.push(g);
    byTeacher.set(g.teacherId, list);
  }

  for (const [teacherId, teacherGroups] of byTeacher) {
    const index = await loadTeacherIndex(teacherId);

    for (const meta of index.excursions) {
      if (!meta.publishedAt) continue;

      const payload = await loadExcursion(teacherId, meta.id);
      if (!payload?.publishedAt) continue;

      for (const g of teacherGroups) {
        if (payload.groupIds.length > 0 && !payload.groupIds.includes(g.id)) continue;

        const key = `${meta.id}:${g.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          teacherId,
          teacherName: g.teacher.name,
          excursionId: meta.id,
          lessonPath: excursionDataPath(meta.id),
          payload,
          groupId: g.id,
          groupName: g.name,
        });
      }
    }
  }

  results.sort((a, b) => {
    const ams = new Date(a.payload.publishedAt || 0).getTime();
    const bms = new Date(b.payload.publishedAt || 0).getTime();
    return bms - ams;
  });
  return results;
};

const assertStudentCanAccessExcursion = async (
  studentId: string,
  teacherId: string,
  excursionId: string,
): Promise<boolean> => {
  const payload = await loadExcursion(teacherId, excursionId);
  if (!payload?.publishedAt) return false;

  const studentGroups = await prisma.learningGroup.findMany({
    where: { teacherId, students: { some: { id: studentId } } },
    select: { id: true },
  });

  if (payload.groupIds.length === 0) return true;
  return studentGroups.some((g) => payload.groupIds.includes(g.id));
};

const normalizeReflection = (raw: unknown): [string, string, string] => {
  const arr = Array.isArray(raw) ? (raw as string[]).map((q) => String(q).trim()).filter(Boolean) : [];
  return [
    arr[0] || DEFAULT_REFLECTION_QUESTIONS[0],
    arr[1] || DEFAULT_REFLECTION_QUESTIONS[1],
    arr[2] || DEFAULT_REFLECTION_QUESTIONS[2],
  ];
};

const normalizeCriteria = (raw: unknown): string[] => {
  const arr = Array.isArray(raw) ? (raw as string[]).map((c) => String(c).trim()).filter(Boolean) : [];
  return arr.length > 0 ? arr : [...DEFAULT_RATING_CRITERIA];
};

const normalizeEditDeadline = (raw: unknown, existing: string | null = null): string | null => {
  if (raw === null || raw === '') return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    const d = new Date(t);
    if (Number.isNaN(d.getTime())) return existing;
    return d.toISOString();
  }
  return existing;
};

const canStudentEditSubmission = (payload: ExcursionDataPayload, hasSubmission: boolean): boolean => {
  if (!hasSubmission) return true;
  if (!payload.editDeadline) return true;
  return Date.now() <= new Date(payload.editDeadline).getTime();
};

const sessionDto = (payload: ExcursionDataPayload) => ({
  id: payload.id,
  title: payload.title,
  date: payload.date,
  groupIds: payload.groupIds,
  editDeadline: payload.editDeadline ?? null,
  reflectionQuestions: payload.reflectionQuestions,
  ratingCriteria: payload.ratingCriteria,
});

export class ExcursionProtocolController {
  /** Lehrkraft: alle Protokolle */
  static async list(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const index = await loadTeacherIndex(user.id);
      const groups = await loadTeacherGroupsWithStudents(user.id);
      const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

      const items = await Promise.all(
        index.excursions.map(async (meta) => {
          const data = await loadExcursion(user.id, meta.id);
          const submissionCount = data?.submissions.length ?? 0;
          const targetGroups = meta.groupIds.length > 0 ? meta.groupIds : groups.map((g) => g.id);
          return {
            ...meta,
            groupNames: targetGroups.map((id) => groupNameById.get(id) || id),
            ratingCriteria: data?.ratingCriteria ?? [...DEFAULT_RATING_CRITERIA],
            reflectionQuestions: data?.reflectionQuestions ?? [...DEFAULT_REFLECTION_QUESTIONS],
            editDeadline: data?.editDeadline ?? null,
            submissionCount,
            totalStudents: countUniqueStudentsInGroups(groups, targetGroups),
            isPublished: Boolean(meta.publishedAt),
          };
        }),
      );

      return res.json({
        excursions: items,
        groups: groups.map((g) => ({ id: g.id, name: g.name, studentCount: g.students.length })),
      });
    } catch (error) {
      console.error('ExcursionProtocol list error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Protokolle' });
    }
  }

  /** Lehrkraft: neues Protokoll (Entwurf) */
  static async create(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      const date = typeof req.body?.date === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10);
      const groupIds = Array.isArray(req.body?.groupIds)
        ? (req.body.groupIds as string[]).map((g) => String(g).trim()).filter(Boolean)
        : [];

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));
      const validGroupIds = groupIds.filter((id) => ownedIds.has(id));

      const now = new Date().toISOString();
      const id = randomUUID();
      const data: ExcursionDataPayload = {
        id,
        title,
        date,
        groupIds: validGroupIds,
        publishedAt: null,
        editDeadline: normalizeEditDeadline(req.body?.editDeadline, null),
        reflectionQuestions: normalizeReflection(req.body?.reflectionQuestions),
        ratingCriteria: normalizeCriteria(req.body?.ratingCriteria),
        submissions: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveExcursion(user.id, data);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, data);
      await saveIndex(user.id, index);

      return res.json({ success: true, excursion: data });
    } catch (error) {
      console.error('ExcursionProtocol create error:', error);
      return res.status(500).json({ error: 'Fehler beim Erstellen' });
    }
  }

  /** Lehrkraft: Protokoll bearbeiten */
  static async update(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const excursionId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      if (!excursionId) return res.status(400).json({ error: 'ID fehlt' });

      const existing = await loadExcursion(user.id, excursionId);
      if (!existing) return res.status(404).json({ error: 'Protokoll nicht gefunden' });

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));
      let groupIds = existing.groupIds;
      if (Array.isArray(req.body?.groupIds)) {
        groupIds = (req.body.groupIds as string[]).map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
      }

      const next: ExcursionDataPayload = {
        ...existing,
        title,
        date: typeof req.body?.date === 'string' ? req.body.date.trim() : existing.date,
        groupIds,
        reflectionQuestions: req.body?.reflectionQuestions
          ? normalizeReflection(req.body.reflectionQuestions)
          : existing.reflectionQuestions,
        ratingCriteria: req.body?.ratingCriteria
          ? normalizeCriteria(req.body.ratingCriteria)
          : existing.ratingCriteria,
        editDeadline:
          req.body?.editDeadline !== undefined
            ? normalizeEditDeadline(req.body.editDeadline, existing.editDeadline ?? null)
            : existing.editDeadline ?? null,
      };

      await saveExcursion(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      if (next.publishedAt) {
        const owned = await loadTeacherGroupsWithStudents(user.id);
        await syncPublishedGroups(
          user.id,
          next,
          next.groupIds.length > 0 ? next.groupIds : owned.map((g) => g.id),
          index,
          owned.map((g) => g.id),
        );
      }
      await saveIndex(user.id, index);

      return res.json({ success: true, excursion: next });
    } catch (error) {
      console.error('ExcursionProtocol update error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  /** Lehrkraft: freigeben für gewählte Gruppen */
  static async publishById(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const excursionId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      if (!excursionId) return res.status(400).json({ error: 'ID fehlt' });

      const existing = await loadExcursion(user.id, excursionId);
      if (!existing) return res.status(404).json({ error: 'Protokoll nicht gefunden' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));

      let groupIds = existing.groupIds;
      if (Array.isArray(req.body?.groupIds)) {
        groupIds = (req.body.groupIds as string[]).map((g) => String(g).trim()).filter((id) => ownedIds.has(id));
      }
      if (groupIds.length === 0) {
        return res.status(400).json({ error: 'Mindestens eine Lerngruppe auswählen' });
      }

      const publishedAt = new Date().toISOString();
      const next: ExcursionDataPayload = {
        ...existing,
        groupIds,
        publishedAt,
      };

      await saveExcursion(user.id, next);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, next);
      await syncPublishedGroups(user.id, next, groupIds, index, owned.map((g) => g.id));
      await saveIndex(user.id, index);

      return res.json({
        success: true,
        publishedAt,
        excursionId,
        groupIds,
        groupNames: owned.filter((g) => groupIds.includes(g.id)).map((g) => g.name),
        lessonPath: excursionDataPath(excursionId),
      });
    } catch (error) {
      console.error('ExcursionProtocol publishById error:', error);
      return res.status(500).json({ error: 'Fehler beim Freigeben' });
    }
  }

  /** Lehrkraft: Protokoll löschen */
  static async remove(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const excursionId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
      if (!excursionId) return res.status(400).json({ error: 'ID fehlt' });

      const index = await loadTeacherIndex(user.id);
      index.excursions = index.excursions.filter((e) => e.id !== excursionId);
      for (const [gid, eid] of Object.entries(index.activeByGroup)) {
        if (eid === excursionId) delete index.activeByGroup[gid];
      }
      await saveIndex(user.id, index);

      await prisma.teacherLessonInstruction.deleteMany({
        where: { teacherId: user.id, lessonPath: excursionDataPath(excursionId) },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('ExcursionProtocol remove error:', error);
      return res.status(500).json({ error: 'Fehler beim Löschen' });
    }
  }

  /** Legacy publish — create + publish in einem Schritt */
  static async publish(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const excursionId = typeof req.body?.excursionId === 'string' ? req.body.excursionId.trim() : '';
      if (excursionId) {
        req.params = { id: excursionId };
        return ExcursionProtocolController.publishById(req, res);
      }

      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      if (!title) return res.status(400).json({ error: 'Titel ist erforderlich' });

      const owned = await loadTeacherGroupsWithStudents(user.id);
      const ownedIds = new Set(owned.map((g) => g.id));
      let groupIds = Array.isArray(req.body?.groupIds)
        ? (req.body.groupIds as string[]).map((g) => String(g).trim()).filter((id) => ownedIds.has(id))
        : owned.map((g) => g.id);
      if (groupIds.length === 0) groupIds = owned.map((g) => g.id);

      const now = new Date().toISOString();
      const id = randomUUID();
      const publishedAt = now;
      const data: ExcursionDataPayload = {
        id,
        title,
        date: typeof req.body?.date === 'string' ? req.body.date.trim() : new Date().toISOString().slice(0, 10),
        groupIds,
        publishedAt,
        editDeadline: normalizeEditDeadline(req.body?.editDeadline, null),
        reflectionQuestions: normalizeReflection(req.body?.reflectionQuestions),
        ratingCriteria: normalizeCriteria(req.body?.ratingCriteria),
        submissions: [],
        createdAt: now,
        updatedAt: now,
      };

      await saveExcursion(user.id, data);
      const index = await loadTeacherIndex(user.id);
      syncIndexEntry(index, data);
      await syncPublishedGroups(user.id, data, groupIds, index, owned.map((g) => g.id));
      await saveIndex(user.id, index);

      return res.json({
        success: true,
        publishedAt,
        excursionId: id,
        groupIds,
        groupNames: owned.filter((g) => groupIds.includes(g.id)).map((g) => g.name),
        lessonPath: excursionDataPath(id),
      });
    } catch (error) {
      console.error('ExcursionProtocol publish error:', error);
      return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
    }
  }

  static async getCurrent(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      if (user.role === 'STUDENT') {
        const excursionIdQ = typeof req.query.excursionId === 'string' ? req.query.excursionId.trim() : '';
        const all = await resolveStudentExcursions(user.id);

        if (all.length === 0) {
          const groups = await prisma.learningGroup.findMany({
            where: { students: { some: { id: user.id } } },
            select: { teacherId: true, teacher: { select: { name: true } } },
            take: 1,
          });
          if (groups.length === 0) return res.status(404).json({ error: 'Keine Lerngruppe gefunden' });
          return res.json({
            session: null,
            sessions: [],
            publishedAt: null,
            teacherId: groups[0].teacherId,
            teacherName: groups[0].teacher.name,
            excursionId: null,
            lessonPath: null,
          });
        }

        const resolved = excursionIdQ
          ? all.find((e) => e.excursionId === excursionIdQ) || all[0]
          : all[0];

        const mine = resolved.payload.submissions.filter((s) => s.studentId === user.id);
        mine.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        const mySubmission = mine[0] ?? null;
        const hasSubmission = Boolean(mySubmission);

        return res.json({
          session: sessionDto(resolved.payload),
          sessions: all.map((e) => {
            const sub = e.payload.submissions.find((s) => s.studentId === user.id);
            const submitted = Boolean(sub);
            return {
              ...sessionDto(e.payload),
              publishedAt: e.payload.publishedAt,
              teacherId: e.teacherId,
              teacherName: e.teacherName,
              groupId: e.groupId,
              groupName: e.groupName,
              lessonPath: e.lessonPath,
              studentSubmitted: submitted,
              studentSubmittedAt: sub?.submittedAt ?? null,
              studentCanEdit: canStudentEditSubmission(e.payload, submitted),
            };
          }),
          publishedAt: resolved.payload.publishedAt,
          editDeadline: resolved.payload.editDeadline ?? null,
          canEdit: canStudentEditSubmission(resolved.payload, hasSubmission),
          teacherId: resolved.teacherId,
          teacherName: resolved.teacherName,
          excursionId: resolved.excursionId,
          lessonPath: resolved.lessonPath,
          groupId: resolved.groupId,
          groupName: resolved.groupName,
          mySubmission,
        });
      }

      const index = await loadTeacherIndex(user.id);
      const groups = await loadTeacherGroupsWithStudents(user.id);

      return res.json({
        teacherId: user.id,
        teacherName: user.name,
        excursionCount: index.excursions.length,
        publishedCount: index.excursions.filter((e) => e.publishedAt).length,
        groupCount: groups.length,
      });
    } catch (error) {
      console.error('ExcursionProtocol getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Nur Schüler können protokollieren' });

      const activities = Array.isArray(req.body?.activities) ? (req.body.activities as ExcursionActivity[]) : null;
      const reflection = req.body?.reflection as ExcursionReflection | undefined;
      const ratings = Array.isArray(req.body?.ratings) ? (req.body.ratings as ExcursionRating[]) : null;

      if (!activities || activities.length === 0) {
        return res.status(400).json({ error: 'Mindestens eine Aktivität ist erforderlich' });
      }
      if (!reflection || typeof reflection.learned !== 'string') {
        return res.status(400).json({ error: 'Reflexion ist erforderlich' });
      }
      if (!ratings || ratings.length === 0) {
        return res.status(400).json({ error: 'Bewertung ist erforderlich' });
      }

      const bodyTeacherId = typeof req.body?.teacherId === 'string' ? req.body.teacherId.trim() : '';
      const bodyExcursionId = typeof req.body?.excursionId === 'string' ? req.body.excursionId.trim() : '';
      const bodyLessonPath = typeof req.body?.lessonPath === 'string' ? req.body.lessonPath.trim() : '';

      let teacherId: string;
      let excursionId: string;

      if (bodyExcursionId && bodyTeacherId) {
        const ok = await assertStudentCanAccessExcursion(user.id, bodyTeacherId, bodyExcursionId);
        if (!ok) return res.status(403).json({ error: 'Kein Zugriff auf dieses Protokoll' });
        teacherId = bodyTeacherId;
        excursionId = bodyExcursionId;
      } else if (bodyLessonPath?.startsWith('__excursion_protocol_e_') && bodyTeacherId) {
        const m = bodyLessonPath.match(/^__excursion_protocol_e_(.+?)__$/);
        excursionId = m?.[1] || '';
        if (!excursionId) return res.status(400).json({ error: 'Ungültiger Pfad' });
        const ok = await assertStudentCanAccessExcursion(user.id, bodyTeacherId, excursionId);
        if (!ok) return res.status(403).json({ error: 'Kein Zugriff' });
        teacherId = bodyTeacherId;
      } else {
        const resolved = (await resolveStudentExcursions(user.id))[0];
        if (!resolved?.payload?.publishedAt) {
          return res.status(404).json({ error: 'Kein aktives Exkursionsprotokoll vorhanden' });
        }
        teacherId = resolved.teacherId;
        excursionId = resolved.excursionId;
      }

      const payload = await loadExcursion(teacherId, excursionId);
      if (!payload?.publishedAt) {
        return res.status(403).json({ error: 'Protokoll ist noch nicht freigegeben' });
      }

      const existingSubmission = payload.submissions.find((item) => item.studentId === user.id);
      if (existingSubmission && !canStudentEditSubmission(payload, true)) {
        return res.status(403).json({ error: 'Bearbeitungszeitraum ist abgelaufen.' });
      }

      const nextSubmissions = payload.submissions.filter((item) => item.studentId !== user.id);
      nextSubmissions.push({
        studentId: user.id,
        studentName: user.name,
        activities: activities.map((a) => ({
          content: String(a.content || '').trim(),
          imageDataUrl: typeof a.imageDataUrl === 'string' ? a.imageDataUrl : undefined,
          activityRating:
            typeof a.activityRating === 'number'
              ? Math.min(5, Math.max(1, Math.round(a.activityRating)))
              : undefined,
        })),
        reflection: {
          learned: String(reflection.learned || '').trim(),
          highlight: String(reflection.highlight || '').trim(),
          openQuestion: String(reflection.openQuestion || '').trim(),
        },
        ratings: ratings.map((r) => ({
          criterion: String(r.criterion || '').trim(),
          score: Math.min(5, Math.max(1, Number(r.score) || 0)),
        })),
        submittedAt: new Date().toISOString(),
      });

      await saveExcursion(teacherId, { ...payload, submissions: nextSubmissions });

      return res.json({ success: true });
    } catch (error) {
      console.error('ExcursionProtocol submit error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern' });
    }
  }

  static async getSubmissions(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte haben Zugriff' });

      const excursionIdQ =
        typeof req.query.excursionId === 'string'
          ? req.query.excursionId.trim()
          : typeof req.query.lessonPath === 'string'
            ? req.query.lessonPath.match(/^__excursion_protocol_e_(.+?)__$/)?.[1] || ''
            : '';

      if (!excursionIdQ) {
        return res.status(400).json({ error: 'excursionId ist erforderlich' });
      }

      const payload = await loadExcursion(user.id, excursionIdQ);
      const groups = await loadTeacherGroupsWithStudents(user.id);

      if (!payload) {
        return res.json({ session: null, submissions: [], roster: [], totalStudents: 0 });
      }

      const targetGroupIds = payload.groupIds.length > 0 ? payload.groupIds : groups.map((g) => g.id);
      const targetGroups = groups.filter((g) => targetGroupIds.includes(g.id));

      const submissionByStudent = new Map(payload.submissions.map((s) => [s.studentId, s]));
      const roster: Array<{
        studentId: string;
        studentName: string;
        groupId: string;
        groupName: string;
        submitted: boolean;
        submittedAt: string | null;
        submission: ExcursionProtocolSubmission | null;
      }> = [];

      for (const g of targetGroups) {
        for (const student of g.students) {
          const submission = submissionByStudent.get(student.id) ?? null;
          roster.push({
            studentId: student.id,
            studentName: student.name,
            groupId: g.id,
            groupName: g.name,
            submitted: Boolean(submission),
            submittedAt: submission?.submittedAt ?? null,
            submission,
          });
        }
      }

      roster.sort((a, b) => {
        if (a.submitted !== b.submitted) return a.submitted ? -1 : 1;
        return a.studentName.localeCompare(b.studentName, 'de');
      });

      return res.json({
        session: sessionDto(payload),
        publishedAt: payload.publishedAt,
        excursionId: payload.id,
        submissions: payload.submissions,
        roster,
        totalStudents: countUniqueStudentsInGroups(groups, targetGroupIds),
        submittedCount: payload.submissions.length,
        pendingCount: roster.filter((r) => !r.submitted).length,
      });
    } catch (error) {
      console.error('ExcursionProtocol getSubmissions error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Abgaben' });
    }
  }
}
