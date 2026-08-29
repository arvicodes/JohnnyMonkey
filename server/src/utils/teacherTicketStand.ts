import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { JM_TEACHER_BACKUP_DIR } from './jmTeacherBackup';
import { standPulledRecently } from './teacherScratchPadStore';

export type TicketStandSet = {
  id?: string;
  name?: string;
  lessons?: unknown[];
  [key: string]: unknown;
};

export type TicketStandPayload = {
  sets: TicketStandSet[];
  savedAt?: string;
  teacherId?: string;
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

export function ticketsLatestPath(): string {
  return path.join(jmReihenRoot(), JM_TEACHER_BACKUP_DIR.tickets, 'latest.json');
}

export function readTicketsLatest(): TicketStandPayload | null {
  try {
    const raw = fs.readFileSync(ticketsLatestPath(), 'utf8');
    const parsed = JSON.parse(raw) as { sets?: unknown; savedAt?: string; teacherId?: string };
    if (!Array.isArray(parsed.sets) || parsed.sets.length === 0) return null;
    return {
      sets: parsed.sets as TicketStandSet[],
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
      teacherId: typeof parsed.teacherId === 'string' ? parsed.teacherId : undefined,
    };
  } catch {
    return null;
  }
}

export function ticketsLatestSavedAtMs(): number {
  const pad = readTicketsLatest();
  const ms = Date.parse(String(pad?.savedAt || ''));
  if (Number.isFinite(ms)) return ms;
  try {
    return fs.statSync(ticketsLatestPath()).mtimeMs;
  } catch {
    return 0;
  }
}

export function preferTicketsLatestFile(): boolean {
  return standPulledRecently() || ticketsLatestSavedAtMs() > Date.now() - 24 * 60 * 60 * 1000;
}

export function applyPulledTicketsFromFile(): TicketStandPayload | null {
  const pad = readTicketsLatest();
  if (!pad) return null;
  const now = new Date().toISOString();
  const next: TicketStandPayload = { ...pad, savedAt: now };
  const dest = ticketsLatestPath();
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function checkpointSqliteFile(dbPath: string): void {
  if (!dbPath || !fs.existsSync(dbPath)) return;
  try {
    execFileSync('sqlite3', [dbPath, 'PRAGMA wal_checkpoint(TRUNCATE);'], {
      timeout: 12_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    /* sqlite3 fehlt oder Datei gesperrt — Datei trotzdem weiterverwenden */
  }
}

export function checkpointStandDatabases(): void {
  const candidates = [
    '/app/server/data/dev.db',
    path.join(projectRoot(), 'server/prisma/dev.db'),
    path.resolve(process.cwd(), 'prisma/dev.db'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) checkpointSqliteFile(file);
  }
}
