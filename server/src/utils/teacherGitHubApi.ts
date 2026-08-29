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
  'thumbs.db',
  'desktop.ini',
  '.jm-seeded',
  '.jm-github-token',
  '.env',
  '.env.school',
  '.env.local',
  '.login-code-pepper',
  'login-codes-alle.txt',
]);

export type SchoolStandChange = {
  path: string;
  kind: 'added' | 'changed';
};

export type GithubStandResult = {
  ok: boolean;
  committed: boolean;
  pushed: boolean;
  message: string;
  changes?: SchoolStandChange[];
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
  if (isDir) return SKIP_DIR.has(name) || name === '__MACOSX';
  if (name.startsWith('._')) return true;
  return SKIP_FILE.has(name.toLowerCase());
}

function isJunkRepoPath(repoPath: string): boolean {
  return repoPath.split('/').some((part) => shouldSkipName(part, false) || shouldSkipName(part, true));
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
    if (shouldSkipName(entry.name, entry.isDirectory())) continue;

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

async function collectSchoolDiff(): Promise<{
  token: string;
  owner: string;
  repo: string;
  parentSha: string;
  baseTreeSha: string;
  changed: Array<{ path: string; buf: Buffer; kind: 'added' | 'changed' }>;
}> {
  const token = readGithubToken();
  if (!token) {
    throw new Error('GitHub-Zugang für die Schule fehlt noch. Einmal am Laptop einrichten.');
  }
  const [owner, repo] = REPO.split('/');
  if (!owner || !repo) throw new Error('GitHub-Repository ist nicht gesetzt.');

  const files = collectStandFiles();
  if (files.length === 0) {
    throw new Error('Keine Dateien zum Schieben gefunden.');
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
    tree: Array<{ path?: string; sha?: string; type?: string }>;
  }>(token, `/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`);

  const remoteSha = new Map<string, string>();
  for (const item of remoteTree.tree || []) {
    if (item.type === 'blob' && item.path && item.sha) {
      remoteSha.set(item.path, item.sha);
    }
  }

  const changed: Array<{ path: string; buf: Buffer; kind: 'added' | 'changed' }> = [];
  for (const file of files) {
    let buf: Buffer;
    try {
      buf = fs.readFileSync(file.absPath);
    } catch {
      continue;
    }
    if (buf.length > MAX_FILE_BYTES) continue;
    const sha = gitBlobSha(buf);
    const remote = remoteSha.get(file.repoPath);
    if (remote === sha) continue;
    changed.push({ path: file.repoPath, buf, kind: remote ? 'changed' : 'added' });
  }

  return { token, owner, repo, parentSha, baseTreeSha, changed };
}

export async function previewSchoolStandChanges(): Promise<SchoolStandChange[]> {
  const { changed } = await collectSchoolDiff();
  return changed.map(({ path, kind }) => ({ path, kind }));
}

export async function pushSchoolStandToGithub(): Promise<GithubStandResult> {
  let prepared: Awaited<ReturnType<typeof collectSchoolDiff>>;
  try {
    prepared = await collectSchoolDiff();
  } catch (err) {
    return {
      ok: false,
      committed: false,
      pushed: false,
      message: err instanceof Error ? err.message : 'Schul-Stand nicht lesbar.',
    };
  }

  const { token, owner, repo, parentSha, baseTreeSha, changed } = prepared;
  const changeList = changed.map(({ path, kind }) => ({ path, kind }));

  if (changed.length === 0) {
    return {
      ok: true,
      committed: false,
      pushed: false,
      message: 'Nichts Neues — GitHub hat schon den aktuellen Schul-Stand.',
      changes: [],
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
  const latestRef = await ghJson<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`
  );
  const freshParent = latestRef.object.sha || parentSha;
  const newCommit = await ghJson<{ sha: string }>(token, `/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      tree: newTree.sha,
      parents: [freshParent],
    }),
  });

  let published = newCommit.sha;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await ghJson(token, `/repos/${owner}/${repo}/git/refs/heads/${BRANCH}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: published, force: false }),
      });
      break;
    } catch (err) {
      if (attempt === 2) throw err;
      const latest = await ghJson<{ object: { sha: string } }>(
        token,
        `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`
      );
      const retry = await ghJson<{ sha: string }>(token, `/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          tree: newTree.sha,
          parents: [latest.object.sha],
        }),
      });
      published = retry.sha;
    }
  }

  return {
    ok: true,
    committed: true,
    pushed: true,
    message: `Auf GitHub: ${message}`,
    changes: changeList,
  };
}

