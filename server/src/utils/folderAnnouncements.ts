import fs from 'fs';
import path from 'path';

export const FOLDER_ANNOUNCEMENT_AUTHOR_ID = 'folder';

const BRIEFE_DIR = 'Ankündigungen & Briefe';

type FolderAnnouncementJson = {
  id?: string;
  title?: string;
  body?: string;
  authorName?: string;
  published?: boolean;
  publishedAt?: string | null;
  updatedAt?: string;
  readBy?: string[];
  links?: Array<{ label?: string; url?: string; path?: string }>;
  images?: Array<{ url?: string; caption?: string }>;
  layoutId?: string;
};

export type FolderAnnouncementListItem = {
  id: string;
  title: string;
  body: string;
  links: Array<{ label: string; url: string }>;
  images: Array<{ url: string; caption?: string }>;
  layoutId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  readCount: number;
  isPublished: boolean;
  fromFolder: true;
  folderSlug: string;
  folderPath: string;
};

export type FolderAnnouncementFeedItem = {
  id: string;
  title: string;
  body: string;
  links: Array<{ label: string; url: string }>;
  images: Array<{ url: string; caption?: string }>;
  layoutId: string | null;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  isRead: boolean;
  fromFolder: true;
  folderSlug: string;
};

const BRIEFE_REL = `${BRIEFE_DIR}`;

export const folderRelativePath = (folderSlug: string) => `${BRIEFE_REL}/${folderSlug}`;

const resolveJmReihenRoot = (): string | null => {
  if (process.env.JM_REIHEN_PATH && fs.existsSync(process.env.JM_REIHEN_PATH)) {
    return process.env.JM_REIHEN_PATH;
  }
  const base = process.env.LOCAL_MATERIALS_PATH;
  if (base) {
    const candidate = path.join(base, 'J-M-Reihen');
    if (fs.existsSync(candidate)) return candidate;
  }
  const projectRoot = path.resolve(__dirname, '../../..');
  const devPath = path.join(projectRoot, 'J-M-Reihen');
  if (fs.existsSync(devPath)) return devPath;
  const serverPath = path.join(process.cwd(), 'J-M-Reihen');
  if (fs.existsSync(serverPath)) return serverPath;
  const parentPath = path.join(process.cwd(), '..', 'J-M-Reihen');
  if (fs.existsSync(parentPath)) return parentPath;
  return null;
};

export const staticMaterialUrl = (relativePath: string): string => {
  const encoded = relativePath
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `/api/file-system-paths/static/${encoded}`;
};

/** HTML-Flyer → In-App-Ansicht (Bilder & Druck zuverlässig) */
export const flyerAppUrl = (folderSlug: string): string =>
  `/ankuendigungen/flyer/${encodeURIComponent(folderSlug)}`;

const normalizeForCompare = (s: string) => s.normalize('NFC').toLowerCase();

const folderSlugFromBriefePath = (relativePath: string): string | null => {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const idx = parts.findIndex((p) => normalizeForCompare(p) === normalizeForCompare(BRIEFE_DIR));
  const slug = idx >= 0 ? parts[idx + 1] : parts.length >= 2 ? parts[parts.length - 2] : null;
  return slug || null;
};

const slugFromStaticHtmlUrl = (url: string): string | null => {
  try {
    const decoded = decodeURIComponent(url).split('?')[0];
    if (!/\.html?$/i.test(decoded)) return null;
    const parts = decoded.replace(/\\/g, '/').split('/').filter(Boolean);
    const idx = parts.findIndex((p) => normalizeForCompare(p).includes('briefe'));
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    return parts.length >= 2 ? parts[parts.length - 2] : null;
  } catch {
    return null;
  }
};

const resolveAnnouncementLinkUrl = (rawUrl: string, rawPath: string): string => {
  const path = rawPath.trim();
  const pathLower = path.toLowerCase();
  const slugFromPath = path ? folderSlugFromBriefePath(path) : null;
  if (slugFromPath && (pathLower.endsWith('.html') || pathLower.endsWith('.htm'))) {
    return flyerAppUrl(slugFromPath);
  }

  const url = rawUrl.trim();
  if (url) {
    if (url.startsWith('/ankuendigungen/flyer/')) return url;
    if (url.includes('/static/')) {
      const slug = slugFromStaticHtmlUrl(url);
      if (slug) return flyerAppUrl(slug);
    }
    return url;
  }

  if (path) return staticMaterialUrl(path);
  return '';
};

