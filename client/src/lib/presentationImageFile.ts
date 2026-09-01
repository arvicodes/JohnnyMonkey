/**
 * iOS/Safari liefert beim zweiten Kamera-Foto oft dieselbe File-Referenz
 * oder denselben Namen (image.jpg). Bytes sofort kopieren + eindeutiger Name.
 */

function guessImageExt(file: File): string {
  const fromName = (file.name || '').split('.').pop()?.toLowerCase() || '';
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName) && fromName !== 'blob') return fromName;
  const t = (file.type || '').toLowerCase();
  if (t.includes('png')) return 'png';
  if (t.includes('webp')) return 'webp';
  if (t.includes('gif')) return 'gif';
  if (t.includes('heic') || t.includes('heif')) return 'jpg';
  return 'jpg';
}

function mimeForExt(ext: string, fallback?: string): string {
  if (fallback && fallback.startsWith('image/')) return fallback;
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export function uniqueImageFileName(prefix: string, ext: string): string {
  const safePrefix = (prefix || 'bild').replace(/[^\w.\-äöüÄÖÜß]+/gi, '_') || 'bild';
  const safeExt = (ext || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${safePrefix}-${Date.now()}-${rand}.${safeExt}`;
}

/** Bytes sofort lesen — vor jedem weiteren await, bevor iOS die File austauscht. */
export async function snapshotImageFile(file: File, prefix: string): Promise<File> {
  const bytes = await file.arrayBuffer();
  const ext = guessImageExt(file);
  return new File([bytes], uniqueImageFileName(prefix, ext), {
    type: mimeForExt(ext, file.type),
    lastModified: Date.now(),
  });
}
