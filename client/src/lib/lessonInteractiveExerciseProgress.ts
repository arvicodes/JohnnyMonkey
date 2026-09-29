import type { InteractiveExerciseProgressSnapshot } from './presentationInteractiveExercise';

export type TeacherInteractiveExerciseProgressRow = {
  studentId: string;
  studentName: string;
  questionPercents: Record<string, number | null>;
  updatedAt: string | null;
};

export async function pushInteractiveExerciseProgress(opts: {
  groupId: string;
  lessonPath: string;
  exerciseId: string;
  snapshot: InteractiveExerciseProgressSnapshot;
}): Promise<void> {
  const gid = opts.groupId.trim();
  const eid = opts.exerciseId.trim();
  if (!gid || !eid) return;
  const loginCode = localStorage.getItem('loginCode')?.trim() || '';
  if (!loginCode) return;
  const progressJson = JSON.stringify({
    progress: opts.snapshot.progress,
    questionPercents: opts.snapshot.questionPercents,
  });
  try {
    await fetch('/api/learning-groups/interactive-exercise-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-login-code': loginCode,
      },
      body: JSON.stringify({
        groupId: gid,
        lessonPath: opts.lessonPath || '',
        exerciseId: eid,
        progressJson,
      }),
    });
  } catch {
    /* offline */
  }
}

export async function fetchTeacherInteractiveExerciseProgress(opts: {
  teacherId: string;
  groupId: string;
  lessonPath: string;
  exerciseId: string;
}): Promise<TeacherInteractiveExerciseProgressRow[]> {
  const params = new URLSearchParams({
    teacherId: opts.teacherId,
    exerciseId: opts.exerciseId,
    lessonPath: opts.lessonPath || '',
  });
  const res = await fetch(
    `/api/learning-groups/interactive-exercise-progress/${encodeURIComponent(opts.groupId)}?${params}`,
  );
  if (!res.ok) {
    throw new Error('Auswertung konnte nicht geladen werden');
  }
  const data = (await res.json()) as { students?: TeacherInteractiveExerciseProgressRow[] };
  return Array.isArray(data.students) ? data.students : [];
}

let syncTimer: number | null = null;

export function queuePushInteractiveExerciseProgress(
  opts: Parameters<typeof pushInteractiveExerciseProgress>[0],
): void {
  if (syncTimer != null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void pushInteractiveExerciseProgress(opts);
  }, 500);
}
