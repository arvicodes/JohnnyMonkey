import { apiCall } from './api';
import { flushStandSources } from './teacherGitBackup';

export const OPEN_TEACHER_FULL_ARCHIVE_EVENT = 'johnny:open-full-archive';

export type TeacherFullArchiveDownload = {
  fileName: string;
  presentations: number;
  notesFiles: number;
  ticketFiles: number;
};

function parseFileName(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const utf = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf?.[1]) {
    try {
      return decodeURIComponent(utf[1]);
    } catch {
      return utf[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1]?.trim() || fallback;
}

export async function downloadTeacherFullArchive(): Promise<TeacherFullArchiveDownload> {
  await flushStandSources();
  const res = await apiCall('/api/teacher-full-archive/download', { method: 'GET' });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || 'Archiv konnte nicht geladen werden.');
  }
  const blob = await res.blob();
  const fileName = parseFileName(
    res.headers.get('Content-Disposition'),
    `JohnnyMonkey-Alles_${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.zip`
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return {
    fileName,
    presentations: Number(res.headers.get('X-Archive-Presentations') || 0),
    notesFiles: Number(res.headers.get('X-Archive-Notes') || 0),
    ticketFiles: Number(res.headers.get('X-Archive-Tickets') || 0),
  };
}
