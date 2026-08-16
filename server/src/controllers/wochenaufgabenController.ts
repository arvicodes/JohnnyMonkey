import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DAY_MS = 86400000;
export const WA_PHASE1_DAYS = 5;
export const WA_PHASE2_DAYS = 2;
export const WA_PHASE3_DAYS = 2;

export type WaPhase = 'draft' | 'phase1' | 'phase2' | 'phase3' | 'completed';

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export function waVirtualPath(lessonPath: string, key: string): string {
  return `${normalizePath(lessonPath)}/${key}`;
}

export const WA_KEYS = {
  solution: 'WA_L1_loesung',
  video: 'WA_V_erklaervideo',
  audio: 'WA_L3_audio',
  correction: 'WA_L5_korrektur',
} as const;

export function computePhase(activatedAt: Date | null, now = new Date()): WaPhase {
  if (!activatedAt) return 'draft';
  const elapsed = now.getTime() - activatedAt.getTime();
  if (elapsed < WA_PHASE1_DAYS * DAY_MS) return 'phase1';
  if (elapsed < (WA_PHASE1_DAYS + WA_PHASE2_DAYS) * DAY_MS) return 'phase2';
  if (elapsed < (WA_PHASE1_DAYS + WA_PHASE2_DAYS + WA_PHASE3_DAYS) * DAY_MS) return 'phase3';
  return 'completed';
}

function phaseEndAt(activatedAt: Date, phase: WaPhase): Date | null {
  if (phase === 'draft' || phase === 'completed') return null;
  if (phase === 'phase1') return new Date(activatedAt.getTime() + WA_PHASE1_DAYS * DAY_MS);
  if (phase === 'phase2') return new Date(activatedAt.getTime() + (WA_PHASE1_DAYS + WA_PHASE2_DAYS) * DAY_MS);
  return new Date(activatedAt.getTime() + (WA_PHASE1_DAYS + WA_PHASE2_DAYS + WA_PHASE3_DAYS) * DAY_MS);
}

async function getTeacherIdForGroup(groupId: string): Promise<string | null> {
  const group = await prisma.learningGroup.findUnique({
    where: { id: groupId },
    select: { teacherId: true },
  });
  return group?.teacherId ?? null;
}

async function findSubmission(
  teacherId: string,
  virtualFilePath: string,
  fileName: string,
  studentId: string,
) {
  const assignment = await prisma.assignment.findFirst({
    where: { filePath: virtualFilePath, teacherId, fileName },
  });
  if (!assignment) return null;
  return prisma.submission.findFirst({
    where: { assignmentId: assignment.id, studentId },
    orderBy: { submittedAt: 'desc' },
  });
}

async function listSubmissionsForKey(teacherId: string, lessonPath: string, fileName: string) {
  const virtualFilePath = waVirtualPath(lessonPath, fileName);
  const assignment = await prisma.assignment.findFirst({
    where: { filePath: virtualFilePath, teacherId, fileName },
    include: {
      submissions: {
        include: { student: { select: { id: true, name: true, avatarEmoji: true } } },
      },
    },
  });
  return assignment?.submissions ?? [];
}

