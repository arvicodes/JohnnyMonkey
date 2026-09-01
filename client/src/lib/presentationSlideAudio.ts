import {
  lessonFolderPath,
  portableSlideMediaPath,
  type SlideAudioTrack,
} from './presentationDeck';

export const SLIDE_AUDIO_MAX_MS = 8 * 60 * 1000;

const MIME_CANDIDATES: Array<{ mimeType: string; ext: string }> = [
  { mimeType: 'audio/mp4', ext: 'm4a' },
  { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
  { mimeType: 'audio/webm', ext: 'webm' },
  { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
];

export function isSlideAudioFileName(name: string): boolean {
  const n = (name || '').trim().split(/[/\\]/).pop() || '';
  return /^slide-audio-/i.test(n);
}

export function pickRecorderMime(): { mimeType: string; ext: string } {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: 'webm' };
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  return { mimeType: '', ext: 'webm' };
}

export function slideAudioIsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function formatSlideAudioDuration(ms?: number): string {
  if (!Number.isFinite(ms) || !ms || ms < 0) return '0:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function slideAudioUrl(track?: SlideAudioTrack | null): string {
  const raw = track?.path?.trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/')) return raw;
  const portable = portableSlideMediaPath(raw);
  const qs = new URLSearchParams({ filePath: portable || raw });
  if (track?.recordedAt) qs.set('t', track.recordedAt);
  return `/api/file-system-paths/read-audio?${qs.toString()}`;
}

function safeSlideIdForFile(slideId: string): string {
  const cleaned = (slideId || 'slide').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 80) || 'slide';
}

function extForMime(mimeType: string, fallback: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return 'm4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('webm')) return 'webm';
  return fallback;
}

export async function saveSlideAudioFile(
  lessonPath: string,
  slideId: string,
  blob: Blob,
  mimeType: string,
): Promise<string> {
  const folder = lessonFolderPath(lessonPath);
  if (!folder) throw new Error('Kein Stundenordner');
  const picked = pickRecorderMime();
  const ext = extForMime(blob.type || mimeType, picked.ext);
  const file = new File([blob], `slide-audio-${safeSlideIdForFile(slideId)}.${ext}`, {
    type: blob.type || mimeType || 'audio/webm',
  });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('targetPath', folder);
  const res = await fetch('/api/file-system-paths/save-file', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || 'Audio konnte nicht gespeichert werden');
  }
  const data = (await res.json()) as { path?: string; filename?: string };
  const saved = (
    data.path && data.path.trim() ? data.path : `${folder}/${data.filename || file.name}`
  ).replace(/\\/g, '/');
  return portableSlideMediaPath(saved) || saved;
}

export function recorderErrorMessage(err: unknown): string {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Kein Mikrofon gefunden.';
  }
  if (name === 'NotSupportedError') {
    return 'Aufnahme wird in diesem Browser nicht unterstützt.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Aufnahme fehlgeschlagen.';
}
