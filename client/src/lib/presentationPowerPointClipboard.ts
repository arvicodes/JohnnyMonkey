/**
 * PowerPoint-Zwischenablage → Johnny-Folie mit freien Elementen.
 * Ergänzt den PPTX-Datei-Import für ⌘V direkt nach dem Kopieren in PowerPoint.
 */
import type { ImportedPptxBox, ImportedPptxSlide } from './presentationPptxImport';
import { normalizeImportedTextHtml } from './presentationPptxImport';

const DEFAULT_SLIDE_W = 960;
const DEFAULT_SLIDE_H = 540;

function roundPct(n: number): number {
  return Math.round(n * 100) / 100;
}

function lengthToPx(raw: string): number {
  const m = String(raw || '')
    .trim()
    .toLowerCase()
    .match(/^([\d.]+)\s*(pt|px|in|cm|mm|pc)?$/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const unit = m[2] || 'px';
  switch (unit) {
    case 'pt':
      return (n * 96) / 72;
    case 'in':
      return n * 96;
    case 'cm':
      return (n * 96) / 2.54;
    case 'mm':
      return (n * 96) / 25.4;
    case 'pc':
      return n * 16;
    default:
      return n;
  }
}

function readStyleLength(style: string, keys: string[]): number | null {
  const normalized = style.replace(/\s+/g, ' ').toLowerCase();
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*:\\s*([^;]+)`, 'i');
    const hit = normalized.match(re);
    if (hit?.[1]) {
      const px = lengthToPx(hit[1].trim());
      if (px > 0) return px;
    }
  }
  return null;
}

function rectFromStyle(
  style: string,
  slideW: number,
  slideH: number,
): { x: number; y: number; w: number; h: number } | null {
  const left =
    readStyleLength(style, ['margin-left', 'left']) ??
    readStyleLength(style, ['mso-position-horizontal']) ??
    null;
  const top =
    readStyleLength(style, ['margin-top', 'top']) ??
    readStyleLength(style, ['mso-position-vertical']) ??
    null;
  const width = readStyleLength(style, ['width']);
  const height = readStyleLength(style, ['height']);
  if (left == null || top == null || width == null || height == null) return null;
  if (width < 2 || height < 2) return null;
  return {
    x: roundPct((left / slideW) * 100),
    y: roundPct((top / slideH) * 100),
    w: roundPct(Math.max((width / slideW) * 100, 1)),
    h: roundPct(Math.max((height / slideH) * 100, 1)),
  };
}

function parseDataImage(src: string): { mime: string; base64: string; name: string } | null {
  const m = src.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1];
  const base64 = m[2];
  if (base64.length < 32) return null;
  const ext = mime.includes('jpeg') ? 'jpg' : mime.replace('image/', '') || 'png';
  return { mime, base64, name: `ppt-clip-${Date.now()}.${ext}` };
}

function elementTextHtml(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img, script, style').forEach((n) => n.remove());
  const html = clone.innerHTML.trim();
  const plain = (clone.textContent || '').replace(/\s+/g, ' ').trim();
  if (!plain && !html) return '';
  return html || `<p>${plain}</p>`;
}

function detectSlideSize(doc: Document): { w: number; h: number } {
  const xml = doc.documentElement.innerHTML;
  const m = xml.match(/slidesize[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/i);
  if (m) {
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    if (w > 100 && h > 100) return { w, h };
  }
  return { w: DEFAULT_SLIDE_W, h: DEFAULT_SLIDE_H };
}

export function isPowerPointClipboardHtml(html: string): boolean {
  if (!html || html.length < 40) return false;
  if (
    /schemas-microsoft-com:office:powerpoint|powerpoint\.slide|progId[^>]*powerpoint|generator[^>]*powerpoint/i.test(
      html,
    )
  ) {
    return true;
  }
  if (/class=["']?slide/i.test(html) && /position\s*:\s*absolute/i.test(html)) {
    return true;
  }
  return false;
}

/** Office-Zwischenablage-HTML → importierbare Folie mit Boxen. */
export function parsePowerPointClipboardHtml(html: string): ImportedPptxSlide | null {
  if (!html.trim()) return null;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    return null;
  }

  const { w: slideW, h: slideH } = detectSlideSize(doc);
  const boxes: ImportedPptxBox[] = [];
  const seen = new Set<string>();

  const pushBox = (box: ImportedPptxBox) => {
    const key = `${box.kind}:${box.x}:${box.y}:${box.w}:${box.h}`;
    if (seen.has(key)) return;
    seen.add(key);
    boxes.push(box);
  };

  const all = Array.from(doc.body.querySelectorAll('*'));
  for (const el of all) {
    const style = (el.getAttribute('style') || '').trim();
    if (!style || !/position\s*:\s*absolute/i.test(style)) continue;
    const rect = rectFromStyle(style, slideW, slideH);
    if (!rect) continue;
    if (rect.w >= 98 && rect.h >= 98) continue;

    const tag = el.tagName.toLowerCase();
    if (tag === 'img') {
      const src = (el.getAttribute('src') || '').trim();
      const img = parseDataImage(src);
      if (img) {
        pushBox({
          kind: 'image',
          ...rect,
          name: img.name,
          mime: img.mime,
          base64: img.base64,
        });
      }
      continue;
    }

    const imgs = el.querySelectorAll('img');
    if (imgs.length === 1 && !(el.textContent || '').trim()) {
      const src = (imgs[0].getAttribute('src') || '').trim();
      const img = parseDataImage(src);
      if (img) {
        pushBox({
          kind: 'image',
          ...rect,
          name: img.name,
          mime: img.mime,
          base64: img.base64,
        });
        continue;
      }
    }

    const textHtml = elementTextHtml(el);
    if (textHtml) {
      pushBox({
        kind: 'text',
        ...rect,
        html: normalizeImportedTextHtml(textHtml),
      });
    }
  }

  if (boxes.length === 0) {
    const plain = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    if (plain.length >= 4) {
      pushBox({
        kind: 'text',
        x: 8,
        y: 12,
        w: 84,
        h: 76,
        html: normalizeImportedTextHtml(`<p>${plain}</p>`),
      });
    }
  }

  if (boxes.length === 0) return null;

  return {
    index: 0,
    title: '',
    bodyLines: [],
    notes: '',
    images: [],
    boxes,
  };
}

/** Für ⌘V ohne Paste-Event: Clipboard API (Safari/Chrome). */
export async function readClipboardForPowerPointPaste(): Promise<{ html: string; pptxFiles: File[] }> {
  const out = { html: '', pptxFiles: [] as File[] };
  const nav = navigator.clipboard as Clipboard & { read?: () => Promise<ClipboardItem[]> };
  if (!nav?.read) return out;
  try {
    const items = await nav.read();
    for (const item of items) {
      for (const type of item.types) {
        const t = type.toLowerCase();
        if (t === 'text/html') {
          out.html = await (await item.getType(type)).text();
        } else if (
          t.includes('presentationml') ||
          t.includes('powerpoint') ||
          t.endsWith('.pptx')
        ) {
          const blob = await item.getType(type);
          out.pptxFiles.push(
            new File([await blob.arrayBuffer()], 'clipboard.pptx', {
              type: type.includes('/') ? type : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            }),
          );
        }
      }
    }
  } catch {
    /* Berechtigung / nicht verfügbar */
  }
  return out;
}
