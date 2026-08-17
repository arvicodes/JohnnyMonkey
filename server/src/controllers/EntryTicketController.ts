import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENTRY_TICKET_LEGACY_PATH = '__entry_ticket_active__';
/** Persistente eigene Fragensets der Lehrkraft (nicht nur Browser-localStorage). */
const ENTRY_TICKET_CUSTOM_SETS_PATH = '__entry_ticket_custom_sets__';

const entryTicketPathForGroup = (groupId: string) => `__entry_ticket_g_${groupId}__`;
const entryTicketDonePathForGroup = (groupId: string) => `__entry_ticket_done_g_${groupId}__`;
const groupIdFromEntryTicketPath = (path: string | null | undefined): string | null => {
  if (!path) return null;
  const m = /^__entry_ticket_g_(.+)__$/.exec(path);
  return m?.[1] ?? null;
};

type EntryTicketTaskPayload = {
  category: string;
  prompt: string;
  solution: string;
  sourceKey?: string;
  id?: string;
};

type EntryTicketCustomSetPayload = {
  id: string;
  name: string;
  reihePath?: string;
  /** Persönliche Lehrer-Notizen */
  notes?: string;
  lessons: Array<{
    id: string;
    lessonName: string;
    lessonKey?: string;
    topicName?: string;
    tasks: EntryTicketTaskPayload[];
  }>;
};

type EntryTicketPayload = {
  startedAt: string;
  /** 0..9 — welches Motiv unter /entry-ticket/entry-NN.jpg; pro Signal neu gewürfelt, bleibt bis zum nächsten Signal */
  heroImageIndex?: number;
  /** Fragenset: "7" | "inf11" | "c_…" — vom Lehrer beim Start gesetzt */
  grade?: string;
  /** Zufalls-Seed für dieselbe Aufgabenauswahl wie bei der Lehrkraft */
  taskSeed?: number;
  /** Echter Stundenordner-Pfad (nicht das Signal-Pseudo-Pfad) */
  materialLessonPath?: string | null;
  /** Konkrete Karten der laufenden Session (für Moderator ohne Lehrer-localStorage) */
  tasks?: EntryTicketTaskPayload[];
  /** Snapshot des eigenen Fragensets (z. B. KI-Reihe), damit Moderator dasselbe Set hat */
  customSet?: EntryTicketCustomSetPayload;
  /** Nur Archive: wann „Erledigt“ gesetzt wurde */
  completedAt?: string;
};

type EntryTicketArchiveStore = {
  archives: EntryTicketPayload[];
};

const clampHeroIndex = (n: unknown): number => {
  if (typeof n !== 'number' || !Number.isInteger(n)) return 0;
  return Math.min(9, Math.max(0, n));
};

const normalizeGradeParam = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const g = raw.trim();
  if (!g || g.length > 120) return undefined;
  return g;
};

const normalizeTaskSeed = (raw: unknown): number | undefined => {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return (Math.floor(raw) >>> 0);
};

const normalizeMaterialLessonPath = (raw: unknown): string | null | undefined => {
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  let p = raw.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  if (!p || p.startsWith('__')) return null;
  // Absolute / gemischte Pfade → kanonisch „J-M-Reihen/…“
  if (p.startsWith('git-intern/')) {
    p = `J-M-Reihen/${p.slice('git-intern/'.length)}`;
  } else {
    const marker = 'J-M-Reihen/';
    const idx = p.indexOf(marker);
    if (idx >= 0) p = p.slice(idx);
  }
  return p || null;
};

const sameLessonPath = (a?: string | null, b?: string | null): boolean => {
  const na = normalizeMaterialLessonPath(a) || '';
  const nb = normalizeMaterialLessonPath(b) || '';
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Fallback: ein Pfad endet mit dem anderen (verschiedene Präfixe)
  return na.endsWith(`/${nb}`) || nb.endsWith(`/${na}`) || na.endsWith(nb) || nb.endsWith(na);
};

const normalizeTasksPayload = (raw: unknown): EntryTicketTaskPayload[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const out: EntryTicketTaskPayload[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const prompt = typeof r.prompt === 'string' ? r.prompt.trim() : '';
    const solution = typeof r.solution === 'string' ? r.solution.trim() : '';
    if (!prompt || !solution) continue;
    const sourceKey =
      typeof r.sourceKey === 'string' && r.sourceKey.trim().startsWith('c:')
        ? r.sourceKey.trim().slice(0, 160)
        : undefined;
    const id =
      typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 80) : undefined;
    out.push({
      category:
        typeof r.category === 'string' && r.category.trim() ? r.category.trim().slice(0, 80) : 'Eigen',
      prompt: prompt.slice(0, 8000),
      solution: solution.slice(0, 8000),
      ...(sourceKey ? { sourceKey } : {}),
      ...(id ? { id } : {}),
    });
    if (out.length >= 80) break;
  }
  return out.length > 0 ? out : undefined;
};

