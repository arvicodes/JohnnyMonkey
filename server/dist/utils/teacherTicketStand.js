"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketsLatestPath = ticketsLatestPath;
exports.readTicketsLatest = readTicketsLatest;
exports.ticketsLatestSavedAtMs = ticketsLatestSavedAtMs;
exports.preferTicketsLatestFile = preferTicketsLatestFile;
exports.applyPulledTicketsFromFile = applyPulledTicketsFromFile;
exports.checkpointSqliteFile = checkpointSqliteFile;
exports.checkpointStandDatabases = checkpointStandDatabases;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const jmTeacherBackup_1 = require("./jmTeacherBackup");
const teacherScratchPadStore_1 = require("./teacherScratchPadStore");
function projectRoot() {
    const fromEnv = process.env.LOCAL_MATERIALS_PATH;
    if (fromEnv && fs_1.default.existsSync(fromEnv))
        return fromEnv;
    return path_1.default.resolve(__dirname, '../../..');
}
function jmReihenRoot() {
    if (process.env.JM_REIHEN_PATH && fs_1.default.existsSync(process.env.JM_REIHEN_PATH)) {
        return process.env.JM_REIHEN_PATH;
    }
    const base = process.env.LOCAL_MATERIALS_PATH;
    if (base) {
        const candidate = path_1.default.join(base, 'J-M-Reihen');
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    return path_1.default.join(projectRoot(), 'J-M-Reihen');
}
function ticketsLatestPath() {
    return path_1.default.join(jmReihenRoot(), jmTeacherBackup_1.JM_TEACHER_BACKUP_DIR.tickets, 'latest.json');
}
function readTicketsLatest() {
    try {
        const raw = fs_1.default.readFileSync(ticketsLatestPath(), 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.sets) || parsed.sets.length === 0)
            return null;
        return {
            sets: parsed.sets,
            savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
            teacherId: typeof parsed.teacherId === 'string' ? parsed.teacherId : undefined,
        };
    }
    catch {
        return null;
    }
}
function ticketsLatestSavedAtMs() {
    const pad = readTicketsLatest();
    const ms = Date.parse(String((pad === null || pad === void 0 ? void 0 : pad.savedAt) || ''));
    if (Number.isFinite(ms))
        return ms;
    try {
        return fs_1.default.statSync(ticketsLatestPath()).mtimeMs;
    }
    catch {
        return 0;
    }
}
function preferTicketsLatestFile() {
    return (0, teacherScratchPadStore_1.standPulledRecently)() || ticketsLatestSavedAtMs() > Date.now() - 24 * 60 * 60 * 1000;
}
function applyPulledTicketsFromFile() {
    const pad = readTicketsLatest();
    if (!pad)
        return null;
    const now = new Date().toISOString();
    const next = { ...pad, savedAt: now };
    const dest = ticketsLatestPath();
    fs_1.default.mkdirSync(path_1.default.dirname(dest), { recursive: true });
    fs_1.default.writeFileSync(dest, `${JSON.stringify(next, null, 2)}\n`);
    return next;
}
function checkpointSqliteFile(dbPath) {
    if (!dbPath || !fs_1.default.existsSync(dbPath))
        return;
    try {
        (0, child_process_1.execFileSync)('sqlite3', [dbPath, 'PRAGMA wal_checkpoint(TRUNCATE);'], {
            timeout: 12000,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    }
    catch {
        /* sqlite3 fehlt oder Datei gesperrt — Datei trotzdem weiterverwenden */
    }
}
function checkpointStandDatabases() {
    const candidates = [
        '/app/server/data/dev.db',
        path_1.default.join(projectRoot(), 'server/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'prisma/dev.db'),
    ];
    for (const file of candidates) {
        if (fs_1.default.existsSync(file))
            checkpointSqliteFile(file);
    }
}
//# sourceMappingURL=teacherTicketStand.js.map