"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupPresentationDeckToFolienAlle = backupPresentationDeckToFolienAlle;
exports.backupPresentationDeckBeforeOverwrite = backupPresentationDeckBeforeOverwrite;
exports.backupPresentationDeckAfterSave = backupPresentationDeckAfterSave;
exports.backupLessonToTeacherFolienFolder = backupLessonToTeacherFolienFolder;
exports.getCentralPresentationBackupRoot = getCentralPresentationBackupRoot;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const folienAlleBackup_1 = require("./folienAlleBackup");
const jmTeacherBackup_1 = require("./jmTeacherBackup");
const LOCAL_BACKUP_DIR = '.presentation-backups';
const CENTRAL_BACKUP_ROOT_NAME = 'Presentation-Sicherheitskopien';
const LOCAL_KEEP = 40;
const CENTRAL_KEEP = 80;
/** Mindestabstand zwischen Zeitstempel-Backups bei unverändertem Umfang */
const MIN_INTERVAL_MS = 30000;
const recentByPath = new Map();
function projectRoot() {
    const fromEnv = process.env.LOCAL_MATERIALS_PATH;
    if (fromEnv && fs_1.default.existsSync(fromEnv))
        return fromEnv;
    return path_1.default.resolve(__dirname, '../../..');
}
function centralBackupRoot() {
    return path_1.default.join(projectRoot(), CENTRAL_BACKUP_ROOT_NAME);
}
/**
 * Relativer Pfad unter J-M-Reihen, z.B.
 * "Informatik/MSS …/01.02 Orga"
 */
