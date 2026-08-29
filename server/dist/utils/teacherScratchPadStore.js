"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCRATCH_PAD_DB_PATH = exports.SCRATCH_PAD_BACKUP_ROOT_NAME = exports.SCRATCH_PAD_LIVE_DIR_NAME = void 0;
exports.sanitizeScratchPadFolderPart = sanitizeScratchPadFolderPart;
exports.scratchPadUserFolderKey = scratchPadUserFolderKey;
exports.ensureScratchPadLiveDir = ensureScratchPadLiveDir;
exports.ensureScratchPadBackupDir = ensureScratchPadBackupDir;
exports.ensureScratchPadRoots = ensureScratchPadRoots;
exports.scratchPadContentLen = scratchPadContentLen;
exports.wouldWipeScratchPad = wouldWipeScratchPad;
exports.scratchPadRawLen = scratchPadRawLen;
exports.wouldShrinkScratchPad = wouldShrinkScratchPad;
exports.standPulledMarkerPath = standPulledMarkerPath;
exports.markStandPulled = markStandPulled;
exports.standPulledAtMs = standPulledAtMs;
exports.standPulledRecently = standPulledRecently;
exports.applyPulledScratchPadFiles = applyPulledScratchPadFiles;
exports.writePulledScratchPadsToDb = writePulledScratchPadsToDb;
exports.readScratchPadLive = readScratchPadLive;
exports.writeScratchPad = writeScratchPad;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const jmTeacherBackup_1 = require("./jmTeacherBackup");
/** Aktueller Stand der Lehrer-Schnellnotizen (pro Lehrkraft). */
exports.SCRATCH_PAD_LIVE_DIR_NAME = 'Lehrer-Schnellnotizen';
/** Separater Ordner für regelmäßige Sicherheitskopien (Projektwurzel). */
exports.SCRATCH_PAD_BACKUP_ROOT_NAME = 'Notizen-Sicherheitskopien';
/** DB-Schlüssel in TeacherLessonInstruction.lessonPath (pro Lehrkraft). */
exports.SCRATCH_PAD_DB_PATH = '__teacher_scratch_pad__';
const BACKUP_KEEP = 60;
const MIN_BACKUP_INTERVAL_MS = 60000;
const recentByUser = new Map();
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
function sanitizeScratchPadFolderPart(raw, maxLen = 80) {
    const cleaned = String(raw || '')
        .normalize('NFC')
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/[<>:"|?*\u0000-\u001f]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, '');
    if (!cleaned)
        return 'lehrer';
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}
function scratchPadUserFolderKey(userId, userName) {
    const idShort = String(userId || 'unknown')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 12);
    const name = sanitizeScratchPadFolderPart(userName || 'lehrer', 48);
    return `${name}_${idShort || 'x'}`;
}
/** Live-Ordner: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/` */
function ensureScratchPadLiveDir(userKey) {
    const dir = path_1.default.join(jmReihenRoot(), exports.SCRATCH_PAD_LIVE_DIR_NAME, userKey);
    fs_1.default.mkdirSync(dir, { recursive: true });
    return dir;
}
/** Backup-Ordner: `Notizen-Sicherheitskopien/<user>/` */
function ensureScratchPadBackupDir(userKey) {
    const root = path_1.default.join(projectRoot(), exports.SCRATCH_PAD_BACKUP_ROOT_NAME);
    fs_1.default.mkdirSync(root, { recursive: true });
    const dir = path_1.default.join(root, userKey);
    fs_1.default.mkdirSync(dir, { recursive: true });
    return dir;
}
/** Legt beide Wurzelordner an (auch ohne User), damit sie im Dateisystem sichtbar sind. */
function ensureScratchPadRoots() {
    const liveRoot = path_1.default.join(jmReihenRoot(), exports.SCRATCH_PAD_LIVE_DIR_NAME);
    const backupRoot = path_1.default.join(projectRoot(), exports.SCRATCH_PAD_BACKUP_ROOT_NAME);
    fs_1.default.mkdirSync(liveRoot, { recursive: true });
    fs_1.default.mkdirSync(backupRoot, { recursive: true });
    const readmeLive = path_1.default.join(liveRoot, 'README.txt');
    const readmeBackup = path_1.default.join(backupRoot, 'README.txt');
    if (!fs_1.default.existsSync(readmeLive)) {
        fs_1.default.writeFileSync(readmeLive, 'Aktueller Stand der Lehrer-Schnellnotizen (gelb N).\n' +
            'Pro Lehrkraft: <Name_ID>/latest.json\n' +
            'Wird automatisch beim Speichern aktualisiert.\n', 'utf8');
    }
    if (!fs_1.default.existsSync(readmeBackup)) {
        fs_1.default.writeFileSync(readmeBackup, 'Regelmäßige Sicherheitskopien der Lehrer-Schnellnotizen.\n' +
            'Pro Lehrkraft: <Name_ID>/latest.json + pad-<Zeitstempel>.json\n' +
            'Ältere Kopien werden automatisch begrenzt.\n', 'utf8');
    }
    return { liveRoot, backupRoot };
}
function stampNow() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
function fileHash(buf) {
    return crypto_1.default.createHash('sha1').update(buf).digest('hex');
}
function pruneTimestampedBackups(dir, keep) {
    if (!fs_1.default.existsSync(dir))
        return;
    const files = fs_1.default
        .readdirSync(dir)
        .filter((name) => /^pad-\d{4}-.+\.json$/i.test(name))
        .map((name) => ({
        name,
        full: path_1.default.join(dir, name),
        mtime: fs_1.default.statSync(path_1.default.join(dir, name)).mtimeMs,
    }))
        .sort((a, b) => a.mtime - b.mtime);
    while (files.length > keep) {
        const oldest = files.shift();
        if (!oldest)
            break;
        try {
            fs_1.default.unlinkSync(oldest.full);
        }
        catch {
            /* ignore */
        }
    }
}
function shouldWriteTimestampedBackup(userKey, buf) {
    const hash = fileHash(buf);
    const prev = recentByUser.get(userKey);
    const now = Date.now();
    if (!prev)
        return true;
    if (prev.lastHash === hash && now - prev.lastAt < MIN_BACKUP_INTERVAL_MS)
        return false;
    if (now - prev.lastAt < MIN_BACKUP_INTERVAL_MS && prev.lastHash === hash)
        return false;
    // Bei inhaltlicher Änderung: höchstens alle MIN_INTERVAL eine Stempel-Datei,
    // latest.json wird trotzdem immer geschrieben.
    if (now - prev.lastAt < MIN_BACKUP_INTERVAL_MS)
        return false;
    return true;
}
function markBackup(userKey, buf) {
    recentByUser.set(userKey, { lastAt: Date.now(), lastHash: fileHash(buf) });
}
function stripHtmlLite(html) {
    return String(html || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/** Sichtbare Text-/Tintenmenge — zum Schutz vor versehentlichem Leerlauf-Überschreiben. */
function scratchPadContentLen(payload) {
    if (!payload || !Array.isArray(payload.pages))
        return 0;
    return payload.pages.reduce((n, raw) => {
        const p = raw;
        const text = typeof p.text === 'string' ? stripHtmlLite(p.text) : '';
        const ink = Array.isArray(p.ink) ? p.ink.length : 0;
        return n + text.length + ink;
    }, 0);
}
function wouldWipeScratchPad(existing, incoming) {
    return scratchPadContentLen(existing) >= 40 && scratchPadContentLen(incoming) < 12;
}
/** Rohe Textmenge (HTML), damit ein älterer Tab einen längeren Schulstand nicht zurückschreibt. */
function scratchPadRawLen(payload) {
    if (!payload || !Array.isArray(payload.pages))
        return 0;
    return payload.pages.reduce((n, raw) => {
        const p = raw;
        const text = typeof p.text === 'string' ? p.text.length : 0;
        const ink = Array.isArray(p.ink) ? p.ink.length : 0;
        return n + text + ink;
    }, 0);
}
function wouldShrinkScratchPad(existing, incoming) {
    const prev = scratchPadRawLen(existing);
    const next = scratchPadRawLen(incoming);
    return prev >= 400 && next + 200 < prev;
}
function standPulledMarkerPath() {
    if (fs_1.default.existsSync('/app/server/data'))
        return path_1.default.join('/app/server/data', '.jm-stand-pulled-at');
    return path_1.default.join(projectRoot(), '.jm-stand-pulled-at');
}
function markStandPulled(at = new Date()) {
    const dest = standPulledMarkerPath();
    fs_1.default.mkdirSync(path_1.default.dirname(dest), { recursive: true });
    fs_1.default.writeFileSync(dest, at.toISOString(), 'utf8');
}
function standPulledAtMs() {
    try {
        const ms = Date.parse(fs_1.default.readFileSync(standPulledMarkerPath(), 'utf8').trim());
        return Number.isFinite(ms) ? ms : 0;
    }
    catch {
        return 0;
    }
}
function standPulledRecently(maxAgeMs = 6 * 60 * 60 * 1000) {
    const at = standPulledAtMs();
    if (!at)
        return false;
    const age = Date.now() - at;
    return age >= 0 && age < maxAgeMs;
}
/** Nach Git-Holen: Dateien sind die Wahrheit. Zeitstempel nach vorne, damit alte Tabs nicht gewinnen. */
function applyPulledScratchPadFiles() {
    const now = new Date().toISOString();
    const liveRoot = path_1.default.join(jmReihenRoot(), exports.SCRATCH_PAD_LIVE_DIR_NAME);
    const applied = [];
    if (!fs_1.default.existsSync(liveRoot)) {
        markStandPulled();
        return applied;
    }
    for (const name of fs_1.default.readdirSync(liveRoot)) {
        const latest = path_1.default.join(liveRoot, name, 'latest.json');
        if (!fs_1.default.existsSync(latest) || !fs_1.default.statSync(latest).isFile())
            continue;
        try {
            const parsed = JSON.parse(fs_1.default.readFileSync(latest, 'utf8'));
            if (!parsed || !Array.isArray(parsed.pages))
                continue;
            const teacherId = String(parsed.userId || '').trim();
            const payload = {
                ...parsed,
                updatedAt: now,
                savedAt: now,
            };
            const json = JSON.stringify(payload, null, 2);
            fs_1.default.writeFileSync(latest, json);
            const backupDir = ensureScratchPadBackupDir(name);
            fs_1.default.writeFileSync(path_1.default.join(backupDir, 'latest.json'), json);
            if (teacherId)
                applied.push({ teacherId, payload, userKey: name });
        }
        catch (e) {
            console.warn('applyPulledScratchPadFiles failed:', name, e);
        }
    }
    markStandPulled();
    return applied;
}
function resolveScratchPadDbFile() {
    const fromEnv = String(process.env.DATABASE_URL || '').trim();
    const envFile = fromEnv.startsWith('file:') ? fromEnv.slice(5) : '';
    const candidates = [
        '/app/server/data/dev.db',
        envFile && path_1.default.isAbsolute(envFile) ? envFile : '',
        envFile ? path_1.default.resolve(process.cwd(), envFile) : '',
        path_1.default.join(projectRoot(), 'server/prisma/dev.db'),
        path_1.default.resolve(process.cwd(), 'prisma/dev.db'),
    ].filter(Boolean);
    for (const file of candidates) {
        if (fs_1.default.existsSync(file))
            return file;
    }
    return path_1.default.join(projectRoot(), 'server/prisma/dev.db');
}
async function writePulledScratchPadsToDb(pads) {
    if (!pads.length)
        return;
    const dbFile = resolveScratchPadDbFile();
    for (const extra of ['-wal', '-shm', '-journal']) {
        try {
            fs_1.default.unlinkSync(`${dbFile}${extra}`);
        }
        catch {
            /* ok */
        }
    }
    const url = `file:${dbFile}`;
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
        const prisma = new client_1.PrismaClient({ datasources: { db: { url } } });
        try {
            for (const { teacherId, payload } of pads) {
                await prisma.teacherLessonInstruction.upsert({
                    where: { teacherId_lessonPath: { teacherId, lessonPath: exports.SCRATCH_PAD_DB_PATH } },
                    create: {
                        teacherId,
                        lessonPath: exports.SCRATCH_PAD_DB_PATH,
                        content: JSON.stringify(payload),
                    },
                    update: { content: JSON.stringify(payload) },
                });
            }
            return;
        }
        catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
        finally {
            await prisma.$disconnect().catch(() => undefined);
        }
    }
    console.warn('writePulledScratchPadsToDb failed:', lastErr);
}
function readScratchPadLive(userKey) {
    try {
        const livePath = path_1.default.join(ensureScratchPadLiveDir(userKey), 'latest.json');
        if (!fs_1.default.existsSync(livePath))
            return null;
        const raw = fs_1.default.readFileSync(livePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.pages))
            return null;
        return parsed;
    }
    catch (e) {
        console.warn('Scratch pad read failed:', userKey, e);
        return null;
    }
}
/**
 * Speichert den aktuellen Stand und schreibt Sicherheitskopien.
 * - Live: `J-M-Reihen/Lehrer-Schnellnotizen/<user>/latest.json`
 * - Backup: `Notizen-Sicherheitskopien/<user>/latest.json` (+ zeitgestempelte Kopien)
 */
