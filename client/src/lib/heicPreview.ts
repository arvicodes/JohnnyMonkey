/** Sofort-Vorschau für HEIC (keine Browser-Konvertierung beim Scan). */
export const HEIC_PREVIEW_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
      '<rect fill="#e8e4dc" width="120" height="120"/>' +
      '<text x="60" y="58" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#5d4037">HEIC</text>' +
      '<text x="60" y="74" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9" fill="#8d6e63">wird geladen…</text>' +
      '</svg>',
  );

export function isHeicFile(file: File): boolean {
  const n = file.name?.toLowerCase() ?? '';
  const t = file.type?.toLowerCase() ?? '';
  return t === 'image/heic' || t === 'image/heif' || /\.heic$/i.test(n) || /\.heif$/i.test(n);
}

/** Vorschau im Ordner-Scan — HEIC ohne Konvertierung (spart viel Zeit). */
export function createImagePreviewUrl(file: File): string {
  if (!isHeicFile(file)) {
    return URL.createObjectURL(file);
  }
  return HEIC_PREVIEW_PLACEHOLDER;
}

/** Kleine JPEG-Vorschau über Server (macOS sips, schnell verkleinert). */
export async function fetchHeicPreviewUrl(file: File, maxEdge = 480): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file, file.name || 'photo.heic');
  const res = await fetch(`/api/story-sites/convert-heic?max=${maxEdge}`, { method: 'POST', body: fd });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** HEIC → JPEG für Galerie/Canvas (zuerst Server, kein heic2any bei großen Dateien). */
export async function heicFileToJpegBlob(file: File): Promise<Blob> {
  const fd = new FormData();
  fd.append('file', file, file.name || 'photo.heic');
  const res = await fetch('/api/story-sites/convert-heic', { method: 'POST', body: fd });
  if (res.ok) return res.blob();

  const heic2any = (await import('heic2any')).default;
  const buf = await file.arrayBuffer();
  const typed = new Blob([buf], { type: 'image/heic' });
  const result = await heic2any({ blob: typed, toType: 'image/jpeg', quality: 0.82 });
  return Array.isArray(result) ? result[0] : result;
}
