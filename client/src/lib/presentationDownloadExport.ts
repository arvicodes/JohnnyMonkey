import { jsPDF } from 'jspdf';
import {
  PresentationAnnotations,
  PresentationDeck,
  PresentationSlide,
  htmlToPlain,
  normalizeDeck,
  slideLogicalHeight,
  sortSlides,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from './presentationDeck';
import { getSlideMaxRevealSteps } from './presentationReveal';
import { captureSlideCanvas, triggerBlobDownload } from './presentationExport';
import { buildImagePptxBlob, canvasToPngBytes } from './presentationImagePptx';

export type PresentationDownloadScope = 'all' | 'current';

export type PresentationDownloadContentOptions = {
  /** Einblendungen im Endzustand (alle Schritte sichtbar). */
  fullReveal: boolean;
  includeImages: boolean;
  includeSpeakerNotes: boolean;
};

export type PresentationDownloadFormatOptions = {
  pdf: boolean;
  pptx: boolean;
};

export type PresentationDownloadRequest = {
  scope: PresentationDownloadScope;
  currentSlideId?: string;
  formats: PresentationDownloadFormatOptions;
  content: PresentationDownloadContentOptions;
  /** Live-Tinte aus dem Unterricht (Annotationen). */
  includeLessonStrokes?: boolean;
};

export type PresentationDownloadProgress = {
  phase: string;
  current?: number;
  total?: number;
};

function safeFileBase(deck: PresentationDeck): string {
  const raw = (deck.title || deck.lessonPath?.split('/').pop() || 'Praesentation').trim();
  return raw.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 80) || 'Praesentation';
}

function pickSlides(deck: PresentationDeck, scope: PresentationDownloadScope, currentSlideId?: string) {
  const slides = sortSlides(normalizeDeck(deck).slides);
  if (scope === 'current' && currentSlideId) {
    const one = slides.find((s) => s.id === currentSlideId);
    return one ? [one] : [];
  }
  return slides;
}

function revealCaptureOptions(
  slide: PresentationSlide,
  content: PresentationDownloadContentOptions,
): { revealStep: number; revealEnabled: boolean } {
  if (!content.fullReveal) {
    return { revealStep: 0, revealEnabled: true };
  }
  const max = getSlideMaxRevealSteps(slide);
  return { revealStep: max > 0 ? max : 999, revealEnabled: max > 0 };
}

function speakerNotesPlain(slide: PresentationSlide): string {
  const parts = [
    htmlToPlain(slide.speakerNotesHtml || ''),
    (slide.speakerNotes || '').trim(),
    htmlToPlain(slide.materialHtml || ''),
    htmlToPlain(slide.preparationHtml || ''),
  ].filter(Boolean);
  return parts.join('\n\n').trim();
}

async function captureSlides(
  deck: PresentationDeck,
  slides: PresentationSlide[],
  annotations: PresentationAnnotations,
  content: PresentationDownloadContentOptions,
  includeLessonStrokes: boolean,
  onProgress?: (p: PresentationDownloadProgress) => void,
): Promise<Array<{ slide: PresentationSlide; canvas: HTMLCanvasElement; notes: string }>> {
  const normalized = normalizeDeck(deck);
  const total = slides.length;
  const out: Array<{ slide: PresentationSlide; canvas: HTMLCanvasElement; notes: string }> = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    onProgress?.({ phase: 'Folien rendern…', current: i + 1, total });
    const strokes = annotations.bySlideId[slide.id] ?? [];
    const { revealStep, revealEnabled } = revealCaptureOptions(slide, content);
    const canvas = await captureSlideCanvas(
      normalized,
      slide,
      i,
      total,
      strokes,
      includeLessonStrokes,
      2,
      {
        revealStep,
        revealEnabled,
        hideImages: !content.includeImages,
      },
    );
    out.push({
      slide,
      canvas,
      notes: content.includeSpeakerNotes ? speakerNotesPlain(slide) : '',
    });
  }
  return out;
}

async function buildPdfDownload(
  captures: Array<{ canvas: HTMLCanvasElement; notes: string }>,
  baseName: string,
): Promise<Blob> {
  let pdf: jsPDF | null = null;
  for (const { canvas, notes } of captures) {
    const w = canvas.width;
    const h = canvas.height;
    const img = canvas.toDataURL('image/png');
    if (!pdf) {
      pdf = new jsPDF({
        orientation: w > h ? 'landscape' : 'portrait',
        unit: 'px',
        format: [w, h],
      });
    } else {
      pdf.addPage([w, h], w > h ? 'landscape' : 'portrait');
    }
    pdf.addImage(img, 'PNG', 0, 0, w, h, undefined, 'FAST');
    if (notes.trim()) {
      const margin = 48;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addPage([pageW, pageH], w > h ? 'landscape' : 'portrait');
      pdf.setFontSize(11);
      pdf.setTextColor(40, 40, 40);
      const lines = pdf.splitTextToSize(notes, pageW - margin * 2);
      pdf.text(lines, margin, margin + 12);
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Sprechernotizen', margin, margin);
    }
  }
  if (!pdf) throw new Error('Keine Folien zum Export');
  return pdf.output('blob');
}

async function buildPptxDownload(
  captures: Array<{ canvas: HTMLCanvasElement; notes: string }>,
): Promise<Blob> {
  const slides = await Promise.all(
    captures.map(async ({ canvas, notes }) => ({
      png: await canvasToPngBytes(canvas),
      widthPx: canvas.width,
      heightPx: canvas.height,
      notes: notes.trim() || undefined,
    })),
  );
  return buildImagePptxBlob(slides);
}

export async function runPresentationDownload(
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  request: PresentationDownloadRequest,
  onProgress?: (p: PresentationDownloadProgress) => void,
): Promise<void> {
  const { formats, content, scope, currentSlideId } = request;
  if (!formats.pdf && !formats.pptx) {
    throw new Error('Bitte mindestens ein Format wählen (PDF oder PPTX).');
  }
  const slides = pickSlides(deck, scope, currentSlideId);
  if (!slides.length) throw new Error('Keine Folien zum Herunterladen.');

  const baseName = safeFileBase(deck);
  const captures = await captureSlides(
    deck,
    slides,
    annotations,
    content,
    request.includeLessonStrokes !== false,
    onProgress,
  );

  if (formats.pdf) {
    onProgress?.({ phase: 'PDF erstellen…' });
    const blob = await buildPdfDownload(captures, baseName);
    triggerBlobDownload(blob, `${baseName}.pdf`);
  }
  if (formats.pptx) {
    onProgress?.({ phase: 'PPTX erstellen…' });
    const blob = await buildPptxDownload(captures);
    triggerBlobDownload(blob, `${baseName}.pptx`);
  }
}

/** Hilfsinfo für UI: erweiterte Folie in Pixelhöhe. */
export function slideExportHeightPx(slide: PresentationSlide): number {
  return slideLogicalHeight(slide);
}

export const SLIDE_EXPORT_ASPECT = {
  width: SLIDE_REF_WIDTH,
  height: SLIDE_REF_HEIGHT,
};