function lessonKeyFromDeckPath(deckFilePath) {
    const norm = deckFilePath.replace(/\\/g, '/');
    const marker = '/J-M-Reihen/';
    const idx = norm.indexOf(marker);
    let rel = idx >= 0 ? norm.slice(idx + marker.length) : path_1.default.basename(path_1.default.dirname(deckFilePath));
    rel = rel.replace(/\/Praesentation\.deck\.json$/i, '').replace(/\/$/, '');
    return rel || 'unbekannt';
}
function stampNow() {
    return new Date().toISOString().replace(/[:.]/g, '-');
}
function fileHash(buf) {
    return crypto_1.default.createHash('sha1').update(buf).digest('hex');
}
function pruneBackups(dir, keep) {
    if (!fs_1.default.existsSync(dir))
        return;
    const files = fs_1.default
        .readdirSync(dir)
        .filter((name) => /^deck-\d{4}-.+\.json$/i.test(name))
        .map((name) => ({ name, full: path_1.default.join(dir, name), mtime: fs_1.default.statSync(path_1.default.join(dir, name)).mtimeMs }))
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
function shouldWriteTimestampedBackup(deckFilePath, existingBuf, force) {
    if (force)
        return true;
    const hash = fileHash(existingBuf);
    const prev = recentByPath.get(deckFilePath);
    const now = Date.now();
    if (!prev)
        return true;
    if (prev.lastHash === hash && now - prev.lastAt < MIN_INTERVAL_MS)
        return false;
    return true;
}
function markBackup(deckFilePath, existingBuf) {
    recentByPath.set(deckFilePath, {
        lastAt: Date.now(),
        lastHash: fileHash(existingBuf),
    });
}
function folienAllePresentationFileName(deckFilePath) {
    const key = (0, folienAlleBackup_1.sanitizeBackupFilePart)(lessonKeyFromDeckPath(deckFilePath), 160);
    return `Praesentation__${key}.json`;
}
/**
 * Schreibt/aktualisiert die Sammel-Sicherheitskopie unter
 * `J-M-Reihen/Folien - ALLE - BACKUP/Praesentation__<Stundenpfad>.json`
 */
function backupPresentationDeckToFolienAlle(deckFilePath, content) {
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf8') : content;
    if (buf.length < 50)
        return null;
    const written = (0, folienAlleBackup_1.writeFolienAlleBackupFile)(folienAllePresentationFileName(deckFilePath), buf);
    if (written) {
        console.log('Folien-ALLE presentation backup:', written);
    }
    return written;
}
/**
 * Schreibt Sicherheitskopien:
 * 1) lokal neben der Präsentation: `.presentation-backups/`
 * 2) zentral im Projekt: `Presentation-Sicherheitskopien/<Stundenpfad>/`
 *    plus immer `latest.json` als schnellste Wiederherstellung.
 * 3) Sammelordner: `J-M-Reihen/Folien - ALLE - BACKUP/`
 */
function backupPresentationDeckBeforeOverwrite(deckFilePath, options) {
    if (!fs_1.default.existsSync(deckFilePath))
        return {};
    let existingBuf;
    try {
        existingBuf = fs_1.default.readFileSync(deckFilePath);
    }
    catch {
        return {};
    }
    // Keine leeren/kaputten Snapshots als "gute" Backups speichern
    if (existingBuf.length < 50)
        return {};
    const force = Boolean(options === null || options === void 0 ? void 0 : options.force);
    const writeStamp = shouldWriteTimestampedBackup(deckFilePath, existingBuf, force);
    const stamp = stampNow();
    const result = {};
    const lessonDir = path_1.default.dirname(deckFilePath);
    const localDir = path_1.default.join(lessonDir, LOCAL_BACKUP_DIR);
    const centralDir = path_1.default.join(centralBackupRoot(), lessonKeyFromDeckPath(deckFilePath));
    try {
        fs_1.default.mkdirSync(localDir, { recursive: true });
        fs_1.default.mkdirSync(centralDir, { recursive: true });
    }
    catch (e) {
        console.warn('Presentation backup dirs failed:', e);
        return {};
    }
    // latest.json immer aktualisieren (auch bei Throttle)
    try {
        const latestPath = path_1.default.join(centralDir, 'latest.json');
        fs_1.default.writeFileSync(latestPath, existingBuf);
        result.latest = latestPath;
    }
    catch (e) {
        console.warn('Presentation latest backup failed:', e);
    }
    // Sammelordner immer aktualisieren
    const folienAlle = backupPresentationDeckToFolienAlle(deckFilePath, existingBuf);
    if (folienAlle)
        result.folienAlle = folienAlle;
    if (writeStamp) {
        try {
            const localPath = path_1.default.join(localDir, `deck-${stamp}.json`);
            fs_1.default.writeFileSync(localPath, existingBuf);
            result.local = localPath;
            pruneBackups(localDir, LOCAL_KEEP);
        }
        catch (e) {
            console.warn('Local presentation backup failed:', e);
        }
        try {
            const centralPath = path_1.default.join(centralDir, `deck-${stamp}.json`);
            fs_1.default.writeFileSync(centralPath, existingBuf);
            result.central = centralPath;
            pruneBackups(centralDir, CENTRAL_KEEP);
        }
        catch (e) {
            console.warn('Central presentation backup failed:', e);
        }
        markBackup(deckFilePath, existingBuf);
        console.log('Presentation safety backup:', (options === null || options === void 0 ? void 0 : options.reason) || 'save', result.central || result.local || result.latest);
    }
    else {
        console.log('Presentation latest.json refreshed (timestamped backup throttled)');
    }
    return result;
}
/**
 * Nach erfolgreichem Speichern: aktuelle Version in den Sammelordner schreiben
 * (auch bei Erst-Erstellung, wenn noch kein vorheriges Backup existierte).
 */
function backupPresentationDeckAfterSave(deckFilePath, savedContent, options) {
    const folienAlle = backupPresentationDeckToFolienAlle(deckFilePath, savedContent);
    backupLessonToTeacherFolienFolder(deckFilePath, { force: options === null || options === void 0 ? void 0 : options.force, savedDeck: savedContent });
    return folienAlle;
}
/**
 * Zeitstempel-Kopie nach `J-M-Reihen/Backup - Folien/` (Deck + Annotationen, falls vorhanden).
 */
function backupLessonToTeacherFolienFolder(lessonFilePath, options) {
    const lessonDir = path_1.default.dirname(lessonFilePath);
    const deckPath = path_1.default.join(lessonDir, 'Praesentation.deck.json');
    let deckRaw = null;
    if (options === null || options === void 0 ? void 0 : options.savedDeck) {
        deckRaw =
            typeof options.savedDeck === 'string' ? Buffer.from(options.savedDeck, 'utf8') : options.savedDeck;
    }
    else if (fs_1.default.existsSync(deckPath)) {
        try {
            deckRaw = fs_1.default.readFileSync(deckPath);
        }
        catch {
            deckRaw = null;
        }
    }
    if (!deckRaw || deckRaw.length < 50)
        return null;
    let annotations = null;
    const annPath = path_1.default.join(lessonDir, 'Praesentation.annotations.json');
    if (fs_1.default.existsSync(annPath)) {
        try {
            annotations = JSON.parse(fs_1.default.readFileSync(annPath, 'utf8'));
        }
        catch {
            annotations = null;
        }
    }
    let deck = null;
    try {
        deck = JSON.parse(deckRaw.toString('utf8'));
    }
    catch {
        return null;
    }
    const lesson = lessonKeyFromDeckPath(deckPath);
    return (0, jmTeacherBackup_1.writeTeacherTimestampedBackup)({
        kind: 'slides',
        label: lesson,
        payload: {
            kind: 'folien',
            lesson,
            savedAt: new Date().toISOString(),
            deck,
            annotations,
        },
        force: Boolean(options === null || options === void 0 ? void 0 : options.force),
    });
}
function getCentralPresentationBackupRoot() {
    return centralBackupRoot();
}
//# sourceMappingURL=presentationDeckBackup.js.map