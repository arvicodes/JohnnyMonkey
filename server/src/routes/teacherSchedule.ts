import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import {
  DEFAULT_JOHNNY_PERIOD_TIMES,
  parsePeriodTimes,
  periodTimesToJson,
} from '../lib/periodTimes';
import {
  ensureTimetableUploadDir,
  TIMETABLE_UPLOAD_DIR,
} from '../services/autoLessonScheduler';

const router = Router();
const prisma = new PrismaClient();

ensureTimetableUploadDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureTimetableUploadDir();
    cb(null, TIMETABLE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF oder Bilddateien erlaubt'));
    }
  },
});

async function getTeacherIdFromLogin(req: Request): Promise<string | null> {
  const loginCode = req.headers['x-login-code'] as string;
  if (!loginCode) return null;
  const user = await prisma.user.findUnique({ where: { loginCode } });
  if (!user || user.role !== 'TEACHER') return null;
  return user.id;
}

async function getOrCreateSettings(teacherId: string) {
  let settings = await prisma.teacherScheduleSettings.findUnique({ where: { teacherId } });
  if (!settings) {
    settings = await prisma.teacherScheduleSettings.create({
      data: {
        teacherId,
        periodTimes: periodTimesToJson(DEFAULT_JOHNNY_PERIOD_TIMES),
      },
    });
  }
  return settings;
}

