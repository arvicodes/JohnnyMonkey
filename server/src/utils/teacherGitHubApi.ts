import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const REPO = process.env.SCHOOL_GITHUB_REPO || process.env.JM_GITHUB_REPO || 'arvicodes/JohnnyMonkey';
const BRANCH = 'main';
const MAX_FILE_BYTES = 90 * 1024 * 1024;
const SKIP_DIR = new Set([
  '.git',
  '.presentation-backups',
  'node_modules',
  'sync-backups',
]);
const SKIP_FILE = new Set([
  '.ds_store',
  '.jm-seeded',
  '.jm-github-token',
  '.env',
  '.env.school',
  '.env.local',
  '.login-code-pepper',
  'login-codes-alle.txt',
]);

export type GithubStandResult = {
  ok: boolean;
  committed: boolean;
  pushed: boolean;
  message: string;
};

type MappedFile = { repoPath: string; absPath: string };

function materialsRoot(): string {
  const fromEnv = String(process.env.LOCAL_MATERIALS_PATH || '').trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  return path.resolve(__dirname, '../../..');
}

export function readGithubToken(): string {
  const fromEnv = String(process.env.JM_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  const candidates = [
    '/app/server/data/.jm-github-token',
    path.join(materialsRoot(), 'server/data/.jm-github-token'),
    path.join(materialsRoot(), '.jm-github-token'),
    path.resolve(__dirname, '../../data/.jm-github-token'),
  ];
  for (const file of candidates) {
    try {
      const text = fs.readFileSync(file, 'utf8').trim();
      if (text) return text;
    } catch {
      /* skip */
    }
  }
  try {
    const out = execFileSync('git', ['credential', 'fill'], {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
      timeout: 8000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = String(out).match(/^password=(.*)$/m);
    const password = match?.[1]?.trim() || '';
    if (password) return password;
  } catch {
    /* no laptop credentials */
  }
  return '';
}

export function hasGithubToken(): boolean {
  return Boolean(readGithubToken());
}

function gitBlobSha(buf: Buffer): string {
  const header = Buffer.from(`blob ${buf.length}\0`);
  return crypto.createHash('sha1').update(header).update(buf).digest('hex');
}

function shouldSkipName(name: string, isDir: boolean): boolean {
  if (isDir) return SKIP_DIR.has(name);
  return SKIP_FILE.has(name.toLowerCase());
}

function walkDir(abs: string, repoPrefix: string, seen: Set<string>, out: MappedFile[]): void {
  let real = abs;
  try {
    real = fs.realpathSync(abs);
  } catch {
    return;
  }
  if (seen.has(real)) return;
  seen.add(real);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIR.has(entry.name)) continue;
    if (!entry.isDirectory() && shouldSkipName(entry.name, false)) continue;

    const childAbs = path.join(abs, entry.name);
    const childRepo = `${repoPrefix}/${entry.name}`.replace(/\\/g, '/');
    let stat: fs.Stats;
    try {
      stat = fs.statSync(childAbs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkDir(childAbs, childRepo, seen, out);
    } else if (stat.isFile()) {
      if (stat.size > MAX_FILE_BYTES) continue;
      out.push({ repoPath: childRepo, absPath: childAbs });
    }
  }
}

function collectStandFiles(): MappedFile[] {
  const root = materialsRoot();
  const seen = new Set<string>();
  const out: MappedFile[] = [];
  const folders = [
    ['J-M-Reihen', 'J-M-Reihen'],
    ['Notizen-Sicherheitskopien', 'Notizen-Sicherheitskopien'],
    ['Presentation-Sicherheitskopien', 'Presentation-Sicherheitskopien'],
  ] as const;
  for (const [rel, repo] of folders) {
    const abs = path.join(root, rel);
    if (fs.existsSync(abs)) walkDir(abs, repo, seen, out);
  }

  const volumeDb = '/app/server/data/dev.db';
  const localDb = path.join(root, 'server/prisma/dev.db');
  if (fs.existsSync(volumeDb)) {
    out.push({ repoPath: 'server/prisma/dev.db', absPath: volumeDb });
  } else if (fs.existsSync(localDb)) {
    out.push({ repoPath: 'server/prisma/dev.db', absPath: localDb });
  }
  return out;
}

async function ghJson<T>(
  token: string,
  apiPath: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`https://api.github.com${apiPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'JohnnyMonkey-teacher-stand',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message?: string }).message || '')
        : '';
    throw new Error(message || `GitHub ${res.status}`);
  }
  return data as T;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i]);
    }
  }
  const n = Math.min(limit, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function berlinStamp(): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date())
    .replace(', ', ' ');
}

export async function pushSchoolStandToGithub(): Promise<GithubStandResult> {
  const token = readGithubToken();
  if (!token) {
    return {
      ok: false,
      committed: false,
      pushed: false,
      message: 'GitHub-Zugang für die Schule fehlt noch. Einmal am Laptop einrichten.',
    };
  }

  const files = collectStandFiles();
  if (files.length === 0) {
    return {
      ok: false,
      committed: false,
      pushed: false,
      message: 'Keine Dateien zum Schieben gefunden.',
    };
  }

  const [owner, repo] = REPO.split('/');
  if (!owner || !repo) {
    return {
      ok: false,
      committed: false,
      pushed: false,
      message: 'GitHub-Repository ist nicht gesetzt.',
    };
  }

  const ref = await ghJson<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`
  );
  const parentSha = ref.object.sha;
  const commit = await ghJson<{ tree: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/commits/${parentSha}`
  );
  const baseTreeSha = commit.tree.sha;
  const remoteTree = await ghJson<{
    truncated?: boolean;
    tree: Array<{ path?: string; sha?: string; type?: string }>;
  }>(token, `/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`);

  const remoteSha = new Map<string, string>();
  for (const item of remoteTree.tree || []) {
    if (item.type === 'blob' && item.path && item.sha) {
      remoteSha.set(item.path, item.sha);
    }
  }

  const changed: Array<{ path: string; buf: Buffer }> = [];
  for (const file of files) {
    let buf: Buffer;
    try {
      buf = fs.readFileSync(file.absPath);
    } catch {
      continue;
    }
    if (buf.length > MAX_FILE_BYTES) continue;
    const sha = gitBlobSha(buf);
    if (remoteSha.get(file.repoPath) === sha) continue;
    changed.push({ path: file.repoPath, buf });
  }

  if (changed.length === 0) {
    return {
      ok: true,
      committed: false,
      pushed: false,
      message: 'Nichts Neues — GitHub hat schon den aktuellen Schul-Stand.',
    };
  }

  const uploaded = await mapPool(changed, 4, async (item) => {
    const blob = await ghJson<{ sha: string }>(token, `/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({ content: item.buf.toString('base64'), encoding: 'base64' }),
    });
    return { path: item.path, sha: blob.sha, mode: '100644', type: 'blob' as const };
  });

  const newTree = await ghJson<{ sha: string }>(token, `/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: uploaded,
    }),
  });

  const stamp = berlinStamp();
  const message = `Stand Schule ${stamp}`;
  const newCommit = await ghJson<{ sha: string }>(token, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [parentSha],
    }),
  });

  await ghJson(token, `/repos/${owner}/${repo}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha, force: false }),
  });

  return {
    ok: true,
    committed: true,
    pushed: true,
    message: `Auf GitHub: ${message}`,
  };
}
