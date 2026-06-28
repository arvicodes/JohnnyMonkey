"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveFolderAnnouncementImage = exports.saveFolderFlyerStudio = exports.readFolderFlyerDesign = exports.readFolderFlyerHtml = exports.findFolderSlugByAnnouncementId = exports.getFolderAnnouncementReadIds = exports.markFolderAnnouncementRead = exports.deleteFolderAnnouncement = exports.setFolderAnnouncementPublished = exports.updateFolderAnnouncement = exports.createFolderAnnouncement = exports.readFolderAnnouncement = exports.loadFolderAnnouncementListItems = exports.loadFolderAnnouncements = exports.ensureBriefeRootPath = exports.resolveBriefeRootPath = exports.sanitizeFolderName = exports.flyerAppUrl = exports.staticMaterialUrl = exports.folderRelativePath = exports.FOLDER_ANNOUNCEMENT_AUTHOR_ID = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.FOLDER_ANNOUNCEMENT_AUTHOR_ID = 'folder';
const BRIEFE_DIR = 'Ankündigungen & Briefe';
const BRIEFE_REL = `${BRIEFE_DIR}`;
const folderRelativePath = (folderSlug) => `${BRIEFE_REL}/${folderSlug}`;
exports.folderRelativePath = folderRelativePath;
const resolveJmReihenRoot = () => {
    if (process.env.JM_REIHEN_PATH && fs_1.default.existsSync(process.env.JM_REIHEN_PATH)) {
        return process.env.JM_REIHEN_PATH;
    }
    const base = process.env.LOCAL_MATERIALS_PATH;
    if (base) {
        const candidate = path_1.default.join(base, 'J-M-Reihen');
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    const projectRoot = path_1.default.resolve(__dirname, '../../..');
    const devPath = path_1.default.join(projectRoot, 'J-M-Reihen');
    if (fs_1.default.existsSync(devPath))
        return devPath;
    const serverPath = path_1.default.join(process.cwd(), 'J-M-Reihen');
    if (fs_1.default.existsSync(serverPath))
        return serverPath;
    const parentPath = path_1.default.join(process.cwd(), '..', 'J-M-Reihen');
    if (fs_1.default.existsSync(parentPath))
        return parentPath;
    return null;
};
const staticMaterialUrl = (relativePath) => {
    const encoded = relativePath
        .replace(/\\/g, '/')
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');
    return `/api/file-system-paths/static/${encoded}`;
};
exports.staticMaterialUrl = staticMaterialUrl;
/** HTML-Flyer → In-App-Ansicht (Bilder & Druck zuverlässig) */
const flyerAppUrl = (folderSlug) => `/ankuendigungen/flyer/${encodeURIComponent(folderSlug)}`;
exports.flyerAppUrl = flyerAppUrl;
const normalizeForCompare = (s) => s.normalize('NFC').toLowerCase();
const folderSlugFromBriefePath = (relativePath) => {
    const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
    const idx = parts.findIndex((p) => normalizeForCompare(p) === normalizeForCompare(BRIEFE_DIR));
    const slug = idx >= 0 ? parts[idx + 1] : parts.length >= 2 ? parts[parts.length - 2] : null;
    return slug || null;
};
const slugFromStaticHtmlUrl = (url) => {
    try {
        const decoded = decodeURIComponent(url).split('?')[0];
        if (!/\.html?$/i.test(decoded))
            return null;
        const parts = decoded.replace(/\\/g, '/').split('/').filter(Boolean);
        const idx = parts.findIndex((p) => normalizeForCompare(p).includes('briefe'));
        if (idx >= 0 && parts[idx + 1])
            return parts[idx + 1];
        return parts.length >= 2 ? parts[parts.length - 2] : null;
    }
    catch {
        return null;
    }
};
const resolveAnnouncementLinkUrl = (rawUrl, rawPath) => {
    const path = rawPath.trim();
    const pathLower = path.toLowerCase();
    const slugFromPath = path ? folderSlugFromBriefePath(path) : null;
    if (slugFromPath && (pathLower.endsWith('.html') || pathLower.endsWith('.htm'))) {
        return (0, exports.flyerAppUrl)(slugFromPath);
    }
    const url = rawUrl.trim();
    if (url) {
        if (url.startsWith('/ankuendigungen/flyer/'))
            return url;
        if (url.includes('/static/')) {
            const slug = slugFromStaticHtmlUrl(url);
            if (slug)
                return (0, exports.flyerAppUrl)(slug);
        }
        return url;
    }
    if (path)
        return (0, exports.staticMaterialUrl)(path);
    return '';
};
const normalizeImages = (raw) => {
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object')
            continue;
        const url = typeof item.url === 'string' ? item.url.trim() : '';
        if (!url)
            continue;
        const caption = typeof item.caption === 'string' ? item.caption.trim() : undefined;
        out.push(caption ? { url, caption } : { url });
    }
    return out;
};
const normalizeLinks = (raw) => {
    if (!Array.isArray(raw))
        return [];
    return raw
        .map((item) => {
        if (!item || typeof item !== 'object')
            return null;
        const label = typeof item.label === 'string' ? item.label.trim() : '';
        const path = typeof item.path === 'string' ? item.path.trim() : '';
        const url = resolveAnnouncementLinkUrl(typeof item.url === 'string' ? item.url : '', path);
        if (!label || !url)
            return null;
        return { label, url };
    })
        .filter((item) => Boolean(item));
};
const parseFolderJson = (raw, folderSlug, { requireTitle = true } = {}) => {
    var _a, _b;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return null;
        if (requireTitle && !((_a = parsed.title) === null || _a === void 0 ? void 0 : _a.trim()))
            return null;
        if (!((_b = parsed.title) === null || _b === void 0 ? void 0 : _b.trim()))
            parsed.title = folderSlug;
        if (!parsed.id)
            parsed.id = folderSlug.toLowerCase().replace(/\s+/g, '-');
        if (!Array.isArray(parsed.readBy))
            parsed.readBy = [];
        if (!Array.isArray(parsed.links))
            parsed.links = [];
        if (!Array.isArray(parsed.images))
            parsed.images = [];
        return parsed;
    }
    catch {
        return null;
    }
};
const sanitizeFolderName = (raw) => {
    const cleaned = raw
        .trim()
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 60);
    return cleaned || 'Neue Ankündigung';
};
exports.sanitizeFolderName = sanitizeFolderName;
const uniqueFolderName = (root, base) => {
    let name = base;
    let n = 2;
    while (fs_1.default.existsSync(path_1.default.join(root, name))) {
        name = `${base} ${n}`;
        n += 1;
    }
    return name;
};
const jsonPathFor = (root, folderSlug) => path_1.default.join(root, folderSlug, 'announcement.json');
const folderJsonToListItem = (data, folderSlug, fileMtime) => {
    var _a, _b;
    const updatedAt = data.updatedAt || data.publishedAt || fileMtime;
    const createdAt = data.publishedAt || fileMtime;
    return {
        id: data.id,
        title: data.title.trim(),
        body: typeof data.body === 'string' ? data.body.trim() : '',
        links: normalizeLinks(data.links),
        images: normalizeImages(data.images),
        layoutId: typeof data.layoutId === 'string' ? data.layoutId : null,
        publishedAt: data.published ? data.publishedAt || updatedAt : null,
        createdAt,
        updatedAt,
        readCount: (_b = (_a = data.readBy) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0,
        isPublished: Boolean(data.published),
        fromFolder: true,
        folderSlug,
        folderPath: (0, exports.folderRelativePath)(folderSlug),
    };
};
/** Findet Ankündigungen & Briefe (macOS NFD/NFC-tolerant) */
const resolveBriefeRootPath = () => {
    const jm = resolveJmReihenRoot();
    if (!jm)
        return null;
    const target = normalizeForCompare(BRIEFE_DIR);
    const direct = path_1.default.join(jm, BRIEFE_DIR);
    if (fs_1.default.existsSync(direct))
        return direct;
    try {
        for (const entry of fs_1.default.readdirSync(jm, { withFileTypes: true })) {
            if (!entry.isDirectory())
                continue;
            if (normalizeForCompare(entry.name) === target) {
                return path_1.default.join(jm, entry.name);
            }
        }
    }
    catch {
        /* ignore */
    }
    return null;
};
exports.resolveBriefeRootPath = resolveBriefeRootPath;
/** Wie resolveBriefeRootPath, legt den Ordner bei Bedarf an */
const ensureBriefeRootPath = () => {
    const jm = resolveJmReihenRoot();
    if (!jm) {
        throw new Error('J-M-Reihen-Ordner nicht gefunden.');
    }
    const existing = (0, exports.resolveBriefeRootPath)();
    if (existing)
        return existing;
    const created = path_1.default.join(jm, BRIEFE_DIR);
    fs_1.default.mkdirSync(created, { recursive: true });
    return created;
};
exports.ensureBriefeRootPath = ensureBriefeRootPath;
const briefeRootPath = () => (0, exports.resolveBriefeRootPath)();
const loadFolderAnnouncements = () => {
    var _a;
    const root = briefeRootPath();
    if (!root)
        return [];
    const items = [];
    for (const entry of fs_1.default.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const jsonPath = path_1.default.join(root, entry.name, 'announcement.json');
        if (!fs_1.default.existsSync(jsonPath))
            continue;
        const data = parseFolderJson(fs_1.default.readFileSync(jsonPath, 'utf-8'), entry.name);
        if (!(data === null || data === void 0 ? void 0 : data.published))
            continue;
        const publishedAt = data.publishedAt || new Date().toISOString();
        items.push({
            id: data.id,
            title: data.title.trim(),
            body: typeof data.body === 'string' ? data.body.trim() : '',
            links: normalizeLinks(data.links),
            images: normalizeImages(data.images),
            layoutId: typeof data.layoutId === 'string' ? data.layoutId : null,
            publishedAt,
            createdAt: publishedAt,
            updatedAt: publishedAt,
            authorId: exports.FOLDER_ANNOUNCEMENT_AUTHOR_ID,
            authorName: ((_a = data.authorName) === null || _a === void 0 ? void 0 : _a.trim()) || 'Johannes-Gymnasium Lahnstein',
            isRead: false,
            fromFolder: true,
            folderSlug: entry.name,
        });
    }
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};
exports.loadFolderAnnouncements = loadFolderAnnouncements;
/** Lehrkraft: alle Ordner mit announcement.json (Entwurf + live) */
const loadFolderAnnouncementListItems = () => {
    const root = briefeRootPath();
    if (!root)
        return [];
    const items = [];
    for (const entry of fs_1.default.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const jsonPath = jsonPathFor(root, entry.name);
        if (!fs_1.default.existsSync(jsonPath))
            continue;
        const data = parseFolderJson(fs_1.default.readFileSync(jsonPath, 'utf-8'), entry.name, { requireTitle: false });
        if (!data)
            continue;
        const mtime = fs_1.default.statSync(jsonPath).mtime.toISOString();
        items.push(folderJsonToListItem(data, entry.name, mtime));
    }
    return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};
exports.loadFolderAnnouncementListItems = loadFolderAnnouncementListItems;
const readFolderAnnouncement = (folderSlug) => {
    const root = briefeRootPath();
    if (!root)
        return null;
    const jsonPath = jsonPathFor(root, folderSlug);
    if (!fs_1.default.existsSync(jsonPath))
        return null;
    return parseFolderJson(fs_1.default.readFileSync(jsonPath, 'utf-8'), folderSlug, { requireTitle: false });
};
exports.readFolderAnnouncement = readFolderAnnouncement;
const writeFolderAnnouncementJson = (folderSlug, data) => {
    const root = (0, exports.ensureBriefeRootPath)();
    const folderPath = path_1.default.join(root, folderSlug);
    if (!fs_1.default.existsSync(folderPath))
        throw new Error('Ankündigungs-Ordner nicht gefunden');
    data.updatedAt = new Date().toISOString();
    fs_1.default.writeFileSync(jsonPathFor(root, folderSlug), `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
};
const createFolderAnnouncement = (opts) => {
    var _a;
    let root;
    try {
        root = (0, exports.ensureBriefeRootPath)();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Ankündigungen-Ordner nicht gefunden';
        throw new Error(msg);
    }
    const folderSlug = uniqueFolderName(root, (0, exports.sanitizeFolderName)(opts.folderName || opts.title));
    const folderPath = path_1.default.join(root, folderSlug);
    fs_1.default.mkdirSync(folderPath, { recursive: true });
    const now = new Date().toISOString();
    const data = {
        id: folderSlug.toLowerCase().replace(/\s+/g, '-'),
        title: opts.title.trim(),
        body: ((_a = opts.body) === null || _a === void 0 ? void 0 : _a.trim()) || '',
        authorName: opts.authorName,
        published: false,
        publishedAt: null,
        updatedAt: now,
        readBy: [],
        links: [],
    };
    try {
        fs_1.default.writeFileSync(jsonPathFor(root, folderSlug), `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
        fs_1.default.writeFileSync(path_1.default.join(folderPath, 'README.txt'), `Material für „${opts.title.trim()}“ hier ablegen (Flyer, PDF, Bilder …).\nInhalt & Freigabe: announcement.json oder die Ankündigungs-Seite in Johnny.\n`, 'utf-8');
    }
    catch (err) {
        const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : '';
        if (code === 'EACCES' || code === 'EROFS') {
            throw new Error('Keine Schreibrechte für J-M-Reihen/Ankündigungen & Briefe.');
        }
        throw err;
    }
    return folderJsonToListItem(data, folderSlug, now);
};
exports.createFolderAnnouncement = createFolderAnnouncement;
const updateFolderAnnouncement = (folderSlug, updates) => {
    const existing = (0, exports.readFolderAnnouncement)(folderSlug);
    if (!existing)
        throw new Error('Ankündigung nicht gefunden');
    if (typeof updates.title === 'string' && updates.title.trim()) {
        existing.title = updates.title.trim();
    }
    if (typeof updates.body === 'string') {
        existing.body = updates.body.trim();
    }
    if (Array.isArray(updates.links)) {
        existing.links = updates.links
            .map((l) => {
            var _a, _b;
            return ({
                label: String(l.label || '').trim(),
                ...(((_a = l.path) === null || _a === void 0 ? void 0 : _a.trim()) ? { path: l.path.trim() } : {}),
                ...(((_b = l.url) === null || _b === void 0 ? void 0 : _b.trim()) ? { url: l.url.trim() } : {}),
            });
        })
            .filter((l) => l.label && (l.url || l.path));
    }
    if (Array.isArray(updates.images)) {
        existing.images = updates.images
            .map((img) => {
            var _a;
            return ({
                url: String(img.url || '').trim(),
                ...(((_a = img.caption) === null || _a === void 0 ? void 0 : _a.trim()) ? { caption: img.caption.trim() } : {}),
            });
        })
            .filter((img) => img.url);
    }
    if (updates.layoutId !== undefined) {
        existing.layoutId = updates.layoutId || undefined;
    }
    writeFolderAnnouncementJson(folderSlug, existing);
    const mtime = new Date().toISOString();
    return folderJsonToListItem(existing, folderSlug, mtime);
};
exports.updateFolderAnnouncement = updateFolderAnnouncement;
const setFolderAnnouncementPublished = (folderSlug, published) => {
    const existing = (0, exports.readFolderAnnouncement)(folderSlug);
    if (!existing)
        throw new Error('Ankündigung nicht gefunden');
    existing.published = published;
    existing.publishedAt = published ? new Date().toISOString() : null;
    writeFolderAnnouncementJson(folderSlug, existing);
    return folderJsonToListItem(existing, folderSlug, existing.updatedAt);
};
exports.setFolderAnnouncementPublished = setFolderAnnouncementPublished;
const deleteFolderAnnouncement = (folderSlug) => {
    const root = briefeRootPath();
    if (!root)
        throw new Error('Ankündigungen-Ordner nicht gefunden');
    const folderPath = path_1.default.join(root, folderSlug);
    if (!fs_1.default.existsSync(folderPath))
        throw new Error('Ankündigung nicht gefunden');
    fs_1.default.rmSync(folderPath, { recursive: true, force: true });
};
exports.deleteFolderAnnouncement = deleteFolderAnnouncement;
const markFolderAnnouncementRead = (folderSlug, announcementId, userId) => {
    const root = briefeRootPath();
    if (!root)
        return false;
    const jsonPath = path_1.default.join(root, folderSlug, 'announcement.json');
    if (!fs_1.default.existsSync(jsonPath))
        return false;
    const data = parseFolderJson(fs_1.default.readFileSync(jsonPath, 'utf-8'), folderSlug);
    if (!(data === null || data === void 0 ? void 0 : data.published) || data.id !== announcementId)
        return false;
    if (!data.readBy.includes(userId)) {
        data.readBy.push(userId);
        fs_1.default.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    }
    return true;
};
exports.markFolderAnnouncementRead = markFolderAnnouncementRead;
const getFolderAnnouncementReadIds = (userId) => {
    var _a;
    const ids = new Set();
    const root = briefeRootPath();
    if (!root)
        return ids;
    for (const entry of fs_1.default.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const jsonPath = path_1.default.join(root, entry.name, 'announcement.json');
        if (!fs_1.default.existsSync(jsonPath))
            continue;
        const data = parseFolderJson(fs_1.default.readFileSync(jsonPath, 'utf-8'), entry.name);
        if (!(data === null || data === void 0 ? void 0 : data.published) || !data.id)
            continue;
        if ((_a = data.readBy) === null || _a === void 0 ? void 0 : _a.includes(userId)) {
            ids.add(`${exports.FOLDER_ANNOUNCEMENT_AUTHOR_ID}::${data.id}`);
        }
    }
    return ids;
};
exports.getFolderAnnouncementReadIds = getFolderAnnouncementReadIds;
const findFolderSlugByAnnouncementId = (announcementId) => {
    const root = briefeRootPath();
    if (!root)
        return null;
    for (const entry of fs_1.default.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory())
            continue;
        const jsonPath = path_1.default.join(root, entry.name, 'announcement.json');
        if (!fs_1.default.existsSync(jsonPath))
            continue;
        const data = parseFolderJson(fs_1.default.readFileSync(jsonPath, 'utf-8'), entry.name);
        if ((data === null || data === void 0 ? void 0 : data.published) && data.id === announcementId)
            return entry.name;
    }
    return null;
};
exports.findFolderSlugByAnnouncementId = findFolderSlugByAnnouncementId;
const FLYER_FILE_NAMES = ['Calisthenics-Flyer.html', 'Flyer.html', 'flyer.html'];
const resolveFolderDir = (root, folderSlug) => {
    const direct = path_1.default.join(root, folderSlug);
    if (fs_1.default.existsSync(direct))
        return direct;
    const target = normalizeForCompare(folderSlug);
    try {
        for (const entry of fs_1.default.readdirSync(root, { withFileTypes: true })) {
            if (entry.isDirectory() && normalizeForCompare(entry.name) === target) {
                return path_1.default.join(root, entry.name);
            }
        }
    }
    catch {
        /* ignore */
    }
    return null;
};
const staticAssetBaseHref = (folderSlug) => {
    const parts = `${BRIEFE_REL}/${folderSlug}`
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join('/');
    return `/api/file-system-paths/static/${parts}/`;
};
const injectFlyerBaseTag = (html, folderSlug) => {
    const baseHref = staticAssetBaseHref(folderSlug);
    if (/<base\s/i.test(html))
        return html;
    return html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
};
const FLYER_PREVIEW_SCRIPT = `<script data-jm-flyer-preview>
(function () {
  function hideToolbar() {
    document.querySelectorAll('.toolbar').forEach(function (el) {
      el.style.display = 'none';
    });
  }
  function fitPages() {
    var pages = document.querySelectorAll('.page');
    var avail = Math.max(240, document.documentElement.clientWidth - 24);
    pages.forEach(function (page) {
      page.style.transform = '';
      page.style.marginBottom = '';
      page.style.transformOrigin = 'top center';
      var rect = page.getBoundingClientRect();
      var w = rect.width;
      if (!w || w <= avail) return;
      var s = avail / w;
      page.style.transform = 'scale(' + s + ')';
      var h = rect.height;
      page.style.marginBottom = h * (s - 1) + 'px';
    });
  }
  function init() {
    if (document.body.dataset.jmFlyerHideToolbar === '1') hideToolbar();
    fitPages();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('resize', fitPages);
  window.addEventListener('load', fitPages);
})();
</script>`;
const injectFlyerPreviewMode = (html, mode) => {
    if (mode === 'default')
        return html;
    const hideToolbar = mode === 'embed';
    const previewStyle = `<style data-jm-flyer-preview>
    html, body { margin: 0; overflow-x: hidden; }
    body { min-height: 100%; }
    .pages { padding: 12px 8px 24px !important; gap: 12px !important; }
    .page { margin-left: auto; margin-right: auto; }
  </style>`;
    const bodyAttr = hideToolbar ? ' data-jm-flyer-hide-toolbar="1"' : '';
    let out = html;
    if (/<\/head>/i.test(out)) {
        out = out.replace(/<\/head>/i, `${previewStyle}${FLYER_PREVIEW_SCRIPT}</head>`);
    }
    else {
        out = `${previewStyle}${FLYER_PREVIEW_SCRIPT}${out}`;
    }
    if (bodyAttr && /<body([^>]*)>/i.test(out)) {
        out = out.replace(/<body([^>]*)>/i, (_m, attrs) => {
            if (/data-jm-flyer-hide-toolbar/i.test(attrs))
                return `<body${attrs}>`;
            return `<body${attrs}${bodyAttr}>`;
        });
    }
    return out;
};
/** Liest HTML-Flyer aus Ankündigungs-Ordner (mit Base-Tag für Bilder) */
const readFolderFlyerHtml = (folderSlug, previewMode = 'default') => {
    const root = briefeRootPath();
    if (!root)
        return null;
    const folderDir = resolveFolderDir(root, folderSlug);
    if (!folderDir)
        return null;
    const folderName = path_1.default.basename(folderDir);
    const wrapFlyer = (raw) => injectFlyerPreviewMode(injectFlyerBaseTag(raw, folderName), previewMode);
    for (const name of FLYER_FILE_NAMES) {
        const filePath = path_1.default.join(folderDir, name);
        if (fs_1.default.existsSync(filePath)) {
            return wrapFlyer(fs_1.default.readFileSync(filePath, 'utf-8'));
        }
    }
    try {
        for (const entry of fs_1.default.readdirSync(folderDir)) {
            const lower = entry.toLowerCase();
            if (lower === 'index.html' || lower === 'index.htm')
                continue;
            if (lower.endsWith('.html') || lower.endsWith('.htm')) {
                return wrapFlyer(fs_1.default.readFileSync(path_1.default.join(folderDir, entry), 'utf-8'));
            }
        }
    }
    catch {
        /* ignore */
    }
    return null;
};
exports.readFolderFlyerHtml = readFolderFlyerHtml;
const FLYER_HTML_FILE = 'Flyer.html';
const FLYER_DESIGN_FILE = 'flyer-design.json';
const readFolderFlyerDesign = (folderSlug) => {
    const root = briefeRootPath();
    if (!root)
        return null;
    const folderDir = resolveFolderDir(root, folderSlug);
    if (!folderDir)
        return null;
    const designPath = path_1.default.join(folderDir, FLYER_DESIGN_FILE);
    if (!fs_1.default.existsSync(designPath))
        return null;
    try {
        return JSON.parse(fs_1.default.readFileSync(designPath, 'utf-8'));
    }
    catch {
        return null;
    }
};
exports.readFolderFlyerDesign = readFolderFlyerDesign;
const saveFolderFlyerStudio = (folderSlug, html, document) => {
    const root = (0, exports.ensureBriefeRootPath)();
    const folderDir = resolveFolderDir(root, folderSlug);
    if (!folderDir)
        throw new Error('Ankündigungs-Ordner nicht gefunden');
    fs_1.default.writeFileSync(path_1.default.join(folderDir, FLYER_HTML_FILE), html, 'utf-8');
    fs_1.default.writeFileSync(path_1.default.join(folderDir, FLYER_DESIGN_FILE), `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
};
exports.saveFolderFlyerStudio = saveFolderFlyerStudio;
const saveFolderAnnouncementImage = (folderSlug, buffer, originalName) => {
    const root = (0, exports.ensureBriefeRootPath)();
    const folderDir = resolveFolderDir(root, folderSlug);
    if (!folderDir)
        throw new Error('Ankündigungs-Ordner nicht gefunden');
    const ext = path_1.default.extname(originalName).toLowerCase() || '.jpg';
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    if (!allowed.includes(ext))
        throw new Error('Nur Bilddateien erlaubt');
    const filename = `bild-${Date.now()}${ext}`;
    fs_1.default.writeFileSync(path_1.default.join(folderDir, filename), buffer);
    const rel = `${BRIEFE_REL}/${folderSlug}/${filename}`;
    return { url: (0, exports.staticMaterialUrl)(rel), filename };
};
exports.saveFolderAnnouncementImage = saveFolderAnnouncementImage;
//# sourceMappingURL=folderAnnouncements.js.map