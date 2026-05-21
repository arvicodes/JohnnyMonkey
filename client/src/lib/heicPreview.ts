import heic2any from 'heic2any';

export function isHeicFile(file: File): boolean {
  const n = file.name?.toLowerCase() ?? '';
  const t = file.type?.toLowerCase() ?? '';
  return t === 'image/heic' || t === 'image/heif' || /\.heic$/i.test(n) || /\.heif$/i.test(n);
}

/** HEIC/HEIF → JPEG-Blob (Browser, sonst Server-API). */
export async function heicFileToJpegBlob(file: File): Promise<Blob> {
  const buf = await file.arrayBuffer();
  const typed = new Blob([buf], { type: 'image/heic' });
  try {
    const result = await heic2any({ blob: typed, toType: 'image/jpeg', quality: 0.88 });
    return Array.isArray(result) ? result[0] : result;
  } catch {
    const fd = new FormData();
    fd.append('file', new File([buf], file.name || 'photo.heic', { type: 'image/heic' }));
    const res = await fetch('/api/story-sites/convert-heic', { method: 'POST', body: fd });
    if (!res.ok) {
      throw new Error('HEIC-Konvertierung fehlgeschlagen');
    }
    return res.blob();
  }
}

/** Vorschau-URL — HEIC wird zu JPEG gewandelt. */
export async function createImagePreviewUrl(file: File): Promise<string> {
  if (!isHeicFile(file)) {
    return URL.createObjectURL(file);
  }
  try {
    const jpeg = await heicFileToJpegBlob(file);
    return URL.createObjectURL(jpeg);
  } catch {
    return URL.createObjectURL(file);
  }
}