/** Zufällige Kreis-Zuordnung: jeder bekommt die Lösung eines anderen. */
function buildPeerCycle(studentIds: string[]): Map<string, string> {
  if (studentIds.length < 2) return new Map();
  const shuffled = [...studentIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const map = new Map<string, string>();
  for (let i = 0; i < shuffled.length; i++) {
    map.set(shuffled[i], shuffled[(i + 1) % shuffled.length]);
  }
  return map;
}

async function ensurePeerPairs(task: {
  id: string;
  groupId: string;
  lessonPath: string;
  peerAssignedAt: Date | null;
}) {
  if (task.peerAssignedAt) return;
  const teacherId = await getTeacherIdForGroup(task.groupId);
  if (!teacherId) return;

  const submissions = await listSubmissionsForKey(teacherId, task.lessonPath, WA_KEYS.solution);
  const studentIds = [...new Set(submissions.map((s) => s.studentId))];
  if (studentIds.length < 2) return;

  const pairs = buildPeerCycle(studentIds);
  const rows = [...pairs.entries()].map(([reviewerStudentId, solutionStudentId]) => ({
    taskId: task.id,
    reviewerStudentId,
    solutionStudentId,
  }));

  await prisma.$transaction([
    ...rows.map((row) => prisma.wochenaufgabePeerPair.create({ data: row })),
    prisma.wochenaufgabeTask.update({
      where: { id: task.id },
      data: { peerAssignedAt: new Date() },
    }),
  ]);
}

async function buildTaskState(
  task: {
    id: string;
    groupId: string;
    lessonPath: string;
    activatedAt: Date | null;
    videoClaimStudentId: string | null;
    videoClaimedAt: Date | null;
    peerAssignedAt: Date | null;
    videoClaimStudent?: { id: string; name: string; avatarEmoji: string | null } | null;
    peerPairs?: {
      reviewerStudentId: string;
      solutionStudentId: string;
      solutionOwner?: { id: string; name: string; avatarEmoji: string | null };
    }[];
  },
  teacherId: string,
  studentId?: string,
) {
  const now = new Date();
  const phase = computePhase(task.activatedAt, now);
  const phaseEndsAt = task.activatedAt ? phaseEndAt(task.activatedAt, phase) : null;
  const remainingMs = phaseEndsAt ? Math.max(0, phaseEndsAt.getTime() - now.getTime()) : null;

  if (
    task.activatedAt &&
    (phase === 'phase2' || phase === 'phase3' || phase === 'completed') &&
    !task.peerAssignedAt
  ) {
    await ensurePeerPairs(task);
    const refreshed = await prisma.wochenaufgabeTask.findUnique({
      where: { id: task.id },
      include: {
        videoClaimStudent: { select: { id: true, name: true, avatarEmoji: true } },
        peerPairs: {
          include: {
            solutionOwner: { select: { id: true, name: true, avatarEmoji: true } },
          },
        },
      },
    });
    if (refreshed) return buildTaskState(refreshed, teacherId, studentId);
  }

  let videoSubmission = null as { id: string } | null;
  if (task.videoClaimStudentId) {
    videoSubmission = await findSubmission(
      teacherId,
      waVirtualPath(task.lessonPath, WA_KEYS.video),
      WA_KEYS.video,
      task.videoClaimStudentId,
    );
  }

  let mySolutionSubmission = null as { id: string } | null;
  let peerSolutionSubmission = null as { id: string; student?: { name: string } } | null;
  let myAudioSubmission = null as { id: string } | null;
  let receivedAudioSubmission = null as { id: string } | null;
  let myCorrectionSubmission = null as { id: string } | null;

  if (studentId) {
    mySolutionSubmission = await findSubmission(
      teacherId,
      waVirtualPath(task.lessonPath, WA_KEYS.solution),
      WA_KEYS.solution,
      studentId,
    );
    myAudioSubmission = await findSubmission(
      teacherId,
      waVirtualPath(task.lessonPath, WA_KEYS.audio),
      WA_KEYS.audio,
      studentId,
    );
    myCorrectionSubmission = await findSubmission(
      teacherId,
      waVirtualPath(task.lessonPath, WA_KEYS.correction),
      WA_KEYS.correction,
      studentId,
    );

    const asReviewer = task.peerPairs?.find((p) => p.reviewerStudentId === studentId);
    if (asReviewer) {
      const peerSub = await findSubmission(
        teacherId,
        waVirtualPath(task.lessonPath, WA_KEYS.solution),
        WA_KEYS.solution,
        asReviewer.solutionStudentId,
      );
      if (peerSub) {
        peerSolutionSubmission = {
          id: peerSub.id,
          student: asReviewer.solutionOwner ?? undefined,
        };
      }
    }

    const asOwner = task.peerPairs?.find((p) => p.solutionStudentId === studentId);
    if (asOwner && phase !== 'phase1' && phase !== 'draft') {
      const phase2Ended =
        task.activatedAt &&
        now.getTime() >= task.activatedAt.getTime() + (WA_PHASE1_DAYS + WA_PHASE2_DAYS) * DAY_MS;
      if (phase2Ended) {
        receivedAudioSubmission = await findSubmission(
          teacherId,
          waVirtualPath(task.lessonPath, WA_KEYS.audio),
          WA_KEYS.audio,
          asOwner.reviewerStudentId,
        );
      }
    }
  }

  const phase1Ended =
    task.activatedAt &&
    now.getTime() >= task.activatedAt.getTime() + WA_PHASE1_DAYS * DAY_MS;

  return {
    lessonPath: task.lessonPath,
    activatedAt: task.activatedAt,
    phase,
    phaseEndsAt,
    remainingMs,
    videoClaimStudentId: task.videoClaimStudentId,
    videoClaimStudentName: task.videoClaimStudent?.name ?? null,
    isVideoClaimMine: Boolean(studentId && task.videoClaimStudentId === studentId),
    canClaimVideo:
      phase === 'phase1' && !task.videoClaimStudentId && Boolean(studentId),
    hasVideo: Boolean(videoSubmission),
    videoSubmissionId: videoSubmission?.id ?? null,
    videoVisibleToAll: Boolean(phase1Ended && videoSubmission),
    mySolutionSubmissionId: mySolutionSubmission?.id ?? null,
    peerSolutionSubmissionId: peerSolutionSubmission?.id ?? null,
    peerSolutionStudentName: peerSolutionSubmission?.student?.name ?? null,
    myAudioSubmissionId: myAudioSubmission?.id ?? null,
    receivedAudioSubmissionId: receivedAudioSubmission?.id ?? null,
    myCorrectionSubmissionId: myCorrectionSubmission?.id ?? null,
  };
}

/** Status aller Wochenaufgaben in einem Ordner. */
export const listWochenaufgabeStates = async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const parentPath = normalizePath(String(req.query.parentPath || ''));
    const studentId = req.query.studentId ? String(req.query.studentId) : undefined;

    const teacherId = await getTeacherIdForGroup(groupId);
    if (!teacherId) return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });

    const whereParent = parentPath ? { startsWith: `${parentPath}/` } : undefined;
    const tasks = await prisma.wochenaufgabeTask.findMany({
      where: {
        groupId,
        ...(whereParent ? { lessonPath: whereParent } : {}),
      },
      include: {
        videoClaimStudent: { select: { id: true, name: true, avatarEmoji: true } },
        peerPairs: {
          include: {
            solutionOwner: { select: { id: true, name: true, avatarEmoji: true } },
          },
        },
      },
      orderBy: { lessonPath: 'asc' },
    });

    const states = await Promise.all(
      tasks.map((task) => buildTaskState(task, teacherId, studentId)),
    );

    res.json({ states, teacherId });
  } catch (error) {
    console.error('Wochenaufgaben-Status:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

/** Lehrer schaltet Wochenaufgabe frei (grau → gelb). */
export const activateWochenaufgabe = async (req: Request, res: Response) => {
  try {
    const { groupId, lessonPath } = req.body as { groupId?: string; lessonPath?: string };
    if (!groupId || !lessonPath) {
      return res.status(400).json({ error: 'groupId und lessonPath sind erforderlich' });
    }
    const path = normalizePath(lessonPath);

    const task = await prisma.wochenaufgabeTask.upsert({
      where: { groupId_lessonPath: { groupId, lessonPath: path } },
      create: { groupId, lessonPath: path, activatedAt: new Date() },
      update: { activatedAt: new Date(), peerAssignedAt: null },
    });

    await prisma.wochenaufgabePeerPair.deleteMany({ where: { taskId: task.id } });

    const teacherId = await getTeacherIdForGroup(groupId);
    const state = teacherId ? await buildTaskState(task, teacherId) : null;
    res.json({ task, state });
  } catch (error) {
    console.error('Wochenaufgabe aktivieren:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

/** Schüler reserviert V (Erklärvideo). */
export const claimWochenaufgabeVideo = async (req: Request, res: Response) => {
  try {
    const { groupId, lessonPath, studentId } = req.body as {
      groupId?: string;
      lessonPath?: string;
      studentId?: string;
    };
    if (!groupId || !lessonPath || !studentId) {
      return res.status(400).json({ error: 'groupId, lessonPath und studentId sind erforderlich' });
    }
    const path = normalizePath(lessonPath);

    const task = await prisma.wochenaufgabeTask.findUnique({
      where: { groupId_lessonPath: { groupId, lessonPath: path } },
    });
    if (!task?.activatedAt) {
      return res.status(400).json({ error: 'Wochenaufgabe ist noch nicht freigegeben' });
    }
    if (computePhase(task.activatedAt) !== 'phase1') {
      return res.status(400).json({ error: 'Reservierung nur in Phase 1 möglich' });
    }
    if (task.videoClaimStudentId && task.videoClaimStudentId !== studentId) {
      return res.status(409).json({ error: 'Erklärvideo wurde bereits reserviert' });
    }

    const updated = await prisma.wochenaufgabeTask.update({
      where: { id: task.id },
      data: {
        videoClaimStudentId: studentId,
        videoClaimedAt: task.videoClaimedAt ?? new Date(),
      },
      include: {
        videoClaimStudent: { select: { id: true, name: true, avatarEmoji: true } },
        peerPairs: {
          include: {
            solutionOwner: { select: { id: true, name: true, avatarEmoji: true } },
          },
        },
      },
    });

    const teacherId = await getTeacherIdForGroup(groupId);
    const state = teacherId ? await buildTaskState(updated, teacherId, studentId) : null;
    res.json({ state });
  } catch (error) {
    console.error('Video reservieren:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
