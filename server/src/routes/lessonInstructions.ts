import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

type LessonBoxField = 'voraussetzungen' | 'materialliste' | 'anweisungen' | 'abAnleitung' | 'geheimtexte';

/** GET alle gespeicherten Anweisungs-Overrides für einen Lehrer */
router.get('/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.teacherId;
    if (!teacherId?.trim()) return res.status(400).json({ error: 'teacherId fehlt' });
    const list = await prisma.teacherLessonInstruction.findMany({
      where: { teacherId },
      select: { lessonPath: true, content: true, updatedAt: true }
    });
    const byPath: Record<string, Partial<Record<LessonBoxField, string>>> = {};
    for (const row of list) {
      try {
        byPath[row.lessonPath] = JSON.parse(row.content || '{}') as Partial<Record<LessonBoxField, string>>;
      } catch {
        byPath[row.lessonPath] = {};
      }
    }
    return res.json(byPath);
  } catch (e: any) {
    console.error('Error fetching lesson instructions:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** PUT eine Stunde speichern (lessonPath + content-Overrides) */
router.put('/', async (req: Request, res: Response) => {
  try {
    const { teacherId, lessonPath, content } = req.body as {
      teacherId: string;
      lessonPath: string;
      content: Record<string, string>;
    };
    if (!teacherId?.trim() || lessonPath == null || lessonPath === '') {
      return res.status(400).json({ error: 'teacherId und lessonPath sind erforderlich' });
    }
    const contentStr = typeof content === 'object' ? JSON.stringify(content) : String(content ?? '{}');
    await prisma.teacherLessonInstruction.upsert({
      where: {
        teacherId_lessonPath: { teacherId, lessonPath: String(lessonPath) }
      },
      create: { teacherId, lessonPath: String(lessonPath), content: contentStr },
      update: { content: contentStr, updatedAt: new Date() }
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('Error saving lesson instructions:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

export default router;
