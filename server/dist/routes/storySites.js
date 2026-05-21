"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
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
    if (!/^[a-f0-9]{8,64}\.(jpg|jpeg|png|webp)$/i.test(base))
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
    var _a;
    try {
        const id = req.params.id;
        safeSiteId(id);
        if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.id) && req.body.id !== id) {
            return res.status(400).json({ error: 'ID stimmt nicht überein' });
        }
        ensureDataDir();
        const payload = externalizeDataUrls(id, { ...req.body, id });
        fs_1.default.writeFileSync(sitePath(id), JSON.stringify(payload), 'utf8');
        res.json({ ok: true, id });
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