import { createSlideFromLayout } from './presentationLayouts';
import {
  SLIDE_REF_HEIGHT,
  textToHtml,
  type PresentationSlide,
  type SlideElement,
} from './presentationDeck';
import { hydratePresentationHtmlFontSizes, PRESENTATION_CONTENT_FONT_PX } from './presentationFontSize';
import { sanitizePresentationHtml } from './presentationRichText';
import type { SlideTemplateKind, SlideTemplatesStore } from './presentationSlideTemplates';
import { JOHNNY_PRESENTATION } from './presentationTheme';

export type ImportedPptxImage = {
  name: string;
  mime: string;
  base64: string;
};

export type ImportedPptxBox =
  | {
      kind: 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      html: string;
      fillColor?: string | null;
      strokeColor?: string | null;
      fontSizePt?: number | null;
      bold?: boolean;
      color?: string | null;
    }
  | {
      kind: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      name: string;
      mime: string;
      base64: string;
    }
  | {
      kind: 'shape';
      x: number;
      y: number;
      w: number;
      h: number;
      fillColor?: string | null;
      strokeColor?: string | null;
      shapeKind: 'rect' | 'ellipse' | 'line' | 'arrow';
    };

export type ImportedPptxSlide = {
  index: number;
  title: string;
  bodyLines: string[];
  notes: string;
  images: ImportedPptxImage[];
  boxes?: ImportedPptxBox[];
  backgroundColor?: string | null;
};

export type ImportedPptxResult = {
  fileName: string;
  slideCount: number;
  slides: ImportedPptxSlide[];
};

export const PPTX_IMPORT_TEMPLATE_OPTIONS: { kind: SlideTemplateKind; label: string }[] = [
  { kind: 'auftrag', label: 'Auftrag (nur Text-Fallback)' },
  { kind: 'bild', label: 'Bild' },
];

export function suggestTemplateKind(slide: ImportedPptxSlide): SlideTemplateKind {
  if (slide.boxes && slide.boxes.length > 0) return 'auftrag';
  const hasText = Boolean(slide.title.trim() || slide.bodyLines.length > 0);
  const hasImages = slide.images.length > 0;
  if (hasImages && !hasText) return 'bild';
  return 'auftrag';
}

export function base64ToFile(image: ImportedPptxImage, index: number): File {
  const bin = atob(image.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const safe = (image.name || `import-${index}.png`).replace(/[^\w.\-äöüÄÖÜß]+/gi, '_');
  const name = `pptx-${Date.now()}-${index}-${safe}`;
  return new File([bytes], name, { type: image.mime || 'image/png' });
}

function roundBox(n: number): number {
  return Math.round(n * 100) / 100;
}

function imageKey(name: string, base64: string): string {
  return `${name}|${base64.slice(0, 32)}`;
}

function nearSameRect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  eps = 1.2,
): boolean {
  return (
    Math.abs(a.x - b.x) <= eps &&
    Math.abs(a.y - b.y) <= eps &&
    Math.abs(a.w - b.w) <= eps &&
    Math.abs(a.h - b.h) <= eps
  );
}

/** Formen entfernen, die deckungsgleich unter einem Textfeld liegen (Alt-Importe). */
function dropShapesUnderText(boxes: ImportedPptxBox[]): ImportedPptxBox[] {
  const texts = boxes.filter((b): b is Extract<ImportedPptxBox, { kind: 'text' }> => b.kind === 'text');
  return boxes.filter((b) => {
    if (b.kind !== 'shape') return true;
    const covered = texts.some((t) => nearSameRect(t, b));
    if (!covered) return true;
    // Fill vom Shape auf Text übernehmen, falls Text noch keins hat
    const text = texts.find((t) => nearSameRect(t, b));
    if (text && !text.fillColor && b.fillColor) {
      text.fillColor = b.fillColor;
      text.strokeColor = text.strokeColor || b.strokeColor;
    }
    return false;
  });
}

