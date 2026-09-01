import {
  lessonFolderPath,
  portableSlideMediaPath,
  type SlideAudioTrack,
} from './presentationDeck';

export const SLIDE_AUDIO_MAX_MS = 8 * 60 * 1000;
export const SLIDE_SCREEN_MAX_MS = 5 * 60 * 1000;

export type SlideRecordKind = 'audio' | 'screen';

const MIME_CANDIDATES: Array<{ mimeType: string; ext: string }> = [
  { mimeType: 'audio/mp4', ext: 'm4a' },
  { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
  { mimeType: 'audio/webm', ext: 'webm' },
  { mimeType: 'audio/ogg;codecs=opus', ext: 'ogg' },
];

const VIDEO_MIME_CANDIDATES: Array<{ mimeType: string; ext: string }> = [
  { mimeType: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mimeType: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mimeType: 'video/webm', ext: 'webm' },
  { mimeType: 'video/mp4', ext: 'mp4' },
];

export function isSlideAudioFileName(name: string): boolean {
  const n = (name || '').trim().split(/[/\\]/).pop() || '';
  return /^slide-audio-/i.test(n);
}

export function isSlideScreenFileName(name: string): boolean {
  const n = (name || '').trim().split(/[/\\]/).pop() || '';
  return /^slide-screen-/i.test(n);
}

export function pickRecorderMime(): { mimeType: string; ext: string } {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: 'webm' };
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  return { mimeType: '', ext: 'webm' };
}

export function pickScreenRecorderMime(): { mimeType: string; ext: string } {
  if (typeof MediaRecorder === 'undefined') return { mimeType: '', ext: 'webm' };
  for (const candidate of VIDEO_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  return { mimeType: 'video/webm', ext: 'webm' };
}

export function slideAudioIsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
}

export function slideAudioPauseSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.prototype.pause === 'function';
}

export async function openMicStream(): Promise<MediaStream> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Mikrofon braucht eine sichere Verbindung (localhost oder https).');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Dieser Browser gibt kein Mikrofon frei.');
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

export function slideScreenIsSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof window !== 'undefined' &&
    typeof navigator.mediaDevices?.getDisplayMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

export async function openScreenStream(): Promise<MediaStream> {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Bildschirm-Aufnahme braucht eine sichere Verbindung (localhost oder https).');
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('Bildschirm-Aufnahme wird in diesem Browser nicht unterstützt.');
  }
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: { ideal: 15, max: 24 },
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
    },
    audio: false,
    // Chrome: diesen Tab vorschlagen — die Folie selbst aufnehmen.
    preferCurrentTab: true,
  } as DisplayMediaStreamOptions);
  let mic: MediaStream | null = null;
  try {
    mic = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    mic = null;
  }
  const mixed = new MediaStream();
  display.getVideoTracks().forEach((track) => mixed.addTrack(track));
  if (mic) {
    mic.getAudioTracks().forEach((track) => mixed.addTrack(track));
  } else {
    display.getAudioTracks().forEach((track) => mixed.addTrack(track));
  }
  return mixed;
}

export function newSlideMediaVersionId(): string {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function formatSlideAudioDuration(ms?: number): string {
  if (!Number.isFinite(ms) || !ms || ms < 0) return '0:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function slideAudioUrl(track?: SlideAudioTrack | null, opts?: { video?: boolean }): string {
  const raw = track?.path?.trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/api/')) return raw;
  const portable = portableSlideMediaPath(raw);
  const qs = new URLSearchParams({ filePath: portable || raw });
  if (track?.recordedAt) qs.set('t', track.recordedAt);
  if (opts?.video) qs.set('kind', 'video');
  return `/api/file-system-paths/read-audio?${qs.toString()}`;
}

function safeSlideIdForFile(slideId: string): string {
  const cleaned = (slideId || 'slide').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 80) || 'slide';
}

function extForMime(mimeType: string, fallback: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime.startsWith('video/mp4')) return 'mp4';
  if (mime.includes('m4a') || mime.includes('aac') || mime === 'audio/mp4') return 'm4a';
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
  kind: SlideRecordKind = 'audio',
  versionId?: string,
): Promise<string> {
  const folder = lessonFolderPath(lessonPath);
  if (!folder) throw new Error('Kein Stundenordner');
  const picked = kind === 'screen' ? pickScreenRecorderMime() : pickRecorderMime();
  const ext = extForMime(blob.type || mimeType, picked.ext);
  const versionPart = versionId ? `-${versionId.replace(/[^\w.-]+/g, '').slice(0, 24)}` : '';
  const file = new File(
    [blob],
    `${kind === 'screen' ? 'slide-screen' : 'slide-audio'}-${safeSlideIdForFile(slideId)}${versionPart}.${ext}`,
    { type: blob.type || mimeType || (kind === 'screen' ? 'video/webm' : 'audio/webm') },
  );
  const formData = new FormData();
  formData.append('file', file);
  formData.append('targetPath', folder);
  const res = await fetch('/api/file-system-paths/save-file', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 413) throw new Error('Aufnahme ist zu groß (max. 50 MB). Bitte kürzer aufnehmen.');
    throw new Error(err.error || 'Aufnahme konnte nicht gespeichert werden');
  }
  const data = (await res.json()) as { path?: string; filename?: string };
  const saved = (
    data.path && data.path.trim() ? data.path : `${folder}/${data.filename || file.name}`
  ).replace(/\\/g, '/');
  return portableSlideMediaPath(saved) || saved;
}

export function recorderErrorMessage(err: unknown, kind: SlideRecordKind = 'audio'): string {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
  if (name === 'AbortError') {
    return kind === 'screen' ? 'Bildschirm-Auswahl abgebrochen.' : 'Aufnahme abgebrochen.';
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return kind === 'screen'
      ? 'Bildschirm-Freigabe abgelehnt.'
      : 'Mikrofon-Zugriff verweigert. Bitte in den Browser-Einstellungen erlauben.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return kind === 'screen' ? 'Kein Bildschirm zum Aufnehmen gefunden.' : 'Kein Mikrofon gefunden.';
  }
  if (name === 'NotSupportedError') {
    return 'Aufnahme wird in diesem Browser nicht unterstützt.';
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Aufnahme fehlgeschlagen.';
}
