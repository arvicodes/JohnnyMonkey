import express from 'express';
import { authenticateUser, requireTeacher } from '../middleware/auth';
import { buildTeacherFullArchive, writeExtraNotesTicketsCopy } from '../utils/teacherFullArchive';

const router = express.Router();

router.use(authenticateUser, requireTeacher);

router.get('/download', async (req, res) => {
  req.setTimeout(300_000);
  res.setTimeout(300_000);
  try {
    const archive = await buildTeacherFullArchive();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${archive.fileName}"`);
    res.setHeader('X-Archive-Presentations', String(archive.counts.presentations));
    res.setHeader('X-Archive-Notes', String(archive.counts.notesFiles));
    res.setHeader('X-Archive-Tickets', String(archive.counts.ticketFiles));
    res.download(archive.zipPath, archive.fileName, (err) => {
      if (err && !res.headersSent) {
        console.error('teacher-full-archive send:', err);
        res.status(500).json({ error: 'ZIP konnte nicht gesendet werden.' });
      }
    });
  } catch (error) {
    console.error('teacher-full-archive:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Archiv konnte nicht gebaut werden.' });
    }
  }
});

router.post('/extra-copy', (_req, res) => {
  try {
    const dir = writeExtraNotesTicketsCopy();
    res.json({ ok: true, dir });
  } catch (error) {
    console.error('teacher-full-archive extra-copy:', error);
    res.status(500).json({ ok: false, error: 'Extra-Kopie fehlgeschlagen.' });
  }
});

export default router;
