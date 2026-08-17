import express from 'express';
import { authenticateUser, requireTeacher } from '../middleware/auth';
import {
  ensureScratchPadRoots,
  readScratchPadLive,
  scratchPadUserFolderKey,
  writeScratchPad,
  type ScratchPadPayload,
} from '../utils/teacherScratchPadStore';

const router = express.Router();

router.use(authenticateUser, requireTeacher);

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

/** Aktueller Stand der Schnellnotizen (Server-Datei). */
router.get('/', (req, res) => {
  try {
    const user = req.user!;
    const key = scratchPadUserFolderKey(user.id, user.name);
    ensureScratchPadRoots();
    const data = readScratchPadLive(key);
    if (!data) {
      return res.json({ ok: true, found: false, pad: null, userKey: key });
    }
    return res.json({ ok: true, found: true, pad: data, userKey: key });
  } catch (e) {
    console.error('Scratch pad GET failed:', e);
    res.status(500).json({ error: 'Notizen konnten nicht geladen werden' });
  }
});

/** Speichern + Sicherheitskopie. */
router.put('/', (req, res) => {
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
    const written = writeScratchPad(key, payload);
    res.json({
      ok: true,
      userKey: key,
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
