import { createSlideFromLayout } from './presentationLayouts';
import { textToHtml, type PresentationSlide, type SlideElement } from './presentationDeck';
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
      shapeKind: 'rect' | 'ellipse';
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

/**
 * PPTX-Boxen → freie Folien-Elemente (Text / Bild / Form) auf blank-Layout.
 */
export function buildLayoutFaithfulSlideFromImport(
  imported: ImportedPptxSlide,
  order: number,
  imagePathByKey: Map<string, string>,
): PresentationSlide {
  const base = createSlideFromLayout(order, 'blank');
  const notes = imported.notes.trim();
  const elements: SlideElement[] = [];
  let z = 1;
  const boxes = imported.boxes || [];

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
    const h = roundBox(Math.max(box.h, 1));
    const idBase = `el-pptx-${order}-${z}-${Date.now().toString(36)}`;

    if (box.kind === 'shape') {
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
      elements.push({
        id: `${idBase}-text`,
        type: 'text',
        x,
        y,
        w,
        h,
        html: box.html || '',
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

export async function parsePptxFile(file: File, loginCode: string): Promise<ImportedPptxResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/presentation/parse-pptx', {
    method: 'POST',
    headers: { 'x-login-code': loginCode },
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
