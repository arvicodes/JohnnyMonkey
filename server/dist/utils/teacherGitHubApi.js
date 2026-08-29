"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readGithubToken = readGithubToken;
exports.hasGithubToken = hasGithubToken;
exports.previewSchoolStandChanges = previewSchoolStandChanges;
exports.pushSchoolStandToGithub = pushSchoolStandToGithub;
exports.previewSchoolStandPull = previewSchoolStandPull;
exports.pullSchoolStandFromGithub = pullSchoolStandFromGithub;
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
    'Backup - Notizen',
    'Backup - Folien',
    'Backup - Tickets',
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
function isMinuteCopyName(name) {
    const n = name.toLowerCase();
    if (n.includes('_notizen_') || n.includes('_tickets_') || n.includes('_folien_'))
        return true;
    if (/^\d{1,2}:\d{2}/.test(name))
        return true;
    return false;
}
function shouldSkipName(name, isDir) {
    if (isDir)
        return SKIP_DIR.has(name) || name === '__MACOSX' || name.startsWith('_extra-sicherung');
    if (name.startsWith('._'))
        return true;
    if (/^pad-.+\.json$/i.test(name))
        return true;
    if (name.startsWith('_extra-sicherung'))
        return true;
    if (isMinuteCopyName(name))
        return true;
    return SKIP_FILE.has(name.toLowerCase());
}
function stampForAbs(abs) {
    try {
        if (!fs_1.default.existsSync(abs))
            return undefined;
        return formatBerlinDate(fs_1.default.statSync(abs).mtime);
    }
    catch {
        return undefined;
    }
}
function isJunkRepoPath(repoPath) {
    return repoPath.split('/').some((part) => shouldSkipName(part, false) || shouldSkipName(part, true));
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
        if (shouldSkipName(entry.name, entry.isDirectory()))
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
function isSchoolStandPath(repoPath) {
    const n = repoPath.replace(/\\/g, '/');
    if (n === 'server/prisma/dev.db')
        return true;
    if (!n.endsWith('/latest.json') && n !== 'latest.json')
        return false;
    return n.includes('/Lehrer-Schnellnotizen/') || n.startsWith('Notizen-Sicherheitskopien/');
}
function collectStandFiles() {
    const root = materialsRoot();
    const seen = new Set();
    const raw = [];
    const folders = [
        ['J-M-Reihen/Lehrer-Schnellnotizen', 'J-M-Reihen/Lehrer-Schnellnotizen'],
        ['Notizen-Sicherheitskopien', 'Notizen-Sicherheitskopien'],
    ];
    for (const [rel, repo] of folders) {
        const abs = path_1.default.join(root, rel);
        if (fs_1.default.existsSync(abs))
            walkDir(abs, repo, seen, raw);
    }
    const out = raw.filter((f) => isSchoolStandPath(f.repoPath));
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
function formatBerlinDate(d) {
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
function berlinStamp() {
    return formatBerlinDate(new Date());
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
        changed.push({
            path: file.repoPath,
            buf,
            kind: remote ? 'changed' : 'added',
        });
    }
    return { token, owner, repo, parentSha, baseTreeSha, changed };
}
async function previewSchoolStandChanges() {
    const { changed } = await collectSchoolDiff();
    return changed.map(({ path, kind }) => ({
        path,
        kind,
        when: stampForAbs(absForRepoPath(path)),
    }));
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
    const changeList = changed.map(({ path, kind }) => ({
        path,
        kind,
        when: stampForAbs(absForRepoPath(path)),
    }));
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
    const latestRef = await ghJson(token, `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`);
    const freshParent = latestRef.object.sha || parentSha;
    const newCommit = await ghJson(token, `/repos/${owner}/${repo}/git/commits`, {
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
        }
        catch (err) {
            if (attempt === 2)
                throw err;
            const latest = await ghJson(token, `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`);
            const retry = await ghJson(token, `/repos/${owner}/${repo}/git/commits`, {
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
function isPullRepoPath(repoPath) {
    return isSchoolStandPath(repoPath);
}
function absForRepoPath(repoPath) {
    if (repoPath === 'server/prisma/dev.db') {
        if (String(process.env.LOCAL_MATERIALS_PATH || '') === '/app' || fs_1.default.existsSync('/app/server/data')) {
            return '/app/server/data/dev.db';
        }
        return path_1.default.join(materialsRoot(), 'server/prisma/dev.db');
    }
    return path_1.default.join(materialsRoot(), repoPath);
}
async function listRemoteStandFiles() {
    const token = readGithubToken();
    if (!token) {
        throw new Error('GitHub-Zugang für die Schule fehlt noch. Einmal am Laptop einrichten.');
    }
    const [owner, repo] = REPO.split('/');
    if (!owner || !repo)
        throw new Error('GitHub-Repository ist nicht gesetzt.');
    const ref = await ghJson(token, `/repos/${owner}/${repo}/git/ref/heads/${BRANCH}`);
    const commit = await ghJson(token, `/repos/${owner}/${repo}/git/commits/${ref.object.sha}`);
    const remoteTree = await ghJson(token, `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}?recursive=1`);
    const files = [];
    for (const item of remoteTree.tree || []) {
        if (item.type !== 'blob' || !item.path || !item.sha)
            continue;
        if (!isPullRepoPath(item.path) || isJunkRepoPath(item.path))
            continue;
        files.push({ path: item.path, sha: item.sha });
    }
    return { token, owner, repo, files };
}
function localKindForRemote(repoPath, remoteSha) {
    const abs = absForRepoPath(repoPath);
    const when = stampForAbs(abs);
    if (!fs_1.default.existsSync(abs))
        return { path: repoPath, kind: 'added' };
    try {
        const buf = fs_1.default.readFileSync(abs);
        if (buf.length > MAX_FILE_BYTES)
            return null;
        if (gitBlobSha(buf) === remoteSha)
            return null;
        return { path: repoPath, kind: 'changed', when };
    }
    catch {
        return { path: repoPath, kind: 'changed', when };
    }
}
async function previewSchoolStandPull() {
    const { files } = await listRemoteStandFiles();
    const changes = [];
    for (const file of files) {
        const next = localKindForRemote(file.path, file.sha);
        if (next)
            changes.push(next);
    }
    return changes;
}
async function pullSchoolStandFromGithub() {
    const { token, owner, repo, files } = await listRemoteStandFiles();
    const wanted = files
        .map((file) => {
        const change = localKindForRemote(file.path, file.sha);
        return change ? { path: file.path, sha: file.sha, kind: change.kind } : null;
    })
        .filter((x) => Boolean(x));
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
        const blob = await ghJson(token, `/repos/${owner}/${repo}/git/blobs/${item.sha}`);
        const raw = String(blob.content || '').replace(/\n/g, '');
        const buf = Buffer.from(raw, blob.encoding === 'base64' ? 'base64' : 'utf8');
        if (buf.length > MAX_FILE_BYTES)
            return;
        const abs = absForRepoPath(item.path);
        fs_1.default.mkdirSync(path_1.default.dirname(abs), { recursive: true });
        fs_1.default.writeFileSync(abs, buf);
        if (item.path === 'server/prisma/dev.db' && abs === '/app/server/data/dev.db') {
            try {
                fs_1.default.copyFileSync(abs, '/app/server/prisma/dev.db');
                for (const extra of ['-wal', '-shm']) {
                    try {
                        fs_1.default.unlinkSync(`/app/server/data/dev.db${extra}`);
                    }
                    catch {
                        /* ok */
                    }
                }
            }
            catch {
                /* prisma copy optional */
            }
        }
    });
    return {
        ok: true,
        committed: false,
        pushed: true,
        message: `Von GitHub geholt: ${wanted.length} Dateien.`,
        changes: wanted.map(({ path, kind }) => ({
            path,
            kind,
            when: stampForAbs(absForRepoPath(path)),
        })),
    };
}
//# sourceMappingURL=teacherGitHubApi.js.map