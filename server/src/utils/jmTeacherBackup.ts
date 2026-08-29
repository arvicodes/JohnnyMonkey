import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/** Von der Lehrerin angelegte Sammelordner unter J-M-Reihen. */
export const JM_TEACHER_BACKUP_DIR = {
  notes: 'Backup - Notizen',
  slides: 'Backup - Folien',
  tickets: 'Backup - Tickets',
} as const;

export type TeacherBackupKind = keyof typeof JM_TEACHER_BACKUP_DIR;

const FILE_PREFIX: Record<TeacherBackupKind, string> = {
  notes: 'notizen',
  slides: 'folien',
  tickets: 'tickets',
};

const KEEP: Record<TeacherBackupKind, number> = {
  notes: 250,
  slides: 120,
  tickets: 200,
};

/** Automatisch: nicht jede Tastenpause eine neue Datei. ⌘S/Button (force) immer. */
const AUTO_STAMP_MIN_MS: Record<TeacherBackupKind, number> = {
  notes: 8_000,
  slides: 60_000,
  tickets: 15_000,
};

type Recent = { at: number; hash: string };
const recentByKey = new Map<string, Recent>();

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

export function sanitizeBackupLabel(raw: string, maxLen = 80): string {
  const cleaned = String(raw || '')
    .normalize('NFC')
    .trim()
    .replace(/[\\/]+/g, '__')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  if (!cleaned) return 'stand';
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

function localStampParts(): { time: string; date: string } {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    time: `${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`,
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
  };
}

function isKindBackupFile(name: string, kind: TeacherBackupKind): boolean {
  if (!name.endsWith('.json')) return false;
  const prefix = FILE_PREFIX[kind];
  if (name.startsWith(`${prefix}_`)) return true;
  return new RegExp(`^\\d{2}-\\d{2}-\\d{2}_\\d{4}-\\d{2}-\\d{2}_${prefix}_`).test(name);
}

function fileHash(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function pruneKind(dir: string, kind: TeacherBackupKind, keep: number): void {
  if (!fs.existsSync(dir)) return;
  const files = fs
    .readdirSync(dir)
    .filter((name) => isKindBackupFile(name, kind))
    .map((name) => {
      const full = path.join(dir, name);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
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

export function ensureTeacherBackupDir(kind: TeacherBackupKind): string {
  const dir = path.join(jmReihenRoot(), JM_TEACHER_BACKUP_DIR[kind]);
  fs.mkdirSync(dir, { recursive: true });
  const readme = path.join(dir, 'README.txt');
  if (!fs.existsSync(readme)) {
    const titles = {
      notes: 'Lehrer-Schnellnotizen (gelb N)',
      slides: 'Präsentationen (Deck + Annotationen)',
      tickets: 'Entry-Ticket-Fragensets',
    };
    fs.writeFileSync(
      readme,
      `Zeitstempel-Kopien: ${titles[kind]}.\n` +
        'Dateiname: Uhrzeit_Datum_Art_Thema.json (z. B. 09-43-19_2026-08-29_folien_…).\n' +
        'Jede Sicherung legt eine neue Datei an. Der aktuelle Stand bleibt am normalen Ort.\n' +
        '⌘S oder der Sicherungsbutton erzeugt extra eine Kopie der aktuellsten Version.\n',
      'utf8'
    );
  }
  return dir;
}

export function ensureTeacherBackupRoots(): string[] {
  return (Object.keys(JM_TEACHER_BACKUP_DIR) as TeacherBackupKind[]).map((kind) =>
    ensureTeacherBackupDir(kind)
  );
}

export function writeTeacherTimestampedBackup(opts: {
  kind: TeacherBackupKind;
  label?: string;
  payload: unknown;
  force?: boolean;
}): string | null {
  try {
    const dir = ensureTeacherBackupDir(opts.kind);
    const json =
      typeof opts.payload === 'string'
        ? opts.payload
        : JSON.stringify(opts.payload, null, 2);
    const buf = Buffer.from(json, 'utf8');
    if (buf.length < 8) return null;

    const key = `${opts.kind}:${sanitizeBackupLabel(opts.label || '')}`;
    const hash = fileHash(buf);
    const now = Date.now();
    const prev = recentByKey.get(key);
    const minMs = AUTO_STAMP_MIN_MS[opts.kind];
    if (!opts.force && prev && now - prev.at < minMs) {
      return null;
    }

    const label = sanitizeBackupLabel(opts.label || FILE_PREFIX[opts.kind]);
    const { time, date } = localStampParts();
    const name = `${time}_${date}_${FILE_PREFIX[opts.kind]}_${label}.json`;
    const full = path.join(dir, name);
    fs.writeFileSync(full, buf);
    recentByKey.set(key, { at: now, hash });
    pruneKind(dir, opts.kind, KEEP[opts.kind]);
    return full;
  } catch (e) {
    console.warn('Lehrer-Backup fehlgeschlagen:', opts.kind, e);
    return null;
  }
}
