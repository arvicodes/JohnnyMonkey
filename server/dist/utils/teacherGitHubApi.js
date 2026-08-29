"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readGithubToken = readGithubToken;
exports.hasGithubToken = hasGithubToken;
exports.previewSchoolStandChanges = previewSchoolStandChanges;
exports.pushSchoolStandToGithub = pushSchoolStandToGithub;
const crypto_1 = __importDefault(require("crypto"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
function materialsRoot() {
    const fromEnv = String(process.env.LOCAL_MATERIALS_PATH || '').trim();
    if (fromEnv && fs_1.default.existsSync(fromEnv))
        return fromEnv;
    return path_1.default.resolve(__dirname, '../../..');
}
function readGithubToken() {
    var _a;
    const fromEnv = String(process.env.JM_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim();
    if (fromEnv)
        return fromEnv;
    const candidates = [
        '/app/server/data/.jm-github-token',
        path_1.default.join(materialsRoot(), 'server/data/.jm-github-token'),
        path_1.default.join(materialsRoot(), '.jm-github-token'),
        path_1.default.resolve(__dirname, '../../data/.jm-github-token'),
    ];
    for (const file of candidates) {
        try {
            const text = fs_1.default.readFileSync(file, 'utf8').trim();
            if (text)
                return text;
        }
        catch {
            /* skip */
        }
    }
    try {
        const out = (0, child_process_1.execFileSync)('git', ['credential', 'fill'], {
            input: 'protocol=https\nhost=github.com\n\n',
            encoding: 'utf8',
            timeout: 8000,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        const match = String(out).match(/^password=(.*)$/m);
        const password = ((_a = match === null || match === void 0 ? void 0 : match[1]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
        if (password)
            return password;
    }
    catch {
        /* no laptop credentials */
    }
    return '';
}
function hasGithubToken() {
    return Boolean(readGithubToken());
}
function gitBlobSha(buf) {
    const header = Buffer.from(`blob ${buf.length}\0`);
    return crypto_1.default.createHash('sha1').update(header).update(buf).digest('hex');
}
function shouldSkipName(name, isDir) {
    if (isDir)
        return SKIP_DIR.has(name);
    return SKIP_FILE.has(name.toLowerCase());
}
function walkDir(abs, repoPrefix, seen, out) {
    let real = abs;
    try {
        real = fs_1.default.realpathSync(abs);
    }
    catch {
        return;
    }
    if (seen.has(real))
        return;
    seen.add(real);
    let entries;
    try {
        entries = fs_1.default.readdirSync(abs, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        if (SKIP_DIR.has(entry.name))
            continue;
        if (!entry.isDirectory() && shouldSkipName(entry.name, false))
            continue;
        const childAbs = path_1.default.join(abs, entry.name);
        const childRepo = `${repoPrefix}/${entry.name}`.replace(/\\/g, '/');
        let stat;
        try {
            stat = fs_1.default.statSync(childAbs);
        }
        catch {
            continue;
        }
        if (stat.isDirectory()) {
            walkDir(childAbs, childRepo, seen, out);
        }
        else if (stat.isFile()) {
            if (stat.size > MAX_FILE_BYTES)
                continue;
            out.push({ repoPath: childRepo, absPath: childAbs });
        }
    }
}
function collectStandFiles() {
    const root = materialsRoot();
    const seen = new Set();
    const out = [];
    const folders = [
        ['J-M-Reihen', 'J-M-Reihen'],
        ['Notizen-Sicherheitskopien', 'Notizen-Sicherheitskopien'],
        ['Presentation-Sicherheitskopien', 'Presentation-Sicherheitskopien'],
    ];
    for (const [rel, repo] of folders) {
        const abs = path_1.default.join(root, rel);
        if (fs_1.default.existsSync(abs))
            walkDir(abs, repo, seen, out);
    }
    const volumeDb = '/app/server/data/dev.db';
    const localDb = path_1.default.join(root, 'server/prisma/dev.db');
    if (fs_1.default.existsSync(volumeDb)) {
        out.push({ repoPath: 'server/prisma/dev.db', absPath: volumeDb });
    }
    else if (fs_1.default.existsSync(localDb)) {
        out.push({ repoPath: 'server/prisma/dev.db', absPath: localDb });
    }
    return out;
}
async function ghJson(token, apiPath, init = {}) {
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
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    }
    catch {
        data = { message: text };
    }
    if (!res.ok) {
        const message = data && typeof data === 'object' && 'message' in data
            ? String(data.message || '')
            : '';
        throw new Error(message || `GitHub ${res.status}`);
    }
    return data;
}
async function mapPool(items, limit, fn) {
    const out = new Array(items.length);
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
function berlinStamp() {
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
async function collectSchoolDiff() {
    const token = readGithubToken();
    if (!token) {
        throw new Error('GitHub-Zugang für die Schule fehlt noch. Einmal am Laptop einrichten.');
    }
    const [owner, repo] = REPO.split('/');
    if (!owner || !repo)
        throw new Error('GitHub-Repository ist nicht gesetzt.');
    const files = collectStandFiles();
    if (files.length === 0) {
        throw new Error('Keine Dateien zum Schieben gefunden.');
    }
    const ref = await ghJson(token, `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`);
    const parentSha = ref.object.sha;
    const commit = await ghJson(token, `/repos/${owner}/${repo}/git/commits/${parentSha}`);
    const baseTreeSha = commit.tree.sha;
    const remoteTree = await ghJson(token, `/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`);
    const remoteSha = new Map();
    for (const item of remoteTree.tree || []) {
        if (item.type === 'blob' && item.path && item.sha) {
            remoteSha.set(item.path, item.sha);
        }
    }
    const changed = [];
    for (const file of files) {
        let buf;
        try {
            buf = fs_1.default.readFileSync(file.absPath);
        }
        catch {
            continue;
        }
        if (buf.length > MAX_FILE_BYTES)
            continue;
        const sha = gitBlobSha(buf);
        const remote = remoteSha.get(file.repoPath);
        if (remote === sha)
            continue;
        changed.push({ path: file.repoPath, buf, kind: remote ? 'changed' : 'added' });
    }
    return { token, owner, repo, parentSha, baseTreeSha, changed };
}
async function previewSchoolStandChanges() {
    const { changed } = await collectSchoolDiff();
    return changed.map(({ path, kind }) => ({ path, kind }));
}
async function pushSchoolStandToGithub() {
    let prepared;
    try {
        prepared = await collectSchoolDiff();
    }
    catch (err) {
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
        const blob = await ghJson(token, `/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content: item.buf.toString('base64'), encoding: 'base64' }),
        });
        return { path: item.path, sha: blob.sha, mode: '100644', type: 'blob' };
    });
    const newTree = await ghJson(token, `/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: uploaded,
        }),
    });
    const stamp = berlinStamp();
    const message = `Stand Schule ${stamp}`;
    const newCommit = await ghJson(token, `/repos/${owner}/${repo}/git/commits`, {
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
        changes: changeList,
    };
}
//# sourceMappingURL=teacherGitHubApi.js.map