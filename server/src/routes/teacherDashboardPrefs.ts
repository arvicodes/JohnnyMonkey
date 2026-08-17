import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, requireTeacher } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

/** Dashboard-Tab „Reihen“: ausgewählte Arbeits-Reihen (früher nur localStorage). */
export const WORKING_REIHEN_DB_PATH = '__dashboard_working_reihen__';

router.use(authenticateUser, requireTeacher);

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

/** Mac-/Schul-Absolutpfade → portabler Relativpfad unter git-intern/. */
export function toPortableReihePath(raw: string): string {
  let p = normalizePath(raw);
  if (!p) return '';
  const markers = ['/J-M-Reihen/', 'J-M-Reihen/', '/git-intern/', 'git-intern/'];
  for (const m of markers) {
    const i = p.indexOf(m);
    if (i >= 0) {
      const rest = p.slice(i + m.length).replace(/^\/+/, '');
      return rest ? `git-intern/${rest}` : 'git-intern';
    }
  }
  if (p.startsWith('/app/J-M-Reihen/')) {
    return `git-intern/${p.slice('/app/J-M-Reihen/'.length)}`;
  }
  if (p.startsWith('Mathe/') || p.startsWith('Informatik/')) {
    return `git-intern/${p}`;
  }
  return p;
}

function parsePaths(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const o = raw as { paths?: unknown };
  if (!Array.isArray(o.paths)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of o.paths) {
    const p = toPortableReihePath(String(item || ''));
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

router.get('/working-reihen', async (req, res) => {
  try {
    const teacherId = req.user!.id;
    const row = await prisma.teacherLessonInstruction.findUnique({
      where: {
        teacherId_lessonPath: { teacherId, lessonPath: WORKING_REIHEN_DB_PATH },
      },
      select: { content: true },
    });
    let paths: string[] = [];
    if (row?.content) {
      try {
        paths = parsePaths(JSON.parse(row.content));
      } catch {
        paths = [];
      }
    }
    return res.json({ ok: true, paths });
  } catch (e) {
    console.error('working-reihen GET failed:', e);
    return res.status(500).json({ error: 'Arbeits-Reihen konnten nicht geladen werden' });
  }
});

router.put('/working-reihen', async (req, res) => {
  try {
    const teacherId = req.user!.id;
    const paths = parsePaths({ paths: req.body?.paths });
    const content = JSON.stringify({ paths, updatedAt: new Date().toISOString() });
    await prisma.teacherLessonInstruction.upsert({
      where: {
        teacherId_lessonPath: { teacherId, lessonPath: WORKING_REIHEN_DB_PATH },
      },
      create: {
        teacherId,
        lessonPath: WORKING_REIHEN_DB_PATH,
        content,
      },
      update: { content },
    });
    return res.json({ ok: true, paths });
  } catch (e) {
    console.error('working-reihen PUT failed:', e);
    return res.status(500).json({ error: 'Arbeits-Reihen konnten nicht gespeichert werden' });
  }
});

export default router;
