import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXIT_TICKET_LESSON_PATH = '__exit_ticket_active__';

type ExitTicketTemplate = {
  id: string;
  title: string;
  description: string;
  questions: string[];
};

type ExitTicketResponse = {
  studentId: string;
  studentName: string;
  answers: string[];
  drawingDataUrl?: string;
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
    if (!parsed || !parsed.template || !Array.isArray(parsed.responses)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const getUserByLoginCode = async (req: Request) => {
  const loginCode = req.headers['x-login-code'] as string | undefined;
  if (!loginCode) return null;
  const user = await prisma.user.findUnique({
    where: { loginCode },
    select: { id: true, name: true, role: true },
  });
  return user;
};

const getTeacherForStudent = async (studentId: string) => {
  const group = await prisma.learningGroup.findFirst({
    where: { students: { some: { id: studentId } } },
    select: {
      teacher: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return group?.teacher ?? null;
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

      const payload: ExitTicketPayload = {
        template,
        publishedAt: new Date().toISOString(),
        responses: [],
      };

      await prisma.teacherLessonInstruction.upsert({
        where: {
          teacherId_lessonPath: {
            teacherId: user.id,
            lessonPath: EXIT_TICKET_LESSON_PATH,
          },
        },
        create: {
          teacherId: user.id,
          lessonPath: EXIT_TICKET_LESSON_PATH,
          content: JSON.stringify(payload),
        },
        update: {
          content: JSON.stringify(payload),
        },
      });

      return res.json({ success: true, template, publishedAt: payload.publishedAt });
    } catch (error) {
      console.error('ExitTicket publish error:', error);
      return res.status(500).json({ error: 'Fehler beim Veröffentlichen' });
    }
  }

  static async getCurrent(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });

      let teacherId = user.id;
      let teacherName = user.name;

      if (user.role === 'STUDENT') {
        const teacher = await getTeacherForStudent(user.id);
        if (!teacher) return res.status(404).json({ error: 'Kein zuständiger Lehrer gefunden' });
        teacherId = teacher.id;
        teacherName = teacher.name;
      }

      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: {
            teacherId,
            lessonPath: EXIT_TICKET_LESSON_PATH,
          },
        },
        select: { content: true, updatedAt: true },
      });

      const payload = parsePayload(row?.content);
      if (!payload) return res.json({ template: null, publishedAt: null, teacherId, teacherName });

      return res.json({
        template: payload.template,
        publishedAt: payload.publishedAt,
        teacherId,
        teacherName,
      });
    } catch (error) {
      console.error('ExitTicket getCurrent error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden des ExitTickets' });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const user = await getUserByLoginCode(req);
      if (!user) return res.status(401).json({ error: 'Nicht angemeldet' });
      if (user.role !== 'STUDENT') return res.status(403).json({ error: 'Nur Schüler können antworten' });

      const answers = Array.isArray(req.body?.answers) ? (req.body.answers as string[]) : null;
      const drawingDataUrl = typeof req.body?.drawingDataUrl === 'string' ? req.body.drawingDataUrl : undefined;
      if (!answers) return res.status(400).json({ error: 'answers ist erforderlich' });

      const teacher = await getTeacherForStudent(user.id);
      if (!teacher) return res.status(404).json({ error: 'Kein zuständiger Lehrer gefunden' });

      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: {
            teacherId: teacher.id,
            lessonPath: EXIT_TICKET_LESSON_PATH,
          },
        },
        select: { content: true },
      });

      const payload = parsePayload(row?.content);
      if (!payload || !payload.template) {
        return res.status(404).json({ error: 'Kein aktives ExitTicket vorhanden' });
      }

      const nextResponses = payload.responses.filter((item) => item.studentId !== user.id);
      nextResponses.push({
        studentId: user.id,
        studentName: user.name,
        answers,
        drawingDataUrl,
        submittedAt: new Date().toISOString(),
      });

      const nextPayload: ExitTicketPayload = {
        ...payload,
        responses: nextResponses,
      };

      await prisma.teacherLessonInstruction.update({
        where: {
          teacherId_lessonPath: {
            teacherId: teacher.id,
            lessonPath: EXIT_TICKET_LESSON_PATH,
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

      const row = await prisma.teacherLessonInstruction.findUnique({
        where: {
          teacherId_lessonPath: {
            teacherId: user.id,
            lessonPath: EXIT_TICKET_LESSON_PATH,
          },
        },
        select: { content: true },
      });

      const payload = parsePayload(row?.content);
      if (!payload) {
        return res.json({ template: null, responses: [] });
      }

      const responses = [...payload.responses].sort((a, b) => {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });

      return res.json({
        template: payload.template,
        publishedAt: payload.publishedAt,
        responses,
      });
    } catch (error) {
      console.error('ExitTicket getResponses error:', error);
      return res.status(500).json({ error: 'Fehler beim Laden der Antworten' });
    }
  }
}