const normalizeImages = (raw: FolderAnnouncementJson['images']): Array<{ url: string; caption?: string }> => {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ url: string; caption?: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const url = typeof item.url === 'string' ? item.url.trim() : '';
    if (!url) continue;
    const caption = typeof item.caption === 'string' ? item.caption.trim() : undefined;
    out.push(caption ? { url, caption } : { url });
  }
  return out;
};

const normalizeLinks = (raw: FolderAnnouncementJson['links']): Array<{ label: string; url: string }> => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const label = typeof item.label === 'string' ? item.label.trim() : '';
      const path = typeof item.path === 'string' ? item.path.trim() : '';
      const url = resolveAnnouncementLinkUrl(
        typeof item.url === 'string' ? item.url : '',
        path
      );
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((item): item is { label: string; url: string } => Boolean(item));
};

const parseFolderJson = (
  raw: string,
  folderSlug: string,
  { requireTitle = true }: { requireTitle?: boolean } = {},
): FolderAnnouncementJson | null => {
  try {
    const parsed = JSON.parse(raw) as FolderAnnouncementJson;
    if (!parsed || typeof parsed !== 'object') return null;
    if (requireTitle && !parsed.title?.trim()) return null;
    if (!parsed.title?.trim()) parsed.title = folderSlug;
    if (!parsed.id) parsed.id = folderSlug.toLowerCase().replace(/\s+/g, '-');
    if (!Array.isArray(parsed.readBy)) parsed.readBy = [];
    if (!Array.isArray(parsed.links)) parsed.links = [];
    if (!Array.isArray(parsed.images)) parsed.images = [];
    return parsed;
  } catch {
    return null;
  }
};

export const sanitizeFolderName = (raw: string): string => {
  const cleaned = raw
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);
  return cleaned || 'Neue Ankündigung';
};

const uniqueFolderName = (root: string, base: string): string => {
  let name = base;
  let n = 2;
  while (fs.existsSync(path.join(root, name))) {
    name = `${base} ${n}`;
    n += 1;
  }
  return name;
};

const jsonPathFor = (root: string, folderSlug: string) => path.join(root, folderSlug, 'announcement.json');

const folderJsonToListItem = (
  data: FolderAnnouncementJson,
  folderSlug: string,
  fileMtime: string,
): FolderAnnouncementListItem => {
  const updatedAt = data.updatedAt || data.publishedAt || fileMtime;
  const createdAt = data.publishedAt || fileMtime;
  return {
    id: data.id!,
    title: data.title!.trim(),
    body: typeof data.body === 'string' ? data.body.trim() : '',
    links: normalizeLinks(data.links),
    images: normalizeImages(data.images),
    layoutId: typeof data.layoutId === 'string' ? data.layoutId : null,
    publishedAt: data.published ? data.publishedAt || updatedAt : null,
    createdAt,
    updatedAt,
    readCount: data.readBy?.length ?? 0,
    isPublished: Boolean(data.published),
    fromFolder: true,
    folderSlug,
    folderPath: folderRelativePath(folderSlug),
  };
};

