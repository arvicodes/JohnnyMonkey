import { createImagePreviewUrl, isHeicFile, heicFileToJpegBlob } from './heicPreview';

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|avif|svg|heic|heif)$/i;

/** MIME oder Dateiendung (macOS liefert oft leeren type beim Drag & Drop). */
export function isLikelyImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const name = file.name?.trim() ?? '';
  return IMAGE_EXT_RE.test(name);
}

/** Dateien aus Drag & Drop / Zwischenablage sammeln. */
export function collectImageFilesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const out: File[] = [];
  const seen = new Set<File>();
  const push = (f: File | null) => {
    if (!f || seen.has(f) || !isLikelyImageFile(f)) return;
    seen.add(f);
    out.push(f);
  };
  if (dt.files?.length) {
    for (let i = 0; i < dt.files.length; i++) push(dt.files[i]);
  }
  if (dt.items?.length) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === 'file') push(item.getAsFile());
    }
  }
  return out;
}

/** data:-URL → blob:-URL (zuverlässiger in der Vorschau als sehr lange data:-Strings). */
export function dataUrlToBlobUrl(dataUrl: string): string | null {
  try {
    const comma = dataUrl.indexOf(',');
    if (comma < 0) return null;
    const header = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mime = header.match(/data:([^;]+)/i)?.[1] || 'image/jpeg';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

/** Bilder für Stories/Websites verkleinern (IndexedDB + Editor). */
export async function fileToStoryImageDataUrl(
  file: File,
  maxChars = 420_000,
): Promise<string> {
  const steps = [
    { maxDim: 1200, quality: 0.82 },
    { maxDim: 960, quality: 0.74 },
    { maxDim: 720, quality: 0.66 },
    { maxDim: 540, quality: 0.58 },
  ];
  let last = '';
  for (const { maxDim, quality } of steps) {
    last = await renderFileToDataUrl(file, maxDim, quality);
    if (last.length <= maxChars) return last;
  }
  return last;
}

async function fileForCanvas(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;
  const jpeg = await heicFileToJpegBlob(file);
  return new File([jpeg], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
}

async function renderFileToDataUrl(file: File, maxDim: number, quality: number): Promise<string> {
  const renderFile = await fileForCanvas(file);
  const blobUrl = await createImagePreviewUrl(renderFile);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = document.createElement('img');
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
      el.src = blobUrl;
    });
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas nicht verfügbar');
    ctx.drawImage(img, 0, 0, width, height);
    const useJpeg = file.type === 'image/jpeg' || file.type === 'image/jpg' || !file.type.includes('png');
    return canvas.toDataURL(useJpeg ? 'image/jpeg' : 'image/png', useJpeg ? quality : undefined);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
