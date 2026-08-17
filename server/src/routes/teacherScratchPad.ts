import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, requireTeacher } from '../middleware/auth';
import {
  ensureScratchPadRoots,
  readScratchPadLive,
  scratchPadUserFolderKey,
  writeScratchPad,
  SCRATCH_PAD_DB_PATH,
  type ScratchPadPayload,
} from '../utils/teacherScratchPadStore';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateUser, requireTeacher);

function padUpdatedMs(pad: ScratchPadPayload | null | undefined): number {
  if (!pad) return 0;
  const raw = String(pad.updatedAt || pad.savedAt || '').trim();
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function normalizePad(raw: unknown): ScratchPadPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as ScratchPadPayload;
  if (!Array.isArray(o.pages)) return null;
  return {
    pages: o.pages,
    pageIndex: typeof o.pageIndex === 'number' ? o.pageIndex : 0,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
    userId: typeof o.userId === 'string' ? o.userId : undefined,
    userName: typeof o.userName === 'string' ? o.userName : undefined,
    savedAt: typeof o.savedAt === 'string' ? o.savedAt : undefined,
  };
}

async function readScratchPadFromDb(teacherId: string): Promise<ScratchPadPayload | null> {
  const row = await prisma.teacherLessonInstruction.findUnique({
    where: {
      teacherId_lessonPath: { teacherId, lessonPath: SCRATCH_PAD_DB_PATH },
    },
  });
  if (!row?.content) return null;
  try {
    return normalizePad(JSON.parse(row.content));
  } catch {
    return null;
  }
}

async function writeScratchPadToDb(teacherId: string, payload: ScratchPadPayload): Promise<void> {
  await prisma.teacherLessonInstruction.upsert({
    where: {
      teacherId_lessonPath: { teacherId, lessonPath: SCRATCH_PAD_DB_PATH },
    },
    create: {
      teacherId,
      lessonPath: SCRATCH_PAD_DB_PATH,
      content: JSON.stringify(payload),
    },
    update: {
      content: JSON.stringify(payload),
    },
  });
}

/** Stellt sicher, dass Live- und Backup-Wurzelordner existieren. */
router.get('/roots', (_req, res) => {
  try {
    const roots = ensureScratchPadRoots();
    res.json({ ok: true, ...roots });
  } catch (e) {
    console.error('Scratch pad roots failed:', e);
    res.status(500).json({ error: 'Ordner konnten nicht angelegt werden' });
  }
});

/** Aktueller Stand: DB zuerst, Datei als Fallback (und einmalig in DB nachziehen). */
router.get('/', async (req, res) => {
  try {
    const user = req.user!;
    const key = scratchPadUserFolderKey(user.id, user.name);
    ensureScratchPadRoots();
    const fromDb = await readScratchPadFromDb(user.id);
    const fromFile = readScratchPadLive(key);
    let data: ScratchPadPayload | null = null;
    if (fromDb && fromFile) {
      data = padUpdatedMs(fromFile) > padUpdatedMs(fromDb) ? fromFile : fromDb;
    } else {
      data = fromDb || fromFile;
    }
    if (!data) {
      return res.json({ ok: true, found: false, pad: null, userKey: key, source: null });
    }
    // Sync: neuerer Stand in DB + Datei schreiben
    try {
      await writeScratchPadToDb(user.id, data);
      writeScratchPad(key, data);
    } catch (syncErr) {
      console.warn('Scratch pad sync after GET failed:', syncErr);
    }
    return res.json({
      ok: true,
      found: true,
      pad: data,
      userKey: key,
      source: fromDb && padUpdatedMs(fromDb) >= padUpdatedMs(fromFile) ? 'db' : 'file',
    });
  } catch (e) {
    console.error('Scratch pad GET failed:', e);
    res.status(500).json({ error: 'Notizen konnten nicht geladen werden' });
  }
});

/** Speichern in DB (+ Datei-Sicherheitskopie). */
router.put('/', async (req, res) => {
  try {
    const user = req.user!;
    const body = req.body as Partial<ScratchPadPayload>;
    if (!body || !Array.isArray(body.pages)) {
      return res.status(400).json({ error: 'Ungültige Notizdaten (pages fehlt)' });
    }
    const key = scratchPadUserFolderKey(user.id, user.name);
    const payload: ScratchPadPayload = {
      pages: body.pages,
      pageIndex: typeof body.pageIndex === 'number' ? body.pageIndex : 0,
      updatedAt:
        typeof body.updatedAt === 'string' && body.updatedAt
          ? body.updatedAt
          : new Date().toISOString(),
      userId: user.id,
      userName: user.name,
    };
    await writeScratchPadToDb(user.id, payload);
    const written = writeScratchPad(key, payload);
    res.json({
      ok: true,
      userKey: key,
      storedIn: 'db',
      live: written.live,
      backupLatest: written.backupLatest,
      backupStamp: written.backupStamp,
      updatedAt: payload.updatedAt,
    });
  } catch (e) {
    console.error('Scratch pad PUT failed:', e);
    res.status(500).json({ error: 'Notizen konnten nicht gespeichert werden' });
  }
});

export default router;
