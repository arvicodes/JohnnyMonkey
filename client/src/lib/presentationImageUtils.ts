import { htmlToPlain, type PresentationSlide, type SlideElement } from './presentationDeck';

/** Max. Bildhöhe auf Folien mit Fußleiste (Prozent), damit die Fußzeile frei bleibt. */
export const SLIDE_HERO_IMAGE_HEIGHT_PCT = 93;

/** Bildformate, die typischerweise einen Alpha-Kanal haben. */
export function isAlphaFriendlyImageSrc(src?: string): boolean {
  if (!src) return false;
  const path = src.split('?')[0].split('#')[0];
  return /\.(png|gif|webp|svg)$/i.test(path);
}

export function effectivePresentationImageFit(
  src: string | undefined,
  fit: 'contain' | 'cover' | undefined,
): 'contain' | 'cover' {
  if (fit === 'cover' || fit === 'contain') return fit;
  if (isAlphaFriendlyImageSrc(src)) return 'contain';
  return 'contain';
}

export const DEFAULT_IMAGE_OBJECT_POSITION = '50% 50%';

export function parseImageObjectPosition(value?: string): { x: number; y: number } {
  const v = (value || DEFAULT_IMAGE_OBJECT_POSITION).trim();
  const parts = v.split(/\s+/);
  const parsePart = (part: string, fallback: number) => {
    const n = parseFloat(part.replace('%', ''));
    return Number.isFinite(n)
      ? clampPercent(n, IMAGE_CROP_POSITION_MIN, IMAGE_CROP_POSITION_MAX)
      : fallback;
  };
  return {
    x: parsePart(parts[0] ?? '50', 50),
    y: parsePart(parts[1] ?? parts[0] ?? '50', 50),
  };
}

export function formatImageObjectPosition(x: number, y: number): string {
  return `${clampPercent(x, IMAGE_CROP_POSITION_MIN, IMAGE_CROP_POSITION_MAX)}% ${clampPercent(
    y,
    IMAGE_CROP_POSITION_MIN,
    IMAGE_CROP_POSITION_MAX,
  )}%`;
}

/** Bild im Beschneide-Modus (object-fit: cover + Ausschnitt verschieben). */
export function isImageCropMode(element: SlideElement): boolean {
  return element.type === 'image' && element.imageFit === 'cover' && Boolean(element.src?.trim());
}

/** Bildrahmen darf über den Folienrand hinausragen (Prozent). */
export const IMAGE_FRAME_MIN = -40;
export const IMAGE_FRAME_MAX = 100;
export const IMAGE_FRAME_SIZE_MAX = 160;

/** Ausschnitt bei Cover-Bildern (object-position). */
export const IMAGE_CROP_POSITION_MIN = -20;
export const IMAGE_CROP_POSITION_MAX = 120;

/** Cover-Bilder: Alt+Ziehen verschiebt den Bildausschnitt; ohne Alt den Rahmen. */
export function shouldPanCoverImageOnDrag(
  element: SlideElement,
  options?: { altKey?: boolean },
): boolean {
  return isImageCropMode(element) && Boolean(options?.altKey);
}

export function presentationImageElementSx(
  src: string | undefined,
  fit: 'contain' | 'cover' | undefined,
  objectPosition?: string,
) {
  const effectiveFit = effectivePresentationImageFit(src, fit);
  return {
    maxWidth: '100%',
    maxHeight: '100%',
    width: '100%',
    height: '100%',
    objectFit: effectiveFit,
    objectPosition: objectPosition || DEFAULT_IMAGE_OBJECT_POSITION,
    userSelect: 'none' as const,
    ...presentationTransparentImageSx,
  };
}

export const presentationTransparentImageSx = {
  display: 'block',
  backgroundColor: 'transparent',
  backgroundImage: 'none',
} as const;

/** Schachbrett-Hintergrund, damit Transparenz im Editor sichtbar bleibt. */
export const presentationImageCheckerboardBg = {
  backgroundColor: '#fff',
  backgroundImage: `
    linear-gradient(45deg, #e8e8e8 25%, transparent 25%),
    linear-gradient(-45deg, #e8e8e8 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e8e8e8 75%),
    linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)
  `,
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0',
} as const;

