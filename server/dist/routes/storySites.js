"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const multer_1 = __importDefault(require("multer"));
const erasmusSiteFolders_1 = require("../utils/erasmusSiteFolders");
const erasmusPhotoImport_1 = require("../utils/erasmusPhotoImport");
const storyPageDate_1 = require("../utils/storyPageDate");
const imageToJpeg_1 = require("../utils/imageToJpeg");
const photoUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 80 * 1024 * 1024, files: 250 },
});
const router = express_1.default.Router();
/** Immer server/story-sites-data (egal ob Start aus src/ oder dist/). */
const DATA_DIR = path_1.default.resolve(__dirname, '..', '..', 'story-sites-data');
const DATA_URL_RE = /data:image\/([\w+.-]+);base64,([A-Za-z0-9+/=]+)/g;
function ensureDataDir() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
}
function safeSiteId(id) {
    const safe = id.replace(/[^a-zA-Z0-9-]/g, '');
    if (!safe || safe !== id) {
        throw new Error('Invalid site id');
    }
    return safe;
}
function sitePath(id) {
    return path_1.default.join(DATA_DIR, `${safeSiteId(id)}.json`);
}
function siteMediaDir(id) {
    return path_1.default.join(DATA_DIR, safeSiteId(id), 'media');
}
function safeMediaFilename(name) {
    const base = path_1.default.basename(name);
    if (!/^[a-f0-9]{8,64}\.(jpg|jpeg|png|webp|mov|mp4|m4v)$/i.test(base))
        return null;
    return base;
}
/** Base64-Bilder als Dateien ablegen — kleines JSON, zuverlässigeres Speichern. */
function externalizeDataUrls(siteId, raw) {
    const mediaDir = siteMediaDir(siteId);
    if (!fs_1.default.existsSync(mediaDir)) {
        fs_1.default.mkdirSync(mediaDir, { recursive: true });
    }
    const replaceInString = (input) => {
        if (!input || !input.includes('data:image'))
            return input;
        return input.replace(DATA_URL_RE, (_match, mime, b64) => {
            const hash = crypto_1.default.createHash('sha256').update(b64).digest('hex').slice(0, 16);
            const ext = String(mime).toLowerCase().includes('png') ? 'png' : 'jpg';
            const filename = `${hash}.${ext}`;
            const filePath = path_1.default.join(mediaDir, filename);
            if (!fs_1.default.existsSync(filePath)) {
                fs_1.default.writeFileSync(filePath, Buffer.from(b64, 'base64'));
            }
            return `/api/story-sites/${siteId}/media/${filename}`;
        });
    };
    const pages = Array.isArray(raw.pages) ? raw.pages : [];
    const nextPages = pages.map((p) => {
        if (!p || typeof p !== 'object')
            return p;
        const page = { ...p };
        if (typeof page.heroImage === 'string')
            page.heroImage = replaceInString(page.heroImage);
        if (Array.isArray(page.galleryImages)) {
            page.galleryImages = page.galleryImages.map((item) => typeof item === 'string' ? replaceInString(item) : item);
        }
        if (typeof page.bodyHtml === 'string')
            page.bodyHtml = replaceInString(page.bodyHtml);
        return page;
    });
    return { ...raw, pages: nextPages };
}
router.get('/', (_req, res) => {
    try {
        ensureDataDir();
        const files = fs_1.default.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
        const sites = files.map((f) => {
            var _a, _b, _c;
            const raw = fs_1.default.readFileSync(path_1.default.join(DATA_DIR, f), 'utf8');
            const parsed = JSON.parse(raw);
            return {
                id: (_a = parsed.id) !== null && _a !== void 0 ? _a : f.replace(/\.json$/, ''),
                name: (_b = parsed.name) !== null && _b !== void 0 ? _b : 'Ohne Titel',
                updatedAt: (_c = parsed.updatedAt) !== null && _c !== void 0 ? _c : null,
            };
        });
        res.json(sites);
    }
    catch (e) {
        console.error('story-sites list error', e);
        res.status(500).json({ error: 'Liste konnte nicht geladen werden' });
    }
});
/** HEIC aus Browser-Upload → JPEG (Vorschau / Galerie). */
router.post('/convert-heic', photoUpload.single('file'), async (req, res) => {
    var _a, _b;
    try {
        const file = req.file;
        if (!((_a = file === null || file === void 0 ? void 0 : file.buffer) === null || _a === void 0 ? void 0 : _a.length)) {
            return res.status(400).json({ error: 'Datei fehlt' });
        }
        const name = file.originalname || 'photo.heic';
        if (!(0, imageToJpeg_1.isHeicPath)(name)) {
            return res.status(400).json({ error: 'Keine HEIC/HEIF-Datei' });
        }
        const maxRaw = parseInt(String((_b = req.query.max) !== null && _b !== void 0 ? _b : ''), 10);
        const maxEdge = Number.isFinite(maxRaw) && maxRaw > 0 && maxRaw <= 2048 ? maxRaw : undefined;
        const jpeg = await (0, imageToJpeg_1.uploadBufferToJpegBuffer)(file.buffer, name, maxEdge);
        res.type('image/jpeg');
        res.send(jpeg);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'HEIC-Konvertierung fehlgeschlagen';
        res.status(500).json({ error: msg });
    }
});
/** Vorschau eines Bildes aus einem lokalen Quellordner (Pfad muss unter root liegen). */
router.get('/local-preview', async (req, res) => {
    var _a, _b;
    try {
        const rootParam = String((_a = req.query.root) !== null && _a !== void 0 ? _a : '');
        const fileParam = String((_b = req.query.file) !== null && _b !== void 0 ? _b : '');
        if (!rootParam || !fileParam) {
            return res.status(400).json({ error: 'root und file erforderlich' });
        }
        const root = (0, erasmusPhotoImport_1.resolveSafeSourceRoot)(rootParam);
        const full = (0, erasmusPhotoImport_1.assertFileUnderRoot)(root, fileParam);
        if ((0, imageToJpeg_1.isHeicPath)(full)) {
            const buf = await (0, imageToJpeg_1.fileToJpegBuffer)(full, 480);
            res.type('image/jpeg');
            return res.send(buf);
        }
        const ext = path_1.default.extname(full).toLowerCase();
        if (ext === '.png')
            res.type('image/png');
        else if (ext === '.webp')
            res.type('image/webp');
        else if (ext === '.gif')
            res.type('image/gif');
        else if (ext === '.mov' || ext === '.qt')
            res.type('video/quicktime');
        else if (ext === '.mp4' || ext === '.m4v')
            res.type('video/mp4');
        else
            res.type('image/jpeg');
        res.sendFile(full);
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : 'Vorschau fehlgeschlagen';
        res.status(400).json({ error: msg });
    }
});
router.post('/:id/scan-photos', async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        safeSiteId(req.params.id);
        const sourcePath = String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.sourcePath) !== null && _b !== void 0 ? _b : '');
        const targetDateRaw = (_c = req.body) === null || _c === void 0 ? void 0 : _c.targetDate;
        const targetDate = typeof targetDateRaw === 'string' && targetDateRaw.trim()
            ? targetDateRaw.trim()
            : typeof ((_d = req.body) === null || _d === void 0 ? void 0 : _d.pageDateStr) === 'string'
                ? (0, storyPageDate_1.parseStoryPageDate)(req.body.pageDateStr)
                : null;
        if (!sourcePath.trim()) {
            return res.status(400).json({ error: 'sourcePath fehlt' });
        }
        const result = await (0, erasmusPhotoImport_1.scanPhotoFolder)(sourcePath, targetDate);
        const effectiveDate = (_e = result.suggestedCaptureDateISO) !== null && _e !== void 0 ? _e : targetDate;
        res.json({
            root: result.root,
            targetDate: effectiveDate,
            suggestedCaptureDateISO: result.suggestedCaptureDateISO,
            exifCount: result.exifCount,
            images: result.images.map((img) => ({
                ...img,
                previewUrl: `/api/story-sites/local-preview?root=${encodeURIComponent(result.root)}&file=${encodeURIComponent(img.relativePath)}`,
            })),
            totalScanned: result.total,
            matchedCount: result.matchedCount,
        });
    }
    catch (e) {
        console.error('story-sites scan-photos', e);
        const msg = e instanceof Error ? e.message : 'Scan fehlgeschlagen';
        res.status(400).json({ error: msg });
    }
});
router.post('/:id/import-photos', async (req, res) => {
    var _a, _b, _c, _d, _e;
    try {
        const id = safeSiteId(req.params.id);
        const sourcePath = String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.sourcePath) !== null && _b !== void 0 ? _b : '');
        const pageDateStr = String((_d = (_c = req.body) === null || _c === void 0 ? void 0 : _c.pageDateStr) !== null && _d !== void 0 ? _d : '');
        const relativePaths = Array.isArray((_e = req.body) === null || _e === void 0 ? void 0 : _e.relativePaths)
            ? req.body.relativePaths.filter((x) => typeof x === 'string')
            : [];
        if (!sourcePath.trim() || !relativePaths.length) {
            return res.status(400).json({ error: 'sourcePath und relativePaths erforderlich' });
        }
        const file = sitePath(id);
        if (!fs_1.default.existsSync(file)) {
            return res.status(404).json({ error: 'Website nicht gefunden' });
        }
        const siteRaw = JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
        const erasmusFolder = typeof siteRaw.erasmusFolder === 'string' ? siteRaw.erasmusFolder : undefined;
        const root = (0, erasmusPhotoImport_1.resolveSafeSourceRoot)(sourcePath);
        const imported = await (0, erasmusPhotoImport_1.importPhotosToErasmus)({
            siteId: id,
            erasmusFolder,
            sourceRoot: root,
            relativePaths,
            pageDateStr,
            mediaDir: siteMediaDir(id),
        });
        res.json({ ok: true, imported, galleryUrls: imported.map((i) => i.galleryUrl) });
    }
    catch (e) {
        console.error('story-sites import-photos', e);
        const msg = e instanceof Error ? e.message : 'Import fehlgeschlagen';
        res.status(400).json({ error: msg });
    }
});
router.post('/:id/import-photo-files', photoUpload.array('photos', 250), async (req, res) => {
    var _a, _b, _c;
    try {
        const id = safeSiteId(req.params.id);
        const pageDateStr = String((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.pageDateStr) !== null && _b !== void 0 ? _b : '');
        const uploads = (_c = req.files) !== null && _c !== void 0 ? _c : [];
        if (!uploads.length) {
            return res.status(400).json({ error: 'Keine Dateien erhalten' });
        }
        const file = sitePath(id);
        if (!fs_1.default.existsSync(file)) {
            return res.status(404).json({ error: 'Website nicht gefunden' });
        }
        const siteRaw = JSON.parse(fs_1.default.readFileSync(file, 'utf8'));
        const erasmusFolder = typeof siteRaw.erasmusFolder === 'string' ? siteRaw.erasmusFolder : undefined;
        const imported = await (0, erasmusPhotoImport_1.importPhotoBuffersToErasmus)({
            siteId: id,
            erasmusFolder,
            files: uploads.map((f) => ({
                buffer: f.buffer,
                originalName: f.originalname || 'foto.jpg',
            })),
            pageDateStr,
            mediaDir: siteMediaDir(id),
        });
        res.json({ ok: true, imported, galleryUrls: imported.map((i) => i.galleryUrl) });
    }
    catch (e) {
        console.error('story-sites import-photo-files', e);
        const msg = e instanceof Error ? e.message : 'Import fehlgeschlagen';
        res.status(400).json({ error: msg });
    }
});
router.get('/:id/media/:filename', (req, res) => {
    try {
        const id = safeSiteId(req.params.id);
        const filename = safeMediaFilename(req.params.filename);
        if (!filename) {
            return res.status(400).json({ error: 'Ungültiger Dateiname' });
        }
        const filePath = path_1.default.join(siteMediaDir(id), filename);
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({ error: 'Bild nicht gefunden' });
        }
        const ext = path_1.default.extname(filename).toLowerCase();
        if (ext === '.png')
            res.type('image/png');
        else if (ext === '.webp')
            res.type('image/webp');
        else if (ext === '.mov' || ext === '.qt')
            res.type('video/quicktime');
        else if (ext === '.mp4' || ext === '.m4v')
            res.type('video/mp4');
        else
            res.type('image/jpeg');
        res.sendFile(path_1.default.resolve(filePath));
    }
    catch (e) {
        console.error('story-sites media error', e);
        res.status(400).json({ error: 'Ungültige Anfrage' });
    }
});
router.get('/:id', (req, res) => {
    try {
        const file = sitePath(req.params.id);
        if (!fs_1.default.existsSync(file)) {
            return res.status(404).json({ error: 'Website nicht gefunden' });
        }
        const raw = fs_1.default.readFileSync(file, 'utf8');
        res.json(JSON.parse(raw));
    }
    catch (e) {
        console.error('story-sites get error', e);
        res.status(400).json({ error: 'Ungültige Anfrage' });
    }
});
router.put('/:id', (req, res) => {
    var _a, _b;
    try {
        const id = req.params.id;
        safeSiteId(id);
        if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.id) && req.body.id !== id) {
            return res.status(400).json({ error: 'ID stimmt nicht überein' });
        }
        ensureDataDir();
        const body = { ...req.body, id };
        const { payload: withFolders, folderPath } = (0, erasmusSiteFolders_1.applyErasmusFoldersToSitePayload)(body);
        const payload = externalizeDataUrls(id, withFolders);
        fs_1.default.writeFileSync(sitePath(id), JSON.stringify(payload), 'utf8');
        res.json({
            ok: true,
            id,
            erasmusFolder: (_b = payload.erasmusFolder) !== null && _b !== void 0 ? _b : null,
            erasmusBilderPath: folderPath !== null && folderPath !== void 0 ? folderPath : null,
        });
    }
    catch (e) {
        console.error('story-sites put error', e);
        const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
        res.status(400).json({ error: msg });
    }
});
router.delete('/:id', (req, res) => {
    try {
        const id = safeSiteId(req.params.id);
        const file = sitePath(id);
        if (fs_1.default.existsSync(file))
            fs_1.default.unlinkSync(file);
        const mediaDir = siteMediaDir(id);
        if (fs_1.default.existsSync(mediaDir)) {
            fs_1.default.rmSync(path_1.default.join(DATA_DIR, id), { recursive: true, force: true });
        }
        res.json({ ok: true });
    }
    catch (e) {
        res.status(400).json({ error: 'Löschen fehlgeschlagen' });
    }
});
exports.default = router;
//# sourceMappingURL=storySites.js.map