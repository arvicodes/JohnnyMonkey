/** Lehrer startet/beendet eine interaktive Übung für eine Lerngruppe (Vollbild bei SuS). */

export type LessonInteractiveExerciseBeaconStatus = {
  active: boolean;
  exerciseId: string | null;
  exerciseTitle: string | null;
  slideId: string | null;
  beaconId: string | null;
};

export function teacherIdFromStorage(): string {
  return (
    localStorage.getItem('teacherId') ||
    localStorage.getItem('userId') ||
    ''
  ).trim();
}

export async function fetchLessonInteractiveExerciseBeacon(
  groupId: string,
): Promise<LessonInteractiveExerciseBeaconStatus> {
  const gid = groupId.trim();
  if (!gid) {
    return { active: false, exerciseId: null, exerciseTitle: null, slideId: null, beaconId: null };
  }
  const res = await fetch(
    `/api/learning-groups/interactive-exercise-beacon/status/${encodeURIComponent(gid)}`,
  );
  if (!res.ok) {
    return { active: false, exerciseId: null, exerciseTitle: null, slideId: null, beaconId: null };
  }
  const data = (await res.json()) as {
    active?: boolean;
    beacon?: {
      exerciseId?: string;
      exerciseTitle?: string;
      slideId?: string;
      beaconId?: string;
    } | null;
  };
  if (!data.active || !data.beacon) {
    return { active: false, exerciseId: null, exerciseTitle: null, slideId: null, beaconId: null };
  }
  return {
    active: true,
    exerciseId: data.beacon.exerciseId || null,
    exerciseTitle: data.beacon.exerciseTitle || null,
    slideId: data.beacon.slideId || null,
    beaconId: data.beacon.beaconId || null,
  };
}

export async function startLessonInteractiveExercise(opts: {
  teacherId: string;
  groupId: string;
  lessonPath?: string;
  slideId?: string;
  exerciseId?: string;
  exerciseTitle?: string;
  exerciseJson: string;
}): Promise<{ beaconId: string; exerciseId: string; exerciseTitle: string }> {
  const res = await fetch('/api/learning-groups/interactive-exercise-beacon/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherId: opts.teacherId,
      groupId: opts.groupId,
      lessonPath: opts.lessonPath || '',
      slideId: opts.slideId || '',
      exerciseId: opts.exerciseId || '',
      exerciseTitle: opts.exerciseTitle || '',
      exerciseJson: opts.exerciseJson,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    beaconId?: string;
    exerciseId?: string;
    exerciseTitle?: string;
  };
  if (!res.ok) throw new Error(data.error || 'Übung konnte nicht gestartet werden');
  return {
    beaconId: data.beaconId || '',
    exerciseId: data.exerciseId || opts.exerciseId || '',
    exerciseTitle: data.exerciseTitle || opts.exerciseTitle || '',
  };
}

export async function stopLessonInteractiveExercise(opts: {
  teacherId: string;
  groupId: string;
}): Promise<void> {
  const res = await fetch('/api/learning-groups/interactive-exercise-beacon/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId: opts.teacherId, groupId: opts.groupId }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || 'Übung konnte nicht beendet werden');
}