export function isImageFileDragEvent(e: React.DragEvent | DragEvent): boolean {
  const types = Array.from(e.dataTransfer?.types ?? []);
  // Finder/macOS: oft nur "Files", ohne image/* vor dem Drop
  return types.includes('Files') || types.includes('application/x-moz-file');
}

/** Datei ODER Bild-URL aus anderem Browser-Tab (uri-list / html). */
export function isPresentationImageDragEvent(e: React.DragEvent | DragEvent): boolean {
  if (isImageFileDragEvent(e)) return true;
  const types = Array.from(e.dataTransfer?.types ?? []).map((t) => t.toLowerCase());
  return (
    types.includes('text/uri-list') ||
    types.includes('text/html') ||
    types.includes('text/x-moz-url') ||
    types.includes('url') ||
    types.includes('downloadurl')
  );
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|heic|heif|tif|tiff|svg)(\?|#|$)/i;
const HTTP_URL_RE = /^(https?:\/\/|blob:|data:image\/)/i;

/** MIME kann unter macOS leer sein — dann Dateiname prüfen. */
export function isLikelyImageFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  if (t && t !== 'application/octet-stream') return false;
  return IMAGE_EXT_RE.test(file.name || '');
}

export function extractImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const fromList = Array.from(dt.files || []).filter((f) => {
    if (isLikelyImageFile(f)) return true;
    // Chrome-Tab-Drag: oft leerer MIME, aber Bilddaten vorhanden
    return !f.type && f.size > 32;
  });
  if (fromList.length > 0) return fromList;

  const fromItems: File[] = [];
  for (const item of Array.from(dt.items || [])) {
    if (item.kind !== 'file') continue;
    const mime = (item.type || '').toLowerCase();
    if (mime && !mime.startsWith('image/') && mime !== 'application/octet-stream') continue;
    const file = item.getAsFile();
    if (!file || file.size < 8) continue;
    if (isLikelyImageFile(file) || !file.type) fromItems.push(file);
  }
  return fromItems;
}

