"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveJmReihenRoot = resolveJmReihenRoot;
exports.sanitizeErasmusSegment = sanitizeErasmusSegment;
exports.erasmusTitelFromSiteName = erasmusTitelFromSiteName;
exports.buildErasmusFolderLabel = buildErasmusFolderLabel;
exports.applyErasmusFoldersToSitePayload = applyErasmusFoldersToSitePayload;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ERASMUS_ROOT = 'Erasmus';
const BILDER_SUB = 'Bilder';
const SITE_MARKER = '.story-site-id';
function resolveJmReihenRoot() {
    if (process.env.JM_REIHEN_PATH && fs_1.default.existsSync(process.env.JM_REIHEN_PATH)) {
        return process.env.JM_REIHEN_PATH;
    }
    const base = process.env.LOCAL_MATERIALS_PATH;
    if (base) {
        const candidate = path_1.default.join(base, 'J-M-Reihen');
        if (fs_1.default.existsSync(candidate))
            return candidate;
        const direct = path_1.default.join(base);
        if (fs_1.default.existsSync(direct) && fs_1.default.statSync(direct).isDirectory()) {
            const name = path_1.default.basename(direct);
            if (name === 'J-M-Reihen')
                return direct;
        }
    }
    const projectRoot = path_1.default.resolve(__dirname, '../../..');
    const fromProject = path_1.default.join(projectRoot, 'J-M-Reihen');
    if (fs_1.default.existsSync(fromProject))
        return fromProject;
    const serverPath = path_1.default.join(process.cwd(), 'J-M-Reihen');
    const parentPath = path_1.default.join(process.cwd(), '..', 'J-M-Reihen');
    if (fs_1.default.existsSync(serverPath))
        return serverPath;
    if (fs_1.default.existsSync(parentPath))
        return parentPath;
    return fromProject;
}
function sanitizeErasmusSegment(input) {
    return input
        .replace(/[\\/:*?"<>|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/** Nur der Titel-Teil vor dem ersten „ - “ (z. B. „Teaching Assignment - Kroatien …“ → Teaching Assignment). */
function erasmusTitelFromSiteName(name) {
    var _a;
    const trimmed = (name === null || name === void 0 ? void 0 : name.trim()) || 'Neue Website';
    const beforeDash = ((_a = trimmed.split(/\s*-\s*/)[0]) === null || _a === void 0 ? void 0 : _a.trim()) || trimmed;
    return sanitizeErasmusSegment(beforeDash);
}
/** Schema: „Jahr - Monat - Land - Titel“ */
function buildErasmusFolderLabel(site) {
    var _a, _b;
    const d = new Date(site.createdAt || Date.now());
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const land = sanitizeErasmusSegment(((_a = site.country) === null || _a === void 0 ? void 0 : _a.trim()) || 'Unbenannt');
    const titel = erasmusTitelFromSiteName((_b = site.name) !== null && _b !== void 0 ? _b : 'Neue Website');
    return `${year} - ${month} - ${land} - ${titel}`;
}
function readSiteMarker(folderPath) {
    const markerFile = path_1.default.join(folderPath, SITE_MARKER);
    if (!fs_1.default.existsSync(markerFile))
        return null;
    try {
        return fs_1.default.readFileSync(markerFile, 'utf8').trim() || null;
    }
    catch {
        return null;
    }
}
function writeSiteMarker(folderPath, siteId) {
    fs_1.default.writeFileSync(path_1.default.join(folderPath, SITE_MARKER), siteId, 'utf8');
}
function resolveUniqueRelativeFolder(jmRoot, relativeFolder, siteId) {
    let candidate = relativeFolder;
    let full = path_1.default.join(jmRoot, candidate);
    if (!fs_1.default.existsSync(full))
        return candidate;
    const owner = readSiteMarker(full);
    if (owner === siteId)
        return candidate;
    const suffix = siteId.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 8);
    candidate = `${relativeFolder} (${suffix})`;
    full = path_1.default.join(jmRoot, candidate);
    if (!fs_1.default.existsSync(full))
        return candidate;
    if (readSiteMarker(full) === siteId)
        return candidate;
    return `${relativeFolder} (${siteId.slice(0, 8)})`;
}
/**
 * Legt J-M-Reihen/Erasmus/{Jahr - Monat - Land - Titel}/Bilder an (oder benennt um).
 * Setzt erasmusFolder auf den relativen Pfad unter J-M-Reihen.
 */
function applyErasmusFoldersToSitePayload(raw) {
    const siteId = typeof raw.id === 'string' ? raw.id : '';
    const name = typeof raw.name === 'string' ? raw.name : 'Neue Website';
    const country = typeof raw.country === 'string' ? raw.country : '';
    const createdAt = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString();
    const existingRel = typeof raw.erasmusFolder === 'string' && raw.erasmusFolder.trim()
        ? raw.erasmusFolder.trim().replace(/\\/g, '/')
        : undefined;
    const jmRoot = resolveJmReihenRoot();
    if (!fs_1.default.existsSync(jmRoot)) {
        console.warn('Erasmus-Ordner: J-M-Reihen nicht gefunden:', jmRoot);
        return { payload: raw, folderCreated: false };
    }
    fs_1.default.mkdirSync(path_1.default.join(jmRoot, ERASMUS_ROOT), { recursive: true });
    const label = buildErasmusFolderLabel({ name, country, createdAt });
    let relativeFolder = `${ERASMUS_ROOT}/${label}`;
    relativeFolder = resolveUniqueRelativeFolder(jmRoot, relativeFolder, siteId);
    const newFull = path_1.default.join(jmRoot, relativeFolder);
    const bilderFull = path_1.default.join(newFull, BILDER_SUB);
    let folderCreated = false;
    if (existingRel && existingRel !== relativeFolder) {
        const oldFull = path_1.default.join(jmRoot, existingRel);
        if (fs_1.default.existsSync(oldFull) && readSiteMarker(oldFull) === siteId) {
            if (!fs_1.default.existsSync(newFull)) {
                fs_1.default.renameSync(oldFull, newFull);
                folderCreated = true;
            }
            else {
                fs_1.default.mkdirSync(bilderFull, { recursive: true });
            }
        }
    }
    if (!fs_1.default.existsSync(newFull)) {
        fs_1.default.mkdirSync(bilderFull, { recursive: true });
        folderCreated = true;
    }
    else {
        if (!fs_1.default.existsSync(bilderFull)) {
            fs_1.default.mkdirSync(bilderFull, { recursive: true });
            folderCreated = true;
        }
    }
    if (siteId)
        writeSiteMarker(newFull, siteId);
    const payload = {
        ...raw,
        erasmusFolder: relativeFolder,
        country,
    };
    return {
        payload,
        folderCreated,
        folderPath: `J-M-Reihen/${relativeFolder}/${BILDER_SUB}`,
    };
}
//# sourceMappingURL=erasmusSiteFolders.js.map