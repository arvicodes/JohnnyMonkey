import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { resolveActiveEntryHeroImageIndexForUser } from './EntryTicketController';

const prisma = new PrismaClient();

/** Global pro Lehrkraft (Exit-Ticket-Seite ohne Gruppenkontext) */
export const EXIT_TICKET_LEGACY_PATH = '__exit_ticket_active__';

const exitTicketPathForGroup = (groupId: string) => `__exit_ticket_g_${groupId}__`;

type ExitTicketTemplate = {
  id: string;
  title: string;
  description: string;
  questions: string[];
  responseMode?: 'questions-only' | 'text-input' | 'photo-upload';
};

type ExitTicketResponse = {
  studentId: string;
  studentName: string;
  answers: string[];
  drawingDataUrl?: string;
  photoDataUrl?: string;
  completionOnly?: boolean;
  submittedAt: string;
};

type ExitTicketPayload = {
  template: ExitTicketTemplate;
  publishedAt: string;
  responses: ExitTicketResponse[];
};

const parsePayload = (raw: string | null | undefined): ExitTicketPayload | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExitTicketPayload;
    if (!parsed || !parsed.template) return null;
    if (!Array.isArray(parsed.responses)) {
      parsed.responses = [];
    }
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

type ResolvedExitTicket = {
  teacherId: string;
  teacherName: string;
  lessonPath: string;
  payload: ExitTicketPayload;
};

/**
 * Nur gruppenspezifische Freigaben (Stunde mit learningGroupId). Kein globales Legacy
 * (__exit_ticket_active__), damit SuS nicht dauernd ein altes „3-Fragen-Feedback“ aus der
 * Lehrer-Exit-Ticket-Seite sehen. Mehrere Gruppen: neuestes publishedAt.
 */
const resolveStudentExitTicket = async (studentId: string): Promise<ResolvedExitTicket | null> => {
  const groups = await prisma.learningGroup.findMany({
    where: { students: { some: { id: studentId } } },
    select: {
      id: true,
      teacherId: true,
      teacher: { select: { id: true, name: true } },
    },
  });
  if (groups.length === 0) return null;

  const candidates: ResolvedExitTicket[] = [];

  for (const g of groups) {
    const tid = g.teacherId;
    const tname = g.teacher.name;
    const pathScoped = exitTicketPathForGroup(g.id);

    const rowScoped = await prisma.teacherLessonInstruction.findUnique({
      where: {
        teacherId_lessonPath: { teacherId: tid, lessonPath: pathScoped },
      },
      select: { content: true },
    });
    const scoped = parsePayload(rowScoped?.content);
    if (scoped?.template && scoped.publishedAt) {
      candidates.push({
        teacherId: tid,
        teacherName: tname,
        lessonPath: pathScoped,
        payload: scoped,
      });
    }
  }

  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestMs = new Date(best.payload.publishedAt).getTime();
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    const ms = new Date(c.payload.publishedAt).getTime();
    if (!Number.isNaN(ms) && ms > bestMs) {
      best = c;
      bestMs = ms;
    }
  }
  return best;
};

const assertStudentCanAccessExitTicketRow = async (
  studentId: string,
  teacherId: string,
  lessonPath: string,
): Promise<boolean> => {
  if (lessonPath === EXIT_TICKET_LEGACY_PATH) {
    const g = await prisma.learningGroup.findFirst({
      where: { teacherId, students: { some: { id: studentId } } },
      select: { id: true },
    });
    return Boolean(g);
  }
  const m = lessonPath.match(/^__exit_ticket_g_(.+?)__$/);
  const groupId = m?.[1];
  if (!groupId) return false;
  const g = await prisma.learningGroup.findFirst({
    where: { id: groupId, teacherId, students: { some: { id: studentId } } },
    select: { id: true },
  });
  return Boolean(g);
};

export class ExitTicketController {
  static async publish(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte dürfen veröffentlichen' });

      const template = req.body?.template as ExitTicketTemplate | undefined;
      if (!template || !template.id || !template.title || !Array.isArray(template.questions)) {
        return res.status(400).json({ error: 'Ungültige Vorlage' });
      }

      const learningGroupId = typeof req.body?.learningGroupId === 'string' ? req.body.learningGroupId.trim() : '';
      const publishedAt = new Date().toISOString();

      /** Beim erneuten Freigeben Vorlage + Zeit aktualisieren, aber SuS-Antworten dauerhaft behalten */
      const buildContentPreservingResponses = async (teacherId: string, lessonPath: string) => {
        const existing = await prisma.teacherLessonInstruction.findUnique({
          where: { teacherId_lessonPath: { teacherId, lessonPath } },
          select: { content: true },
        });
        const prev = parsePayload(existing?.content);
        const preserved = Array.isArray(prev?.responses) ? prev.responses : [];
        const payload: ExitTicketPayload = {
          template,
          publishedAt,
          responses: preserved,
        };
        return JSON.stringify(payload);
      };

      const upsertRow = async (teacherId: string, lessonPath: string) => {
        const content = await buildContentPreservingResponses(teacherId, lessonPath);
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

      /** Nur eine Klasse (Stunde): nur dieser gruppenspezifische Pfad — SuS lesen ausschließlich diese Pfade. */
      if (learningGroupId) {
        const owned = await prisma.learningGroup.findFirst({
          where: { id: learningGroupId, teacherId: user.id },
          select: { id: true },
        });
        if (owned) {
          const path = exitTicketPathForGroup(owned.id);
          await upsertRow(user.id, path);
          return res.json({ success: true, template, publishedAt, lessonPath: path });
        }
        console.warn(
          '[exit-ticket/publish] learningGroupId nicht nutzbar, schreibe global + alle Gruppen:',
          learningGroupId,
        );
      }

      // Lehrer-Exit-Ticket-Seite (ohne Gruppe) oder ungültige Gruppe: Legacy für die Lehrer-Ansicht
      // + dieselbe Vorlage in JEDE Lerngruppe — SuS nutzen nur Gruppen-Pfade, nie das reine Legacy.
      await upsertRow(user.id, EXIT_TICKET_LEGACY_PATH);
      const allGroups = await prisma.learningGroup.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });
      for (const g of allGroups) {
        await upsertRow(user.id, exitTicketPathForGroup(g.id));
      }