/** Findet Ankündigungen & Briefe (macOS NFD/NFC-tolerant) */
export const resolveBriefeRootPath = (): string | null => {
  const jm = resolveJmReihenRoot();
  if (!jm) return null;

  const target = normalizeForCompare(BRIEFE_DIR);
  const direct = path.join(jm, BRIEFE_DIR);
  if (fs.existsSync(direct)) return direct;

  try {
    for (const entry of fs.readdirSync(jm, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (normalizeForCompare(entry.name) === target) {
        return path.join(jm, entry.name);
      }
    }
  } catch {
    /* ignore */
  }
  return null;
};

/** Wie resolveBriefeRootPath, legt den Ordner bei Bedarf an */
export const ensureBriefeRootPath = (): string => {
  const jm = resolveJmReihenRoot();
  if (!jm) {
    throw new Error('J-M-Reihen-Ordner nicht gefunden.');
  }
  const existing = resolveBriefeRootPath();
  if (existing) return existing;
  const created = path.join(jm, BRIEFE_DIR);
  fs.mkdirSync(created, { recursive: true });
  return created;
};

const briefeRootPath = () => resolveBriefeRootPath();

export const loadFolderAnnouncements = (): FolderAnnouncementFeedItem[] => {
  const root = briefeRootPath();
  if (!root) return [];

  const items: FolderAnnouncementFeedItem[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(root, entry.name, 'announcement.json');
    if (!fs.existsSync(jsonPath)) continue;

    const data = parseFolderJson(fs.readFileSync(jsonPath, 'utf-8'), entry.name);
    // Strikt: nur explizit veröffentlichte Einträge (Entwurf = published false / ohne Datum)
    if (data?.published !== true) continue;
    if (!data.publishedAt || typeof data.publishedAt !== 'string') continue;

    const publishedAt = data.publishedAt;
    items.push({
      id: data.id!,
      title: data.title!.trim(),
      body: typeof data.body === 'string' ? data.body.trim() : '',
      links: normalizeLinks(data.links),
      images: normalizeImages(data.images),
      layoutId: typeof data.layoutId === 'string' ? data.layoutId : null,
      publishedAt,
      createdAt: publishedAt,
      updatedAt: data.updatedAt || publishedAt,
      authorId: FOLDER_ANNOUNCEMENT_AUTHOR_ID,
      authorName: data.authorName?.trim() || 'Johannes-Gymnasium Lahnstein',
      isRead: false,
      fromFolder: true,
      folderSlug: entry.name,
    });
  }

  return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
};

/** Lehrkraft: alle Ordner mit announcement.json (Entwurf + live) */
export const loadFolderAnnouncementListItems = (): FolderAnnouncementListItem[] => {
  const root = briefeRootPath();
  if (!root) return [];

  const items: FolderAnnouncementListItem[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const jsonPath = jsonPathFor(root, entry.name);
    if (!fs.existsSync(jsonPath)) continue;

    const data = parseFolderJson(fs.readFileSync(jsonPath, 'utf-8'), entry.name, { requireTitle: false });
    if (!data) continue;
    const mtime = fs.statSync(jsonPath).mtime.toISOString();
    items.push(folderJsonToListItem(data, entry.name, mtime));
  }

  return items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

export const readFolderAnnouncement = (folderSlug: string): FolderAnnouncementJson | null => {
  const root = briefeRootPath();
  if (!root) return null;
  const jsonPath = jsonPathFor(root, folderSlug);
  if (!fs.existsSync(jsonPath)) return null;
  return parseFolderJson(fs.readFileSync(jsonPath, 'utf-8'), folderSlug, { requireTitle: false });
};

const writeFolderAnnouncementJson = (folderSlug: string, data: FolderAnnouncementJson) => {
  const root = ensureBriefeRootPath();
  const folderPath = path.join(root, folderSlug);
  if (!fs.existsSync(folderPath)) throw new Error('Ankündigungs-Ordner nicht gefunden');
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(jsonPathFor(root, folderSlug), `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
};

export const createFolderAnnouncement = (opts: {
  title: string;
  folderName?: string;
  body?: string;
  authorName: string;
}): FolderAnnouncementListItem => {
  let root: string;
  try {
    root = ensureBriefeRootPath();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ankündigungen-Ordner nicht gefunden';
    throw new Error(msg);
  }
  const folderSlug = uniqueFolderName(root, sanitizeFolderName(opts.folderName || opts.title));
  const folderPath = path.join(root, folderSlug);
  fs.mkdirSync(folderPath, { recursive: true });

  const now = new Date().toISOString();
  const data: FolderAnnouncementJson = {
    id: folderSlug.toLowerCase().replace(/\s+/g, '-'),
    title: opts.title.trim(),
    body: opts.body?.trim() || '',
    authorName: opts.authorName,
    published: false,
    publishedAt: null,
    updatedAt: now,
    readBy: [],
    links: [],
  };

  try {
    fs.writeFileSync(jsonPathFor(root, folderSlug), `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
    fs.writeFileSync(
      path.join(folderPath, 'README.txt'),
      `Material für „${opts.title.trim()}“ hier ablegen (Flyer, PDF, Bilder …).\nInhalt & Freigabe: announcement.json oder die Ankündigungs-Seite in Johnny.\n`,
      'utf-8',
    );
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as NodeJS.ErrnoException).code) : '';
    if (code === 'EACCES' || code === 'EROFS') {
      throw new Error('Keine Schreibrechte für J-M-Reihen/Ankündigungen & Briefe.');
    }
    throw err;
  }

  return folderJsonToListItem(data, folderSlug, now);
};