const normalizeCustomSetPayload = (raw: unknown): EntryTicketCustomSetPayload | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id.trim() : '';
  if (!id.startsWith('c_') || id.length < 4) return undefined;
  const name =
    typeof row.name === 'string' && row.name.trim() ? row.name.trim().slice(0, 120) : 'Fragenset';
  const lessonsRaw = Array.isArray(row.lessons) ? row.lessons : [];
  const lessons: EntryTicketCustomSetPayload['lessons'] = [];
  for (const lessonRaw of lessonsRaw) {
    if (!lessonRaw || typeof lessonRaw !== 'object') continue;
    const lesson = lessonRaw as Record<string, unknown>;
    const lessonName =
      typeof lesson.lessonName === 'string' && lesson.lessonName.trim()
        ? lesson.lessonName.trim().slice(0, 160)
        : '';
    if (!lessonName) continue;
    const tasks = normalizeTasksPayload(lesson.tasks) ?? [];
    lessons.push({
      id:
        typeof lesson.id === 'string' && lesson.id.trim()
          ? lesson.id.trim().slice(0, 80)
          : `ls_${lessons.length + 1}`,
      lessonName,
      ...(typeof lesson.lessonKey === 'string' && lesson.lessonKey.trim()
        ? { lessonKey: lesson.lessonKey.trim().replace(/\\/g, '/').slice(0, 500) }
        : {}),
      ...(typeof lesson.topicName === 'string' && lesson.topicName.trim()
        ? { topicName: lesson.topicName.trim().slice(0, 120) }
        : {}),
      tasks,
    });
    if (lessons.length >= 40) break;
  }
  if (lessons.length === 0) return undefined;
  const reihePath =
    typeof row.reihePath === 'string' && row.reihePath.trim()
      ? row.reihePath.trim().replace(/\\/g, '/').slice(0, 500)
      : undefined;
  const notes =
    typeof row.notes === 'string' && row.notes.trim()
      ? row.notes.replace(/\r\n/g, '\n').slice(0, 4000)
      : undefined;
  return {
    id,
    name,
    ...(reihePath ? { reihePath } : {}),
    ...(notes ? { notes } : {}),
    lessons,
  };
};

/** Lehrer-Notizen nie in Play-/SuS-Payloads (nur im privaten Fragenset-Speicher). */
function withoutCustomSetNotes(
  set: EntryTicketCustomSetPayload | undefined | null,
): EntryTicketCustomSetPayload | undefined {
  if (!set) return undefined;
  const { notes: _omit, ...rest } = set;
  return rest;
}

const parsePayload = (raw: string | null | undefined): EntryTicketPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EntryTicketPayload;
    if (!parsed || typeof parsed.startedAt !== 'string') return null;
    return {
      startedAt: parsed.startedAt,
      heroImageIndex: clampHeroIndex(parsed.heroImageIndex),
      grade: normalizeGradeParam(parsed.grade),
      taskSeed: normalizeTaskSeed(parsed.taskSeed),
      materialLessonPath: normalizeMaterialLessonPath(parsed.materialLessonPath) ?? undefined,
      tasks: normalizeTasksPayload(parsed.tasks),
      customSet: withoutCustomSetNotes(normalizeCustomSetPayload(parsed.customSet)),
      ...(typeof parsed.completedAt === 'string' && parsed.completedAt.trim()
        ? { completedAt: parsed.completedAt.trim() }
        : {}),
    };
  } catch {
    return null;
  }
};

const parseArchiveStore = (raw: string | null | undefined): EntryTicketArchiveStore => {
  if (!raw) return { archives: [] };
  try {
    const parsed = JSON.parse(raw) as EntryTicketArchiveStore & EntryTicketPayload;
    if (Array.isArray(parsed?.archives)) {
      const archives = parsed.archives
        .map((row) => {
          if (!row || typeof row !== 'object') return null;
          const asPayload = parsePayload(JSON.stringify(row));
          if (!asPayload) return null;
          const completedAt =
            typeof (row as EntryTicketPayload).completedAt === 'string'
              ? (row as EntryTicketPayload).completedAt
              : undefined;
          return completedAt ? { ...asPayload, completedAt } : asPayload;
        })
        .filter(Boolean) as EntryTicketPayload[];
      return { archives };
    }
    // Legacy: einzelne Payload-Zeile statt Store
    const single = parsePayload(raw);
    return single ? { archives: [single] } : { archives: [] };
  } catch {
    return { archives: [] };
  }
};

async function upsertArchiveForGroup(
  teacherId: string,
  groupId: string,
  payload: EntryTicketPayload,
): Promise<void> {
  const lessonPath = entryTicketDonePathForGroup(groupId);
  const row = await prisma.teacherLessonInstruction.findUnique({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
    select: { content: true },
  });
  const store = parseArchiveStore(row?.content);
  const completedAt = new Date().toISOString();
  const entry: EntryTicketPayload = {
    ...payload,
    completedAt,
    materialLessonPath: normalizeMaterialLessonPath(payload.materialLessonPath) ?? null,
  };
  // Append-only Historie: jedes „Erledigt“ behalten (1. Set, 2. Set, …).
  // getCompleted nutzt weiterhin den neuesten Treffer je Stundenpfad (.find auf unshift-Liste).
  let archives = [entry, ...store.archives];
  archives = archives.slice(0, 200);
  const content = JSON.stringify({ archives });
  await prisma.teacherLessonInstruction.upsert({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
    create: { teacherId, lessonPath, content },
    update: { content },
  });
}

