import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Gleicht Pfade ab, die sich nur durch Slashes, Backslashes oder Unicode-Form (NFC) unterscheiden —
 * z. B. gespeicherter Stunden-Pfad vs. refId aus der Gruppenzuordnung.
 */
function normalizeLessonPathKey(p: string): string {
  return String(p ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

/** Interne Pseudo-Pfade (Entry/Exit-Ticket-Status) von echten Materialordnern trennen */
function isRealMaterialLessonPath(p: string): boolean {
  const n = normalizeLessonPathKey(p);
  return n.length > 0 && !n.startsWith('__');
}

function hasNonEmptyLessonPlan(content: string): boolean {
  try {
    const c = JSON.parse(content || '{}') as { lessonPlan?: unknown };
    return Array.isArray(c.lessonPlan) && c.lessonPlan.length > 0;
  } catch {
    return false;
  }
}

async function findTeacherLessonInstructionRow(teacherId: string, lessonPath: string) {
  const exact = await prisma.teacherLessonInstruction.findUnique({
    where: { teacherId_lessonPath: { teacherId, lessonPath } },
  });
  if (exact) return exact;
  const want = normalizeLessonPathKey(lessonPath);
  if (!want) return null;
  const rows = await prisma.teacherLessonInstruction.findMany({
    where: { teacherId },
    orderBy: { updatedAt: 'desc' },
  });
  const normMatch = rows.find((r) => normalizeLessonPathKey(r.lessonPath) === want);
  if (normMatch) return normMatch;

  /**
   * Gruppe hat oft nur den übergeordneten Ordner zugeordnet (z. B. „11-03 Technische Informatik“),
   * der Lehrer speichert den Stundenplan aber auf dem konkreten Stundenordner
   * (z. B. „…/2 Digitaltechnik/2.01 Gatter bauen“). Dann ist der gespeicherte Pfad ein Unterpfad.
   */
  const prefix = `${want}/`;
  const descendantsWithPlan = rows.filter((r) => {
    if (!isRealMaterialLessonPath(r.lessonPath)) return false;
    const rp = normalizeLessonPathKey(r.lessonPath);
    if (!rp.startsWith(prefix)) return false;
    return hasNonEmptyLessonPlan(r.content);
  });
  if (descendantsWithPlan.length === 0) return null;
  descendantsWithPlan.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return descendantsWithPlan[0];
}

/** GET Stunden-Inhalt für SuS (nur wenn Mitglied der Gruppe) — z. B. lessonPlan mit Ziel-Deck für gemeinsame Karteikarten */
router.get('/by-group/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const lessonPath = typeof req.query.lessonPath === 'string' ? req.query.lessonPath : '';
    if (!groupId?.trim() || !lessonPath) {
      return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
    }
    const loginCode = String(req.headers['x-login-code'] || '').trim();
    if (!loginCode) {
      return res.status(401).json({ error: 'Anmeldung erforderlich' });
    }
    const user = await prisma.user.findFirst({
      where: { loginCode },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'STUDENT') {
      return res.status(403).json({ error: 'Nur für Schülerkonten' });
    }
    const group = await prisma.learningGroup.findFirst({
      where: {
        id: groupId,
        students: { some: { id: user.id } },
      },
      select: { teacherId: true },
    });
    if (!group) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Gruppe' });
    }
    const row = await findTeacherLessonInstructionRow(group.teacherId, lessonPath);
    if (!row) {
      return res.json({ content: {} });
    }
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(row.content || '{}') as Record<string, unknown>;
    } catch {
      parsed = {};
    }
    return res.json({ content: parsed });
  } catch (e: any) {
    console.error('lesson-instructions by-group:', e);
    return res.status(500).json({ error: e?.message || 'Serverfehler' });
  }
});

/** GET alle gespeicherten Anweisungs-Overrides für einen Lehrer */
router.get('/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const teacherId = req.params.teacherId;
    if (!teacherId?.trim()) return res.status(400).json({ error: 'teacherId fehlt' });
    const list = await prisma.teacherLessonInstruction.findMany({
      where: { teacherId },
      select: { lessonPath: true, content: true, updatedAt: true }
    });
    const byPath: Record<string, Record<string, any>> = {};
    for (const row of list) {
      try {
        byPath[row.lessonPath] = JSON.parse(row.content || '{}') as Record<string, any>;
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
