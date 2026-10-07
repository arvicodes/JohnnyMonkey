"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_LIBRARY_WHITE_BG_VERSION = exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX = void 0;
exports.canonicalExamLibraryIconKey = canonicalExamLibraryIconKey;
exports.readTeacherExamLibraryIcons = readTeacherExamLibraryIcons;
exports.readTeacherExamLibraryWhiteBgVersion = readTeacherExamLibraryWhiteBgVersion;
exports.readTeacherExamLibraryIconTemplate = readTeacherExamLibraryIconTemplate;
exports.saveTeacherExamLibraryIconTemplate = saveTeacherExamLibraryIconTemplate;
exports.setTeacherExamLibraryWhiteBgVersion = setTeacherExamLibraryWhiteBgVersion;
exports.overwriteTeacherExamLibraryIconAsset = overwriteTeacherExamLibraryIconAsset;
exports.setTeacherExamLibraryIcon = setTeacherExamLibraryIcon;
exports.saveTeacherExamLibraryIconFromUpload = saveTeacherExamLibraryIconFromUpload;
exports.migrateTeacherExamLibraryIconKey = migrateTeacherExamLibraryIconKey;
exports.listTeacherExamLibraryCustomIconChoices = listTeacherExamLibraryCustomIconChoices;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const imageToJpeg_1 = require("../utils/imageToJpeg");
const storageManager_1 = require("../utils/storageManager");
exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX = 'img:';
exports.EXAM_LIBRARY_WHITE_BG_VERSION = 2;
/** Gleicher Schlüssel wie im Client (git-intern ↔ J-M-Reihen). */
function canonicalExamLibraryIconKey(filePath) {
    let p = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
    if (p.startsWith('git-intern/')) {
        p = p.slice('git-intern/'.length);
    }
    else if (p.startsWith('/git-intern/')) {
        p = p.slice('/git-intern/'.length);
    }
    else if (p.startsWith('J-M-Reihen/')) {
        p = p.slice('J-M-Reihen/'.length);
    }
    return p.toLowerCase();
}
function iconsFileAbsolute(teacherFolderKey) {
    const rel = path_1.default.join('_Meta', 'Pruefungs-Icons', `${teacherFolderKey}.json`);
    return storageManager_1.StorageManager.resolveGitInternRelativePath(rel);
}
function readTeacherExamLibraryIcons(teacherFolderKey) {
    return readTeacherExamLibraryIconsDocument(teacherFolderKey).icons;
}
function readTeacherExamLibraryWhiteBgVersion(teacherFolderKey) {
    return readTeacherExamLibraryIconsDocument(teacherFolderKey).whiteBgVersion;
}
function examTypeFromBasename(fileName) {
    const n = String(fileName || '').trim();
    if (/^KA_/i.test(n))
        return 'KA';
    if (/^KU_/i.test(n))
        return 'KU';
    if (/^HU_/i.test(n) || /^HÜ_/i.test(n))
        return 'HU';
    if (/^QZ_/i.test(n))
        return 'QZ';
    return '';
}
function readTeacherExamLibraryIconsDocument(teacherFolderKey) {
    const fp = iconsFileAbsolute(teacherFolderKey);
    if (!fs_1.default.existsSync(fp))
        return { icons: {}, whiteBgVersion: 0, iconTemplate: null };
    try {
        const parsed = JSON.parse(fs_1.default.readFileSync(fp, 'utf8'));
        const whiteBgVersion = typeof parsed.whiteBgVersion === 'number' && Number.isFinite(parsed.whiteBgVersion)
            ? parsed.whiteBgVersion
            : 0;
        let iconTemplate = null;
        if (parsed.iconTemplate && typeof parsed.iconTemplate === 'object') {
            const t = parsed.iconTemplate;
            if (t.icons && typeof t.icons === 'object' && typeof t.savedAt === 'string') {
                iconTemplate = {
                    savedAt: t.savedAt,
                    icons: Object.fromEntries(Object.entries(t.icons).filter(([, v]) => typeof v === 'string' && v.trim())),
                    byExamType: t.byExamType && typeof t.byExamType === 'object'
                        ? Object.fromEntries(Object.entries(t.byExamType).filter(([, v]) => typeof v === 'string' && v.trim()))
                        : {},
                };
            }
        }
        if (!parsed.icons || typeof parsed.icons !== 'object') {
            return { icons: {}, whiteBgVersion, iconTemplate };
        }
        const out = {};
        for (const [k, v] of Object.entries(parsed.icons)) {
            if (typeof v === 'string' && v.trim())
                out[k] = v.trim();
        }
        return { icons: out, whiteBgVersion, iconTemplate };
    }
    catch {
        return { icons: {}, whiteBgVersion: 0, iconTemplate: null };
    }
}
function readTeacherExamLibraryIconTemplate(teacherFolderKey) {
    return readTeacherExamLibraryIconsDocument(teacherFolderKey).iconTemplate;
}
function writeTeacherExamLibraryIcons(teacherFolderKey, icons, opts) {
    var _a;
    const fp = iconsFileAbsolute(teacherFolderKey);
    fs_1.default.mkdirSync(path_1.default.dirname(fp), { recursive: true });
    const prev = readTeacherExamLibraryIconsDocument(teacherFolderKey);
    const payload = {
        icons,
        updatedAt: new Date().toISOString(),
        whiteBgVersion: (_a = opts === null || opts === void 0 ? void 0 : opts.whiteBgVersion) !== null && _a !== void 0 ? _a : prev.whiteBgVersion,
    };
    const template = opts && 'iconTemplate' in opts ? opts.iconTemplate : prev.iconTemplate;
    if (template)
        payload.iconTemplate = template;
    fs_1.default.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
}
function cloneIconValueToVorlage(teacherFolderKey, examKey, iconValue) {
    const trimmed = iconValue.trim();
    if (!trimmed.startsWith(exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX))
        return trimmed;
    const assetGitPath = trimmed.slice(exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX.length);
    const { abs: srcAbs } = assertTeacherExamLibraryAssetPath(teacherFolderKey, assetGitPath);
    const ext = path_1.default.extname(srcAbs).toLowerCase() || '.png';
    const safeStem = examKey
        .replace(/[^a-z0-9äöüß]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 96) || 'icon';
    const rel = path_1.default
        .join('_Meta', 'Pruefungs-Icons', '_vorlage', teacherFolderKey, `${safeStem}${ext}`)
        .replace(/\\/g, '/');
    const destAbs = storageManager_1.StorageManager.resolveGitInternRelativePath(rel);
    fs_1.default.mkdirSync(path_1.default.dirname(destAbs), { recursive: true });
    fs_1.default.copyFileSync(srcAbs, destAbs);
    return `${exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX}git-intern/${rel}`;
}
/** Aktuelle Icon-Zuordnungen als Vorlage (eigene Kopien unter _vorlage/). */
function saveTeacherExamLibraryIconTemplate(teacherFolderKey) {
    const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
    const templateIcons = {};
    const byExamType = {};
    for (const [examKey, iconVal] of Object.entries(doc.icons)) {
        const templVal = cloneIconValueToVorlage(teacherFolderKey, examKey, iconVal);
        templateIcons[examKey] = templVal;
        const base = examKey.split('/').pop() || examKey;
        const t = examTypeFromBasename(base);
        if (t)
            byExamType[t] = templVal;
    }
    const iconTemplate = {
        savedAt: new Date().toISOString(),
        icons: templateIcons,
        byExamType,
    };
    writeTeacherExamLibraryIcons(teacherFolderKey, doc.icons, { iconTemplate });
    return { icons: doc.icons, iconTemplate };
}
function setTeacherExamLibraryWhiteBgVersion(teacherFolderKey, version) {
    const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
    writeTeacherExamLibraryIcons(teacherFolderKey, doc.icons, { whiteBgVersion: version });
    return doc.icons;
}
function assertTeacherExamLibraryAssetPath(teacherFolderKey, assetGitPath) {
    let p = (assetGitPath || '').replace(/\\/g, '/').trim();
    if (p.startsWith('git-intern/'))
        p = p.slice('git-intern/'.length);
    const expectedSeg = `_Meta/Pruefungs-Icons/_assets/${teacherFolderKey}/`;
    if (!p.toLowerCase().includes(expectedSeg.toLowerCase())) {
        throw new Error('Ungültiger Icon-Dateipfad');
    }
    const abs = storageManager_1.StorageManager.resolveGitInternRelativePath(p);
    if (!abs || !fs_1.default.existsSync(abs)) {
        throw new Error('Icon-Datei nicht gefunden');
    }
    return { rel: p.replace(/\\/g, '/'), abs };
}
/** Ersetzt eine vorhandene Icon-Datei (PNG mit Alpha), aktualisiert ggf. .jpg → .png in der Map. */
async function overwriteTeacherExamLibraryIconAsset(teacherFolderKey, examIconKey, assetGitPath, uploadBuffer) {
    const { abs: oldAbs, rel: oldRel } = assertTeacherExamLibraryAssetPath(teacherFolderKey, assetGitPath);
    const extIn = path_1.default.extname(oldAbs).toLowerCase() || '.png';
    const tmpIn = path_1.default.join(os_1.default.tmpdir(), `exam-lib-ow-${Date.now()}-${Math.random().toString(36).slice(2)}${extIn}`);
    fs_1.default.writeFileSync(tmpIn, uploadBuffer);
    try {
        const { buffer } = await (0, imageToJpeg_1.readImageFileForServe)(tmpIn, 256);
        const dir = path_1.default.dirname(oldAbs);
        const base = path_1.default.basename(oldAbs, path_1.default.extname(oldAbs));
        const newAbs = path_1.default.join(dir, `${base}.png`);
        fs_1.default.mkdirSync(dir, { recursive: true });
        fs_1.default.writeFileSync(newAbs, buffer);
        if (newAbs !== oldAbs && fs_1.default.existsSync(oldAbs)) {
            try {
                fs_1.default.unlinkSync(oldAbs);
            }
            catch {
                /* ignore */
            }
        }
        const newRel = path_1.default.join(path_1.default.dirname(oldRel), `${base}.png`).replace(/\\/g, '/');
        const iconValue = `${exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX}git-intern/${newRel}`;
        const map = readTeacherExamLibraryIcons(teacherFolderKey);
        const key = examIconKey.trim().toLowerCase();
        if (map[key]) {
            map[key] = iconValue;
            writeTeacherExamLibraryIcons(teacherFolderKey, map);
        }
        return { icons: map, iconValue };
    }
    finally {
        try {
            if (fs_1.default.existsSync(tmpIn))
                fs_1.default.unlinkSync(tmpIn);
        }
        catch {
            /* ignore */
        }
    }
}
function setTeacherExamLibraryIcon(teacherFolderKey, examFilePath, emoji) {
    const map = readTeacherExamLibraryIcons(teacherFolderKey);
    const key = canonicalExamLibraryIconKey(examFilePath);
    const trimmed = typeof emoji === 'string' ? emoji.trim() : '';
    if (!trimmed) {
        delete map[key];
    }
    else {
        map[key] = trimmed;
    }
    writeTeacherExamLibraryIcons(teacherFolderKey, map);
    return map;
}
/** Bild hochladen, skaliert (max. 256 px), unter _Meta/…/_assets/<Lehrer>/ speichern. */
async function saveTeacherExamLibraryIconFromUpload(teacherFolderKey, examFilePath, uploadBuffer, originalName) {
    const extIn = path_1.default.extname(originalName || '').toLowerCase() || '.png';
    const tmpIn = path_1.default.join(os_1.default.tmpdir(), `exam-lib-icon-${Date.now()}-${Math.random().toString(36).slice(2)}${extIn}`);
    fs_1.default.writeFileSync(tmpIn, uploadBuffer);
    try {
        const { buffer, mimeType } = await (0, imageToJpeg_1.readImageFileForServe)(tmpIn, 256);
        const extOut = mimeType === 'image/png' ? '.png' : '.jpg';
        const fileName = `exam-icon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extOut}`;
        const rel = path_1.default
            .join('_Meta', 'Pruefungs-Icons', '_assets', teacherFolderKey, fileName)
            .replace(/\\/g, '/');
        const abs = storageManager_1.StorageManager.resolveGitInternRelativePath(rel);
        fs_1.default.mkdirSync(path_1.default.dirname(abs), { recursive: true });
        fs_1.default.writeFileSync(abs, buffer);
        const iconValue = `${exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX}git-intern/${rel}`;
        const icons = setTeacherExamLibraryIcon(teacherFolderKey, examFilePath, iconValue);
        return { icons, iconValue };
    }
    finally {
        try {
            if (fs_1.default.existsSync(tmpIn))
                fs_1.default.unlinkSync(tmpIn);
        }
        catch {
            /* ignore */
        }
    }
}
function migrateTeacherExamLibraryIconKey(teacherFolderKey, oldExamPath, newExamPath) {
    const map = readTeacherExamLibraryIcons(teacherFolderKey);
    const oldKey = canonicalExamLibraryIconKey(oldExamPath);
    const newKey = canonicalExamLibraryIconKey(newExamPath);
    if (oldKey === newKey || !map[oldKey])
        return;
    map[newKey] = map[oldKey];
    delete map[oldKey];
    writeTeacherExamLibraryIcons(teacherFolderKey, map);
}
function labelFromExamLibraryPath(examPath) {
    const file = examPath.split('/').pop() || 'Icon';
    return file.replace(/\.html?$/i, '').replace(/^((ka|ku|hu|hü|qz)_)/i, '').trim() || file;
}
function resolveTeacherExamLibraryIconImageAbs(teacherFolderKey, iconValue) {
    if (!iconValue.startsWith(exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX))
        return null;
    let p = iconValue.slice(exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX.length).replace(/\\/g, '/').trim();
    if (p.startsWith('git-intern/'))
        p = p.slice('git-intern/'.length);
    const allowedPrefixes = [
        `_Meta/Pruefungs-Icons/_assets/${teacherFolderKey}/`,
        `_Meta/Pruefungs-Icons/_vorlage/${teacherFolderKey}/`,
    ];
    const pl = p.toLowerCase();
    if (!allowedPrefixes.some((seg) => pl.includes(seg.toLowerCase())))
        return null;
    const abs = storageManager_1.StorageManager.resolveGitInternRelativePath(p);
    return abs && fs_1.default.existsSync(abs) ? abs : null;
}
/** Eigene Icons für die Auswahlliste — identische Bilddateien nur einmal (MD5). */
function listTeacherExamLibraryCustomIconChoices(teacherFolderKey) {
    var _a, _b, _c, _d, _e;
    const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
    const examPathKeys = new Set([
        ...Object.keys(doc.icons),
        ...Object.keys((_b = (_a = doc.iconTemplate) === null || _a === void 0 ? void 0 : _a.icons) !== null && _b !== void 0 ? _b : {}),
    ]);
    const byHash = new Map();
    for (const examPath of examPathKeys) {
        const key = examPath.toLowerCase();
        const value = (_e = (doc.icons[key] || ((_d = (_c = doc.iconTemplate) === null || _c === void 0 ? void 0 : _c.icons) === null || _d === void 0 ? void 0 : _d[key]))) === null || _e === void 0 ? void 0 : _e.trim();
        if (!(value === null || value === void 0 ? void 0 : value.startsWith(exports.EXAM_LIBRARY_ICON_IMAGE_PREFIX)))
            continue;
        const abs = resolveTeacherExamLibraryIconImageAbs(teacherFolderKey, value);
        if (!abs)
            continue;
        let hash;
        try {
            hash = crypto_1.default.createHash('md5').update(fs_1.default.readFileSync(abs)).digest('hex');
        }
        catch {
            continue;
        }
        const choice = {
            value,
            label: labelFromExamLibraryPath(examPath),
        };
        const prev = byHash.get(hash);
        if (!prev) {
            byHash.set(hash, choice);
            continue;
        }
        const preferAssets = value.includes('/_assets/') && !prev.value.includes('/_assets/');
        if (preferAssets)
            byHash.set(hash, choice);
    }
    return [...byHash.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
}
//# sourceMappingURL=examLibraryIconsStore.js.map