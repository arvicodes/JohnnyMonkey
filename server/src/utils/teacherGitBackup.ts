import { execFile, execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import {
  hasGithubToken,
  previewSchoolStandChanges,
  previewSchoolStandPull,
  pullSchoolStandFromGithub,
  pushSchoolStandToGithub,
} from './teacherGitHubApi';
import { applyPulledScratchPadFiles, writePulledScratchPadsToDb } from './teacherScratchPadStore';

const execFileAsync = promisify(execFile);

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
  committed: boolean;
  pushed: boolean;
  message: string;
  changes?: StandChange[];
  explanation?: string;
  where?: 'laptop' | 'school';
  githubWhen?: string;
  githubMessage?: string;
};

let running = false;

function candidateRoots(): string[] {
  const fromEnv = [process.env.JM_GIT_ROOT]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  return [
    ...fromEnv,
    path.resolve(__dirname, '../../..'),
    process.cwd(),
    path.resolve(process.cwd(), '..'),
  ];
}

export function findGitRoot(): string | null {
  for (const root of candidateRoots()) {
    try {
      if (fs.existsSync(path.join(root, '.git')) && fs.existsSync(path.join(root, 'scripts'))) {
        return root;
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

function scriptPath(root: string): string {
  return path.join(root, 'scripts', 'git-push-sicherungen.sh');
}

function isSchoolHost(): boolean {
  return String(process.env.LOCAL_MATERIALS_PATH || '') === '/app' || !findGitRoot();
}

function isSecretPath(repoPath: string): boolean {
  const n = repoPath.replace(/\\/g, '/');
  if (n === '.env' || n.startsWith('.env.') || n.includes('/.env')) return true;
  if (n.includes('.jm-github-token') || n.includes('.login-code-pepper')) return true;
  if (n.includes('LOGIN-CODES-ALLE.txt')) return true;
  if (n === 'sync-backups' || n.startsWith('sync-backups/')) return true;
  if (n.endsWith('.b64')) return true;
  if (n.split('/').some((part) => part.startsWith('._') || part === '.DS_Store' || part === '__MACOSX')) {
    return true;
  }
  if (/(^|\/)pad-[^/]+\.json$/i.test(n)) return true;
  if (n.includes('/Backup - Notizen/') || n.includes('/Backup - Folien/') || n.includes('/Backup - Tickets/')) {
    return true;
  }
  return false;
}

export function formatBerlinStamp(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(', ', ' ');
}

function stampForAbs(abs: string): string | undefined {
  try {
    if (!fs.existsSync(abs)) return undefined;
    return formatBerlinStamp(fs.statSync(abs).mtime);
  } catch {
    return undefined;
  }
}

function stampForRepoPath(repoPath: string, root?: string | null): string | undefined {
  if (repoPath === 'server/prisma/dev.db' && fs.existsSync('/app/server/data/dev.db')) {
    return stampForAbs('/app/server/data/dev.db');
  }
  const bases = [root, findGitRoot(), process.env.LOCAL_MATERIALS_PATH, path.resolve(__dirname, '../../..')].filter(
    Boolean
  ) as string[];
  for (const base of bases) {
    const when = stampForAbs(path.join(base, repoPath));
    if (when) return when;
  }
  return undefined;
}

function laptopGithubTip(root: string): { githubWhen?: string; githubMessage?: string } {
  try {
    execFileSync('git', ['fetch', 'origin', 'main'], {
      cwd: root,
      timeout: 60_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    const raw = execFileSync('git', ['log', '-1', '--format=%cI\t%s', 'origin/main'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const [iso, ...rest] = raw.split('\t');
    const when = iso ? formatBerlinStamp(new Date(iso)) : undefined;
    return { githubWhen: when, githubMessage: rest.join('\t').trim() || undefined };
  } catch {
    return {};
  }
}

export function describeStandPath(repoPath: string): string {
  const n = repoPath.replace(/\\/g, '/');
  const base = n.split('/').pop() || n;
  if (n === 'server/prisma/dev.db') return 'Tickets und Datenbank';
  if (n.startsWith('Notizen-Sicherheitskopien/')) return `Notizen-Kopie: ${base}`;
  if (n.includes('/Backup - Tickets/')) return `Ticket-Kopie: ${base}`;
  if (n.includes('/Backup - Folien/')) return `Folien-Kopie: ${base}`;
  if (n.includes('/Backup - Notizen/')) return `Notizen-Kopie: ${base}`;
  if (n.includes('/Lehrer-Schnellnotizen/')) return `Notizen: ${base}`;
  if (n.includes('Praesentation.deck')) {
    const parts = n.split('/').filter((p) => p && p !== 'J-M-Reihen' && !p.startsWith('Praesentation'));
    const lesson = parts.slice(-2).join(' / ') || base;
    return `Folie: ${lesson}`;
  }
  if (n.startsWith('J-M-Reihen/')) {
    const short = n.replace(/^J-M-Reihen\//, '');
    return short.length > 72 ? `Material: …${short.slice(-64)}` : `Material: ${short}`;
  }
  if (n.startsWith('client/') || n.startsWith('server/')) return `App: ${n}`;
  return n;
}

function toChange(pathName: string, kind: StandChangeKind, when?: string): StandChange {
  return { path: pathName, kind, label: describeStandPath(pathName), when };
}

function summarizeChanges(changes: StandChange[]): string {
  if (changes.length === 0) return 'Nichts Neues gegenüber GitHub.';
  const added = changes.filter((c) => c.kind === 'added').length;
  const changed = changes.filter((c) => c.kind === 'changed').length;
  const removed = changes.filter((c) => c.kind === 'removed').length;
  const bits: string[] = [];
  if (changed) bits.push(`${changed} geändert`);
  if (added) bits.push(`${added} neu`);
  if (removed) bits.push(`${removed} entfernt`);
  return bits.join(', ');
}

function previewLaptopChanges(root: string): StandChange[] {
  const out = execFileSync('git', ['status', '--porcelain', '-uall'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
  });
  const changes: StandChange[] = [];
  for (const raw of String(out).split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.length < 4) continue;
    const xy = line.slice(0, 2);
    let filePath = line.slice(3).replace(/^"|"$/g, '');
    if (filePath.includes(' -> ')) filePath = filePath.split(' -> ').pop() || filePath;
    if (isSecretPath(filePath)) continue;
    const index = xy[0];
    const work = xy[1];
    let kind: StandChangeKind = 'changed';
    if (xy === '??' || index === 'A' || work === 'A') kind = 'added';
    else if (index === 'D' || work === 'D') kind = 'removed';
    changes.push(toChange(filePath, kind, stampForRepoPath(filePath, root)));
  }
  return changes;
}

export function getTeacherGitBackupStatus(): TeacherGitBackupStatus {
  if (running) {
    return {
      available: false,
      reason: 'busy',
      hint: 'Gerade unterwegs — einen Moment warten.',
    };
  }
  const root = findGitRoot();
  if (root && fs.existsSync(scriptPath(root))) {
    return {
      available: true,
      reason: 'ok',
      where: 'laptop',
      hint: 'Ganzer Stand: Folien, Notizen, Tickets und Code. Keine Passwörter.',
    };
  }
  if (hasGithubToken()) {
    return {
      available: true,
      reason: 'ok',
      where: 'school',
      hint: 'Dieser Schul-Stand nach GitHub: Notizen und Tickets.',
    };
  }
  return {
    available: false,
    reason: 'no-git',
    hint: isSchoolHost()
      ? 'GitHub für die Schule ist noch nicht eingerichtet. Einmal am Laptop setzen.'
      : 'Kein Git-Ordner gefunden.',
  };
}

function settleSqliteAfterReplace(dbPath: string): void {
  for (const extra of ['-wal', '-shm', '-journal']) {
    try {
      fs.unlinkSync(`${dbPath}${extra}`);
    } catch {
      /* ok */
    }
  }
}

const LAPTOP_PULL_PATHS = [
  'J-M-Reihen',
  'Notizen-Sicherheitskopien',
  'Presentation-Sicherheitskopien',
  'server/prisma/dev.db',
];

function previewLaptopPull(root: string): StandChange[] {
  execFileSync('git', ['fetch', 'origin', 'main'], {
    cwd: root,
    timeout: 120_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  const out = execFileSync(
    'git',
    ['diff', '--name-status', 'HEAD', 'origin/main', '--', ...LAPTOP_PULL_PATHS],
    { cwd: root, encoding: 'utf8', timeout: 30_000 }
  );
  const changes: StandChange[] = [];
  for (const line of String(out).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\t/);
    const code = parts[0] || '';
    const filePath = parts[parts.length - 1] || '';
    if (!filePath || isSecretPath(filePath)) continue;
    let kind: StandChangeKind = 'changed';
    if (code.startsWith('A')) kind = 'added';
    else if (code.startsWith('D')) kind = 'removed';
    changes.push(toChange(filePath, kind, stampForRepoPath(filePath, root)));
  }
  return changes;
}

async function pullLaptopStand(root: string): Promise<TeacherGitBackupResult> {
  const changes = previewLaptopPull(root);
  if (changes.length === 0) {
    return {
      ok: true,
      committed: false,
      pushed: false,
      message: 'Nichts Neues — dieser Laptop hat schon den GitHub-Stand.',
      changes: [],
      where: 'laptop',
      explanation: 'Stand von GitHub auf diesen Laptop.',
    };
  }
  execFileSync('git', ['checkout', 'origin/main', '--', ...LAPTOP_PULL_PATHS], {
    cwd: root,
    timeout: 120_000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  });
  settleSqliteAfterReplace(path.join(root, 'server/prisma/dev.db'));
  return {
    ok: true,
    committed: false,
    pushed: true,
    message: `Von GitHub geholt: ${changes.length} Dateien.`,
    changes,
    where: 'laptop',
    explanation: 'Stand von GitHub auf diesen Laptop.',
  };
}

export async function previewTeacherGitPull(): Promise<TeacherGitBackupPreview> {
  const status = getTeacherGitBackupStatus();
  const explanation =
    status.where === 'school'
      ? 'Ich hole den Stand von GitHub auf die Schule: Notizen und Tickets. Folien bleiben hier.'
      : 'Ich hole den Stand von GitHub auf diesen Laptop: Folien, Notizen und Tickets.';
  if (!status.available) {
    return { ...status, explanation: status.hint, changes: [], summary: status.hint };
  }
  try {
    const root = findGitRoot();
    const tip = root ? laptopGithubTip(root) : {};
    const raw =
      status.where === 'school'
        ? await previewSchoolStandPull()
        : previewLaptopPull(root || '');
    const changes = raw.map((c) =>
      toChange(c.path, c.kind, 'when' in c ? c.when : stampForRepoPath(c.path, root))
    );
    const empty = tip.githubWhen
      ? `GitHub-Stand vom ${tip.githubWhen}${tip.githubMessage ? ` — ${tip.githubMessage}` : ''}. Dieser Rechner hat dieselben Dateien.`
      : 'Dieser Rechner hat schon den GitHub-Stand.';
    return {
      ...status,
      explanation: changes.length ? explanation : empty,
      changes,
      summary: summarizeChanges(changes),
      ...tip,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Änderungen nicht lesbar.';
    return { ...status, available: false, reason: 'error', hint: message, explanation: message, changes: [], summary: message };
  }
}

export async function pullTeacherGitBackup(): Promise<TeacherGitBackupResult> {
  const pre = getTeacherGitBackupStatus();
  if (!pre.available) {
    return { ok: false, committed: false, pushed: false, message: pre.hint };
  }
  if (running) {
    return {
      ok: false,
      committed: false,
      pushed: false,
      message: 'Gerade unterwegs — einen Moment warten.',
    };
  }
  running = true;
  try {
    const root = findGitRoot();
    if (root && fs.existsSync(scriptPath(root))) {
      const result = await pullLaptopStand(root);
      try {
        await writePulledScratchPadsToDb(applyPulledScratchPadFiles());
      } catch (e) {
        console.warn('Notizen nach Holen nicht in die Datenbank geschrieben:', e);
      }
      return result;
    }
    const school = await pullSchoolStandFromGithub();
    try {
      await writePulledScratchPadsToDb(applyPulledScratchPadFiles());
    } catch (e) {
      console.warn('Notizen nach Holen nicht in die Datenbank geschrieben:', e);
    }
    return {
      ...school,
      where: 'school',
      explanation: 'Stand von GitHub auf die Schule.',
      changes: (school.changes || []).map((c) => toChange(c.path, c.kind, c.when)),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Holen fehlgeschlagen.';
    return { ok: false, committed: false, pushed: false, message };
  } finally {
    running = false;
  }
}

export async function previewTeacherGitBackup(): Promise<TeacherGitBackupPreview> {
  const status = getTeacherGitBackupStatus();
  const where = status.where;
  const explanation =
    where === 'school'
      ? 'Ich schicke Notizen und Tickets von der Schule nach GitHub. Folien bleiben hier. Passwörter bleiben hier.'
      : 'Ich schicke den Stand von diesem Laptop nach GitHub: Folien, Notizen, Tickets und Code. Passwörter bleiben hier.';
  if (!status.available) {
    return { ...status, explanation: status.hint, changes: [], summary: status.hint };
  }
  try {
    const root = findGitRoot();
    const tip = root ? laptopGithubTip(root) : {};
    const raw =
      where === 'school'
        ? await previewSchoolStandChanges()
        : previewLaptopChanges(root || '');
    const changes = raw.map((c) =>
      toChange(c.path, c.kind, 'when' in c ? c.when : stampForRepoPath(c.path, root))
    );
    const summary = summarizeChanges(changes);
    const empty = tip.githubWhen
      ? `GitHub-Stand vom ${tip.githubWhen}${tip.githubMessage ? ` — ${tip.githubMessage}` : ''}. Nichts Neues zu schicken.`
      : 'GitHub hat schon genau diesen Stand.';
    return {
      ...status,
      explanation: changes.length ? explanation : empty,
      changes,
      summary,
      ...tip,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Änderungen nicht lesbar.';
    return { ...status, available: false, reason: 'error', hint: message, explanation: message, changes: [], summary: message };
  }
}

function parseScriptOutput(stdout: string, stderr: string): TeacherGitBackupResult {
  const text = `${stdout}\n${stderr}`.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const statusLine = [...lines].reverse().find((l) => l.startsWith('JM_STATUS=')) || '';
  const status = statusLine.replace('JM_STATUS=', '').trim();
  const message =
    [...lines].reverse().find((l) => l && !l.startsWith('JM_STATUS=')) ||
    'Fertig.';

  if (status === 'nothing') {
    return { ok: true, committed: false, pushed: false, message };
  }
  if (status === 'ok') {
    return { ok: true, committed: true, pushed: true, message };
  }
  return { ok: false, committed: false, pushed: false, message };
}

async function runLaptopGitBackup(root: string): Promise<TeacherGitBackupResult> {
  const { stdout, stderr } = await execFileAsync('bash', [scriptPath(root)], {
    cwd: root,
    timeout: 240_000,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_OPTIONAL_LOCKS: '0',
    },
  });
  return parseScriptOutput(String(stdout || ''), String(stderr || ''));
}

export async function runTeacherGitBackup(): Promise<TeacherGitBackupResult> {
  const pre = getTeacherGitBackupStatus();
  if (!pre.available) {
    return { ok: false, committed: false, pushed: false, message: pre.hint };
  }
  if (running) {
    return {
      ok: false,
      committed: false,
      pushed: false,
      message: 'Gerade unterwegs — einen Moment warten.',
    };
  }

  running = true;
  try {
    const root = findGitRoot();
    if (root && fs.existsSync(scriptPath(root))) {
      try {
        const changes = previewLaptopChanges(root);
        const result = await runLaptopGitBackup(root);
        return {
          ...result,
          changes,
          where: 'laptop',
          explanation: 'Stand von diesem Laptop nach GitHub.',
        };
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        const parsed = parseScriptOutput(String(e.stdout || ''), String(e.stderr || ''));
        if (parsed.message && parsed.message !== 'Fertig.') {
          return { ...parsed, ok: false };
        }
        const raw = String(e.stderr || e.message || 'Push fehlgeschlagen.').trim();
        const lines = raw.split(/\r?\n/).filter((l) => l && !/^hint:/i.test(l) && !/^! \[rejected\]/i.test(l));
        const short = lines.slice(-2).join(' ');
        const friendly = /non-fast-forward|fetch first|rejected/i.test(raw)
          ? 'GitHub hat inzwischen einen anderen Stand. Erst „Stand von GitHub holen“, dann nochmal schieben.'
          : short || 'Push fehlgeschlagen. Am Laptop GitHub-Zugang prüfen.';
        return {
          ok: false,
          committed: false,
          pushed: false,
          message: friendly,
        };
      }
    }
    const school = await pushSchoolStandToGithub();
    return {
      ...school,
      where: 'school',
      explanation: 'Stand von der Schule nach GitHub.',
      changes: (school.changes || []).map((c) => toChange(c.path, c.kind, c.when)),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Push fehlgeschlagen.';
    const friendly = /Bad credentials|401/i.test(message)
      ? 'GitHub hat den Zugang abgelehnt. Token auf der Schule neu setzen.'
      : /rate limit/i.test(message)
        ? 'GitHub bremst gerade — in ein paar Minuten nochmal.'
        : message;
    return { ok: false, committed: false, pushed: false, message: friendly };
  } finally {
    running = false;
  }
}