      return res.json({ success: true, template, publishedAt, lessonPath: EXIT_TICKET_LEGACY_PATH });
    } catch (error) {
      console.error('ExitTicket publish error:', error);
      return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
    }
  }

  static async getCurrent(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      let teacherId = user.id;
      let teacherName = user.name;

      const entryHero =
        (await resolveActiveEntryHeroImageIndexForUser(user.id, user.role)) ?? 0;

      if (user.role === 'STUDENT') {
        const resolved = await resolveStudentExitTicket(user.id);
        if (!resolved) {
          const groups = await prisma.learningGroup.findMany({
            where: { students: { some: { id: user.id } } },
            select: { teacherId: true, teacher: { select: { name: true } } },
            take: 1,
          });
          if (groups.length === 0) return res.status(404).json({ error: 'Kein zuständiger Lehrer gefunden' });
          return res.json({
            template: null,
            publishedAt: null,
            teacherId: groups[0].teacherId,
            teacherName: groups[0].teacher.name,
            lessonPath: null,
            heroImageIndex: entryHero,
          });
        }
        return res.json({
          template: resolved.payload.template,
          publishedAt: resolved.payload.publishedAt,
          teacherId: resolved.teacherId,
          teacherName: resolved.teacherName,
          lessonPath: resolved.lessonPath,
          heroImageIndex: entryHero,
        });
      }

      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: {
            teacherId,
            lessonPath: EXIT_TICKET_LEGACY_PATH,
          },
        },
        select: { content: true, updatedAt: true },
      });

      const payload = parsePayload(row?.content);
      if (!payload) {
        return res.json({
          template: null,
          publishedAt: null,
          teacherId,
          teacherName,
          lessonPath: EXIT_TICKET_LEGACY_PATH,
          heroImageIndex: entryHero,
        });
      }

      return res.json({
        template: payload.template,
        publishedAt: payload.publishedAt,
        teacherId,
        teacherName,
        lessonPath: EXIT_TICKET_LEGACY_PATH,
        heroImageIndex: entryHero,
      });
    } catch (error) {
      console.error('ExitTicket getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden des ExitTickets' });
    }
  }

  /**
   * SuS: eigene Abgabe zur gruppenspezifischen Exit-Ticket-Zeile (für dauerhafte Anzeige z. B. im Stundenbaum).
   */
  static async getMySubmission(req: Request, res: Response) {
    try {
      res.set('Cache-Control', 'private, no-store, must-revalidate');
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Nur für Schülerinnen und Schüler' });

      const groupId = typeof req.query.groupId === 'string' ? req.query.groupId.trim() : '';
      if (!groupId) return res.status(400).json({ error: 'groupId ist erforderlich' });

      const group = await prisma.learningGroup.findFirst({
        where: { id: groupId, students: { some: { id: user.id } } },
        select: { teacherId: true, teacher: { select: { name: true } } },
      });
      if (!group) return res.status(403).json({ error: 'Keine Berechtigung für diese Gruppe' });

      const lessonPath = exitTicketPathForGroup(groupId);
      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: { teacherId: group.teacherId, lessonPath },
        },
        select: { content: true },
      });
      const payload = parsePayload(row?.content);
      if (!payload?.template || !payload.publishedAt) {
        return res.json({
          template: null,
          publishedAt: null,
          myResponse: null,
          teacherName: group.teacher.name,
          lessonPath,
        });
      }

      const mine = payload.responses.filter((r) => r.studentId === user.id);
      mine.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      const myResponse = mine[0] ?? null;

      return res.json({
        template: payload.template,
        publishedAt: payload.publishedAt,
        myResponse,
        teacherName: group.teacher.name,
        lessonPath,
      });
    } catch (error) {
      console.error('ExitTicket getMySubmission error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden deiner Exit-Ticket-Abgabe' });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Nur Schüler können antworten' });

      const answers = Array.isArray(req.body?.answers) ? (req.body.answers as string[]) : null;
      const drawingDataUrl = typeof req.body?.drawingDataUrl === 'string' ? req.body.drawingDataUrl : undefined;
      const photoDataUrl = typeof req.body?.photoDataUrl === 'string' ? req.body.photoDataUrl : undefined;
      const completionOnly = Boolean(req.body?.completionOnly);
      if (!answers) return res.status(400).json({ error: 'answers ist erforderlich' });

      const bodyTeacherId = typeof req.body?.teacherId === 'string' ? req.body.teacherId.trim() : '';
      const bodyLessonPath = typeof req.body?.lessonPath === 'string' ? req.body.lessonPath.trim() : '';

      let teacherId: string;
      let lessonPath: string;

      if (bodyTeacherId && bodyLessonPath) {
        const ok = await assertStudentCanAccessExitTicketRow(user.id, bodyTeacherId, bodyLessonPath);
        if (!ok) return res.status(403).json({ error: 'Kein Zugriff auf dieses Exit Ticket' });
        teacherId = bodyTeacherId;
        lessonPath = bodyLessonPath;
      } else {
        const resolved = await resolveStudentExitTicket(user.id);
        if (!resolved?.payload?.template) {
          return res.status(404).json({ error: 'Kein aktives ExitTicket vorhanden' });
        }
        teacherId = resolved.teacherId;
        lessonPath = resolved.lessonPath;
      }

      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: {
            teacherId,
            lessonPath,
          },
        },
        select: { content: true },
      });
      const payload = parsePayload(row?.content);
      if (!payload?.template) {
        return res.status(404).json({ error: 'Kein aktives ExitTicket vorhanden' });
      }
      if (!payload.publishedAt) {
        return res.status(403).json({ error: 'Exit Ticket ist noch nicht freigegeben' });
      }

      const nextResponses = payload.responses.filter((item) => item.studentId !== user.id);
      nextResponses.push({
        studentId: user.id,
        studentName: user.name,
        answers,
        drawingDataUrl,
        photoDataUrl,
        completionOnly,
        submittedAt: new Date().toISOString(),
      });

      const nextPayload: ExitTicketPayload = {
        ...payload,
        responses: nextResponses,
      };

      await prisma.teacherLessonInstruction.update({
        where: {
          teacherId_lessonPath: {
            teacherId,
            lessonPath,
          },
        },
        data: {
          content: JSON.stringify(nextPayload),
        },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('ExitTicket submit error:', error);
      return res.status(500).json({ error: 'Fehler beim Speichern der Antwort' });
    }
  }

  static async getResponses(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'TEACHER') return res.status(403).json({ error: 'Nur Lehrkräfte haben Zugriff' });

      const lessonPathQ = typeof req.query.lessonPath === 'string' ? req.query.lessonPath.trim() : '';
      if (lessonPathQ) {
        const isLegacy = lessonPathQ === EXIT_TICKET_LEGACY_PATH;
        const isGroupScoped =
          lessonPathQ.startsWith('__exit_ticket_g_') && lessonPathQ.endsWith('__') && lessonPathQ.length > 20;
        if (!isLegacy && !isGroupScoped) {
          return res.status(400).json({ error: 'Ungültiger lessonPath' });
        }
        const row = await prisma.teacherLessonInstruction.findUnique({
          where: {
            teacherId_lessonPath: { teacherId: user.id, lessonPath: lessonPathQ },
          },
          select: { content: true },
        });
        const payload = parsePayload(row?.content);
        if (!payload?.template) {
          return res.json({ template: null, publishedAt: null, responses: [], lessonPath: lessonPathQ });
        }
        const responses = [...payload.responses].sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
        return res.json({
          template: payload.template,
          publishedAt: payload.publishedAt,
          responses,
          lessonPath: lessonPathQ,
        });
      }

      const rows = await prisma.teacherLessonInstruction.findMany({
        where: {
          teacherId: user.id,
          OR: [{ lessonPath: EXIT_TICKET_LEGACY_PATH }, { lessonPath: { startsWith: '__exit_ticket_g_' } }],
        },
        select: { content: true, lessonPath: true },
      });

      let bestTemplate: ExitTicketTemplate | null = null;
      let bestPublishedAt: string | null = null;
      let bestMs = -1;
      const merged: ExitTicketResponse[] = [];

      for (const row of rows) {
        const payload = parsePayload(row.content);
        if (!payload?.template) continue;
        const ms = new Date(payload.publishedAt).getTime();
        if (!Number.isNaN(ms) && ms > bestMs) {
          bestMs = ms;
          bestTemplate = payload.template;
          bestPublishedAt = payload.publishedAt;
        }
        merged.push(...payload.responses);
      }

      if (!bestTemplate) {
        return res.json({ template: null, responses: [] });
      }

      const seen = new Set<string>();
      const responses = merged
        .filter((r) => {
          const key = `${r.studentId}|${r.submittedAt}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      return res.json({
        template: bestTemplate,
        publishedAt: bestPublishedAt,
        responses,
      });
    } catch (error) {
      console.error('ExitTicket getResponses error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Antworten' });
    }
  }
}