function countCustomSetTasks(set: EntryTicketCustomSetPayload): number {
  return (set.lessons || []).reduce((n, l) => n + (l.tasks?.length || 0), 0);
}

function mergeCustomSetMaps(
  into: Map<string, EntryTicketCustomSetPayload>,
  set: EntryTicketCustomSetPayload | null | undefined,
) {
  if (!set?.id || !set.id.startsWith('c_')) return;
  const prev = into.get(set.id);
  if (!prev || countCustomSetTasks(set) >= countCustomSetTasks(prev)) {
    into.set(set.id, {
      id: set.id,
      name: set.name || 'Fragenset',
      lessons: Array.isArray(set.lessons) ? set.lessons : [],
      ...(set.reihePath || prev?.reihePath
        ? { reihePath: set.reihePath || prev?.reihePath }
        : {}),
      ...(set.notes || prev?.notes ? { notes: set.notes ?? prev?.notes } : {}),
    });
  }
}

async function loadStoredCustomSets(teacherId: string): Promise<EntryTicketCustomSetPayload[]> {
  const row = await prisma.teacherLessonInstruction.findUnique({
    where: {
      teacherId_lessonPath: { teacherId, lessonPath: ENTRY_TICKET_CUSTOM_SETS_PATH },
    },
    select: { content: true },
  });
  if (!row?.content) return [];
  try {
    const parsed = JSON.parse(row.content) as { sets?: unknown };
    if (!Array.isArray(parsed?.sets)) return [];
    return parsed.sets
      .map((raw) => normalizeCustomSetPayload(raw))
      .filter(Boolean) as EntryTicketCustomSetPayload[];
  } catch {
    return [];
  }
}

async function saveStoredCustomSets(
  teacherId: string,
  sets: EntryTicketCustomSetPayload[],
): Promise<void> {
  const cleaned = sets
    .map((s) => normalizeCustomSetPayload(s))
    .filter(Boolean) as EntryTicketCustomSetPayload[];
  await prisma.teacherLessonInstruction.upsert({
    where: {
      teacherId_lessonPath: { teacherId, lessonPath: ENTRY_TICKET_CUSTOM_SETS_PATH },
    },
    create: {
      teacherId,
      lessonPath: ENTRY_TICKET_CUSTOM_SETS_PATH,
      content: JSON.stringify({ sets: cleaned }),
    },
    update: { content: JSON.stringify({ sets: cleaned }) },
  });
}

/** Aus aktiven Signalen / Archiven Fragensets einsammeln (Wiederherstellung nach leerem localStorage). */
async function recoverCustomSetsFromSignals(
  teacherId: string,
): Promise<EntryTicketCustomSetPayload[]> {
  const rows = await prisma.teacherLessonInstruction.findMany({
    where: {
      teacherId,
      OR: [
        { lessonPath: ENTRY_TICKET_LEGACY_PATH },
        { lessonPath: { startsWith: '__entry_ticket_g_' } },
        { lessonPath: { startsWith: '__entry_ticket_done_' } },
      ],
    },
    select: { content: true },
  });
  const byId = new Map<string, EntryTicketCustomSetPayload>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.content) as {
        customSet?: unknown;
        archives?: Array<{ customSet?: unknown }>;
      };
      mergeCustomSetMaps(byId, normalizeCustomSetPayload(parsed.customSet));
      if (Array.isArray(parsed.archives)) {
        for (const a of parsed.archives) {
          mergeCustomSetMaps(byId, normalizeCustomSetPayload(a?.customSet));
        }
      }
    } catch {
      /* ignore */
    }
  }
  return Array.from(byId.values());
}

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

type ResolvedEntryTicket = {
  teacherId: string;
  teacherName: string;
  lessonPath: string;
  payload: EntryTicketPayload;
  learningGroupId?: string | null;
};

const entryTicketGroupIdFromPath = (lessonPath: string): string | null => {
  const m = /^__entry_ticket_g_(.+)__$/.exec(String(lessonPath || '').trim());
  return m?.[1] || null;
};

async function resolveModeratorContext(
  studentId: string,
  opts?: { lessonPath?: string | null; teacherId?: string | null },
): Promise<{ isModerator: boolean; learningGroupId: string | null; groupName: string | null }> {
  const moderated = await prisma.learningGroup.findMany({
    where: { moderatorStudentId: studentId },
    select: { id: true, name: true, teacherId: true },
  });
  if (moderated.length === 0) {
    return { isModerator: false, learningGroupId: null, groupName: null };
  }

  const fromPath = opts?.lessonPath ? entryTicketGroupIdFromPath(opts.lessonPath) : null;
  if (fromPath) {
    const hit = moderated.find((g) => g.id === fromPath);
    if (hit) {
      return { isModerator: true, learningGroupId: hit.id, groupName: hit.name };
    }
    // Scoped-Signal für andere Gruppe → kein Moderator-Recht für dieses Ticket
    return { isModerator: false, learningGroupId: null, groupName: null };
  }

  if (opts?.teacherId) {
    const hit = moderated.find((g) => g.teacherId === opts.teacherId);
    if (hit) {
      return { isModerator: true, learningGroupId: hit.id, groupName: hit.name };
    }
    return { isModerator: false, learningGroupId: null, groupName: null };
  }

  // Ohne aktives Ticket: allgemeiner Moderator-Status (für Seiten-Gate)
  return {
    isModerator: true,
    learningGroupId: moderated[0].id,
    groupName: moderated[0].name,
  };
}