function countTextLines(html: string): number {
  const parts = html
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return Math.max(1, parts.length);
}

/** Platzhalter-Höhe auf sinnvolle Texthöhe einkürzen. */
function tightenTextHeight(
  html: string,
  fontSizePt: number | null | undefined,
  boxH: number,
): number {
  const lines = countTextLines(html);
  const fs = fontSizePt && fontSizePt > 0 ? fontSizePt : PRESENTATION_CONTENT_FONT_PX;
  const pxPerPct = SLIDE_REF_HEIGHT / 100;
  const neededPct = (lines * fs * 1.45 + 20) / pxPerPct;
  if (boxH > neededPct * 1.75 && boxH > neededPct + 5) {
    return roundBox(Math.min(boxH, Math.max(neededPct, 5)));
  }
  return roundBox(boxH);
}

/**
 * Import-HTML → Johnny-tauglich: sanitize, Schriftgrößen sichtbar, flache Struktur.
 */
export function normalizeImportedTextHtml(
  html: string,
  opts?: { fontSizePt?: number | null; color?: string | null },
): string {
  let out = (html || '').trim() || '<p></p>';
  out = sanitizePresentationHtml(out);
  out = hydratePresentationHtmlFontSizes(out);

  // Einheitliche Größe: einen Wrapper statt vieler Run-Spans
  if (typeof document !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(out, 'text/html');
      const spans = Array.from(doc.body.querySelectorAll('[data-pres-fs]')) as HTMLElement[];
      const sizes = new Set(
        spans
          .map((s) => parseInt(s.getAttribute('data-pres-fs') || '', 10))
          .filter((n) => Number.isFinite(n) && n > 0),
      );
      const dominant =
        sizes.size === 1
          ? [...sizes][0]
          : opts?.fontSizePt && opts.fontSizePt > 0
            ? Math.round(opts.fontSizePt)
            : null;

      if (dominant && spans.length > 0) {
        // Innere fs-Spans entpacken wenn alle gleich
        spans.forEach((s) => {
          const n = parseInt(s.getAttribute('data-pres-fs') || '', 10);
          if (n !== dominant) return;
          while (s.firstChild) s.parentNode?.insertBefore(s.firstChild, s);
          s.remove();
        });
        const inner = doc.body.innerHTML;
        out = `<div data-pres-fs="${dominant}" style="font-size:${dominant}px">${inner}</div>`;
      } else {
        out = doc.body.innerHTML;
      }

      if (opts?.color && !/data-pres-color=|style="[^"]*color:/i.test(out)) {
        out = `<div data-pres-color="${opts.color}" style="color:${opts.color}">${out}</div>`;
      }
    } catch {
      /* keep hydrated */
    }
  }

  return out || '<p></p>';
}

/**
 * PPTX-Boxen → freie Folien-Elemente (Text / Bild / Form) auf blank-Layout.
 * Text ist editierbar wie Johnny-Felder: sichtbare Größen, Fill am Text, keine Doppel-Boxen.
 */
