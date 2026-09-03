/** Lehrer startet/beendet eine Prüfungs-HTML für eine Lerngruppe (Vollbild bei SuS). */

export type LessonExamBeaconStatus = {
  active: boolean;
  filePath: string | null;
  beaconId: string | null;
};

export function teacherIdFromStorage(): string {
  return (localStorage.getItem('userId') || '').trim();
}

export function openExamHtmlInTab(filePath: string): void {
  const path = (filePath || '').replace(/\\/g, '/').trim();
  if (!path) return;
  window.open(
    `/api/file-system-paths/read-html?filePath=${encodeURIComponent(path)}`,
    '_blank',
    'noopener,noreferrer',
  );
}

export async function fetchLessonExamBeacon(groupId: string): Promise<LessonExamBeaconStatus> {
  const gid = groupId.trim();
  if (!gid) return { active: false, filePath: null, beaconId: null };
  const res = await fetch(`/api/learning-groups/exam-beacon/status/${encodeURIComponent(gid)}`);
  if (!res.ok) return { active: false, filePath: null, beaconId: null };
  const data = (await res.json()) as {
    active?: boolean;
    beacon?: { filePath?: string; beaconId?: string } | null;
  };
  if (!data.active || !data.beacon) return { active: false, filePath: null, beaconId: null };
  return {
    active: true,
    filePath: data.beacon.filePath || null,
    beaconId: data.beacon.beaconId || null,
  };
}

export async function startLessonExam(opts: {
  teacherId: string;
  groupId: string;
  filePath: string;
  lessonPath?: string;
}): Promise<{ filePath: string; beaconId: string }> {
  const res = await fetch('/api/learning-groups/exam-beacon/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherId: opts.teacherId,
      groupId: opts.groupId,
      filePath: opts.filePath,
      lessonPath: opts.lessonPath || '',
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    filePath?: string;
    beaconId?: string;
  };
  if (!res.ok) throw new Error(data.error || 'Prüfung konnte nicht gestartet werden');
  return {
    filePath: data.filePath || opts.filePath,
    beaconId: data.beaconId || '',
  };
}

export async function stopLessonExam(opts: { teacherId: string; groupId: string }): Promise<void> {
  const res = await fetch('/api/learning-groups/exam-beacon/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teacherId: opts.teacherId, groupId: opts.groupId }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || 'Prüfung konnte nicht beendet werden');
}
