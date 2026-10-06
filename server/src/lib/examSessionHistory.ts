import type { PrismaClient } from '@prisma/client';
import { kaPathsMatchFamily } from './examVersionPaths';

export async function recordExamSessionStarts(
  prisma: PrismaClient,
  entries: Array<{
    groupId: string;
    filePath: string;
    lessonPath: string;
    beaconId: string;
  }>,
): Promise<void> {
  if (!entries.length) return;
  await prisma.$transaction(
    entries.map((e) =>
      prisma.lessonExamSession.create({
        data: {
          groupId: e.groupId,
          filePath: e.filePath.replace(/\\/g, '/').trim(),
          lessonPath: (e.lessonPath || '').replace(/\\/g, '/').trim(),
          beaconId: e.beaconId,
        },
      }),
    ),
  );
}

export async function closeOpenExamSessionsForGroups(
  prisma: PrismaClient,
  groupIds: string[],
): Promise<void> {
  const ids = [...new Set(groupIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return;
  const now = new Date();
  await prisma.lessonExamSession.updateMany({
    where: { groupId: { in: ids }, endedAt: null },
    data: { endedAt: now },
  });
}

export type ExamSessionHistoryEntry = {
  id: string;
  groupId: string;
  groupName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  submissionCount: number;
  running: boolean;
};

async function countSubmissionsInWindow(
  prisma: PrismaClient,
  examFilePath: string,
  groupId: string,
  startedAt: Date,
  endedAt: Date,
): Promise<number> {
  const group = await prisma.learningGroup.findUnique({
    where: { id: groupId },
    select: { students: { select: { id: true } } },
  });
  const studentIds = (group?.students || []).map((s) => s.id);
  if (!studentIds.length) return 0;

  const subs = await prisma.kASubmission.findMany({
    where: {
      studentId: { in: studentIds },
      submittedAt: { gte: startedAt, lte: endedAt },
    },
    select: { kaFilePath: true },
  });

  return subs.filter((s) => kaPathsMatchFamily(examFilePath, s.kaFilePath)).length;
}

export async function getExamSessionHistoryForTeacher(
  prisma: PrismaClient,
  teacherId: string,
  filePathRaw: string,
  limit = 80,
): Promise<ExamSessionHistoryEntry[]> {
  const teacher = teacherId.trim();
  const filePath = String(filePathRaw || '').replace(/\\/g, '/').trim();
  if (!teacher || !filePath) return [];

  const sessions = await prisma.lessonExamSession.findMany({
    where: { group: { teacherId: teacher } },
    include: { group: { select: { name: true } } },
    orderBy: { startedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  });

  const filtered = sessions.filter((s) => kaPathsMatchFamily(filePath, s.filePath));
  const now = Date.now();

  const rows: ExamSessionHistoryEntry[] = [];
  for (const s of filtered) {
    const end = s.endedAt ?? new Date(now);
    const durationMs = Math.max(0, end.getTime() - s.startedAt.getTime());
    const submissionCount = await countSubmissionsInWindow(
      prisma,
      s.filePath,
      s.groupId,
      s.startedAt,
      end,
    );
    rows.push({
      id: s.id,
      groupId: s.groupId,
      groupName: s.group.name || 'Lerngruppe',
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      durationMs,
      submissionCount,
      running: !s.endedAt,
    });
  }
  return rows;
}