export function buildLayoutFaithfulSlideFromImport(
  imported: ImportedPptxSlide,
  order: number,
  imagePathByKey: Map<string, string>,
): PresentationSlide {
  const base = createSlideFromLayout(order, 'blank-full');
  const notes = imported.notes.trim();
  const elements: SlideElement[] = [];
  let z = 1;
  const boxes = dropShapesUnderText([...(imported.boxes || [])]);

  const bg = imported.backgroundColor?.trim();
  if (bg && bg.toUpperCase() !== '#FFFFFF' && bg.toUpperCase() !== '#FFF') {
    elements.push({
      id: `el-pptx-${order}-bg-${Date.now().toString(36)}`,
      type: 'shape',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      shapeKind: 'rect',
      fillColor: bg,
      strokeColor: bg,
      strokeWidth: 0,
      zIndex: z++,
      stackLayer: 'background',
    });
  }

  for (const box of boxes) {
    const x = roundBox(box.x);
    const y = roundBox(box.y);
    const w = roundBox(Math.max(box.w, 1));
    const idBase = `el-pptx-${order}-${z}-${Date.now().toString(36)}`;

    if (box.kind === 'shape') {
      const h = roundBox(Math.max(box.h, 1));
      elements.push({
        id: `${idBase}-shape`,
        type: 'shape',
        x,
        y,
        w,
        h,
        shapeKind: box.shapeKind || 'rect',
        fillColor: box.fillColor || '#FFFFFF',
        strokeColor: box.strokeColor || box.fillColor || '#BDBDBD',
        strokeWidth: box.strokeColor ? 2 : 0,
        zIndex: z++,
        stackLayer: 'background',
      });
      continue;
    }

    if (box.kind === 'image') {
      const h = roundBox(Math.max(box.h, 1));
      const src = imagePathByKey.get(imageKey(box.name, box.base64));
      if (!src) continue;
      elements.push({
        id: `${idBase}-img`,
        type: 'image',
        x,
        y,
        w,
        h,
        src,
        imageFit: 'contain',
        zIndex: z++,
        stackLayer: 'foreground',
      });
      continue;
    }

    if (box.kind === 'text') {
      const html = normalizeImportedTextHtml(box.html || '', {
        fontSizePt: box.fontSizePt,
        color: box.color,
      });
      const h = tightenTextHeight(html, box.fontSizePt, Math.max(box.h, 1));
      elements.push({
        id: `${idBase}-text`,
        type: 'text',
        x,
        y,
        w,
        h,
        html,
        fillColor: box.fillColor || undefined,
        strokeColor: box.strokeColor || undefined,
        strokeWidth: box.strokeColor ? 2 : undefined,
        zIndex: z++,
        stackLayer: 'foreground',
      });
    }
  }

  const title =
    imported.title.trim() ||
    boxes
      .filter((b): b is Extract<ImportedPptxBox, { kind: 'text' }> => b.kind === 'text')
      .sort((a, b) => a.y - b.y)[0]
      ?.html.replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) ||
    `Import ${order + 1}`;

  return {
    ...base,
    title,
    titleHtml: '',
    body: '',
    bodyHtml: '',
    accentColor: JOHNNY_PRESENTATION.primary,
    elements,
    speakerNotes: notes,
    speakerNotesHtml: notes ? textToHtml(notes) : '',
  };
}

/** @deprecated alter Text→Vorlage-Weg */
export function buildStyledSlideFromImport(
  imported: ImportedPptxSlide,
  _kind: SlideTemplateKind,
  order: number,
  _lessonPath: string,
  _store: SlideTemplatesStore,
  savedImagePaths: string[],
): PresentationSlide | null {
  const map = new Map<string, string>();
  const images = imported.images || [];
  images.forEach((img, i) => {
    if (savedImagePaths[i]) map.set(imageKey(img.name, img.base64), savedImagePaths[i]);
  });
  return buildLayoutFaithfulSlideFromImport(imported, order, map);
}

export function isPptxFile(file: File): boolean {
  const n = (file.name || '').toLowerCase();
  const t = (file.type || '').toLowerCase();
  return n.endsWith('.pptx') || t.includes('presentation') || t.includes('powerpoint');
}

export async function parsePptxFile(file: File, loginCode?: string): Promise<ImportedPptxResult> {
  const form = new FormData();
  form.append('file', file);
  const headers: Record<string, string> = {};
  const code = (loginCode || localStorage.getItem('loginCode') || '').trim();
  if (code) headers['x-login-code'] = code;
  const res = await fetch('/api/presentation/parse-pptx', {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string; error?: string }).message ||
        (err as { error?: string }).error ||
        'PPTX-Import fehlgeschlagen',
    );
  }
  return res.json();
}
