import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { hasGithubToken, pushSchoolStandToGithub } from './teacherGitHubApi';

const execFileAsync = promisify(execFile);

export type TeacherGitBackupStatus = {
  available: boolean;
  reason: 'ok' | 'no-git' | 'not-main' | 'busy' | 'error';
  hint: string;
  where?: 'laptop' | 'school';
};

export type TeacherGitBackupResult = {
  ok: boolean;
  committed: boolean;
  pushed: boolean;
  message: string;
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
      hint: 'Dieser Schul-Stand nach GitHub: Folien, Notizen und Tickets.',
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
        return await runLaptopGitBackup(root);
      } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        const parsed = parseScriptOutput(String(e.stdout || ''), String(e.stderr || ''));
        if (parsed.message && parsed.message !== 'Fertig.') {
          return { ...parsed, ok: false };
        }
        const raw = String(e.stderr || e.message || 'Push fehlgeschlagen.').trim();
        const short = raw.split(/\r?\n/).filter(Boolean).slice(-3).join(' ');
        return {
          ok: false,
          committed: false,
          pushed: false,
          message: short || 'Push fehlgeschlagen. Am Laptop GitHub-Zugang prüfen.',
        };
      }
    }
    return await pushSchoolStandToGithub();
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
