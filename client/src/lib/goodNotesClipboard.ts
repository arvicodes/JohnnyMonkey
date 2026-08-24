/**
 * GoodNotes hat keine öffentliche API.
 * Inhalt kommt per System-Zwischenablage: Lasso → Kopieren → in JohnnyMonkey einfügen.
 * Auf dem iPad erscheint „Einfügen“ nur in einem echten Text-/Edit-Feld — nicht auf der Folie.
 */
import { extractImageFilesFromDataTransfer } from './presentationImageUtils';

function clipboardTypes(dt: DataTransfer): string[] {
  try {
    return Array.from(dt.types || []);
  } catch {
    return [];
  }
}

function asImageFile(file: File): File {
  if (file.type && file.type.startsWith('image/')) return file;
  return new File([file], file.name || `goodnotes-${Date.now()}.png`, { type: 'image/png' });
}

/** Dateien sofort im Paste-Event lesen (DataTransfer ist danach oft leer). */
export function snapshotClipboardFiles(dt: DataTransfer | null | undefined): File[] {
  if (!dt) return [];
  const out: File[] = [];
  const seen = new Set<string>();
  const add = (f: File | null | undefined) => {
    if (!f || f.size < 8) return;
    const key = `${f.size}:${f.type}:${f.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(asImageFile(f));
  };
  for (const item of Array.from(dt.items || [])) {
    add(item.getAsFile());
  }
  for (const f of Array.from(dt.files || [])) add(f);
  const extracted = extractImageFilesFromDataTransfer(dt);
  extracted.forEach((f) => add(f));
  return out;
}

export function clipboardHasImage(dt: DataTransfer | null | undefined): boolean {
  if (!dt) return false;
  if (snapshotClipboardFiles(dt).length > 0) return true;
  const types = clipboardTypes(dt).map((t) => t.toLowerCase());
  if (types.some((t) => t.startsWith('image/') || t === 'files' || t.includes('png') || t.includes('jpeg') || t.includes('tiff'))) {
    return true;
  }
  if (Array.from(dt.items || []).some((it) => (it.type || '').toLowerCase().startsWith('image/'))) {
    return true;
  }
  const html = dt.getData('text/html') || '';
  return /<img[\s>]/i.test(html);
}

async function fileFromImageSrc(src: string): Promise<File | null> {
  const url = (src || '').trim();
  if (!url) return null;
  if (!(url.startsWith('data:image/') || url.startsWith('blob:'))) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    if (blob.size < 8) return null;
    const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
    const ext = mime.replace('image/', '').replace('jpeg', 'jpg') || 'png';
    return new File([blob], `goodnotes-${Date.now()}.${ext}`, { type: mime });
  } catch {
    return null;
  }
}

function imageSrcsFromHtml(html: string): string[] {
  if (!html) return [];
  const out: string[] = [];
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('img').forEach((img) => {
      const src = (img.getAttribute('src') || img.getAttribute('data-src') || '').trim();
      if (src) out.push(src);
    });
  } catch {
    const m = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const hit of m) out.push(hit[1]);
  }
  return out;
}

/** Bilder aus einem Paste-/Drop-DataTransfer (GoodNotes, Fotos, Browser). */
export async function collectPasteImages(dt: DataTransfer | null | undefined): Promise<File[]> {
  if (!dt) return [];
  const files = snapshotClipboardFiles(dt);
  if (files.length > 0) return files;

  const srcs = imageSrcsFromHtml(dt.getData('text/html') || '');
  const fromHtml: File[] = [];
  for (const src of srcs) {
    const file = await fileFromImageSrc(src);
    if (file) fromHtml.push(file);
  }
  return fromHtml;
}

/** Nach App-Wechsel: Zwischenablage per Geste lesen (Safari erlaubt das oft nicht). */
export async function readImagesFromSystemClipboard(): Promise<File[]> {
  const nav = navigator.clipboard as Clipboard & { read?: () => Promise<ClipboardItem[]> };
  if (!nav?.read) return [];
  try {
    const items = await nav.read();
    const files: File[] = [];
    for (const item of items) {
      const type =
        item.types.find((t) => t.startsWith('image/')) ||
        item.types.find((t) => /png|jpeg|jpg|gif|webp|tiff/i.test(t));
      if (!type) continue;
      const blob = await item.getType(type);
      const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
      const ext = mime.replace('image/', '').replace('jpeg', 'jpg') || 'png';
      files.push(new File([blob], `goodnotes-${Date.now()}.${ext}`, { type: mime }));
    }
    return files;
  } catch {
    return [];
  }
}

export function isTypingField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return false;
}
