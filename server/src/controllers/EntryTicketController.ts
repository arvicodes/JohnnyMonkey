import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ENTRY_TICKET_LEGACY_PATH = '__entry_ticket_active__';

const entryTicketPathForGroup = (groupId: string) => `__entry_ticket_g_${groupId}__`;

type EntryTicketPayload = {
  startedAt: string;
  /** 0..9 — welches Motiv unter /entry-ticket/entry-NN.jpg; pro Signal neu gewürfelt, bleibt bis zum nächsten Signal */
  heroImageIndex?: number;
};

const clampHeroIndex = (n: unknown): number => {
  if (typeof n !== 'number' || !Number.isInteger(n)) return 0;
  return Math.min(9, Math.max(0, n));
};

const parsePayload = (raw: string | null | undefined): EntryTicketPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EntryTicketPayload;
    if (!parsed || typeof parsed.startedAt !== 'string') return null;
    return {
      startedAt: parsed.startedAt,
      heroImageIndex: clampHeroIndex(parsed.heroImageIndex),
    };
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

type ResolvedEntryTicket = {
  teacherId: string;
  teacherName: string;
  lessonPath: string;
  payload: EntryTicketPayload;
};

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

      const heroImageIndex = Math.floor(Math.random() * 10);
      const payload: EntryTicketPayload = {
        startedAt: new Date().toISOString(),
        heroImageIndex,
      };
      const content = JSON.stringify(payload);

      const upsertRow = async (teacherId: string, lessonPath: string) => {
        await prisma.teacherLessonInstruction.upsert({
          where: {
            teacherId_lessonPath: { teacherId, lessonPath },
          },
          create: {
            teacherId,
            lessonPath,
            content,
          },
          update: { content },
        });
      };

      if (learningGroupId) {
        const owned = await prisma.learningGroup.findFirst({
          where: { id: learningGroupId, teacherId: user.id },
          select: { id: true },
        });
        if (owned) {
          const path = entryTicketPathForGroup(owned.id);
          await upsertRow(user.id, path);
          /** Gleicher Zeitstempel auch in Legacy-Zeile: Auflösung pro Lehrkraft im Schüler-GET nutzt Legacy als Fallback — sonst fehlt das Signal, wenn nur der Gruppenpfad geschrieben wurde und die Zuordnung/ID nicht passt. */
          await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH);
          return res.json({
            success: true,
            startedAt: payload.startedAt,
            lessonPath: path,
            heroImageIndex: payload.heroImageIndex,
          });
        }
      }

      await upsertRow(user.id, ENTRY_TICKET_LEGACY_PATH);
      const allGroups = await prisma.learningGroup.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });
      for (const g of allGroups) {
        await upsertRow(user.id, entryTicketPathForGroup(g.id));
      }

      return res.json({
        success: true,
        startedAt: payload.startedAt,
        lessonPath: ENTRY_TICKET_LEGACY_PATH,
        heroImageIndex: payload.heroImageIndex,
      });
    } catch (error) {
      console.error('EntryTicket signal error:', error);
      return res.status(500).json({ error: 'Fehler beim Signalisieren' });
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
          if (groups.length === 0) {
            return res.json({
              startedAt: null,
              teacherId: null,
              teacherName: null,
              lessonPath: null,
              heroImageIndex: null,
            });
          }
          return res.json({
            startedAt: null,
            teacherId: groups[0].teacherId,
            teacherName: groups[0].teacher.name,
            lessonPath: null,
            heroImageIndex: null,
          });
        }
        return res.json({
          startedAt: resolved.payload.startedAt,
          teacherId: resolved.teacherId,
          teacherName: resolved.teacherName,
          lessonPath: resolved.lessonPath,
          heroImageIndex: resolved.payload.heroImageIndex ?? 0,
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
        });
      }
      return res.json({
        startedAt: teacherResolved.payload.startedAt,
        teacherId: user.id,
        teacherName: user.name,
        lessonPath: teacherResolved.lessonPath,
        heroImageIndex: teacherResolved.payload.heroImageIndex ?? 0,
      });
    } catch (error) {
      console.error('EntryTicket getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden' });
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
