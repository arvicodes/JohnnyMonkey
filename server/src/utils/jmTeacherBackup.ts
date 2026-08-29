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

/** Immer deutsche Wanduhr — der Schulcontainer läuft sonst in UTC (2 h hinterher). */
function localStampParts(d = new Date()): { time: string; date: string; seconds: string } {
  const fmt = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    time: `${parseInt(get('hour'), 10)}:${get('minute').padStart(2, '0')}`,
    date: `${parseInt(get('day'), 10)}.${parseInt(get('month'), 10)}`,
    seconds: get('second').padStart(2, '0'),
  };
}

function isKindBackupFile(name: string, kind: TeacherBackupKind): boolean {
  if (!name.endsWith('.json')) return false;
  const prefix = FILE_PREFIX[kind];
  return name.includes(`_${prefix}_`) || name.startsWith(`${prefix}_`);
}

function uniqueBackupName(dir: string, kind: TeacherBackupKind, label: string, d = new Date()): string {
  const { time, date, seconds } = localStampParts(d);
  const prefix = FILE_PREFIX[kind];
  const base = `${time}_${date}_${prefix}_${label}.json`;
  if (!fs.existsSync(path.join(dir, base))) return base;
  const withSeconds = `${time}:${seconds}_${date}_${prefix}_${label}.json`;
  if (!fs.existsSync(path.join(dir, withSeconds))) return withSeconds;
  let n = 2;
  while (fs.existsSync(path.join(dir, `${time}_${date}_${prefix}_${label}-${n}.json`))) n += 1;
  return `${time}_${date}_${prefix}_${label}-${n}.json`;
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
        'Dateiname: Uhrzeit_Datum_Art_Thema.json (z. B. 9:25_29.8_folien_…).\n' +
        'Neue Datei nur bei ⌘S oder dem Sicherungsbutton. Der aktuelle Stand wird trotzdem immer gespeichert.\n',
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
    if (!opts.force) return null;

    const dir = ensureTeacherBackupDir(opts.kind);
    const json =
      typeof opts.payload === 'string'
        ? opts.payload
        : JSON.stringify(opts.payload, null, 2);
    const buf = Buffer.from(json, 'utf8');
    if (buf.length < 8) return null;

    const label = sanitizeBackupLabel(opts.label || FILE_PREFIX[opts.kind]);
    const name = uniqueBackupName(dir, opts.kind, label);
    const full = path.join(dir, name);
    fs.writeFileSync(full, buf);
    pruneKind(dir, opts.kind, KEEP[opts.kind]);
    return full;
  } catch (e) {
    console.warn('Lehrer-Backup fehlgeschlagen:', opts.kind, e);
    return null;
  }
}
