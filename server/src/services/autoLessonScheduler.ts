import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import {
  berlinDateTime,
  getBerlinNow,
  parsePeriodTimes,
} from '../lib/periodTimes';
import {
  collectFilesInDirectory,
  revokeNonMaterialSharesInTree,
  syncLessonFolderShares,
} from './lessonFolderShareSync';

const prisma = new PrismaClient();

async function shareLessonFolder(groupId: string, lessonPath: string): Promise<void> {
  await syncLessonFolderShares(groupId, lessonPath);
}

async function shareGroupAssignedMaterials(groupId: string): Promise<void> {
  const assignments = await prisma.groupAssignment.findMany({
    where: { groupId, type: 'FOLDER' },
  });
  for (const assignment of assignments) {
    await revokeNonMaterialSharesInTree(groupId, assignment.refId);
  }
}

async function shareLessonForSlot(groupId: string, lessonPath: string | null): Promise<void> {
  if (lessonPath) {
    await shareLessonFolder(groupId, lessonPath);
  } else {
    await shareGroupAssignedMaterials(groupId);
  }
}

async function activateSession(sessionId: string, _groupId: string, _lessonPath: string | null): Promise<void> {
  await prisma.autoLessonSession.update({
    where: { id: sessionId },
    data: { status: 'ACTIVE', updatedAt: new Date() },
  });
}

async function closeSession(sessionId: string): Promise<void> {
  await prisma.autoLessonSession.update({
    where: { id: sessionId },
    data: { status: 'CLOSED', updatedAt: new Date() },
  });
}

export async function runAutoLessonSchedulerTick(): Promise<void> {
  const { date, dayOfWeek, now } = getBerlinNow();
  if (dayOfWeek < 1 || dayOfWeek > 5) return;

  // Prisma-Client kann unvollständig sein, wenn schema.prisma vom DB-Volume überdeckt wurde
  if (!prisma.teacherScheduleSettings?.findMany) {
    console.warn(
      '[AutoLesson] teacherScheduleSettings fehlt im Prisma-Client — Tick übersprungen (DB-Volume darf prisma/ nicht mounten).'
    );
    return;
  }

  const teachers = await prisma.teacherScheduleSettings.findMany({
    include: {
      teacher: {
        include: {
          scheduleSlots: {
            where: { dayOfWeek },
            include: { group: true },
          },
        },
      },
    },
  });

  for (const settings of teachers) {
    const periods = parsePeriodTimes(settings.periodTimes);
    const startWindow = settings.startWindowMinutes;
    const endWindow = settings.endWindowMinutes;

    for (const slot of settings.teacher.scheduleSlots) {
      const period = periods.find((p) => p.period === slot.periodNumber);
      if (!period) continue;

      const startsAt = berlinDateTime(date, period.start);
      const endsAt = berlinDateTime(date, period.end);
      const opensAt = new Date(startsAt.getTime() - startWindow * 60_000);
      const closesAt = endsAt;

      if (now < opensAt || now >= endsAt) {
        const existing = await prisma.autoLessonSession.findUnique({
          where: {
            groupId_sessionDate_periodNumber: {
              groupId: slot.groupId,
              sessionDate: date,
              periodNumber: slot.periodNumber,
            },
          },
        });
        if (existing && existing.status !== 'CLOSED' && now >= endsAt) {
          await closeSession(existing.id);
        }
        continue;
      }

      let session = await prisma.autoLessonSession.findUnique({
        where: {
          groupId_sessionDate_periodNumber: {
            groupId: slot.groupId,
            sessionDate: date,
            periodNumber: slot.periodNumber,
          },
        },
      });

      if (!session) {
        session = await prisma.autoLessonSession.create({
          data: {
            teacherId: settings.teacherId,
            groupId: slot.groupId,
            sessionDate: date,
            dayOfWeek: slot.dayOfWeek,
            periodNumber: slot.periodNumber,
            lessonPath: slot.lessonPath,
            opensAt,
            startsAt,
            endsAt,
            closesAt,
            status: 'OPEN',
          },
        });
        await shareLessonForSlot(slot.groupId, slot.lessonPath);
      }

      if (session.status === 'OPEN' && now >= startsAt) {
        await activateSession(session.id, slot.groupId, null);
      } else if (session.status === 'ACTIVE' && now >= endsAt) {
        await closeSession(session.id);
      }
    }
  }
}

export function startAutoLessonScheduler(): void {
  const tick = () => {
    runAutoLessonSchedulerTick().catch((err) => {
      console.error('[AutoLesson] Scheduler tick failed:', err);
    });
  };
  tick();
  setInterval(tick, 30_000);
}

export const TIMETABLE_UPLOAD_DIR = path.join(__dirname, '../../uploads/timetables');

export function ensureTimetableUploadDir(): void {
  if (!fs.existsSync(TIMETABLE_UPLOAD_DIR)) {
    fs.mkdirSync(TIMETABLE_UPLOAD_DIR, { recursive: true });
  }
}