const resolveStudentEntryTicket = async (studentId: string): Promise<ResolvedEntryTicket | null> => {
  const groups = await prisma.learningGroup.findMany({
    where: { students: { some: { id: studentId } } },
    select: {
      id: true,
      teacherId: true,
      teacher: { select: { id: true, name: true } },
    },
  });
  if (groups.length === 0) return null;

  const candidates: ResolvedEntryTicket[] = [];
  const legacyCheckedForTeacher = new Set<string>();

  for (const g of groups) {
    const tid = g.teacherId;
    const tname = g.teacher.name;
    const pathScoped = entryTicketPathForGroup(g.id);

    const rowScoped = await prisma.teacherLessonInstruction.findUnique({
      where: {
        teacherId_lessonPath: { teacherId: tid, lessonPath: pathScoped },
      },
      select: { content: true },
    });
    const scoped = parsePayload(rowScoped?.content);
    if (scoped?.startedAt) {
      candidates.push({
        teacherId: tid,
        teacherName: tname,
        lessonPath: pathScoped,
        payload: scoped,
        learningGroupId: g.id,
      });
    }

    /** Fallback: Signal hat nur Legacy-Zeile geschrieben (Randfälle) – gleicher Lehrer wie die Gruppe */
    if (!legacyCheckedForTeacher.has(tid)) {
      legacyCheckedForTeacher.add(tid);
      const rowLegacy = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: { teacherId: tid, lessonPath: ENTRY_TICKET_LEGACY_PATH },
        },
        select: { content: true },
      });
      const leg = parsePayload(rowLegacy?.content);
      if (leg?.startedAt) {
        candidates.push({
          teacherId: tid,
          teacherName: tname,
          lessonPath: ENTRY_TICKET_LEGACY_PATH,
          payload: leg,
          learningGroupId: g.id,
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestMs = new Date(best.payload.startedAt).getTime();
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const ms = new Date(c.payload.startedAt).getTime();
    if (!Number.isNaN(ms) && ms > bestMs) {
      best = c;
      bestMs = ms;
    }
  }
  return best;
};

const resolveLatestEntryTicketForTeacher = async (teacherId: string): Promise<ResolvedEntryTicket | null> => {
  const rows = await prisma.teacherLessonInstruction.findMany({
    where: {
      teacherId,
      OR: [{ lessonPath: ENTRY_TICKET_LEGACY_PATH }, { lessonPath: { startsWith: '__entry_ticket_g_' } }],
    },
    select: { content: true, lessonPath: true },
  });
  let best: ResolvedEntryTicket | null = null;
  let bestMs = -1;
  for (const row of rows) {
    const p = parsePayload(row.content);
    if (!p?.startedAt) continue;
    const ms = new Date(p.startedAt).getTime();
    if (!Number.isNaN(ms) && ms > bestMs) {
      bestMs = ms;
      best = {
        teacherId,
        teacherName: '',
        lessonPath: row.lessonPath,
        payload: p,
      };
    }
  }
  return best;
};

export class EntryTicketController {
  /** Lehrkraft startet Entry Ticket (Schüler sehen Hinweis-Popup) */
  static async signal(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte' });

      const learningGroupId = typeof req.body?.learningGroupId === 'string' ? req.body.learningGroupId.trim() : '';
      const grade = normalizeGradeParam(req.body?.grade);
      const taskSeed = normalizeTaskSeed(
        typeof req.body?.taskSeed === 'string' ? Number(req.body.taskSeed) : req.body?.taskSeed,
      );
      const materialLessonPath =
        normalizeMaterialLessonPath(req.body?.lessonPath ?? req.body?.materialLessonPath) ?? null;
      const tasks = normalizeTasksPayload(req.body?.tasks);
      const customSet = withoutCustomSetNotes(normalizeCustomSetPayload(req.body?.customSet));
      const syncTasks = req.body?.syncTasks === true || req.body?.preserveSession === true;

      const resolveExisting = async (lessonPath: string): Promise<EntryTicketPayload | null> => {
        const row = await prisma.teacherLessonInstruction.findUnique({
          where: { teacherId_lessonPath: { teacherId: user.id, lessonPath } },
          select: { content: true },
        });
        return parsePayload(row?.content);
      };

      const buildPayload = (existing: EntryTicketPayload | null): EntryTicketPayload => {
        const keepSession = Boolean(syncTasks && existing?.startedAt);
        return {
          startedAt: keepSession ? existing!.startedAt : new Date().toISOString(),
          heroImageIndex: keepSession
            ? clampHeroIndex(existing!.heroImageIndex)
            : Math.floor(Math.random() * 10),
          ...(grade
            ? { grade }
            : existing?.grade
              ? { grade: existing.grade }
              : {}),
          ...(taskSeed != null
            ? { taskSeed }
            : existing?.taskSeed != null
              ? { taskSeed: existing.taskSeed }
              : {}),
          ...(materialLessonPath
            ? { materialLessonPath }
            : existing?.materialLessonPath
              ? { materialLessonPath: existing.materialLessonPath }
              : {}),
          ...(tasks
            ? { tasks }
            : existing?.tasks
              ? { tasks: existing.tasks }
              : {}),
          ...(customSet
            ? { customSet }
            : existing?.customSet
              ? { customSet: existing.customSet }
              : {}),
        };
      };

      const upsertRow = async (teacherId: string, lessonPath: string, payload: EntryTicketPayload) => {
        await prisma.teacherLessonInstruction.upsert({
          where: {
            teacherId_lessonPath: { teacherId, lessonPath },
          },
          create: {
            teacherId,
            lessonPath,
            content: JSON.stringify(payload),
          },
          update: { content: JSON.stringify(payload) },
        });
      };

      if (learningGroupId) {
        const owned = await prisma.learningGroup.findFirst({
          where: { id: learningGroupId, teacherId: user.id },
          select: { id: true },
        });
        if (owned) {
          const path = entryTicketPathForGroup(owned.id);
          const existing = await resolveExisting(path);
          const payload = buildPayload(existing);
          await upsertRow(user.id, path, payload);
          /** Gleicher Zeitstempel auch in Legacy-Zeile: Auflösung pro Lehrkraft im Schüler-GET nutzt Legacy als Fallback — sonst fehlt das Signal, wenn nur der Gruppenpfad geschrieben wurde und die Zuordnung/ID nicht passt. */
          await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH, payload);
          return res.json({
            success: true,
            startedAt: payload.startedAt,
            lessonPath: path,
            heroImageIndex: payload.heroImageIndex,
            grade: payload.grade ?? null,
            taskSeed: payload.taskSeed ?? null,
            materialLessonPath: payload.materialLessonPath ?? null,
            tasks: payload.tasks ?? null,
            customSet: payload.customSet ?? null,
          });
        }
      }

      const existingLegacy = await resolveExisting(ENTRY_TICKET_LEGACY_PATH);
      const payload = buildPayload(existingLegacy);
      await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH, payload);
      const allGroups = await prisma.learningGroup.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });
      for (const g of allGroups) {
        await upsertRow(user.id, entryTicketPathForGroup(g.id), payload);
      }

      return res.json({
        success: true,
        startedAt: payload.startedAt,
        lessonPath: ENTRY_TICKET_LEGACY_PATH,
        heroImageIndex: payload.heroImageIndex,
        grade: payload.grade ?? null,
        taskSeed: payload.taskSeed ?? null,
        materialLessonPath: payload.materialLessonPath ?? null,
        tasks: payload.tasks ?? null,
        customSet: payload.customSet ?? null,
      });
    } catch (error) {
      console.error('EntryTicket signal error:', error);
      return res.status(500).json({ error: 'Fehler beim Signalisieren' });
    }
  }

  /** Lehrer oder Klassen-Moderator: Entry Ticket beenden → archivieren für SuS-Materialien, Signal löschen */
  static async complete(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      let teacherId: string | null = null;
      let learningGroupId =
        typeof req.body?.learningGroupId === 'string' ? req.body.learningGroupId.trim() : '';

      if (user.role === 'TEACHER') {
        teacherId = user.id;
        if (learningGroupId) {
          const owned = await prisma.learningGroup.findFirst({
            where: { id: learningGroupId, teacherId: user.id },
            select: { id: true },
          });
          if (!owned) {
            return res.status(403).json({ error: 'Lerngruppe nicht gefunden' });
          }
        }
      } else if (user.role === 'STUDENT') {
        const mod = await resolveModeratorContext(
          user.id,
          learningGroupId
            ? { lessonPath: entryTicketPathForGroup(learningGroupId) }
            : undefined,
        );
        if (!mod.isModerator || !mod.learningGroupId) {
          return res.status(403).json({ error: 'Nur Lehrkräfte oder Klassen-Moderatoren' });
        }
        learningGroupId = mod.learningGroupId;
        const group = await prisma.learningGroup.findUnique({
          where: { id: learningGroupId },
          select: { teacherId: true },
        });
        teacherId = group?.teacherId ?? null;
      } else {
        return res.status(403).json({ error: 'Nur Lehrkräfte oder Klassen-Moderatoren' });
      }

      if (!teacherId) {
        return res.status(400).json({ error: 'Lehrer nicht gefunden' });
      }

      const bodyTasks = normalizeTasksPayload(req.body?.tasks);
      const bodyMaterial =
        normalizeMaterialLessonPath(req.body?.materialLessonPath ?? req.body?.lessonPath) ?? null;
      const bodyGrade = normalizeGradeParam(req.body?.grade);
      const bodySeed = normalizeTaskSeed(
        typeof req.body?.taskSeed === 'string' ? Number(req.body.taskSeed) : req.body?.taskSeed,
      );
      const bodyHero =
        typeof req.body?.heroImageIndex === 'number' || typeof req.body?.heroImageIndex === 'string'
          ? clampHeroIndex(Number(req.body.heroImageIndex))
          : undefined;
      const bodyCustomSet = withoutCustomSetNotes(normalizeCustomSetPayload(req.body?.customSet));

      const enrichPayload = (base: EntryTicketPayload | null): EntryTicketPayload => {
        const startedAt = base?.startedAt || new Date().toISOString();
        return {
          startedAt,
          heroImageIndex:
            bodyHero != null
              ? bodyHero
              : base?.heroImageIndex != null
                ? clampHeroIndex(base.heroImageIndex)
                : 0,
          ...(bodyGrade
            ? { grade: bodyGrade }
            : base?.grade
              ? { grade: base.grade }
              : {}),
          ...(bodySeed != null
            ? { taskSeed: bodySeed }
            : base?.taskSeed != null
              ? { taskSeed: base.taskSeed }
              : {}),
          ...(bodyMaterial
            ? { materialLessonPath: bodyMaterial }
            : base?.materialLessonPath
              ? { materialLessonPath: base.materialLessonPath }
              : {}),
          ...(bodyTasks
            ? { tasks: bodyTasks }
            : base?.tasks
              ? { tasks: base.tasks }
              : {}),
          ...(bodyCustomSet
            ? { customSet: bodyCustomSet }
            : base?.customSet
              ? { customSet: base.customSet }
              : {}),
        };
      };

      const activeRows = await prisma.teacherLessonInstruction.findMany({
        where: {
          teacherId,
          OR: [
            { lessonPath: ENTRY_TICKET_LEGACY_PATH },
            { lessonPath: { startsWith: '__entry_ticket_g_' } },
          ],
        },
        select: { lessonPath: true, content: true },
      });

      const byGroup = new Map<string, EntryTicketPayload>();
      let legacyPayload: EntryTicketPayload | null = null;

      for (const row of activeRows) {
        const parsed = parsePayload(row.content);
        if (!parsed?.startedAt) continue;
        const gid = entryTicketGroupIdFromPath(row.lessonPath);
        if (gid) {
          byGroup.set(gid, enrichPayload(parsed));
        } else if (row.lessonPath === ENTRY_TICKET_LEGACY_PATH) {
          legacyPayload = enrichPayload(parsed);
        }
      }

      if (legacyPayload) {
        if (learningGroupId) {
          if (!byGroup.has(learningGroupId)) byGroup.set(learningGroupId, legacyPayload);
        } else {
          const allGroups = await prisma.learningGroup.findMany({
            where: { teacherId },
            select: { id: true },
          });
          for (const g of allGroups) {
            if (!byGroup.has(g.id)) byGroup.set(g.id, legacyPayload);
          }
        }
      }

      if (byGroup.size === 0 && learningGroupId) {
        const fallback = enrichPayload(null);
        if (fallback.tasks?.length || fallback.materialLessonPath) {
          byGroup.set(learningGroupId, fallback);
        }
      }

      for (const [gid, payload] of byGroup.entries()) {
        // Immer archivieren, sobald Karten oder Stundenpfad da sind (SuS-Materialien)
        if (!payload.tasks?.length && !payload.materialLessonPath) continue;
        await upsertArchiveForGroup(teacherId, gid, {
          ...payload,
          materialLessonPath:
            normalizeMaterialLessonPath(payload.materialLessonPath) ??
            normalizeMaterialLessonPath(bodyMaterial) ??
            null,
        });
      }

      /** Nur aktive Signale löschen — Archive (__entry_ticket_done_…) bleiben. */
      await prisma.teacherLessonInstruction.deleteMany({
        where: {
          teacherId,
          AND: [
            {
              OR: [
                { lessonPath: ENTRY_TICKET_LEGACY_PATH },
                { lessonPath: { startsWith: '__entry_ticket_g_' } },
              ],
            },
            { NOT: { lessonPath: { startsWith: '__entry_ticket_done_' } } },
          ],
        },
      });

      return res.json({
        success: true,
        learningGroupId: learningGroupId || null,
        archivedGroups: Array.from(byGroup.keys()),
      });
    } catch (error) {
      console.error('EntryTicket complete error:', error);
      return res.status(500).json({ error: 'Fehler beim Beenden' });
    }
  }

  /**
   * Abgeschlossenes Entry Ticket einer Stunde (für SuS-Materialien inkl. Lösungen).
   * Query: lessonPath, groupId
   * Bei mehreren Durchläufen derselben Stunde: neuestes Archiv.
   */
  static async getCompleted(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      const lessonPathRaw = normalizeMaterialLessonPath(req.query.lessonPath);
      const groupId =
        typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
      if (!lessonPathRaw || !groupId) {
        return res.status(400).json({ error: 'lessonPath und groupId erforderlich' });
      }
      const lessonPath = lessonPathRaw;

      const group = await prisma.learningGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          teacherId: true,
          students: { where: { id: user.id }, select: { id: true }, take: 1 },
        },
      });
      if (!group) return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });

      const isTeacherOwner = user.role === 'TEACHER' && user.id === group.teacherId;
      const isStudentMember = user.role === 'STUDENT' && group.students.length > 0;
      if (!isTeacherOwner && !isStudentMember) {
        return res.status(403).json({ error: 'Kein Zugriff' });
      }

      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: {
            teacherId: group.teacherId,
            lessonPath: entryTicketDonePathForGroup(groupId),
          },
        },
        select: { content: true },
      });
      const store = parseArchiveStore(row?.content);
      // archives: neueste zuerst → erster Treffer = letzter Durchlauf dieser Stunde
      const hit =
        store.archives.find((a) => sameLessonPath(a.materialLessonPath, lessonPath)) || null;

      if (!hit || !hit.tasks?.length) {
        return res.json({
          completed: false,
          lessonPath,
          learningGroupId: groupId,
          groupName: group.name,
          startedAt: null,
          completedAt: null,
          heroImageIndex: null,
          grade: null,
          taskSeed: null,
          materialLessonPath: null,
          tasks: null,
          customSet: null,
        });
      }

      return res.json({
        completed: true,
        lessonPath,
        learningGroupId: groupId,
        groupName: group.name,
        startedAt: hit.startedAt,
        completedAt: hit.completedAt || null,
        heroImageIndex: hit.heroImageIndex ?? 0,
        grade: hit.grade ?? null,
        taskSeed: hit.taskSeed ?? null,
        materialLessonPath: hit.materialLessonPath ?? lessonPath,
        tasks: hit.tasks ?? null,
        customSet: hit.customSet ?? null,
      });
    } catch (error) {
      console.error('EntryTicket getCompleted error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  /**
   * Lehrer-Historie: erledigte Entry-Ticket-Durchläufe.
   * Query optional: groupId, setId (Fragenset) — Nummerierung jeweils 1 = zuerst.
   */
  static async getHistory(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrkräfte' });
      }

      const groupIdFilter =
        typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
      const setIdFilter =
        typeof req.query.setId === 'string' ? req.query.setId.trim() : '';

      const groups = await prisma.learningGroup.findMany({
        where: {
          teacherId: user.id,
          ...(groupIdFilter ? { id: groupIdFilter } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });

      type HistoryRaw = {
        learningGroupId: string;
        groupName: string;
        startedAt: string;
        completedAt: string;
        grade?: string;
        customSetId: string | null;
        setName: string;
        materialLessonPath?: string | null;
        tasks: EntryTicketTaskPayload[];
        sortMs: number;
      };

      const raw: HistoryRaw[] = [];
      for (const g of groups) {
        const row = await prisma.teacherLessonInstruction.findUnique({
          where: {
            teacherId_lessonPath: {
              teacherId: user.id,
              lessonPath: entryTicketDonePathForGroup(g.id),
            },
          },
          select: { content: true },
        });
        const store = parseArchiveStore(row?.content);
        for (const a of store.archives) {
          if (!a.tasks?.length) continue;
          const completedAt = a.completedAt || a.startedAt;
          const sortMs = new Date(completedAt).getTime();
          const customSetId =
            (a.customSet?.id && a.customSet.id.trim()) ||
            (typeof a.grade === 'string' && a.grade.startsWith('c_') ? a.grade : null);
          if (setIdFilter && customSetId !== setIdFilter && a.grade !== setIdFilter) {
            continue;
          }
          raw.push({
            learningGroupId: g.id,
            groupName: g.name,
            startedAt: a.startedAt,
            completedAt,
            grade: a.grade,
            customSetId,
            setName:
              (a.customSet?.name && a.customSet.name.trim()) ||
              (typeof a.grade === 'string' && a.grade.startsWith('c_')
                ? 'Fragenset'
                : a.grade
                  ? `Klasse ${a.grade}`
                  : 'Entry Ticket'),
            materialLessonPath: a.materialLessonPath ?? null,
            tasks: a.tasks,
            sortMs: Number.isFinite(sortMs) ? sortMs : 0,
          });
        }
      }

      raw.sort((a, b) => a.sortMs - b.sortMs || a.startedAt.localeCompare(b.startedAt));

      const items = raw.map((row, i) => ({
        index: i + 1,
        learningGroupId: row.learningGroupId,
        groupName: row.groupName,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        grade: row.grade ?? null,
        customSetId: row.customSetId,
        setName: row.setName,
        materialLessonPath: row.materialLessonPath,
        tasks: row.tasks,
      }));

      return res.json({
        items,
        learningGroupId: groupIdFilter || null,
        setId: setIdFilter || null,
      });
    } catch (error) {
      console.error('EntryTicket getHistory error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Historie' });
    }
  }

  static async getCurrent(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      if (user.role === 'STUDENT') {
        const resolved = await resolveStudentEntryTicket(user.id);
        if (!resolved) {
          const groups = await prisma.learningGroup.findMany({
            where: { students: { some: { id: user.id } } },
            select: { teacherId: true, teacher: { select: { name: true } } },
            take: 1,
          });
          const mod = await resolveModeratorContext(user.id);
          if (groups.length === 0) {
            return res.json({
              startedAt: null,
              teacherId: null,
              teacherName: null,
              lessonPath: null,
              heroImageIndex: null,
              grade: null,
              taskSeed: null,
              materialLessonPath: null,
              tasks: null,
              customSet: null,
              isModerator: mod.isModerator,
              learningGroupId: mod.learningGroupId,
              groupName: mod.groupName,
            });
          }
          return res.json({
            startedAt: null,
            teacherId: groups[0].teacherId,
            teacherName: groups[0].teacher.name,
            lessonPath: null,
            heroImageIndex: null,
            grade: null,
            taskSeed: null,
            materialLessonPath: null,
            tasks: null,
            customSet: null,
            isModerator: mod.isModerator,
            learningGroupId: mod.learningGroupId,
            groupName: mod.groupName,
          });
        }
        const mod = await resolveModeratorContext(user.id, {
          lessonPath: resolved.lessonPath,
          teacherId: resolved.teacherId,
        });
        return res.json({
          startedAt: resolved.payload.startedAt,
          teacherId: resolved.teacherId,
          teacherName: resolved.teacherName,
          lessonPath: resolved.lessonPath,
          heroImageIndex: resolved.payload.heroImageIndex ?? 0,
          grade: resolved.payload.grade ?? null,
          taskSeed: resolved.payload.taskSeed ?? null,
          materialLessonPath: resolved.payload.materialLessonPath ?? null,
          tasks: resolved.payload.tasks ?? null,
          customSet: resolved.payload.customSet ?? null,
          isModerator: mod.isModerator,
          learningGroupId: mod.learningGroupId || resolved.learningGroupId || null,
          groupName: mod.groupName,
        });
      }

      const teacherResolved = await resolveLatestEntryTicketForTeacher(user.id);
      if (!teacherResolved?.payload?.startedAt) {
        return res.json({
          startedAt: null,
          teacherId: user.id,
          teacherName: user.name,
          lessonPath: null,
          heroImageIndex: null,
          grade: null,
          taskSeed: null,
          materialLessonPath: null,
          tasks: null,
          customSet: null,
          learningGroupId: null,
        });
      }
      return res.json({
        startedAt: teacherResolved.payload.startedAt,
        teacherId: user.id,
        teacherName: user.name,
        lessonPath: teacherResolved.lessonPath,
        heroImageIndex: teacherResolved.payload.heroImageIndex ?? 0,
        grade: teacherResolved.payload.grade ?? null,
        taskSeed: teacherResolved.payload.taskSeed ?? null,
        materialLessonPath: teacherResolved.payload.materialLessonPath ?? null,
        tasks: teacherResolved.payload.tasks ?? null,
        customSet: teacherResolved.payload.customSet ?? null,
        learningGroupId: groupIdFromEntryTicketPath(teacherResolved.lessonPath),
      });
    } catch (error) {
      console.error('EntryTicket getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
    }
  }

  /** Eigene Fragensets der Lehrkraft (Server-Backup + Wiederherstellung aus Signalen). */
  static async getCustomSets(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrkräfte' });
      }

      let sets = await loadStoredCustomSets(user.id);
      if (sets.length === 0) {
        const recovered = await recoverCustomSetsFromSignals(user.id);
        if (recovered.length > 0) {
          await saveStoredCustomSets(user.id, recovered);
          sets = recovered;
        }
      } else {
        // Fehlende Sets aus laufenden Signalen nachziehen (z. B. KI / Analysis)
        const recovered = await recoverCustomSetsFromSignals(user.id);
        if (recovered.length > 0) {
          const byId = new Map(sets.map((s) => [s.id, s] as const));
          let changed = false;
          for (const s of recovered) {
            const prev = byId.get(s.id);
            if (!prev || countCustomSetTasks(s) > countCustomSetTasks(prev)) {
              byId.set(s.id, s);
              changed = true;
            }
          }
          if (changed) {
            sets = Array.from(byId.values());
            await saveStoredCustomSets(user.id, sets);
          }
        }
      }

      return res.json({ sets });
    } catch (error) {
      console.error('EntryTicket getCustomSets error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Fragensets' });
    }
  }

  static async saveCustomSets(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrkräfte' });
      }
      const rawSets = Array.isArray(req.body?.sets) ? req.body.sets : [];
      const sets = rawSets
        .map((s: unknown) => normalizeCustomSetPayload(s))
        .filter(Boolean) as EntryTicketCustomSetPayload[];
      await saveStoredCustomSets(user.id, sets);
      return res.json({ success: true, count: sets.length });
    } catch (error) {
      console.error('EntryTicket saveCustomSets error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern der Fragensets' });
    }
  }
}

/** Gleiches Motiv wie aktuelles Entry-Ticket (für Exit-Ticket-UI in derselben Stunde) */
export async function resolveActiveEntryHeroImageIndexForUser(userId: string, role: string): Promise<number | null> {
  if (role === 'STUDENT') {
    const r = await resolveStudentEntryTicket(userId);
    if (!r?.payload?.startedAt) return null;
    return r.payload.heroImageIndex ?? 0;
  }
  if (role === 'TEACHER') {
    const r = await resolveLatestEntryTicketForTeacher(userId);
    if (!r?.payload?.startedAt) return null;
    return r.payload.heroImageIndex ?? 0;
  }
  return null;
}