export const updateFolderAnnouncement = (
  folderSlug: string,
  updates: {
    title?: string;
    body?: string;
    links?: Array<{ label: string; url?: string; path?: string }>;
    images?: Array<{ url: string; caption?: string }>;
    layoutId?: string | null;
  },
): FolderAnnouncementListItem => {
  const existing = readFolderAnnouncement(folderSlug);
  if (!existing) throw new Error('Ankündigung nicht gefunden');

  if (typeof updates.title === 'string' && updates.title.trim()) {
    existing.title = updates.title.trim();
  }
  if (typeof updates.body === 'string') {
    existing.body = updates.body.trim();
  }
  if (Array.isArray(updates.links)) {
    existing.links = updates.links
      .map((l) => ({
        label: String(l.label || '').trim(),
        ...(l.path?.trim() ? { path: l.path.trim() } : {}),
        ...(l.url?.trim() ? { url: l.url.trim() } : {}),
      }))
      .filter((l) => l.label && (l.url || l.path));
  }
  if (Array.isArray(updates.images)) {
    existing.images = updates.images
      .map((img) => ({
        url: String(img.url || '').trim(),
        ...(img.caption?.trim() ? { caption: img.caption.trim() } : {}),
      }))
      .filter((img) => img.url);
  }
  if (updates.layoutId !== undefined) {
    existing.layoutId = updates.layoutId || undefined;
  }

  writeFolderAnnouncementJson(folderSlug, existing);
  const mtime = new Date().toISOString();
  return folderJsonToListItem(existing, folderSlug, mtime);
};

export const setFolderAnnouncementPublished = (
  folderSlug: string,
  published: boolean,
): FolderAnnouncementListItem => {
  const existing = readFolderAnnouncement(folderSlug);
  if (!existing) throw new Error('Ankündigung nicht gefunden');

  existing.published = published;
  existing.publishedAt = published ? new Date().toISOString() : null;
  writeFolderAnnouncementJson(folderSlug, existing);
  return folderJsonToListItem(existing, folderSlug, existing.updatedAt!);
};

export const deleteFolderAnnouncement = (folderSlug: string): void => {
  const root = briefeRootPath();
  if (!root) throw new Error('Ankündigungen-Ordner nicht gefunden');
  const folderPath = path.join(root, folderSlug);
  if (!fs.existsSync(folderPath)) throw new Error('Ankündigung nicht gefunden');
  fs.rmSync(folderPath, { recursive: true, force: true });
};

export const markFolderAnnouncementRead = (folderSlug: string, announcementId: string, userId: string): boolean => {
  const root = briefeRootPath();
  if (!root) return false;

  const jsonPath = path.join(root, folderSlug, 'announcement.json');
  if (!fs.existsSync(jsonPath)) return false;

  const data = parseFolderJson(fs.readFileSync(jsonPath, 'utf-8'), folderSlug);
  if (!data?.published || data.id !== announcementId) return false;

  if (!data.readBy!.includes(userId)) {
    data.readBy!.push(userId);
    fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  }
  return true;
};

export const getFolderAnnouncementReadIds = (userId: string): Set<string> => {
  const ids = new Set<string>();
  const root = briefeRootPath();
  if (!root) return ids;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(root, entry.name, 'announcement.json');
    if (!fs.existsSync(jsonPath)) continue;
    const data = parseFolderJson(fs.readFileSync(jsonPath, 'utf-8'), entry.name);
    if (!data?.published || !data.id) continue;
    if (data.readBy?.includes(userId)) {
      ids.add(`${FOLDER_ANNOUNCEMENT_AUTHOR_ID}::${data.id}`);
    }
  }
  return ids;
};

export const findFolderSlugByAnnouncementId = (announcementId: string): string | null => {
  const root = briefeRootPath();
  if (!root) return null;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const jsonPath = path.join(root, entry.name, 'announcement.json');
    if (!fs.existsSync(jsonPath)) continue;
    const data = parseFolderJson(fs.readFileSync(jsonPath, 'utf-8'), entry.name);
    if (data?.published && data.id === announcementId) return entry.name;
  }
  return null;
};

const FLYER_FILE_NAMES = ['Calisthenics-Flyer.html', 'Flyer.html', 'flyer.html'];

