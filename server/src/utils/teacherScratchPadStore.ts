import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { writeTeacherTimestampedBackup } from './jmTeacherBackup';

/** Aktueller Stand der Lehrer-Schnellnotizen (pro Lehrkraft). */
export const SCRATCH_PAD_LIVE_DIR_NAME = 'Lehrer-Schnellnotizen';

/** Separater Ordner für regelmäßige Sicherheitskopien (Projektwurzel). */
export const SCRATCH_PAD_BACKUP_ROOT_NAME = 'Notizen-Sicherheitskopien';

/** DB-Schlüssel in TeacherLessonInstruction.lessonPath (pro Lehrkraft). */
export const SCRATCH_PAD_DB_PATH = '__teacher_scratch_pad__';

const BACKUP_KEEP = 60;
const MIN_BACKUP_INTERVAL_MS = 60_000;

type BackupMeta = { lastAt: number; lastHash: string };
const recentByUser = new Map<string, BackupMeta>();

function projectRoot(): string {
  const fromEnv = process.env.LOCAL_MATERIALS_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  return path.resolve(__dirname, '../../..');
}

function jmReihenRoot(): string {
  if (process.env.JM_REIHEN_PATH && fs.existsSync(process.env.JM_REIHEN_PATH)) {
    return process.env.JM_REIHEN_PATH;
  }
  const base = process.env.LOCAL_MATERIALS_PATH;
  if (base) {
    const candidate = path.join(base, 'J-M-Reihen');
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(projectRoot(), 'J-M-Reihen');
}

export function sanitizeScratchPadFolderPart(raw: string, maxLen = 80): string {
  const cleaned = String(raw || '')
    .normalize('NFC')
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  if (!cleaned) return 'lehrer';
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

export function scratchPadUserFolderKey(userId: string, userName?: string): string {
  const idShort = String(userId || 'unknown')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 12);
  const name = sanitizeScratchPadFolderPart(userName || 'lehrer', 48);
  return `${name}_${idShort || 'x'}`;
}

/** Live-Ordner: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/` */
export function ensureScratchPadLiveDir(userKey: string): string {
  const dir = path.join(jmReihenRoot(), SCRATCH_PAD_LIVE_DIR_NAME, userKey);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Backup-Ordner: `Notizen-Sicherheitskopien/<user>/` */
export function ensureScratchPadBackupDir(userKey: string): string {
  const root = path.join(projectRoot(), SCRATCH_PAD_BACKUP_ROOT_NAME);
  fs.mkdirSync(root, { recursive: true });
  const dir = path.join(root, userKey);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Legt beide Wurzelordner an (auch ohne User), damit sie im Dateisystem sichtbar sind. */
export function ensureScratchPadRoots(): {
  liveRoot: string;
  backupRoot: string;
} {
  const liveRoot = path.join(jmReihenRoot(), SCRATCH_PAD_LIVE_DIR_NAME);
  const backupRoot = path.join(projectRoot(), SCRATCH_PAD_BACKUP_ROOT_NAME);
  fs.mkdirSync(liveRoot, { recursive: true });
  fs.mkdirSync(backupRoot, { recursive: true });
  const readmeLive = path.join(liveRoot, 'README.txt');
  const readmeBackup = path.join(backupRoot, 'README.txt');
  if (!fs.existsSync(readmeLive)) {
    fs.writeFileSync(
      readmeLive,
      'Aktueller Stand der Lehrer-Schnellnotizen (gelb N).\n' +
        'Pro Lehrkraft: <Name_ID>/latest.json\n' +
        'Wird automatisch beim Speichern aktualisiert.\n',
      'utf8'
    );
  }
  if (!fs.existsSync(readmeBackup)) {
    fs.writeFileSync(
      readmeBackup,
      'Regelmäßige Sicherheitskopien der Lehrer-Schnellnotizen.\n' +
        'Pro Lehrkraft: <Name_ID>/latest.json + pad-<Zeitstempel>.json\n' +
        'Ältere Kopien werden automatisch begrenzt.\n',
      'utf8'
    );
  }
  return { liveRoot, backupRoot };
}

function stampNow(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function fileHash(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function pruneTimestampedBackups(dir: string, keep: number): void {
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((name) => /^pad-\d{4}-.+\.json$/i.test(name))
    .map((name) => ({
      name,
      full: path.join(dir, name),
      mtime: fs.statSync(path.join(dir, name)).mtimeMs,
    }))
    .sort((a, b) => a.mtime - b.mtime);
  while (files.length > keep) {
    const oldest = files.shift();
    if (!oldest) break;
    try {
      fs.unlinkSync(oldest.full);
    } catch {
      /* ignore */
    }
  }
}

function shouldWriteTimestampedBackup(userKey: string, buf: Buffer): boolean {
  const hash = fileHash(buf);
  const prev = recentByUser.get(userKey);
  const now = Date.now();
  if (!prev) return true;
  if (prev.lastHash === hash && now - prev.lastAt < MIN_BACKUP_INTERVAL_MS) return false;
  if (now - prev.lastAt < MIN_BACKUP_INTERVAL_MS && prev.lastHash === hash) return false;
  // Bei inhaltlicher Änderung: höchstens alle MIN_INTERVAL eine Stempel-Datei,
  // latest.json wird trotzdem immer geschrieben.
  if (now - prev.lastAt < MIN_BACKUP_INTERVAL_MS) return false;
  return true;
}

function markBackup(userKey: string, buf: Buffer): void {
  recentByUser.set(userKey, { lastAt: Date.now(), lastHash: fileHash(buf) });
}

export type ScratchPadPayload = {
  pages: unknown[];
  pageIndex: number;
  updatedAt: string;
  userId?: string;
  userName?: string;
  savedAt?: string;
};

function stripHtmlLite(html: string): string {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sichtbare Text-/Tintenmenge — zum Schutz vor versehentlichem Leerlauf-Überschreiben. */
export function scratchPadContentLen(payload: ScratchPadPayload | null | undefined): number {
  if (!payload || !Array.isArray(payload.pages)) return 0;
  return payload.pages.reduce<number>((n, raw) => {
    const p = raw as { text?: unknown; ink?: unknown };
    const text = typeof p.text === 'string' ? stripHtmlLite(p.text) : '';
    const ink = Array.isArray(p.ink) ? p.ink.length : 0;
    return n + text.length + ink;
  }, 0);
}

export function wouldWipeScratchPad(
  existing: ScratchPadPayload | null | undefined,
  incoming: ScratchPadPayload | null | undefined
): boolean {
  return scratchPadContentLen(existing) >= 40 && scratchPadContentLen(incoming) < 12;
}

/** Rohe Textmenge (HTML), damit ein älterer Tab einen längeren Schulstand nicht zurückschreibt. */
export function scratchPadRawLen(payload: ScratchPadPayload | null | undefined): number {
  if (!payload || !Array.isArray(payload.pages)) return 0;
  return payload.pages.reduce<number>((n, raw) => {
    const p = raw as { text?: unknown; ink?: unknown };
    const text = typeof p.text === 'string' ? p.text.length : 0;
    const ink = Array.isArray(p.ink) ? p.ink.length : 0;
    return n + text + ink;
  }, 0);
}

export function wouldShrinkScratchPad(
  existing: ScratchPadPayload | null | undefined,
  incoming: ScratchPadPayload | null | undefined
): boolean {
  const prev = scratchPadRawLen(existing);
  const next = scratchPadRawLen(incoming);
  return prev >= 400 && next + 200 < prev;
}

export function standPulledMarkerPath(): string {
  if (fs.existsSync('/app/server/data')) return path.join('/app/server/data', '.jm-stand-pulled-at');
  return path.join(projectRoot(), '.jm-stand-pulled-at');
}

export function markStandPulled(at = new Date()): void {
  const dest = standPulledMarkerPath();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, at.toISOString(), 'utf8');
}

export function standPulledAtMs(): number {
  try {
    const ms = Date.parse(fs.readFileSync(standPulledMarkerPath(), 'utf8').trim());
    return Number.isFinite(ms) ? ms : 0;
  } catch {
    return 0;
  }
}

export function standPulledRecently(maxAgeMs = 6 * 60 * 60 * 1000): boolean {
  const at = standPulledAtMs();
  if (!at) return false;
  const age = Date.now() - at;
  return age >= 0 && age < maxAgeMs;
}

/** Nach Git-Holen: Dateien sind die Wahrheit. Zeitstempel nach vorne, damit alte Tabs nicht gewinnen. */
export function applyPulledScratchPadFiles(): Array<{ teacherId: string; payload: ScratchPadPayload; userKey: string }> {
  const now = new Date().toISOString();
  const liveRoot = path.join(jmReihenRoot(), SCRATCH_PAD_LIVE_DIR_NAME);
  const applied: Array<{ teacherId: string; payload: ScratchPadPayload; userKey: string }> = [];
  if (!fs.existsSync(liveRoot)) {
    markStandPulled();
    return applied;
  }
  for (const name of fs.readdirSync(liveRoot)) {
    const latest = path.join(liveRoot, name, 'latest.json');
    if (!fs.existsSync(latest) || !fs.statSync(latest).isFile()) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(latest, 'utf8')) as ScratchPadPayload;
      if (!parsed || !Array.isArray(parsed.pages)) continue;
      const teacherId = String(parsed.userId || '').trim();
      const payload: ScratchPadPayload = {
        ...parsed,
        updatedAt: now,
        savedAt: now,
      };
      const json = JSON.stringify(payload, null, 2);
      fs.writeFileSync(latest, json);
      const backupDir = ensureScratchPadBackupDir(name);
      fs.writeFileSync(path.join(backupDir, 'latest.json'), json);
      if (teacherId) applied.push({ teacherId, payload, userKey: name });
    } catch (e) {
      console.warn('applyPulledScratchPadFiles failed:', name, e);
    }
  }
  markStandPulled();
  return applied;
}

export async function writePulledScratchPadsToDb(
  pads: Array<{ teacherId: string; payload: ScratchPadPayload }>
): Promise<void> {
  if (!pads.length) return;
  const url =
    String(process.env.DATABASE_URL || '').trim() ||
    (fs.existsSync('/app/server/data/dev.db') ? 'file:/app/server/data/dev.db' : '');
  const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
  try {
    for (const { teacherId, payload } of pads) {
      await prisma.teacherLessonInstruction.upsert({
        where: { teacherId_lessonPath: { teacherId, lessonPath: SCRATCH_PAD_DB_PATH } },
        create: {
          teacherId,
          lessonPath: SCRATCH_PAD_DB_PATH,
          content: JSON.stringify(payload),
        },
        update: { content: JSON.stringify(payload) },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export function readScratchPadLive(userKey: string): ScratchPadPayload | null {
  try {
    const livePath = path.join(ensureScratchPadLiveDir(userKey), 'latest.json');
    if (!fs.existsSync(livePath)) return null;
    const raw = fs.readFileSync(livePath, 'utf8');
    const parsed = JSON.parse(raw) as ScratchPadPayload;
    if (!parsed || !Array.isArray(parsed.pages)) return null;
    return parsed;
  } catch (e) {
    console.warn('Scratch pad read failed:', userKey, e);
    return null;
  }
}

/**
 * Speichert den aktuellen Stand und schreibt Sicherheitskopien.
 * - Live: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/latest.json`
 * - Backup: `Notizen-Sicherheitskopien/<user>/latest.json` (+ zeitgestempelte Kopien)
 */
export function writeScratchPad(
  userKey: string,
  payload: ScratchPadPayload,
  options?: { timestamped?: boolean; forceStamp?: boolean }
): { live: string; backupLatest: string; backupStamp: string | null; teacherBackup?: string | null } {
  ensureScratchPadRoots();
  const liveDir = ensureScratchPadLiveDir(userKey);
  const backupDir = ensureScratchPadBackupDir(userKey);

  const livePath = path.join(liveDir, 'latest.json');
  const existing = readScratchPadLive(userKey);
  if (wouldWipeScratchPad(existing, payload) || wouldShrinkScratchPad(existing, payload)) {
    console.warn('Scratch pad: refusing to overwrite substantial notes with near-empty payload', userKey);
    return {
      live: livePath,
      backupLatest: path.join(backupDir, 'latest.json'),
      backupStamp: null,
      teacherBackup: null,
    };
  }

  const body: ScratchPadPayload = {
    ...payload,
    savedAt: new Date().toISOString(),
  };
  const json = JSON.stringify(body, null, 2);
  const buf = Buffer.from(json, 'utf8');

  const backupLatestPath = path.join(backupDir, 'latest.json');
  fs.writeFileSync(livePath, buf);
  fs.writeFileSync(backupLatestPath, buf);

  let backupStamp: string | null = null;
  const wantStamp = options?.timestamped !== false;
  if (wantStamp && (options?.forceStamp || shouldWriteTimestampedBackup(userKey, buf))) {
    backupStamp = path.join(backupDir, `pad-${stampNow()}.json`);
    fs.writeFileSync(backupStamp, buf);
    pruneTimestampedBackups(backupDir, BACKUP_KEEP);
    markBackup(userKey, buf);
  } else {
    // latest aktualisiert — Meta nur bei Stempel-Write setzen wäre falsch:
    // Hash merken, Intervall aber nicht künstlich verlängern ohne Stempel
    const prev = recentByUser.get(userKey);
    if (!prev) markBackup(userKey, buf);
    else recentByUser.set(userKey, { lastAt: prev.lastAt, lastHash: fileHash(buf) });
  }

  const teacherBackup = wantStamp
    ? writeTeacherTimestampedBackup({
        kind: 'notes',
        label: userKey,
        payload: body,
        force: Boolean(options?.forceStamp),
      })
    : null;

  return { live: livePath, backupLatest: backupLatestPath, backupStamp, teacherBackup };
}
