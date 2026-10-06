import { teacherIdFromStorage } from './lessonExamBeacon';

export type ExamSessionHistoryRow = {
  id: string;
  groupId: string;
  groupName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  submissionCount: number;
  running: boolean;
};

export async function fetchExamSessionHistory(filePath: string): Promise<ExamSessionHistoryRow[]> {
  const teacherId = teacherIdFromStorage();
  if (!teacherId || !filePath.trim()) return [];
  const res = await fetch(
    `/api/learning-groups/exam-sessions/history?teacherId=${encodeURIComponent(teacherId)}&filePath=${encodeURIComponent(filePath)}`,
  );
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Historie konnte nicht geladen werden');
  }
  const data = (await res.json()) as { sessions?: ExamSessionHistoryRow[] };
  return data.sessions || [];
}

export function formatExamSessionDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatExamSessionDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))} Sek.`;
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 60) return `${totalMin} Min.`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
}
