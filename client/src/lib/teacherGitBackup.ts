import { apiGet, apiPost } from './api';

export type StandChangeKind = 'added' | 'changed' | 'removed';

export type StandChange = {
  path: string;
  kind: StandChangeKind;
  label: string;
};

export type TeacherGitBackupStatus = {
  available: boolean;
  reason: 'ok' | 'no-git' | 'not-main' | 'busy' | 'error';
  hint: string;
  where?: 'laptop' | 'school';
};

export type TeacherGitBackupPreview = TeacherGitBackupStatus & {
  explanation: string;
  changes: StandChange[];
  summary: string;
};

export type TeacherGitBackupResult = {
  ok: boolean;
  committed?: boolean;
  pushed?: boolean;
  message: string;
  changes?: StandChange[];
  explanation?: string;
  where?: 'laptop' | 'school';
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
    where: data.where,
  };
}

export async function fetchTeacherGitBackupPreview(): Promise<TeacherGitBackupPreview> {
  const res = await apiGet('/api/teacher-git-backup/preview');
  const data = (await res.json().catch(() => ({}))) as Partial<TeacherGitBackupPreview>;
  const changes = Array.isArray(data.changes) ? data.changes : [];
  return {
    available: Boolean(data.available),
    reason: data.reason || (data.available ? 'ok' : 'error'),
    hint: String(data.hint || ''),
    where: data.where,
    explanation: String(data.explanation || data.hint || ''),
    changes,
    summary: String(data.summary || ''),
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
    changes: Array.isArray(data.changes) ? data.changes : [],
    explanation: data.explanation,
    where: data.where,
  };
}