router.get('/settings', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const settings = await getOrCreateSettings(teacherId);
    const uploads = await prisma.teacherTimetableUpload.findMany({
      where: { teacherId },
      orderBy: { uploadedAt: 'desc' },
    });
    const slots = await prisma.scheduleSlot.findMany({
      where: { teacherId },
      include: {
        group: {
          select: { id: true, name: true, iconEmoji: true, color: true, isArchived: true },
        },
      },
    });

    res.json({
      settings: {
        startWindowMinutes: settings.startWindowMinutes,
        endWindowMinutes: settings.endWindowMinutes,
        periodTimes: parsePeriodTimes(settings.periodTimes),
      },
      uploads,
      slots: slots.map((s) => ({
        id: s.id,
        groupId: s.groupId,
        dayOfWeek: s.dayOfWeek,
        periodNumber: s.periodNumber,
        lessonPath: s.lessonPath,
        group: s.group,
      })),
    });
  } catch (error) {
    console.error('GET /teacher-schedule/settings:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.put('/settings', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const { startWindowMinutes, endWindowMinutes, periodTimes } = req.body;
    const data: Record<string, unknown> = {};
    if (typeof startWindowMinutes === 'number') data.startWindowMinutes = Math.max(0, startWindowMinutes);
    if (typeof endWindowMinutes === 'number') data.endWindowMinutes = Math.max(0, endWindowMinutes);
    if (Array.isArray(periodTimes)) {
      data.periodTimes = periodTimesToJson(periodTimes);
    }

    const settings = await prisma.teacherScheduleSettings.upsert({
      where: { teacherId },
      create: {
        teacherId,
        startWindowMinutes: (data.startWindowMinutes as number) ?? 5,
        endWindowMinutes: (data.endWindowMinutes as number) ?? 5,
        periodTimes: (data.periodTimes as string) ?? periodTimesToJson(DEFAULT_JOHNNY_PERIOD_TIMES),
      },
      update: data,
    });

    res.json({
      startWindowMinutes: settings.startWindowMinutes,
      endWindowMinutes: settings.endWindowMinutes,
      periodTimes: parsePeriodTimes(settings.periodTimes),
    });
  } catch (error) {
    console.error('PUT /teacher-schedule/settings:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.put('/slots', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const { slots } = req.body;
    if (!Array.isArray(slots)) {
      return res.status(400).json({ error: 'slots Array erforderlich' });
    }

    await prisma.scheduleSlot.deleteMany({ where: { teacherId } });

    const created = [];
    for (const slot of slots) {
      if (!slot.groupId || !slot.dayOfWeek || !slot.periodNumber) continue;
      if (slot.dayOfWeek < 1 || slot.dayOfWeek > 5) continue;
      if (slot.periodNumber < 1 || slot.periodNumber > 10) continue;

      const group = await prisma.learningGroup.findFirst({
        where: { id: slot.groupId, teacherId },
      });
      if (!group) continue;

      const row = await prisma.scheduleSlot.create({
        data: {
          teacherId,
          groupId: slot.groupId,
          dayOfWeek: slot.dayOfWeek,
          periodNumber: slot.periodNumber,
          lessonPath: slot.lessonPath || null,
        },
        include: {
          group: { select: { id: true, name: true, iconEmoji: true, color: true } },
        },
      });
      created.push(row);
    }

    res.json({ slots: created });
  } catch (error) {
    console.error('PUT /teacher-schedule/slots:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/uploads', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

    const upload = await prisma.teacherTimetableUpload.create({
      data: {
        teacherId,
        filename: req.file.originalname,
        filePath: req.file.filename,
      },
    });

    res.json(upload);
  } catch (error) {
    console.error('POST /teacher-schedule/uploads:', error);
    res.status(500).json({ error: 'Upload fehlgeschlagen' });
  }
});

router.put('/uploads/:id/current', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const upload = await prisma.teacherTimetableUpload.findFirst({
      where: { id: req.params.id, teacherId },
    });
    if (!upload) return res.status(404).json({ error: 'Nicht gefunden' });

    await prisma.teacherTimetableUpload.updateMany({
      where: { teacherId },
      data: { isCurrent: false },
    });
    const updated = await prisma.teacherTimetableUpload.update({
      where: { id: upload.id },
      data: { isCurrent: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('PUT /teacher-schedule/uploads/:id/current:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.delete('/uploads/:id', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const upload = await prisma.teacherTimetableUpload.findFirst({
      where: { id: req.params.id, teacherId },
    });
    if (!upload) return res.status(404).json({ error: 'Nicht gefunden' });

    const filePath = path.join(TIMETABLE_UPLOAD_DIR, upload.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.teacherTimetableUpload.delete({ where: { id: upload.id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /teacher-schedule/uploads/:id:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/uploads/:id/file', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const upload = await prisma.teacherTimetableUpload.findFirst({
      where: { id: req.params.id, teacherId },
    });
    if (!upload) return res.status(404).json({ error: 'Nicht gefunden' });

    const filePath = path.join(TIMETABLE_UPLOAD_DIR, upload.filePath);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei nicht gefunden' });

    res.sendFile(filePath);
  } catch (error) {
    console.error('GET /teacher-schedule/uploads/:id/file:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/active-lessons/student', async (req: Request, res: Response) => {
  try {
    const loginCode = req.headers['x-login-code'] as string;
    if (!loginCode) return res.status(401).json({ error: 'Nicht autorisiert' });

    const student = await prisma.user.findUnique({
      where: { loginCode },
      include: { learningGroups: { select: { id: true } } },
    });
    if (!student || student.role !== 'STUDENT') {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const groupIds = student.learningGroups.map((g) => g.id);
    if (groupIds.length === 0) return res.json({ sessions: [] });

    const now = new Date();
    const sessions = await prisma.autoLessonSession.findMany({
      where: {
        groupId: { in: groupIds },
        status: { in: ['OPEN', 'ACTIVE'] },
        opensAt: { lte: now },
        endsAt: { gt: now },
      },
      include: {
        group: { select: { id: true, name: true, iconEmoji: true, color: true } },
      },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('GET /teacher-schedule/active-lessons/student:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/active-lessons/teacher', async (req: Request, res: Response) => {
  try {
    const teacherId = await getTeacherIdFromLogin(req);
    if (!teacherId) return res.status(401).json({ error: 'Nicht autorisiert' });

    const now = new Date();
    const sessions = await prisma.autoLessonSession.findMany({
      where: {
        teacherId,
        status: { in: ['OPEN', 'ACTIVE'] },
        opensAt: { lte: now },
        endsAt: { gt: now },
      },
      include: {
        group: { select: { id: true, name: true, iconEmoji: true, color: true } },
      },
    });

    res.json({ sessions });
  } catch (error) {
    console.error('GET /teacher-schedule/active-lessons/teacher:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

export default router;
