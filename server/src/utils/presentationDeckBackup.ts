import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  sanitizeBackupFilePart,
  writeFolienAlleBackupFile,
} from './folienAlleBackup';
import { writeTeacherTimestampedBackup } from './jmTeacherBackup';

const LOCAL_BACKUP_DIR = '.presentation-backups';
const CENTRAL_BACKUP_ROOT_NAME = 'Presentation-Sicherheitskopien';
const LOCAL_KEEP = 40;
const CENTRAL_KEEP = 80;
/** Mindestabstand zwischen Zeitstempel-Backups bei unverändertem Umfang */
const MIN_INTERVAL_MS = 30_000;

type BackupMeta = {
  lastAt: number;
  lastHash: string;
};

const recentByPath = new Map<string, BackupMeta>();

function projectRoot(): string {
  const fromEnv = process.env.LOCAL_MATERIALS_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  return path.resolve(__dirname, '../../..');
}

function centralBackupRoot(): string {
  return path.join(projectRoot(), CENTRAL_BACKUP_ROOT_NAME);
}

/**
 * Relativer Pfad unter J-M-Reihen, z.B.
 * "Informatik/MSS …/01.02 Orga"
 */
function lessonKeyFromDeckPath(deckFilePath: string): string {
  const norm = deckFilePath.replace(/\\/g, '/');
  const marker = '/J-M-Reihen/';
  const idx = norm.indexOf(marker);
  let rel = idx >= 0 ? norm.slice(idx + marker.length) : path.basename(path.dirname(deckFilePath));
  rel = rel.replace(/\/Praesentation\.deck\.json$/i, '').replace(/\/$/, '');
  return rel || 'unbekannt';
}

