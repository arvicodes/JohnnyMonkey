import { apiGet, apiPost } from './api';

export type TeacherGitBackupStatus = {
  available: boolean;
  reason: 'ok' | 'no-git' | 'not-main' | 'busy' | 'error';
  hint: string;
  where?: 'laptop' | 'school';
};

export type TeacherGitBackupResult = {
  ok: boolean;
  committed?: boolean;
  pushed?: boolean;
  message: string;
};

export async function fetchTeacherGitBackupStatus(): Promise<TeacherGitBackupStatus> {
  const res = await apiGet('/api/teacher-git-backup');
  const data = (await res.json().catch(() => ({}))) as Partial<TeacherGitBackupStatus>;
  if (!res.ok) {
    return {
      available: false,
      reason: 'error',
      hint: data.hint || 'GitHub-Knopf gerade nicht erreichbar.',
    };
  }
  return {
    available: Boolean(data.available),
    reason: data.reason || (data.available ? 'ok' : 'error'),
    hint: String(data.hint || ''),
  };
}

export async function pushTeacherGitBackup(): Promise<TeacherGitBackupResult> {
  const res = await apiPost('/api/teacher-git-backup');
  const data = (await res.json().catch(() => ({}))) as Partial<TeacherGitBackupResult>;
  const message = String(data.message || (res.ok ? 'Fertig.' : 'Push fehlgeschlagen.'));
  return {
    ok: Boolean(data.ok),
    committed: Boolean(data.committed),
    pushed: Boolean(data.pushed),
    message,
  };
}
