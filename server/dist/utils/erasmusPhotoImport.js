"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUserFolderPath = normalizeUserFolderPath;
exports.resolveSafeSourceRoot = resolveSafeSourceRoot;
exports.assertFileUnderRoot = assertFileUnderRoot;
exports.scanPhotoFolder = scanPhotoFolder;
exports.getErasmusBilderDir = getErasmusBilderDir;
exports.importPhotosToErasmus = importPhotosToErasmus;
exports.importPhotoBuffersToErasmus = importPhotoBuffersToErasmus;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const storyPageDate_1 = require("./storyPageDate");
const erasmusSiteFolders_1 = require("./erasmusSiteFolders");
const imageToJpeg_1 = require("./imageToJpeg");
const exifCaptureDate_1 = require("./exifCaptureDate");
const MEDIA_EXT = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.heic',
    '.heif',
    '.gif',
    '.tif',
    '.tiff',
    '.mov',
    '.mp4',
    '.m4v',
    '.qt',
]);
function isVideoExt(ext) {
    return ext === '.mov' || ext === '.mp4' || ext === '.m4v' || ext === '.qt';
}
/** Pfad aus Finder-Zwischenablage / manueller Eingabe bereinigen. */
function normalizeUserFolderPath(inputPath) {
    let s = inputPath.trim();
    if ((s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith('„') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1).trim();
    }
    try {
        s = decodeURIComponent(s);
    }
    catch {
        /* ignore */
    }
    const home = os_1.default.homedir() || process.env.HOME || '';
    if (s === '~' || s.startsWith('~/')) {
        s = path_1.default.join(home, s === '~' ? '' : s.slice(2));
    }
    else if (s.startsWith('~')) {
        s = path_1.default.join(home, s.slice(1));
    }
    if (!path_1.default.isAbsolute(s) && home) {
        s = path_1.default.resolve(home, s);
    }
    return path_1.default.resolve(s);
}
function resolveSafeSourceRoot(inputPath) {
    const resolved = normalizeUserFolderPath(inputPath);
    const candidates = [resolved, resolved.replace(/\/+$/, '')];
    let found = null;
    for (const c of candidates) {
        if (!c || !fs_1.default.existsSync(c))
            continue;
        const stat = fs_1.default.statSync(c);
        if (stat.isDirectory()) {
            found = fs_1.default.realpathSync(c);
            break;
        }
    }
    if (!found) {
        throw new Error(`Ordner nicht gefunden: „${resolved}“. ` +
            'Pfad aus dem Finder kopieren (Rechtsklick Ordner → ⌥+„Pfadname kopieren“) ' +
            'oder unten „Ordner auswählen“ nutzen — ohne manuellen Pfad.');
    }
    return found;
}
function assertFileUnderRoot(root, filePath) {
    const full = path_1.default.resolve(root, filePath);
    const rel = path_1.default.relative(root, full);
    if (rel.startsWith('..') || path_1.default.isAbsolute(rel)) {
        throw new Error('Ungültiger Dateipfad');
    }
    if (!fs_1.default.existsSync(full) || !fs_1.default.statSync(full).isFile()) {
        throw new Error(`Datei nicht gefunden: ${filePath}`);
    }
    return full;
}
function pickDominantCaptureDateISO(dates) {
    var _a;
    const counts = new Map();
    for (const d of dates) {
        if (!d)
            continue;
        counts.set(d, ((_a = counts.get(d)) !== null && _a !== void 0 ? _a : 0) + 1);
    }
    if (!counts.size)
        return null;
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}
function walkImages(dir, root, depth, out) {
    if (depth > 6)
        return;
    let entries;
    try {
        entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const ent of entries) {
        if (ent.name.startsWith('.'))
            continue;
        const full = path_1.default.join(dir, ent.name);
        if (ent.isDirectory()) {
            walkImages(full, root, depth + 1, out);
            continue;
        }
        const ext = path_1.default.extname(ent.name).toLowerCase();
        if (!MEDIA_EXT.has(ext))
            continue;
        const relativePath = path_1.default.relative(root, full).replace(/\\/g, '/');
        out.push({
            relativePath,
            fileName: ent.name,
            dateISO: null,
            size: fs_1.default.statSync(full).size,
        });
    }
}
async function scanPhotoFolder(sourcePath, targetDateISO) {
    var _a;
    const root = resolveSafeSourceRoot(sourcePath);
    const found = [];
    walkImages(root, root, 0, found);
    const withDates = [];
    for (const item of found) {
        const full = path_1.default.join(root, item.relativePath);
        const dateISO = await (0, exifCaptureDate_1.readCaptureDateISOFromPath)(full);
        withDates.push({ ...item, dateISO });
    }
    const exifCount = withDates.filter((x) => x.dateISO).length;
    const suggestedCaptureDateISO = pickDominantCaptureDateISO(withDates.map((x) => x.dateISO));
    const filterDate = (_a = targetDateISO !== null && targetDateISO !== void 0 ? targetDateISO : suggestedCaptureDateISO) !== null && _a !== void 0 ? _a : null;
    withDates.sort((a, b) => {
        var _a, _b;
        const da = (_a = a.dateISO) !== null && _a !== void 0 ? _a : '9999-99-99';
        const db = (_b = b.dateISO) !== null && _b !== void 0 ? _b : '9999-99-99';
        if (da !== db)
            return da.localeCompare(db);
        return a.fileName.localeCompare(b.fileName, 'de');
    });
    const matchedCount = filterDate
        ? withDates.filter((img) => img.dateISO === filterDate).length
        : withDates.length;
    return {
        root,
        images: withDates,
        total: withDates.length,
        matchedCount,
        suggestedCaptureDateISO,
        exifCount,
    };
}
function getErasmusBilderDir(erasmusFolder) {
    if (!(erasmusFolder === null || erasmusFolder === void 0 ? void 0 : erasmusFolder.trim()))
        return null;
    const jmRoot = (0, erasmusSiteFolders_1.resolveJmReihenRoot)();
    const bilder = path_1.default.join(jmRoot, erasmusFolder.replace(/\\/g, '/'), 'Bilder');
    fs_1.default.mkdirSync(bilder, { recursive: true });
    return bilder;
}
function mediaExtForFile(srcPath) {
    const ext = path_1.default.extname(srcPath).toLowerCase();
    if (ext === '.png')
        return 'png';
    if (ext === '.webp')
        return 'webp';
    if (ext === '.mov')
        return 'mov';
    if (ext === '.mp4')
        return 'mp4';
    if (ext === '.m4v')
        return 'm4v';
    return 'jpg';
}
function copyBufferToMediaDir(siteId, buf, extHint, mediaDir) {
    const hash = crypto_1.default.createHash('sha256').update(buf).digest('hex').slice(0, 16);
    const ext = mediaExtForFile(`x${extHint}`);
    const filename = `${hash}.${ext}`;
    const dest = path_1.default.join(mediaDir, filename);
    if (!fs_1.default.existsSync(dest)) {
        fs_1.default.writeFileSync(dest, buf);
    }
    return `/api/story-sites/${siteId}/media/${filename}`;
}
async function galleryBufferFromPath(src) {
    const ext = path_1.default.extname(src).toLowerCase();
    if (isVideoExt(ext)) {
        return { buf: fs_1.default.readFileSync(src), extHint: ext };
    }
    if ((0, imageToJpeg_1.isHeicPath)(src)) {
        return { buf: await (0, imageToJpeg_1.fileToJpegBuffer)(src, 1600), extHint: '.jpg' };
    }
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
        return { buf: fs_1.default.readFileSync(src), extHint: ext };
    }
    return { buf: await (0, imageToJpeg_1.fileToJpegBuffer)(src), extHint: '.jpg' };
}
function sanitizeCopyName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}
async function importPhotosToErasmus(params) {
    const { siteId, erasmusFolder, sourceRoot, relativePaths, pageDateStr, mediaDir } = params;
    const bilderDir = getErasmusBilderDir(erasmusFolder);
    if (!bilderDir) {
        throw new Error('Erasmus-Ordner fehlt — bitte Website zuerst speichern.');
    }
    if (!fs_1.default.existsSync(mediaDir)) {
        fs_1.default.mkdirSync(mediaDir, { recursive: true });
    }
    const pageDateISO = (0, storyPageDate_1.parseStoryPageDate)(pageDateStr);
    const imported = [];
    for (const rel of relativePaths) {
        const src = assertFileUnderRoot(sourceRoot, rel);
        const fileDateISO = await (0, exifCaptureDate_1.readCaptureDateISOFromPath)(src);
        if (pageDateISO && fileDateISO && fileDateISO !== pageDateISO) {
            throw new Error(`${path_1.default.basename(src)} gehört zu ${fileDateISO}, nicht zum Unterseiten-Datum ${pageDateISO}.`);
        }
        const base = sanitizeCopyName(path_1.default.basename(src));
        const prefix = pageDateISO !== null && pageDateISO !== void 0 ? pageDateISO : 'ohne-datum';
        let destName = `${prefix}_${base}`;
        let destPath = path_1.default.join(bilderDir, destName);
        let n = 1;
        while (fs_1.default.existsSync(destPath)) {
            const ext = path_1.default.extname(base);
            const stem = path_1.default.basename(base, ext);
            destName = `${prefix}_${stem}_${n}${ext}`;
            destPath = path_1.default.join(bilderDir, destName);
            n += 1;
        }
        fs_1.default.copyFileSync(src, destPath);
        const { buf: galleryBuf, extHint } = await galleryBufferFromPath(src);
        const galleryUrl = copyBufferToMediaDir(siteId, galleryBuf, extHint, mediaDir);
        imported.push({
            relativePath: rel,
            galleryUrl,
            erasmusPath: destPath,
            dateISO: fileDateISO !== null && fileDateISO !== void 0 ? fileDateISO : pageDateISO,
        });
    }
    return imported;
}
/** Fotos aus Browser-Upload (ohne Server-Pfad zum Quellordner). */
async function importPhotoBuffersToErasmus(params) {
    var _a;
    const { siteId, erasmusFolder, files, pageDateStr, mediaDir } = params;
    const bilderDir = (erasmusFolder === null || erasmusFolder === void 0 ? void 0 : erasmusFolder.trim()) ? getErasmusBilderDir(erasmusFolder) : null;
    if (!fs_1.default.existsSync(mediaDir)) {
        fs_1.default.mkdirSync(mediaDir, { recursive: true });
    }
    const pageDateISO = (0, storyPageDate_1.parseStoryPageDate)(pageDateStr);
    const imported = [];
    const tmpDir = path_1.default.join(mediaDir, '_import_tmp');
    fs_1.default.mkdirSync(tmpDir, { recursive: true });
    try {
        for (const { buffer, originalName } of files) {
            const tmpPath = path_1.default.join(tmpDir, sanitizeCopyName(originalName));
            fs_1.default.writeFileSync(tmpPath, buffer);
            const fileDateISO = (_a = (await (0, exifCaptureDate_1.readCaptureDateISOFromBuffer)(buffer, originalName))) !== null && _a !== void 0 ? _a : (await (0, exifCaptureDate_1.readCaptureDateISOFromPath)(tmpPath));
            let erasmusPath = tmpPath;
            if (bilderDir) {
                const base = sanitizeCopyName(originalName);
                const prefix = pageDateISO !== null && pageDateISO !== void 0 ? pageDateISO : 'ohne-datum';
                let destName = `${prefix}_${base}`;
                let destPath = path_1.default.join(bilderDir, destName);
                let n = 1;
                while (fs_1.default.existsSync(destPath)) {
                    const ext = path_1.default.extname(base);
                    const stem = path_1.default.basename(base, ext);
                    destName = `${prefix}_${stem}_${n}${ext}`;
                    destPath = path_1.default.join(bilderDir, destName);
                    n += 1;
                }
                fs_1.default.copyFileSync(tmpPath, destPath);
                erasmusPath = destPath;
            }
            const ext = path_1.default.extname(originalName).toLowerCase();
            let galleryBuf;
            let extHint;
            if (isVideoExt(ext)) {
                galleryBuf = buffer;
                extHint = ext;
            }
            else if ((0, imageToJpeg_1.isHeicPath)(originalName)) {
                galleryBuf = await (0, imageToJpeg_1.uploadBufferToJpegBuffer)(buffer, originalName, 1600);
                extHint = '.jpg';
            }
            else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
                galleryBuf = buffer;
                extHint = ext;
            }
            else {
                galleryBuf = await (0, imageToJpeg_1.uploadBufferToJpegBuffer)(buffer, originalName, 1600);
                extHint = '.jpg';
            }
            const galleryUrl = copyBufferToMediaDir(siteId, galleryBuf, extHint, mediaDir);
            imported.push({
                relativePath: originalName,
                galleryUrl,
                erasmusPath,
                dateISO: fileDateISO !== null && fileDateISO !== void 0 ? fileDateISO : pageDateISO,
            });
        }
    }
    finally {
        try {
            fs_1.default.rmSync(tmpDir, { recursive: true, force: true });
        }
        catch {
            /* ignore */
        }
    }
    return imported;
}
//# sourceMappingURL=erasmusPhotoImport.js.map