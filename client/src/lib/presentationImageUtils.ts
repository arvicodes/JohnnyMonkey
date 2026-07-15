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
  if (isAlphaFriendlyImageSrc(src)) return 'contain';
  return fit || 'contain';
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
  return types.includes('Files');
}

export function extractImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const fromList = Array.from(dt.files).filter((f) => f.type.startsWith('image/'));
  if (fromList.length > 0) return fromList;

  const fromItems: File[] = [];
  for (const item of Array.from(dt.items)) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
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