const PULL_PREFIXES = [
  'J-M-Reihen/',
  'Notizen-Sicherheitskopien/',
  'Presentation-Sicherheitskopien/',
];

function isPullRepoPath(repoPath: string): boolean {
  return repoPath === 'server/prisma/dev.db' || PULL_PREFIXES.some((pre) => repoPath.startsWith(pre));
}

function absForRepoPath(repoPath: string): string {
  if (repoPath === 'server/prisma/dev.db') {
    if (String(process.env.LOCAL_MATERIALS_PATH || '') === '/app' || fs.existsSync('/app/server/data')) {
      return '/app/server/data/dev.db';
    }
    return path.join(materialsRoot(), 'server/prisma/dev.db');
  }
  return path.join(materialsRoot(), repoPath);
}

async function listRemoteStandFiles(): Promise<{
  token: string;
  owner: string;
  repo: string;
  files: Array<{ path: string; sha: string }>;
}> {
  const token = readGithubToken();
  if (!token) {
    throw new Error('GitHub-Zugang für die Schule fehlt noch. Einmal am Laptop einrichten.');
  }
  const [owner, repo] = REPO.split('/');
  if (!owner || !repo) throw new Error('GitHub-Repository ist nicht gesetzt.');

  const ref = await ghJson<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`
  );
  const commit = await ghJson<{ tree: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`
  );
  const remoteTree = await ghJson<{
    tree: Array<{ path?: string; sha?: string; type?: string }>;
  }>(token, `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);

  const files: Array<{ path: string; sha: string }> = [];
  for (const item of remoteTree.tree || []) {
    if (item.type !== 'blob' || !item.path || !item.sha) continue;
    if (!isPullRepoPath(item.path) || isJunkRepoPath(item.path)) continue;
    files.push({ path: item.path, sha: item.sha });
  }
  return { token, owner, repo, files };
}

function localKindForRemote(repoPath: string, remoteSha: string): SchoolStandChange | null {
  const abs = absForRepoPath(repoPath);
  if (!fs.existsSync(abs)) return { path: repoPath, kind: 'added' };
  try {
    const buf = fs.readFileSync(abs);
    if (buf.length > MAX_FILE_BYTES) return null;
    if (gitBlobSha(buf) === remoteSha) return null;
    return { path: repoPath, kind: 'changed' };
  } catch {
    return { path: repoPath, kind: 'changed' };
  }
}

export async function previewSchoolStandPull(): Promise<SchoolStandChange[]> {
  const { files } = await listRemoteStandFiles();
  const changes: SchoolStandChange[] = [];
  for (const file of files) {
    const next = localKindForRemote(file.path, file.sha);
    if (next) changes.push(next);
  }
  return changes;
}

export async function pullSchoolStandFromGithub(): Promise<GithubStandResult> {
  const { token, owner, repo, files } = await listRemoteStandFiles();
  const wanted = files
    .map((file) => {
      const change = localKindForRemote(file.path, file.sha);
      return change ? { path: file.path, sha: file.sha, kind: change.kind } : null;
    })
    .filter((x): x is { path: string; sha: string; kind: 'added' | 'changed' } => Boolean(x));

  if (wanted.length === 0) {
    return {
      ok: true,
      committed: false,
      pushed: false,
      message: 'Nichts Neues — dieser Rechner hat schon den GitHub-Stand.',
      changes: [],
    };
  }

  await mapPool(wanted, 4, async (item) => {
    const blob = await ghJson<{ content?: string; encoding?: string }>(
      token,
      `/repos/${owner}/${repo}/git/blobs/${item.sha}`
    );
    const raw = String(blob.content || '').replace(/\n/g, '');
    const buf = Buffer.from(raw, blob.encoding === 'base64' ? 'base64' : 'utf8');
    if (buf.length > MAX_FILE_BYTES) return;
    const abs = absForRepoPath(item.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buf);
    if (item.path === 'server/prisma/dev.db' && abs === '/app/server/data/dev.db') {
      try {
        fs.copyFileSync(abs, '/app/server/prisma/dev.db');
        for (const extra of ['-wal', '-shm']) {
          try {
            fs.unlinkSync(`/app/server/data/dev.db${extra}`);
          } catch {
            /* ok */
          }
        }
      } catch {
        /* prisma copy optional */
      }
    }
  });

  return {
    ok: true,
    committed: false,
    pushed: true,
    message: `Von GitHub geholt: ${wanted.length} Dateien.`,
    changes: wanted.map(({ path, kind }) => ({ path, kind })),
  };
}
