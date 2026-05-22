import { resolveStoryImageSrc } from './storyPageLayout';
import { importPhotoFilesUpload } from './storySitePhotoImport';
import { isStoryVideoSrc } from './storyMediaUtils';

/** Scrapbook-Vorschau: etwas kräftiger, heller, lebendiger. */
export const STORY_PHOTO_FILTER = 'contrast(1.15) brightness(1.08) saturate(1.1)';

export const storyPhotoDisplaySx = {
  filter: STORY_PHOTO_FILTER,
};

export function applyStoryPhotoEnhancementToImageData(imageData: ImageData): void {
  const contrast = 1.12;
  const brightness = 12;
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      v = (v - 128) * contrast + 128 + brightness;
      d[i + c] = Math.max(0, Math.min(255, Math.round(v)));
    }
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mime = header.match(/data:([^;]+)/i)?.[1] || 'image/jpeg';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function fetchBlobForStorySrc(src: string): Promise<Blob> {
  const trimmed = src.trim();
  if (/^data:image\//i.test(trimmed)) {
    return dataUrlToBlob(trimmed);
  }
  if (trimmed.startsWith('blob:')) {
    const res = await fetch(trimmed);
    if (!res.ok) throw new Error('Bild konnte nicht geladen werden');
    return res.blob();
  }
  const url = resolveStoryImageSrc(trimmed);
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`Bild konnte nicht geladen werden (${res.status})`);
  }
  return res.blob();
}

async function blobToImageBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Bildbearbeitung wird von diesem Browser nicht unterstützt');
  }
  try {
    return await createImageBitmap(blob, {
      imageOrientation: 'from-image',
    } as unknown as ImageBitmapOptions);
  } catch {
    return createImageBitmap(blob);
  }
}

/** Große iPhone-Fotos vor dem Drehen verkleinern (Speicher/Canvas). */
async function downscaleBitmap(bitmap: ImageBitmap, maxDim: number): Promise<ImageBitmap> {
  const max = Math.max(bitmap.width, bitmap.height);
  if (max <= maxDim) return bitmap;

  const scale = maxDim / max;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas nicht verfügbar');
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const scaledBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Bild konnte nicht verkleinert werden'))),
      'image/jpeg',
      0.9,
    );
  });
  return blobToImageBitmap(scaledBlob);
}

/** Galerie-Quelle (/api/, data:, blob:) → ImageBitmap zum Bearbeiten. */
export async function loadStoryImageBitmap(src: string, maxDim = 2400): Promise<ImageBitmap> {
  const blob = await fetchBlobForStorySrc(src);
  const bitmap = await blobToImageBitmap(blob);
  return downscaleBitmap(bitmap, maxDim);
}

/** Bitmap zeichnen, aufhübschen, optional drehen → JPEG data-URL. */
export async function bitmapToEnhancedDataUrl(
  bitmap: ImageBitmap,
  opts: { rotation?: number; maxDim?: number; quality?: number } = {},
): Promise<string> {
  const rotation = (((opts.rotation ?? 0) % 360) + 360) % 360;
  const maxDim = opts.maxDim ?? 1200;
  const quality = opts.quality ?? 0.86;

  const sw = bitmap.width;
  const sh = bitmap.height;
  if (!sw || !sh) {
    bitmap.close();
    throw new Error('Bild konnte nicht geladen werden');
  }

  const swap = rotation === 90 || rotation === 270;
  let dw = swap ? sh : sw;
  let dh = swap ? sw : sh;
  const fit = Math.min(1, maxDim / Math.max(dw, dh));
  dw = Math.max(1, Math.round(dw * fit));
  dh = Math.max(1, Math.round(dh * fit));

  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas nicht verfügbar');
  }

  try {
    ctx.fillStyle = '#fffef9';
    ctx.fillRect(0, 0, dw, dh);
    ctx.save();
    ctx.translate(dw / 2, dh / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    const iw = Math.round(sw * fit);
    const ih = Math.round(sh * fit);
    ctx.drawImage(bitmap, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, dw, dh);
    applyStoryPhotoEnhancementToImageData(imageData);
    ctx.putImageData(imageData, 0, 0);

    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    bitmap.close();
  }
}

/** Galerie-Bild um 90° drehen; Ergebnis wird auf dem Server gespeichert. */
export async function rotateStoryGalleryImage90(siteId: string, src: string): Promise<string> {
  if (isStoryVideoSrc(src)) {
    throw new Error('Videos können nicht gedreht werden.');
  }

  const bitmap = await loadStoryImageBitmap(src, 2400);
  const dataUrl = await bitmapToEnhancedDataUrl(bitmap, { rotation: 90, maxDim: 1600, quality: 0.88 });
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], `rot-${Date.now()}.jpg`, { type: 'image/jpeg' });
  const urls = await importPhotoFilesUpload(siteId, '', [file]);
  if (!urls[0]) throw new Error('Speichern nach Drehen fehlgeschlagen');
  return urls[0];
}
