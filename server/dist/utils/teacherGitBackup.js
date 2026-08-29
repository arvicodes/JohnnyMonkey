"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGitRoot = findGitRoot;
exports.getTeacherGitBackupStatus = getTeacherGitBackupStatus;
exports.runTeacherGitBackup = runTeacherGitBackup;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const teacherGitHubApi_1 = require("./teacherGitHubApi");
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
                return await runLaptopGitBackup(root);
            }
            catch (err) {
                const e = err;
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
        return await (0, teacherGitHubApi_1.pushSchoolStandToGithub)();
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