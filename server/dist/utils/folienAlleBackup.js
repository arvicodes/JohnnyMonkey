"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOLIEN_ALLE_BACKUP_DIR_NAME = void 0;
exports.ensureFolienAlleBackupDir = ensureFolienAlleBackupDir;
exports.sanitizeBackupFilePart = sanitizeBackupFilePart;
exports.writeFolienAlleBackupFile = writeFolienAlleBackupFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/** Zentraler Sammelordner unter J-M-Reihen für Präsentations- und Karteikarten-Sicherheitskopien */
exports.FOLIEN_ALLE_BACKUP_DIR_NAME = 'Folien - ALLE - BACKUP';
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
/** Absoluter Pfad zu `J-M-Reihen/Folien - ALLE - BACKUP` (Ordner wird angelegt). */
function ensureFolienAlleBackupDir() {
    const dir = path_1.default.join(jmReihenRoot(), exports.FOLIEN_ALLE_BACKUP_DIR_NAME);
    fs_1.default.mkdirSync(dir, { recursive: true });
    return dir;
}
/** Dateinamen-sichere Variante eines Pfads/Titels (ohne Extension). */
function sanitizeBackupFilePart(raw, maxLen = 120) {
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
        return 'unbekannt';
    return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}
function writeFolienAlleBackupFile(fileName, content) {
    try {
        const dir = ensureFolienAlleBackupDir();
        const safeName = fileName.replace(/[<>:"|?*\u0000-\u001f]/g, '-');
        const full = path_1.default.join(dir, safeName);
        fs_1.default.writeFileSync(full, content);
        return full;
    }
    catch (e) {
        console.warn('Folien-ALLE-BACKUP write failed:', fileName, e);
        return null;
    }
}
//# sourceMappingURL=folienAlleBackup.js.map