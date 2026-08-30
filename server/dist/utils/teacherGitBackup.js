"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGitRoot = findGitRoot;
exports.formatBerlinStamp = formatBerlinStamp;
exports.describeStandPath = describeStandPath;
exports.getTeacherGitBackupStatus = getTeacherGitBackupStatus;
exports.previewTeacherGitPull = previewTeacherGitPull;
exports.pullTeacherGitBackup = pullTeacherGitBackup;
exports.previewTeacherGitBackup = previewTeacherGitBackup;
exports.runTeacherGitBackup = runTeacherGitBackup;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const teacherGitHubApi_1 = require("./teacherGitHubApi");
const teacherScratchPadStore_1 = require("./teacherScratchPadStore");
const teacherTicketStand_1 = require("./teacherTicketStand");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let running = false;
function candidateRoots() {
    const fromEnv = [process.env.JM_GIT_ROOT]
        .map((v) => String(v || '').trim())
        .filter(Boolean);
    return [
        ...fromEnv,
        path_1.default.resolve(__dirname, '../../..'),
        process.cwd(),
        path_1.default.resolve(process.cwd(), '..'),
    ];
}
function findGitRoot() {
    for (const root of candidateRoots()) {
        try {
            if (fs_1.default.existsSync(path_1.default.join(root, '.git')) && fs_1.default.existsSync(path_1.default.join(root, 'scripts'))) {
                return root;
            }
        }
        catch {
            /* skip */
        }
    }
    return null;
}
function scriptPath(root) {
    return path_1.default.join(root, 'scripts', 'git-push-sicherungen.sh');
}
function isSchoolHost() {
    return String(process.env.LOCAL_MATERIALS_PATH || '') === '/app' || !findGitRoot();
}
function isSecretPath(repoPath) {
    const n = repoPath.replace(/\\/g, '/');
    if (n === '.env' || n.startsWith('.env.') || n.includes('/.env'))
        return true;
    if (n.includes('.jm-github-token') || n.includes('.login-code-pepper'))
        return true;
    if (n.includes('LOGIN-CODES-ALLE.txt'))
        return true;
    if (n === 'sync-backups' || n.startsWith('sync-backups/'))
        return true;
    if (n.endsWith('.b64'))
        return true;
    if (n.split('/').some((part) => part.startsWith('._') || part === '.DS_Store' || part === '__MACOSX')) {
        return true;
    }
    if (/(^|\/)pad-[^/]+\.json$/i.test(n))
        return true;
    if (n.includes('/Backup - Notizen/') || n.includes('/Backup - Folien/')) {
        return true;
    }
    if (n.includes('/Backup - Tickets/') && !n.endsWith('/latest.json')) {
        return true;
    }
    return false;
}
function formatBerlinStamp(d) {
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
function stampForAbs(abs) {
    try {
        if (!fs_1.default.existsSync(abs))
            return undefined;
        return formatBerlinStamp(fs_1.default.statSync(abs).mtime);
    }
    catch {
        return undefined;
    }
}
function stampForRepoPath(repoPath, root) {
    if (repoPath === 'server/prisma/dev.db' && fs_1.default.existsSync('/app/server/data/dev.db')) {
        return stampForAbs('/app/server/data/dev.db');
    }
    const bases = [root, findGitRoot(), process.env.LOCAL_MATERIALS_PATH, path_1.default.resolve(__dirname, '../../..')].filter(Boolean);
    for (const base of bases) {
        const when = stampForAbs(path_1.default.join(base, repoPath));
        if (when)
            return when;
    }
    return undefined;
}
function laptopGithubTip(root) {
    try {
        (0, child_process_1.execFileSync)('git', ['fetch', 'origin', 'main'], {
            cwd: root,
            timeout: 60000,
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        });
        const raw = (0, child_process_1.execFileSync)('git', ['log', '-1', '--format=%cI\t%s', 'origin/main'], {
            cwd: root,
            encoding: 'utf8',
        }).trim();
        const [iso, ...rest] = raw.split('\t');
        const when = iso ? formatBerlinStamp(new Date(iso)) : undefined;
        return { githubWhen: when, githubMessage: rest.join('\t').trim() || undefined };
    }
    catch {
        return {};
    }
}
function describeStandPath(repoPath) {
    const n = repoPath.replace(/\\/g, '/');
    const base = n.split('/').pop() || n;
    if (n === 'server/prisma/dev.db')
        return 'Tickets und Datenbank';
    if (n.startsWith('Notizen-Sicherheitskopien/'))
        return `Notizen-Kopie: ${base}`;
    if (n.includes('/Backup - Tickets/'))
        return `Ticket-Kopie: ${base}`;
    if (n.includes('/Backup - Folien/'))
        return `Folien-Kopie: ${base}`;
    if (n.includes('/Backup - Notizen/'))
        return `Notizen-Kopie: ${base}`;
    if (n.includes('/Lehrer-Schnellnotizen/'))
        return `Notizen: ${base}`;
    if (n.includes('Praesentation.')) {
        const parts = n.split('/').filter((p) => p && p !== 'J-M-Reihen' && !p.startsWith('Praesentation'));
        const lesson = parts.slice(-2).join(' / ') || base;
        if (n.includes('annotations'))
            return `Folien-Markierungen: ${lesson}`;
        if (n.includes('play-variants'))
            return `Folien-Varianten: ${lesson}`;
        return `Folie: ${lesson}`;
    }
    if (n.startsWith('J-M-Reihen/')) {
        const short = n.replace(/^J-M-Reihen\//, '');
        return short.length > 72 ? `Material: …${short.slice(-64)}` : `Material: ${short}`;
    }
    if (n.startsWith('client/') || n.startsWith('server/'))
        return `App: ${n}`;
    return n;
}
function toChange(pathName, kind, when) {
    return { path: pathName, kind, label: describeStandPath(pathName), when };
}
function summarizeChanges(changes) {
    if (changes.length === 0)
        return 'Nichts Neues gegenüber GitHub.';
    const added = changes.filter((c) => c.kind === 'added').length;
    const changed = changes.filter((c) => c.kind === 'changed').length;
    const removed = changes.filter((c) => c.kind === 'removed').length;
    const bits = [];
    if (changed)
        bits.push(`${changed} geändert`);
    if (added)
        bits.push(`${added} neu`);
    if (removed)
        bits.push(`${removed} entfernt`);
    return bits.join(', ');
}
function previewLaptopChanges(root) {
    const out = (0, child_process_1.execFileSync)('git', ['status', '--porcelain', '-uall'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 20000,
    });
    const changes = [];
    for (const raw of String(out).split(/\r?\n/)) {
        const line = raw.trimEnd();
        if (line.length < 4)
            continue;
        const xy = line.slice(0, 2);
        let filePath = line.slice(3).replace(/^"|"$/g, '');
        if (filePath.includes(' -> '))
            filePath = filePath.split(' -> ').pop() || filePath;
        if (isSecretPath(filePath))
            continue;
        const index = xy[0];
        const work = xy[1];
        let kind = 'changed';
        if (xy === '??' || index === 'A' || work === 'A')
            kind = 'added';
        else if (index === 'D' || work === 'D')
            kind = 'removed';
        changes.push(toChange(filePath, kind, stampForRepoPath(filePath, root)));
    }
    return changes;
}
function getTeacherGitBackupStatus() {
    if (running) {
        return {
            available: false,
            reason: 'busy',
            hint: 'Gerade unterwegs — einen Moment warten.',
        };
    }
    const root = findGitRoot();
    if (root && fs_1.default.existsSync(scriptPath(root))) {
        return {
            available: true,
            reason: 'ok',
            where: 'laptop',
            hint: 'Ganzer Stand: Folien, Notizen, Tickets und Code. Keine Passwörter.',
        };
    }
    if ((0, teacherGitHubApi_1.hasGithubToken)()) {
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
function settleSqliteAfterReplace(dbPath) {
    for (const extra of ['-wal', '-shm', '-journal']) {
        try {
            fs_1.default.unlinkSync(`${dbPath}${extra}`);
        }
        catch {
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
function previewLaptopPull(root) {
    (0, child_process_1.execFileSync)('git', ['fetch', 'origin', 'main'], {
        cwd: root,
        timeout: 120000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    const out = (0, child_process_1.execFileSync)('git', ['diff', '--name-status', 'HEAD', 'origin/main', '--', ...LAPTOP_PULL_PATHS], { cwd: root, encoding: 'utf8', timeout: 30000 });
    const changes = [];
    for (const line of String(out).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        const parts = trimmed.split(/\t/);
        const code = parts[0] || '';
        const filePath = parts[parts.length - 1] || '';
        if (!filePath || isSecretPath(filePath))
            continue;
        let kind = 'changed';
        if (code.startsWith('A'))
            kind = 'added';
        else if (code.startsWith('D'))
            kind = 'removed';
        changes.push(toChange(filePath, kind, stampForRepoPath(filePath, root)));
    }
    return changes;
}
async function pullLaptopStand(root) {
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
    (0, child_process_1.execFileSync)('git', ['checkout', 'origin/main', '--', ...LAPTOP_PULL_PATHS], {
        cwd: root,
        timeout: 120000,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    settleSqliteAfterReplace(path_1.default.join(root, 'server/prisma/dev.db'));
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
async function previewTeacherGitPull() {
    const status = getTeacherGitBackupStatus();
    const explanation = status.where === 'school'
        ? 'Ich hole den Stand von GitHub auf die Schule: Folien, Notizen und Tickets.'
        : 'Ich hole den Stand von GitHub auf diesen Laptop: Folien, Notizen und Tickets.';
    if (!status.available) {
        return { ...status, explanation: status.hint, changes: [], summary: status.hint };
    }
    try {
        const root = findGitRoot();
        const tip = root ? laptopGithubTip(root) : {};
        const raw = status.where === 'school'
            ? await (0, teacherGitHubApi_1.previewSchoolStandPull)()
            : previewLaptopPull(root || '');
        const changes = raw.map((c) => toChange(c.path, c.kind, 'when' in c ? c.when : stampForRepoPath(c.path, root)));
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Änderungen nicht lesbar.';
        return { ...status, available: false, reason: 'error', hint: message, explanation: message, changes: [], summary: message };
    }
}
async function pullTeacherGitBackup() {
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
        if (root && fs_1.default.existsSync(scriptPath(root))) {
            const result = await pullLaptopStand(root);
            try {
                await (0, teacherScratchPadStore_1.writePulledScratchPadsToDb)((0, teacherScratchPadStore_1.applyPulledScratchPadFiles)());
            }
            catch (e) {
                console.warn('Notizen nach Holen nicht in die Datenbank geschrieben:', e);
            }
            (0, teacherTicketStand_1.applyPulledTicketsFromFile)();
            return result;
        }
        const school = await (0, teacherGitHubApi_1.pullSchoolStandFromGithub)();
        try {
            await (0, teacherScratchPadStore_1.writePulledScratchPadsToDb)((0, teacherScratchPadStore_1.applyPulledScratchPadFiles)());
        }
        catch (e) {
            console.warn('Notizen nach Holen nicht in die Datenbank geschrieben:', e);
        }
        (0, teacherTicketStand_1.applyPulledTicketsFromFile)();
        return {
            ...school,
            where: 'school',
            explanation: 'Stand von GitHub auf die Schule.',
            changes: (school.changes || []).map((c) => toChange(c.path, c.kind, c.when)),
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Holen fehlgeschlagen.';
        return { ok: false, committed: false, pushed: false, message };
    }
    finally {
        running = false;
    }
}
async function previewTeacherGitBackup() {
    const status = getTeacherGitBackupStatus();
    const where = status.where;
    const explanation = where === 'school'
        ? 'Ich schicke Folien, Notizen und Tickets von der Schule nach GitHub. Passwörter bleiben hier.'
        : 'Ich schicke den Stand von diesem Laptop nach GitHub: Folien, Notizen, Tickets und Code. Passwörter bleiben hier.';
    if (!status.available) {
        return { ...status, explanation: status.hint, changes: [], summary: status.hint };
    }
    try {
        const root = findGitRoot();
        const tip = root ? laptopGithubTip(root) : {};
        const raw = where === 'school'
            ? await (0, teacherGitHubApi_1.previewSchoolStandChanges)()
            : previewLaptopChanges(root || '');
        const changes = raw.map((c) => toChange(c.path, c.kind, 'when' in c ? c.when : stampForRepoPath(c.path, root)));
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
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Änderungen nicht lesbar.';
        return { ...status, available: false, reason: 'error', hint: message, explanation: message, changes: [], summary: message };
    }
}
function parseScriptOutput(stdout, stderr) {
    const text = `${stdout}\n${stderr}`.trim();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const statusLine = [...lines].reverse().find((l) => l.startsWith('JM_STATUS=')) || '';
    const status = statusLine.replace('JM_STATUS=', '').trim();
    const message = [...lines].reverse().find((l) => l && !l.startsWith('JM_STATUS=')) ||
        'Fertig.';
    if (status === 'nothing') {
        return { ok: true, committed: false, pushed: false, message };
    }
    if (status === 'ok') {
        return { ok: true, committed: true, pushed: true, message };
    }
    return { ok: false, committed: false, pushed: false, message };
}
async function runLaptopGitBackup(root) {
    const { stdout, stderr } = await execFileAsync('bash', [scriptPath(root)], {
        cwd: root,
        timeout: 240000,
        env: {
            ...process.env,
            GIT_TERMINAL_PROMPT: '0',
            GIT_OPTIONAL_LOCKS: '0',
        },
    });
    return parseScriptOutput(String(stdout || ''), String(stderr || ''));
}
async function runTeacherGitBackup() {
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
        if (root && fs_1.default.existsSync(scriptPath(root))) {
            try {
                const changes = previewLaptopChanges(root);
                const result = await runLaptopGitBackup(root);
                return {
                    ...result,
                    changes,
                    where: 'laptop',
                    explanation: 'Stand von diesem Laptop nach GitHub.',
                };
            }
            catch (err) {
                const e = err;
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
        const school = await (0, teacherGitHubApi_1.pushSchoolStandToGithub)();
        return {
            ...school,
            where: 'school',
            explanation: 'Stand von der Schule nach GitHub.',
            changes: (school.changes || []).map((c) => toChange(c.path, c.kind, c.when)),
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Push fehlgeschlagen.';
        const friendly = /Bad credentials|401/i.test(message)
            ? 'GitHub hat den Zugang abgelehnt. Token auf der Schule neu setzen.'
            : /rate limit/i.test(message)
                ? 'GitHub bremst gerade — in ein paar Minuten nochmal.'
                : message;
        return { ok: false, committed: false, pushed: false, message: friendly };
    }
    finally {
        running = false;
    }
}
//# sourceMappingURL=teacherGitBackup.js.map