const resolveFolderDir = (root: string, folderSlug: string): string | null => {
  const direct = path.join(root, folderSlug);
  if (fs.existsSync(direct)) return direct;
  const target = normalizeForCompare(folderSlug);
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && normalizeForCompare(entry.name) === target) {
        return path.join(root, entry.name);
      }
    }
  } catch {
    /* ignore */
  }
  return null;
};

const staticAssetBaseHref = (folderSlug: string): string => {
  const parts = `${BRIEFE_REL}/${folderSlug}`
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `/api/file-system-paths/static/${parts}/`;
};

const injectFlyerBaseTag = (html: string, folderSlug: string): string => {
  const baseHref = staticAssetBaseHref(folderSlug);
  if (/<base\s/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
};

export type FlyerPreviewMode = 'default' | 'embed' | 'fullscreen';

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

const injectFlyerPreviewMode = (html: string, mode: FlyerPreviewMode): string => {
  if (mode === 'default') return html;
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
  } else {
    out = `${previewStyle}${FLYER_PREVIEW_SCRIPT}${out}`;
  }
  if (bodyAttr && /<body([^>]*)>/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, (_m, attrs: string) => {
      if (/data-jm-flyer-hide-toolbar/i.test(attrs)) return `<body${attrs}>`;
      return `<body${attrs}${bodyAttr}>`;
    });
  }
  return out;
};

/** Liest HTML-Flyer aus Ankündigungs-Ordner (mit Base-Tag für Bilder) */
export const readFolderFlyerHtml = (folderSlug: string, previewMode: FlyerPreviewMode = 'default'): string | null => {
  const root = briefeRootPath();
  if (!root) return null;

  const folderDir = resolveFolderDir(root, folderSlug);
  if (!folderDir) return null;

  const folderName = path.basename(folderDir);

  const wrapFlyer = (raw: string) =>
    injectFlyerPreviewMode(injectFlyerBaseTag(raw, folderName), previewMode);

  for (const name of FLYER_FILE_NAMES) {
    const filePath = path.join(folderDir, name);
    if (fs.existsSync(filePath)) {
      return wrapFlyer(fs.readFileSync(filePath, 'utf-8'));
    }
  }

  try {
    for (const entry of fs.readdirSync(folderDir)) {
      const lower = entry.toLowerCase();
      if (lower === 'index.html' || lower === 'index.htm') continue;
      if (lower.endsWith('.html') || lower.endsWith('.htm')) {
        return wrapFlyer(fs.readFileSync(path.join(folderDir, entry), 'utf-8'));
      }
    }
  } catch {
    /* ignore */
  }

  return null;
};

const FLYER_HTML_FILE = 'Flyer.html';
const FLYER_DESIGN_FILE = 'flyer-design.json';

export const readFolderFlyerDesign = (folderSlug: string): unknown | null => {
  const root = briefeRootPath();
  if (!root) return null;
  const folderDir = resolveFolderDir(root, folderSlug);
  if (!folderDir) return null;
  const designPath = path.join(folderDir, FLYER_DESIGN_FILE);
  if (!fs.existsSync(designPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(designPath, 'utf-8'));
  } catch {
    return null;
  }
};

export const saveFolderFlyerStudio = (folderSlug: string, html: string, document: unknown): void => {
  const root = ensureBriefeRootPath();
  const folderDir = resolveFolderDir(root, folderSlug);
  if (!folderDir) throw new Error('Ankündigungs-Ordner nicht gefunden');

  fs.writeFileSync(path.join(folderDir, FLYER_HTML_FILE), html, 'utf-8');
  fs.writeFileSync(path.join(folderDir, FLYER_DESIGN_FILE), `${JSON.stringify(document, null, 2)}\n`, 'utf-8');
};

export const saveFolderAnnouncementImage = (
  folderSlug: string,
  buffer: Buffer,
  originalName: string,
): { url: string; filename: string } => {
  const root = ensureBriefeRootPath();
  const folderDir = resolveFolderDir(root, folderSlug);
  if (!folderDir) throw new Error('Ankündigungs-Ordner nicht gefunden');

  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  if (!allowed.includes(ext)) throw new Error('Nur Bilddateien erlaubt');

  const filename = `bild-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(folderDir, filename), buffer);

  const rel = `${BRIEFE_REL}/${folderSlug}/${filename}`;
  return { url: staticMaterialUrl(rel), filename };
};