function looksLikeDirectImageUrl(url: string): boolean {
  const u = (url || '').trim();
  if (!u) return false;
  if (u.startsWith('data:image/')) return true;
  if (IMAGE_EXT_RE.test(u)) return true;
  // Häufige Bild-CDNs / Thumbnail-Pfade ohne Dateiendung
  if (
    /(?:[./]|%2F)(images?|img|media|static|thumb|upload|photos?|assets?)(?:[./]|%2F)/i.test(u) &&
    /^https?:\/\//i.test(u)
  ) {
    return true;
  }
  if (/googleusercontent\.com|ggpht\.com|twimg\.com|fbcdn\.net|cdninstagram|pinimg\.com|wikimedia\.org|imgur\.com|cloudfront\.net/i.test(u)) {
    return true;
  }
  return false;
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function firstHttpUrlFromText(text: string): string | null {
  const raw = (text || '').trim();
  if (!raw) return null;
  for (const line of raw.split(/\r?\n/)) {
    let t = line.trim();
    if (!t || t.startsWith('#')) continue;
    // Chrome DownloadURL: image/png:1234:https://…
    const dl = t.match(/^(?:image\/[a-z0-9.+-]+|application\/octet-stream):\d+:(https?:\/\/\S+)/i);
    if (dl) return decodeBasicHtmlEntities(dl[1]);
    if (HTTP_URL_RE.test(t)) return decodeBasicHtmlEntities(t.split(/\s+/)[0]);
    const m = t.match(/https?:\/\/[^\s"'<>]+/i);
    if (m) return decodeBasicHtmlEntities(m[0].replace(/[),.;]+$/, ''));
  }
  return null;
}

function imageUrlFromHtml(html: string): string | null {
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Meta-Bilder (wenn man die ganze Seite zieht)
    const metaCandidates = [
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content'),
      doc.querySelector('link[rel="image_src"]')?.getAttribute('href'),
    ];
    for (const c of metaCandidates) {
      const src = decodeBasicHtmlEntities((c || '').trim());
      if (src && HTTP_URL_RE.test(src)) return src;
    }

    // Alle imgs — größte / beste Kandidaten zuerst
    const imgs = Array.from(doc.querySelectorAll('img[src], img[data-src], img[srcset], img[data-original]'));
    const scored: { url: string; score: number }[] = [];
    for (const img of imgs) {
      const candidates = [
        img.getAttribute('src'),
        img.getAttribute('data-src'),
        img.getAttribute('data-original'),
        (img.getAttribute('srcset') || '').split(',')[0]?.trim().split(/\s+/)[0],
      ];
      for (const c of candidates) {
        const src = decodeBasicHtmlEntities((c || '').trim());
        if (!src || !HTTP_URL_RE.test(src)) continue;
        if (src.startsWith('data:image/svg') && src.length < 200) continue;
        let score = looksLikeDirectImageUrl(src) ? 10 : 2;
        const w = Number(img.getAttribute('width') || 0);
        const h = Number(img.getAttribute('height') || 0);
        if (w * h > 0) score += Math.min(20, Math.log10(w * h + 1));
        scored.push({ url: src, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    if (scored[0]) return scored[0].url;

    // Hintergrundbild
    const styled = doc.querySelector('[style*="background"]');
    const style = styled?.getAttribute('style') || '';
    const bg = style.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/i);
    if (bg) return decodeBasicHtmlEntities(bg[1]);
  } catch {
    /* ignore */
  }
  const m = html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
  if (m?.[1] && HTTP_URL_RE.test(m[1])) return decodeBasicHtmlEntities(m[1]);
  return null;
}

/** Bild-URL aus Tab-/Web-Drag (kein File). */
export function extractImageUrlFromDataTransfer(dt: DataTransfer): string | null {
  const html = dt.getData('text/html') || '';
  // 1) HTML <img> hat Vorrang — uri-list ist oft nur die Seiten-URL
  const fromHtml = imageUrlFromHtml(html);
  if (fromHtml) return fromHtml;

  const downloadUrl =
    firstHttpUrlFromText(dt.getData('DownloadURL') || '') ||
    firstHttpUrlFromText(dt.getData('downloadurl') || '');
  if (downloadUrl) return downloadUrl;

  const uriCandidates = [
    dt.getData('text/uri-list'),
    dt.getData('text/x-moz-url'),
    dt.getData('url'),
    dt.getData('text/plain'),
  ];
  const pageOrImageUrls: string[] = [];
  for (const raw of uriCandidates) {
    const u = firstHttpUrlFromText(raw || '');
    if (u) pageOrImageUrls.push(u);
  }
  // Direkte Bild-URLs bevorzugen
  const direct = pageOrImageUrls.find((u) => looksLikeDirectImageUrl(u));
  if (direct) return direct;
  // Sonst erste URL (Server versucht ggf. og:image aus HTML-Seite)
  return pageOrImageUrls[0] || null;
}

/**
 * Liest URL asynchron aus DataTransfer-Items (falls getData leer war).
 */
export function extractImageUrlFromDataTransferAsync(dt: DataTransfer): Promise<string | null> {
  const sync = extractImageUrlFromDataTransfer(dt);
  if (sync) return Promise.resolve(sync);

  const stringItems = Array.from(dt.items || []).filter((i) => i.kind === 'string');
  if (stringItems.length === 0) return Promise.resolve(null);

  return new Promise((resolve) => {
    let pending = stringItems.length;
    let found: string | null = null;
    const done = () => {
      pending -= 1;
      if (pending <= 0) resolve(found);
    };
    for (const item of stringItems) {
      try {
        item.getAsString((s) => {
          if (!found) {
            if (s.includes('<img') || s.includes('<IMG')) {
              found = imageUrlFromHtml(s);
            }
            if (!found) found = firstHttpUrlFromText(s);
          }
          done();
        });
      } catch {
        done();
      }
    }
  });
}

function extFromMime(mime: string): string {
  const m = (mime || '').toLowerCase();
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('png')) return 'png';
  if (m.includes('gif')) return 'gif';
  if (m.includes('webp')) return 'webp';
  if (m.includes('svg')) return 'svg';
  return 'png';
}

function fileNameFromUrl(url: string, mime: string): string {
  try {
    if (url.startsWith('data:')) return `web-image-${Date.now()}.${extFromMime(mime)}`;
    const u = new URL(url);
    const base = (u.pathname.split('/').pop() || '').split('?')[0];
    if (base && IMAGE_EXT_RE.test(base)) return base.replace(/[^\w.\-]+/g, '_');
  } catch {
    /* ignore */
  }
  return `web-image-${Date.now()}.${extFromMime(mime)}`;
}

async function blobFromBrowserUrl(url: string): Promise<{ blob: Blob; mime: string } | null> {
  try {
    const abs = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    const res = await fetch(abs);
    if (!res.ok) return null;
    const blob = await res.blob();
    const mime = blob.type.startsWith('image/')
      ? blob.type
      : blob.type === 'application/octet-stream' || !blob.type
        ? 'image/png'
        : '';
    if (!mime.startsWith('image/')) return null;
    return { blob, mime };
  } catch {
    return null;
  }
}

/**
 * Bild-URL → Datei in der Lektion speichern.
 * data/blob/same-origin: Client-Fetch + save-file.
 * Fremde Tabs/Domains: Server lädt herunter (kein CORS).
 * Wirft Error mit lesbarer Meldung bei Fehlschlag.
 */
export async function saveImageUrlToLessonFolder(
  url: string,
  targetPath: string,
): Promise<string> {
  const trimmed = (url || '').trim();
  if (!trimmed) throw new Error('Keine Bild-URL');
  if (!targetPath) throw new Error('Kein Zielordner');

  // blob: aus anderem Tab ist in diesem Tab ungültig
  if (trimmed.startsWith('blob:')) {
    throw new Error('Dieses Bild kommt nur als Browser-Vorschau — bitte Bilddatei speichern oder Direktlink ziehen');
  }

  const tryClientUpload = async (blob: Blob, mime: string, name: string): Promise<string | null> => {
    const file = new File([blob], name, { type: mime });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetPath', targetPath);
    const res = await fetch('/api/file-system-paths/save-file', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { path?: string; filename?: string };
    if (data.path && typeof data.path === 'string' && data.path.trim()) {
      return data.path.replace(/\\/g, '/');
    }
    const fname = (data.filename || name).replace(/\\/g, '/');
    return `${targetPath.replace(/\\/g, '/').replace(/\/+$/, '')}/${fname.split('/').pop()}`;
  };

  if (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith(window.location.origin)
  ) {
    const got = await blobFromBrowserUrl(trimmed);
    if (got) {
      const path = await tryClientUpload(got.blob, got.mime, fileNameFromUrl(trimmed, got.mime));
      if (path) return path;
    }
  }

  // Server-Proxy (anderer Tab / externe URL)
  const res = await fetch('/api/file-system-paths/save-from-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: trimmed, targetPath }),
  });
  const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
  if (res.ok && data.path) {
    return data.path.replace(/\\/g, '/');
  }

  // Letzter Versuch: CORS-fähige Remote-URL im Browser
  const got = await blobFromBrowserUrl(trimmed);
  if (got) {
    const path = await tryClientUpload(got.blob, got.mime, fileNameFromUrl(trimmed, got.mime));
    if (path) return path;
  }

  throw new Error(data.error || `Bild-URL nicht ladbar (${res.status})`);
}

export function clampPercent(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Kompakt genug, dass Auswahl-/Resize-Handles auf der Folie sichtbar bleiben. */
export const DEFAULT_FLOATING_IMAGE_W = 28;
export const DEFAULT_FLOATING_IMAGE_H = 25;

export function slideDropPositionForImage(
  clientX: number,
  clientY: number,
  slideEl: HTMLElement,
  imageWPct = DEFAULT_FLOATING_IMAGE_W,
  imageHPct = DEFAULT_FLOATING_IMAGE_H,
): { x: number; y: number } {
  const rect = slideEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 36, y: 30 };
  }
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;
  // Rand lassen, damit Resize-Handles nicht am Folienrand abgeschnitten werden
  const edge = 1.5;
  return {
    x: clampPercent(xPct - imageWPct / 2, edge, 100 - imageWPct - edge),
    y: clampPercent(yPct - imageHPct / 2, edge, 100 - imageHPct - edge),
  };
}

export function slideHasImageHeroLayout(slide: {
  layout?: string;
  bodyHtml?: string;
  body?: string;
  elements?: { type: string; w?: number; h?: number }[];
}): boolean {
  if (slide.layout !== 'blank' && slide.layout !== 'blank-full') return false;
  const hasLargeImage = slide.elements?.some(
    (el) =>
      el.type === 'image' &&
      (el.w ?? 0) >= 80 &&
      (el.h ?? 0) >= 80,
  );
  if (!hasLargeImage) return false;
  return !htmlToPlain(slide.bodyHtml || slide.body || '').trim();
}

export function findEmptyFullscreenImageElement(
  elements: SlideElement[] | undefined,
): SlideElement | undefined {
  return elements?.find(
    (el) =>
      el.type === 'image' &&
      !el.src?.trim() &&
      (el.w ?? 0) >= 80 &&
      (el.h ?? 0) >= 80,
  );
}

/** Vollbild-Bildslot (Vorlage B): oben links, volle Breite, hohe Fläche. */
export function isHeroSlideImage(el: SlideElement): boolean {
  return (
    el.type === 'image' &&
    (el.x ?? 0) <= 2 &&
    (el.y ?? 0) <= 2 &&
    (el.w ?? 0) >= 90 &&
    (el.h ?? 0) >= 80
  );
}

/** Vollbild-Hintergrundbilder auf blank-Folien: Fußzeile freihalten, Cover-Fit. */
export function normalizeSlideHeroImageElements(slide: PresentationSlide): SlideElement[] {
  const elements = slide.elements ?? [];
  if ((slide.layout !== 'blank' && slide.layout !== 'blank-full') || elements.length === 0) return elements;

  return elements.map((el) => {
    if (el.type !== 'image') return el;

    const isEmptySlot = !el.src?.trim() && (el.w ?? 0) >= 80 && (el.h ?? 0) >= 80;
    if (isEmptySlot) {
      return {
        ...el,
        x: 0,
        y: 0,
        w: 100,
        h: SLIDE_HERO_IMAGE_HEIGHT_PCT,
        imageFit: 'cover' as const,
        stackLayer: 'background' as const,
      };
    }

    if (!isHeroSlideImage(el)) return el;

    const h = el.h ?? 100;
    const patch: Partial<SlideElement> = {};
    if (h > SLIDE_HERO_IMAGE_HEIGHT_PCT) patch.h = SLIDE_HERO_IMAGE_HEIGHT_PCT;
    if (!el.stackLayer) patch.stackLayer = 'background';
    if (el.imageFit !== 'cover' && el.imageFit !== 'contain') patch.imageFit = 'cover';
    if (Object.keys(patch).length === 0) return el;
    return { ...el, ...patch };
  });
}

export function patchBildTemplateHeroElements(
  elements: SlideElement[] | undefined,
): SlideElement[] {
  const list = [...(elements ?? [])];
  const heroIdx = list.findIndex((el) => isHeroSlideImage(el) || (el.type === 'image' && (el.w ?? 0) >= 80));
  if (heroIdx < 0) {
    list.unshift({
      id: 'tpl-bild-img',
      type: 'image',
      x: 0,
      y: 0,
      w: 100,
      h: SLIDE_HERO_IMAGE_HEIGHT_PCT,
      src: '',
      zIndex: 1,
      revealStep: 0,
      stackLayer: 'background',
      imageFit: 'cover',
    });
    return list;
  }
  list[heroIdx] = {
    ...list[heroIdx],
    x: 0,
    y: 0,
    w: 100,
    h: SLIDE_HERO_IMAGE_HEIGHT_PCT,
    stackLayer: 'background',
    imageFit: 'cover',
  };
  return list;
}
