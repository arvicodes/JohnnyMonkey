import express from 'express';
import { authenticateUser, requireTeacher } from '../middleware/auth';
import { getTeacherGitBackupStatus, runTeacherGitBackup } from '../utils/teacherGitBackup';

const router = express.Router();

router.use(authenticateUser, requireTeacher);

router.get('/', (_req, res) => {
  res.json(getTeacherGitBackupStatus());
});

router.post('/', async (req, res) => {
  req.setTimeout(300_000);
  res.setTimeout(300_000);
  try {
    const result = await runTeacherGitBackup();
    res.status(result.ok ? 200 : 409).json(result);
  } catch (error) {
    console.error('teacher-git-backup:', error);
    res.status(500).json({
      ok: false,
      committed: false,
      pushed: false,
      message: 'Unerwarteter Fehler beim Schieben nach GitHub.',
    });
  }
});

export default router;
