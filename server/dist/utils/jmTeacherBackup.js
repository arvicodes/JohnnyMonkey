"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JM_TEACHER_BACKUP_DIR = void 0;
exports.sanitizeBackupLabel = sanitizeBackupLabel;
exports.ensureTeacherBackupDir = ensureTeacherBackupDir;
exports.ensureTeacherBackupRoots = ensureTeacherBackupRoots;
exports.writeTeacherTimestampedBackup = writeTeacherTimestampedBackup;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Von der Lehrerin angelegte Sammelordner unter J-M-Reihen. */
exports.JM_TEACHER_BACKUP_DIR = {
    notes: 'Backup - Notizen',
    slides: 'Backup - Folien',
    tickets: 'Backup - Tickets',
};
const FILE_PREFIX = {
    notes: 'notizen',
    slides: 'folien',
    tickets: 'tickets',
};
const KEEP = {
    notes: 250,
    slides: 120,
    tickets: 200,
};
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
function sanitizeBackupLabel(raw, maxLen = 80) {
    const cleaned = String(raw || '')
        .normalize('NFC')
        .trim()
        .replace(/[\\/]+/g, '__')
        .replace(/[<>:"|?*\u0000-\u001f]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/_+/g, '_')
        .replace(/^[-_.]+|[-_.]+$/g, '');
    if (!cleaned)
        return 'stand';
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}
function localStampParts(d = new Date()) {
    return {
        time: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
        date: `${d.getDate()}.${d.getMonth() + 1}`,
    };
}
function isKindBackupFile(name, kind) {
    if (!name.endsWith('.json'))
        return false;
    const prefix = FILE_PREFIX[kind];
    return name.includes(`_${prefix}_`) || name.startsWith(`${prefix}_`);
}
function uniqueBackupName(dir, kind, label, d = new Date()) {
    const { time, date } = localStampParts(d);
    const prefix = FILE_PREFIX[kind];
    const base = `${time}_${date}_${prefix}_${label}.json`;
    if (!fs_1.default.existsSync(path_1.default.join(dir, base)))
        return base;
    const withSeconds = `${time}:${String(d.getSeconds()).padStart(2, '0')}_${date}_${prefix}_${label}.json`;
    if (!fs_1.default.existsSync(path_1.default.join(dir, withSeconds)))
        return withSeconds;
    let n = 2;
    while (fs_1.default.existsSync(path_1.default.join(dir, `${time}_${date}_${prefix}_${label}-${n}.json`)))
        n += 1;
    return `${time}_${date}_${prefix}_${label}-${n}.json`;
}
function pruneKind(dir, kind, keep) {
    if (!fs_1.default.existsSync(dir))
        return;
    const files = fs_1.default
        .readdirSync(dir)
        .filter((name) => isKindBackupFile(name, kind))
        .map((name) => {
        const full = path_1.default.join(dir, name);
        return { full, mtime: fs_1.default.statSync(full).mtimeMs };
    })
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
function ensureTeacherBackupDir(kind) {
    const dir = path_1.default.join(jmReihenRoot(), exports.JM_TEACHER_BACKUP_DIR[kind]);
    fs_1.default.mkdirSync(dir, { recursive: true });
    const readme = path_1.default.join(dir, 'README.txt');
    if (!fs_1.default.existsSync(readme)) {
        const titles = {
            notes: 'Lehrer-Schnellnotizen (gelb N)',
            slides: 'Präsentationen (Deck + Annotationen)',
            tickets: 'Entry-Ticket-Fragensets',
        };
        fs_1.default.writeFileSync(readme, `Zeitstempel-Kopien: ${titles[kind]}.\n` +
            'Dateiname: Uhrzeit_Datum_Art_Thema.json (z. B. 9:25_29.8_folien_…).\n' +
            'Neue Datei nur bei ⌘S oder dem Sicherungsbutton. Der aktuelle Stand wird trotzdem immer gespeichert.\n', 'utf8');
    }
    return dir;
}
function ensureTeacherBackupRoots() {
    return Object.keys(exports.JM_TEACHER_BACKUP_DIR).map((kind) => ensureTeacherBackupDir(kind));
}
function writeTeacherTimestampedBackup(opts) {
    try {
        if (!opts.force)
            return null;
        const dir = ensureTeacherBackupDir(opts.kind);
        const json = typeof opts.payload === 'string'
            ? opts.payload
            : JSON.stringify(opts.payload, null, 2);
        const buf = Buffer.from(json, 'utf8');
        if (buf.length < 8)
            return null;
        const label = sanitizeBackupLabel(opts.label || FILE_PREFIX[opts.kind]);
        const name = uniqueBackupName(dir, opts.kind, label);
        const full = path_1.default.join(dir, name);
        fs_1.default.writeFileSync(full, buf);
        pruneKind(dir, opts.kind, KEEP[opts.kind]);
        return full;
    }
    catch (e) {
        console.warn('Lehrer-Backup fehlgeschlagen:', opts.kind, e);
        return null;
    }
}
//# sourceMappingURL=jmTeacherBackup.js.map