import { isLikelyImageFile } from './storyImageUtils';
import { createImagePreviewUrl } from './heicPreview';

function hasVideoExtension(pathOrName: string): boolean {
  return /\.(mov|mp4|m4v|qt|3gp)(\?.*)?$/i.test(pathOrName.trim());
}

/** MIME oder Dateiendung (macOS liefert oft leeren type beim Drag & Drop). */
export function isLikelyVideoFile(file: File): boolean {
  const t = file.type?.toLowerCase() ?? '';
  if (t.startsWith('video/')) return true;
  const name = file.name?.trim() ?? '';
  if (hasVideoExtension(name)) return true;
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() ?? '';
  return hasVideoExtension(rel);
}

export function isLikelyStoryMediaFile(file: File): boolean {
  return isLikelyImageFile(file) || isLikelyVideoFile(file);
}

export function isStoryVideoSrc(src: string): boolean {
  const s = (src?.trim() ?? '').split(/[?#]/)[0];
  return /\.(mov|mp4|m4v|qt)$/i.test(s);
}

/** Vorschau-URL für Bilder (inkl. HEIC-Platzhalter) und Videos (blob:). */
export function createStoryMediaPreviewUrl(file: File): string {
  if (isLikelyVideoFile(file)) {
    return URL.createObjectURL(file);
  }
  return createImagePreviewUrl(file);
}
