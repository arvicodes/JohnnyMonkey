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

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|heic|heif|tif|tiff|svg)$/i;

/** MIME kann unter macOS leer sein — dann Dateiname prüfen. */
export function isLikelyImageFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  if (t && t !== 'application/octet-stream') return false;
  return IMAGE_EXT_RE.test(file.name || '');
}

export function extractImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const fromList = Array.from(dt.files).filter(isLikelyImageFile);
  if (fromList.length > 0) return fromList;

  const fromItems: File[] = [];
  for (const item of Array.from(dt.items)) {
    if (item.kind !== 'file') continue;
    const mime = (item.type || '').toLowerCase();
    // Vor dem Drop ist type oft leer — File erst nach getAsFile prüfen
    if (mime && !mime.startsWith('image/') && mime !== 'application/octet-stream') continue;
    const file = item.getAsFile();
    if (file && isLikelyImageFile(file)) fromItems.push(file);
  }
  return fromItems;
}

export function clampPercent(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function slideDropPositionForImage(
  clientX: number,
  clientY: number,
  slideEl: HTMLElement,
  imageWPct = 45,
  imageHPct = 40,
): { x: number; y: number } {
  const rect = slideEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 25, y: 22 };
  }
  const xPct = ((clientX - rect.left) / rect.width) * 100;
  const yPct = ((clientY - rect.top) / rect.height) * 100;
  return {
    x: clampPercent(xPct - imageWPct / 2, 0, 100 - imageWPct),
    y: clampPercent(yPct - imageHPct / 2, 0, 100 - imageHPct),
  };
}

export const DEFAULT_FLOATING_IMAGE_W = 45;
export const DEFAULT_FLOATING_IMAGE_H = 40;

export function slideHasImageHeroLayout(slide: {
  layout?: string;
  bodyHtml?: string;
  body?: string;
  elements?: { type: string; w?: number; h?: number }[];
}): boolean {
  if (slide.layout !== 'blank') return false;
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
  if (slide.layout !== 'blank' || elements.length === 0) return elements;

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