function stampNow(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function fileHash(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function pruneBackups(dir: string, keep: number): void {
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((name) => /^deck-\d{4}-.+\.json$/i.test(name))
    .map((name) => ({ name, full: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
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

function shouldWriteTimestampedBackup(
  deckFilePath: string,
  existingBuf: Buffer,
  force: boolean
): boolean {
  if (force) return true;
  const hash = fileHash(existingBuf);
  const prev = recentByPath.get(deckFilePath);
  const now = Date.now();
  if (!prev) return true;
  if (prev.lastHash === hash && now - prev.lastAt < MIN_INTERVAL_MS) return false;
  return true;
}

function markBackup(deckFilePath: string, existingBuf: Buffer): void {
  recentByPath.set(deckFilePath, {
    lastAt: Date.now(),
    lastHash: fileHash(existingBuf),
  });
}

function folienAllePresentationFileName(deckFilePath: string): string {
  const key = sanitizeBackupFilePart(lessonKeyFromDeckPath(deckFilePath), 160);
  return `Praesentation__${key}.json`;
}

/**
 * Schreibt/aktualisiert die Sammel-Sicherheitskopie unter
 * `J-M-Reihen/Folien - ALLE - BACKUP/Praesentation__<Stundenpfad>.json`
 */
export function backupPresentationDeckToFolienAlle(
  deckFilePath: string,
  content: Buffer | string
): string | null {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
  if (buf.length < 50) return null;
  const written = writeFolienAlleBackupFile(folienAllePresentationFileName(deckFilePath), buf);
  if (written) {
    console.log('Folien-ALLE presentation backup:', written);
  }
  return written;
}

/**
 * Schreibt Sicherheitskopien:
 * 1) lokal neben der Präsentation: `.presentation-backups/`
 * 2) zentral im Projekt: `Presentation-Sicherheitskopien/<Stundenpfad>/`
 *    plus immer `latest.json` als schnellste Wiederherstellung.
 * 3) Sammelordner: `J-M-Reihen/Folien - ALLE - BACKUP/`
 */
export function backupPresentationDeckBeforeOverwrite(
  deckFilePath: string,
  options?: { force?: boolean; reason?: string }
): { local?: string; central?: string; latest?: string; folienAlle?: string } {
  if (!fs.existsSync(deckFilePath)) return {};

  let existingBuf: Buffer;
  try {
    existingBuf = fs.readFileSync(deckFilePath);
  } catch {
    return {};
  }

  // Keine leeren/kaputten Snapshots als "gute" Backups speichern
  if (existingBuf.length < 50) return {};

  const force = Boolean(options?.force);
  const writeStamp = shouldWriteTimestampedBackup(deckFilePath, existingBuf, force);
  const stamp = stampNow();
  const result: { local?: string; central?: string; latest?: string; folienAlle?: string } = {};

  const lessonDir = path.dirname(deckFilePath);
  const localDir = path.join(lessonDir, LOCAL_BACKUP_DIR);
  const centralDir = path.join(centralBackupRoot(), lessonKeyFromDeckPath(deckFilePath));

  try {
    fs.mkdirSync(localDir, { recursive: true });
    fs.mkdirSync(centralDir, { recursive: true });
  } catch (e) {
    console.warn('Presentation backup dirs failed:', e);
    return {};
  }

  // latest.json immer aktualisieren (auch bei Throttle)
  try {
    const latestPath = path.join(centralDir, 'latest.json');
    fs.writeFileSync(latestPath, existingBuf);
    result.latest = latestPath;
  } catch (e) {
    console.warn('Presentation latest backup failed:', e);
  }

  // Sammelordner immer aktualisieren
  const folienAlle = backupPresentationDeckToFolienAlle(deckFilePath, existingBuf);
  if (folienAlle) result.folienAlle = folienAlle;

  if (writeStamp) {
    try {
      const localPath = path.join(localDir, `deck-${stamp}.json`);
      fs.writeFileSync(localPath, existingBuf);
      result.local = localPath;
      pruneBackups(localDir, LOCAL_KEEP);
    } catch (e) {
      console.warn('Local presentation backup failed:', e);
    }

    try {
      const centralPath = path.join(centralDir, `deck-${stamp}.json`);
      fs.writeFileSync(centralPath, existingBuf);
      result.central = centralPath;
      pruneBackups(centralDir, CENTRAL_KEEP);
    } catch (e) {
      console.warn('Central presentation backup failed:', e);
    }

    markBackup(deckFilePath, existingBuf);
    console.log(
      'Presentation safety backup:',
      options?.reason || 'save',
      result.central || result.local || result.latest
    );
  } else {
    console.log('Presentation latest.json refreshed (timestamped backup throttled)');
  }

  return result;
}

/**
 * Nach erfolgreichem Speichern: aktuelle Version in den Sammelordner schreiben
 * (auch bei Erst-Erstellung, wenn noch kein vorheriges Backup existierte).
 */
export function backupPresentationDeckAfterSave(
  deckFilePath: string,
  savedContent: Buffer | string,
  options?: { force?: boolean }
): string | null {
  const folienAlle = backupPresentationDeckToFolienAlle(deckFilePath, savedContent);
  backupLessonToTeacherFolienFolder(deckFilePath, { force: options?.force, savedDeck: savedContent });
  return folienAlle;
}

/**
 * Zeitstempel-Kopie nach `J-M-Reihen/Backup - Folien/` (Deck + Annotationen, falls vorhanden).
 */
export function backupLessonToTeacherFolienFolder(
  lessonFilePath: string,
  options?: { force?: boolean; savedDeck?: Buffer | string }
): string | null {
  const lessonDir = path.dirname(lessonFilePath);
  const deckPath = path.join(lessonDir, 'Praesentation.deck.json');
  let deckRaw: Buffer | null = null;
  if (options?.savedDeck) {
    deckRaw =
      typeof options.savedDeck === 'string' ? Buffer.from(options.savedDeck, 'utf8') : options.savedDeck;
  } else if (fs.existsSync(deckPath)) {
    try {
      deckRaw = fs.readFileSync(deckPath);
    } catch {
      deckRaw = null;
    }
  }
  if (!deckRaw || deckRaw.length < 50) return null;

  let annotations: unknown = null;
  const annPath = path.join(lessonDir, 'Praesentation.annotations.json');
  if (fs.existsSync(annPath)) {
    try {
      annotations = JSON.parse(fs.readFileSync(annPath, 'utf8'));
    } catch {
      annotations = null;
    }
  }

  let deck: unknown = null;
  try {
    deck = JSON.parse(deckRaw.toString('utf8'));
  } catch {
    return null;
  }

  const lesson = lessonKeyFromDeckPath(deckPath);
  return writeTeacherTimestampedBackup({
    kind: 'slides',
    label: lesson,
    payload: {
      kind: 'folien',
      lesson,
      savedAt: new Date().toISOString(),
      deck,
      annotations,
    },
    force: Boolean(options?.force),
  });
}

export function getCentralPresentationBackupRoot(): string {
  return centralBackupRoot();
}
