/** Sync einer gestarteten Stunde auf andere Tabs/Geräte desselben Lehrer-Logins. */

const PLAY_HOST_KEY = 'jm-teacher-play-host';

export function normalizeTeacherLessonPath(path: string): string {
  return (path || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

export function teacherLessonPathsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeTeacherLessonPath(a || '');
  const nb = normalizeTeacherLessonPath(b || '');
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.endsWith(`/${nb}`) || nb.endsWith(`/${na}`) || na.endsWith(nb) || nb.endsWith(na);
}

export function markTeacherPlayHost(groupId: string, lessonPath: string): void {
  try {
    sessionStorage.setItem(
      PLAY_HOST_KEY,
      JSON.stringify({
        groupId,
        lessonPath: normalizeTeacherLessonPath(lessonPath),
        at: Date.now(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function clearTeacherPlayHost(): void {
  try {
    sessionStorage.removeItem(PLAY_HOST_KEY);
  } catch {
    /* ignore */
  }
}

export function isTeacherPlayHost(groupId: string, lessonPath: string): boolean {
  try {
    const raw = sessionStorage.getItem(PLAY_HOST_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { groupId?: string; lessonPath?: string };
    return (
      parsed.groupId === groupId &&
      normalizeTeacherLessonPath(parsed.lessonPath || '') === normalizeTeacherLessonPath(lessonPath)
    );
  } catch {
    return false;
  }
}
