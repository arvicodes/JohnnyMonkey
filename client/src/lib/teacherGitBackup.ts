import { apiGet, apiPost } from './api';

export type StandChangeKind = 'added' | 'changed' | 'removed';

export type StandChange = {
  path: string;
  kind: StandChangeKind;
  label: string;
  when?: string;
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
  githubWhen?: string;
  githubMessage?: string;
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

export async function fetchTeacherGitBackupPreview(
  direction: 'push' | 'pull' = 'push'
): Promise<TeacherGitBackupPreview> {
  const q = direction === 'pull' ? '?direction=pull' : '';
  const res = await apiGet(`/api/teacher-git-backup/preview${q}`);
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
    githubWhen: data.githubWhen,
    githubMessage: data.githubMessage,
  };
}

export async function pullTeacherGitBackup(): Promise<TeacherGitBackupResult> {
  const res = await apiPost('/api/teacher-git-backup/pull');
  const data = (await res.json().catch(() => ({}))) as Partial<TeacherGitBackupResult>;
  const message = String(data.message || (res.ok ? 'Fertig.' : 'Holen fehlgeschlagen.'));
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

export const FLUSH_TICKETS_EVENT = 'johnny:flush-tickets';
export const FLUSH_PRESENTATIONS_EVENT = 'johnny:flush-presentations';

type FlushDetail = { done?: (p: Promise<unknown>) => void };

/** Offene Folien- und Ticket-Änderungen auf die Platte schreiben, bevor der Stand geht. */
export function flushStandSources(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const waits: Promise<unknown>[] = [];
  const collect = (p: Promise<unknown>) => {
    waits.push(Promise.resolve(p).catch(() => undefined));
  };
  window.dispatchEvent(new CustomEvent<FlushDetail>(FLUSH_TICKETS_EVENT, { detail: { done: collect } }));
  window.dispatchEvent(
    new CustomEvent<FlushDetail>(FLUSH_PRESENTATIONS_EVENT, { detail: { done: collect } })
  );
  return Promise.all(waits).then(() => undefined);
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
