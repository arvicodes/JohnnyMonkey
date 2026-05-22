/** Scrapbook-Beige (kein Grau/Weiß in der Vorschau). */
export const STORY_BEIGE = {
  page: '#f5efe4',
  surface: '#f3ebe0',
  panel: '#faf6ee',
  cream: '#fffef9',
  placeholder: '#e8e4dc',
} as const;

/** Hintergrund für thematische Unterseiten (nicht „Tag N“) in der Builder-Liste. */
export const STORY_THEMATIC_ROW_BG = 'rgba(92, 107, 192, 0.1)';
export const STORY_THEMATIC_ROW_BG_HOVER = 'rgba(92, 107, 192, 0.16)';

export const STORY_SCRAPBOOK_BG =
  'linear-gradient(180deg, #fffdf7 0%, #faf6ee 45%, #f5efe4 100%)';

/** Vorschau im Builder: 98 % der Inhaltsspalte, je 1 % frei links/rechts. */
export const storyPreviewContainerSx = {
  width: '98%',
  maxWidth: '98%',
  mx: 'auto',
  boxSizing: 'border-box' as const,
};

/** Vorschau Vollbild: Fensterbreite minus je 1 % Rand (ohne vw-Überlauf). */
export const storyPreviewViewportSx = {
  width: '100%',
  maxWidth: '100%',
  px: '1%',
  boxSizing: 'border-box' as const,
};

export function storyPageAnchorId(pageId: string): string {
  return `story-page-${pageId}`;
}

/** Abstand unter fixierter Schnellnavigation beim Anspringen. */
export const storyPageScrollMarginSx = { scrollMarginTop: { xs: 72, sm: 80 } };

const IMG_SRC_IN_HTML =
  /<img\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))[^>]*>/gi;

/** Bild-URLs aus HTML (auch ohne DOM — zuverlässig in der Vorschau). */
export function extractImageSrcsFromHtml(html: string): string[] {
  if (!html || typeof html !== 'string') return [];
  const out: string[] = [];
  let m: RegExpExecArray | null;
  IMG_SRC_IN_HTML.lastIndex = 0;
  while ((m = IMG_SRC_IN_HTML.exec(html)) !== null) {
    const src = (m[1] || m[2] || m[3] || '').trim();
    if (src && !out.includes(src)) out.push(src);
  }
  return out;
}

function getApiBaseUrl(): string {
  const raw = typeof process !== 'undefined' ? process.env.REACT_APP_API_BASE_URL : undefined;
  if (raw != null && String(raw).trim() !== '') return String(raw).replace(/\/$/, '');
  return '';
}

/** Relative API-Pfade und data:-URLs für <img> auflösen. */
export function resolveStoryImageSrc(src: string): string {
  const s = src?.trim();
  if (!s) return '';
  if (s.startsWith('data:') || s.startsWith('blob:') || /^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) {
    const base = getApiBaseUrl();
    if (base) return `${base}${s}`;
    if (typeof window !== 'undefined') return `${window.location.origin}${s}`;
  }
  return s;
}

/** Schwellwert: sehr lange data:-URLs laden in <img> oft nicht — blob:-URL nutzen. */
export const STORY_DATA_URL_BLOB_THRESHOLD = 80_000;

/** Für <img>/<video>: API-Pfade auflösen; große data:-URLs → blob: (Aufrufer revokeObjectURL). */
export function displayStoryImageSrc(src: string): string {
  return resolveStoryImageSrc(src);
}

export function pageHasLoadableDataImages(page: StoryPageImageSource): boolean {
  const urls = [...galleryFromPage(page), ...extractImageSrcsFromHtml(page.bodyHtml ?? '')];
  return urls.some((u) => u.startsWith('data:') || u.startsWith('blob:'));
}

/** Galerie/Text mit gespeicherten Server-Dateien (/api/…/media/…). */
export function pageHasApiStoryMedia(page: StoryPageImageSource): boolean {
  const urls = [...galleryFromPage(page), ...extractImageSrcsFromHtml(page.bodyHtml ?? '')];
  return urls.some((u) => /\/api\/story-sites\/[^/]+\/media\//i.test(u));
}

function galleryFromPage(page: StoryPageImageSource): string[] {
  const raw = Array.isArray(page.galleryImages) ? page.galleryImages : [];
  const gallery = raw.filter((x): x is string => typeof x === 'string' && !!x.trim()).map((x) => x.trim());
  if (gallery.length) return gallery;
  if (page.heroImage?.trim()) return [page.heroImage.trim()];
  return [];
}

/** Text ohne eingebettete Bilder; Bild-URLs für die rechte Spalte. */
export function splitStoryBodyHtml(html: string): { textHtml: string; imageSrcs: string[] } {
  if (!html || typeof html !== 'string') return { textHtml: '', imageSrcs: [] };
  const imageSrcs = extractImageSrcsFromHtml(html);
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('img').forEach((img) => img.remove());
    return { textHtml: div.innerHTML.trim(), imageSrcs };
  } catch {
    let textHtml = html;
    textHtml = textHtml.replace(/<img\b[^>]*>/gi, '');
    return { textHtml: textHtml.trim(), imageSrcs };
  }
}

export type StoryPageImageSource = {
  galleryImages?: string[];
  heroImage?: string;
  bodyHtml?: string;
  fullWidth?: boolean;
};

export function collectPageImages(pageOrGallery: StoryPageImageSource | string, bodyHtml?: string): string[] {
  const page: StoryPageImageSource =
    typeof pageOrGallery === 'string'
      ? { heroImage: pageOrGallery, bodyHtml: bodyHtml ?? '' }
      : pageOrGallery;
  if (page.fullWidth) return [];
  const html = page.bodyHtml ?? '';
  const { imageSrcs } = splitStoryBodyHtml(html);
  const out: string[] = [];
  for (const src of galleryFromPage(page)) {
    if (!out.includes(src)) out.push(src);
  }
  for (const src of imageSrcs) {
    const t = src.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Alle Vorschau-Bilder der Site in Seitenreihenfolge (für Lightbox-Diashow). */
export function buildSitePreviewImageIndex(
  pages: Array<{ id: string } & StoryPageImageSource>
): { images: string[]; pageStartIndex: Map<string, number> } {
  const images: string[] = [];
  const pageStartIndex = new Map<string, number>();
  for (const page of pages) {
    pageStartIndex.set(page.id, images.length);
    images.push(...collectPageImages(normalizePageForPreview(page)));
  }
  return { images, pageStartIndex };
}

/** Galerie + heroImage für die Vorschau vereinheitlichen (ohne Text-Bilder). */
export function normalizePageForPreview<T extends StoryPageImageSource>(page: T): T {
  const galleryImages = galleryFromPage(page);
  return {
    ...page,
    galleryImages,
    heroImage: galleryImages[0] ?? '',
  };
}