function writeScratchPad(userKey, payload, options) {
    ensureScratchPadRoots();
    const liveDir = ensureScratchPadLiveDir(userKey);
    const backupDir = ensureScratchPadBackupDir(userKey);
    const livePath = path_1.default.join(liveDir, 'latest.json');
    const existing = readScratchPadLive(userKey);
    if (wouldWipeScratchPad(existing, payload) || wouldShrinkScratchPad(existing, payload)) {
        console.warn('Scratch pad: refusing to overwrite substantial notes with near-empty payload', userKey);
        return {
            live: livePath,
            backupLatest: path_1.default.join(backupDir, 'latest.json'),
            backupStamp: null,
            teacherBackup: null,
        };
    }
    const body = {
        ...payload,
        savedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(body, null, 2);
    const buf = Buffer.from(json, 'utf8');
    const backupLatestPath = path_1.default.join(backupDir, 'latest.json');
    fs_1.default.writeFileSync(livePath, buf);
    fs_1.default.writeFileSync(backupLatestPath, buf);
    let backupStamp = null;
    const wantStamp = (options === null || options === void 0 ? void 0 : options.timestamped) !== false;
    if (wantStamp && ((options === null || options === void 0 ? void 0 : options.forceStamp) || shouldWriteTimestampedBackup(userKey, buf))) {
        backupStamp = path_1.default.join(backupDir, `pad-${stampNow()}.json`);
        fs_1.default.writeFileSync(backupStamp, buf);
        pruneTimestampedBackups(backupDir, BACKUP_KEEP);
        markBackup(userKey, buf);
    }
    else {
        // latest aktualisiert — Meta nur bei Stempel-Write setzen wäre falsch:
        // Hash merken, Intervall aber nicht künstlich verlängern ohne Stempel
        const prev = recentByUser.get(userKey);
        if (!prev)
            markBackup(userKey, buf);
        else
            recentByUser.set(userKey, { lastAt: prev.lastAt, lastHash: fileHash(buf) });
    }
    const teacherBackup = wantStamp
        ? (0, jmTeacherBackup_1.writeTeacherTimestampedBackup)({
            kind: 'notes',
            label: userKey,
            payload: body,
            force: Boolean(options === null || options === void 0 ? void 0 : options.forceStamp),
        })
        : null;
    return { live: livePath, backupLatest: backupLatestPath, backupStamp, teacherBackup };
}
//# sourceMappingURL=teacherScratchPadStore.js.map