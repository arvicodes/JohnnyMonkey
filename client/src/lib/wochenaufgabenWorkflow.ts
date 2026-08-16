/** Wochenaufgaben-Workflow: Phasen, API, virtuelle Abgabe-Pfade. */

export const WA_PHASE1_DAYS = 5;
export const WA_PHASE2_DAYS = 2;
export const WA_PHASE3_DAYS = 2;
export const WA_SLOT_BUTTONS = [1, 2, 3, 4, 5] as const;

export type WaPhase = 'draft' | 'phase1' | 'phase2' | 'phase3' | 'completed';

export type WaUploadKind = 'solution' | 'video' | 'audio' | 'correction';

export type WochenaufgabeTaskState = {
  lessonPath: string;
  activatedAt: string | null;
  phase: WaPhase;
  phaseEndsAt: string | null;
  remainingMs: number | null;
  videoClaimStudentId: string | null;
  videoClaimStudentName: string | null;
  isVideoClaimMine: boolean;
  canClaimVideo: boolean;
  hasVideo: boolean;
  videoSubmissionId: string | null;
  videoVisibleToAll: boolean;
  mySolutionSubmissionId: string | null;
  peerSolutionSubmissionId: string | null;
  peerSolutionStudentName: string | null;
  myAudioSubmissionId: string | null;
  receivedAudioSubmissionId: string | null;
  myCorrectionSubmissionId: string | null;
};

export const WA_KEYS: Record<WaUploadKind, string> = {
  solution: 'WA_L1_loesung',
  video: 'WA_V_erklaervideo',
  audio: 'WA_L3_audio',
  correction: 'WA_L5_korrektur',
};

function normalizePath(p: string): string {
  return (p || '').replace(/\\/g, '/').replace(/\/+$/, '');
}

export function waVirtualPath(lessonPath: string, key: string): string {
  return `${normalizePath(lessonPath)}/${key}`;
}

export function formatWaRemaining(ms: number | null): string {
  if (ms == null || ms <= 0) return '0:00:00';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function fetchWochenaufgabeStates(
  groupId: string,
  parentPath: string,
  studentId?: string,
): Promise<{ states: WochenaufgabeTaskState[]; teacherId: string }> {
  const q = new URLSearchParams({ parentPath: normalizePath(parentPath) });
  if (studentId) q.set('studentId', studentId);
  const res = await fetch(`/api/wochenaufgaben/states/${encodeURIComponent(groupId)}?${q}`);
  if (!res.ok) throw new Error('Wochenaufgaben-Status konnte nicht geladen werden');
  return res.json();
}

export async function activateWochenaufgabe(
  groupId: string,
  lessonPath: string,
): Promise<WochenaufgabeTaskState> {
  const res = await fetch('/api/wochenaufgaben/activate', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, lessonPath: normalizePath(lessonPath) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'Freigabe fehlgeschlagen');
  }
  const data = (await res.json()) as { state?: WochenaufgabeTaskState };
  if (!data.state) throw new Error('Freigabe fehlgeschlagen (keine Antwort vom Server)');
  return data.state;
}

export async function claimWochenaufgabeVideo(
  groupId: string,
  lessonPath: string,
  studentId: string,
): Promise<WochenaufgabeTaskState> {
  const res = await fetch('/api/wochenaufgaben/claim-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupId,
      lessonPath: normalizePath(lessonPath),
      studentId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Reservierung fehlgeschlagen');
  }
  const data = await res.json();
  return data.state;
}

export function waUploadMeta(kind: WaUploadKind, lessonPath: string) {
  const fileName = WA_KEYS[kind];
  return { fileName, filePath: waVirtualPath(lessonPath, fileName) };
}

export function waSubmissionDownloadUrl(submissionId: string): string {
  return `/api/submissions/download/${submissionId}`;
}
