import { jsPDF } from 'jspdf';
import {
  PresentationAnnotations,
  PresentationDeck,
  PresentationSlide,
  PresentationStroke,
  normalizeDeck,
  normalizeSlide,
  slideLogicalHeight,
  sortSlides,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from './presentationDeck';
import type { PresentationPlayVariants } from './presentationPlayVariants';
import { getSlideMaxRevealSteps } from './presentationReveal';
import { captureSlideCanvas, triggerBlobDownload } from './presentationExport';
import { buildImagePptxBlob, canvasToPngBytes } from './presentationImagePptx';
import {
  captureSpeakerNotesCanvas,
  speakerNotesHtmlForExport,
  speakerNotesTextForExport,
} from './presentationNotesExport';

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
  /** Folien-IDs in Deck-Reihenfolge; mindestens eine. */
  slideIds: string[];
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

function pickSlides(deck: PresentationDeck, slideIds: string[]) {
  const wanted = new Set(slideIds);
  return sortSlides(normalizeDeck(deck).slides).filter((s) => wanted.has(s.id));
}

/** Editor-Ansicht inkl. Play-Variante — nicht SuS/NOW-Stand. */
export function resolveSlidesForExport(
  deck: PresentationDeck,
  slideIds: string[],
  playVariants?: PresentationPlayVariants | null,
): PresentationSlide[] {
  return pickSlides(deck, slideIds).map((slide) => {
    const overlay = playVariants?.bySlideId[slide.id]?.slide;
    if (!overlay) return slide;
    return normalizeSlide({ ...slide, ...overlay, id: slide.id });
  });
}

function slideIndicesLabel(deck: PresentationDeck, slideIds: string[]): string {
  const sorted = sortSlides(normalizeDeck(deck).slides);
  const nums = slideIds
    .map((id) => sorted.findIndex((s) => s.id === id) + 1)
    .filter((n) => n > 0);
  if (!nums.length) return 'Auswahl';
  if (nums.length === 1) return `Folie-${nums[0]}`;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max - min + 1 === nums.length) return `Folien-${min}-${max}`;
  return `${nums.length}-Folien`;
}

function buildExportFilename(deck: PresentationDeck, slideIds: string[], ext: string): string {
  const base = safeFileBase(deck);
  const part = slideIndicesLabel(deck, slideIds);
  return `${base}_${part}.${ext}`;
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

export function mergeExportInkStrokes(
  slide: PresentationSlide,
  annotations: PresentationAnnotations,
  playVariants?: PresentationPlayVariants | null,
  includeLessonStrokes = true,
): PresentationStroke[] {
  const lists: PresentationStroke[][] = [slide.inkStrokes ?? []];
  if (includeLessonStrokes) {
    lists.push(annotations.bySlideId[slide.id] ?? []);
    lists.push(playVariants?.bySlideId[slide.id]?.strokes ?? []);
  }
  const seen = new Set<string>();
  const out: PresentationStroke[] = [];
  for (const list of lists) {
    for (const stroke of list) {
      if (!stroke?.points?.length) continue;
      const key = stroke.id || `${stroke.points[0]?.x}:${stroke.points[0]?.y}:${stroke.points.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(stroke);
    }
  }
  return out;
}

type SlideCapture = {
  slide: PresentationSlide;
  canvas: HTMLCanvasElement;
  notesText: string;
  notesHtml: string;
};

async function captureSlides(
  deck: PresentationDeck,
  slides: PresentationSlide[],
  annotations: PresentationAnnotations,
  content: PresentationDownloadContentOptions,
  includeLessonStrokes: boolean,
  onProgress?: (p: PresentationDownloadProgress) => void,
  playVariants?: PresentationPlayVariants | null,
): Promise<SlideCapture[]> {
  const normalized = normalizeDeck(deck);
  const total = slides.length;
  const out: SlideCapture[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    onProgress?.({ phase: 'Folie vorbereiten…', current: i + 1, total });
    const strokes = mergeExportInkStrokes(slide, annotations, playVariants, includeLessonStrokes);
    const { revealStep, revealEnabled } = revealCaptureOptions(slide, content);
    onProgress?.({ phase: 'Folie als Bild erfassen…', current: i + 1, total });
    const canvas = await captureSlideCanvas(
      normalized,
      slide,
      i,
      total,
      strokes,
      strokes.length > 0,
      1,
      {
        revealStep,
        revealEnabled,
        hideImages: !content.includeImages,
        exportInkStrokes: strokes,
      },
    );
    const notesHtml = content.includeSpeakerNotes ? speakerNotesHtmlForExport(slide) : '';
    const notesText = notesHtml ? speakerNotesTextForExport(slide) : '';
    out.push({
      slide,
      canvas,
      notesText,
      notesHtml,
    });
  }
  return out;
}

async function buildPdfDownload(captures: SlideCapture[], baseName: string): Promise<Blob> {
  let pdf: jsPDF | null = null;
  for (const { canvas, notesHtml, notesText } of captures) {
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
    if (notesHtml || notesText) {
      const notesCanvas = notesHtml ? await captureSpeakerNotesCanvas(notesHtml) : null;
      const margin = 48;
      const headerH = 28;
      if (notesCanvas) {
        const nw = notesCanvas.width;
        const nh = notesCanvas.height;
        const pageW = Math.max(w, nw + margin * 2);
        const pageH = nh + margin * 2 + headerH;
        pdf.addPage([pageW, pageH], pageW > pageH ? 'landscape' : 'portrait');
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Sprechernotizen', margin, margin + 10);
        const notesImg = notesCanvas.toDataURL('image/png');
        const drawW = pageW - margin * 2;
        const drawH = (nh / nw) * drawW;
        pdf.addImage(notesImg, 'PNG', margin, margin + headerH, drawW, drawH, undefined, 'FAST');
      } else if (notesText.trim()) {
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        pdf.addPage([pageW, pageH], w > h ? 'landscape' : 'portrait');
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        pdf.text('Sprechernotizen', margin, margin);
        pdf.setFontSize(11);
        pdf.setTextColor(40, 40, 40);
        const lines = pdf.splitTextToSize(notesText, pageW - margin * 2);
        pdf.text(lines, margin, margin + 14);
      }
    }
  }
  if (!pdf) throw new Error('Keine Folien zum Export');
  return pdf.output('blob');
}

async function buildPptxDownload(captures: SlideCapture[]): Promise<Blob> {
  const slides = await Promise.all(
    captures.map(async ({ canvas, notesText }) => ({
      png: await canvasToPngBytes(canvas),
      widthPx: canvas.width,
      heightPx: canvas.height,
      notes: notesText.trim() || undefined,
    })),
  );
  return buildImagePptxBlob(slides);
}

export async function runPresentationDownload(
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  request: PresentationDownloadRequest,
  onProgress?: (p: PresentationDownloadProgress) => void,
  playVariants?: PresentationPlayVariants | null,
): Promise<void> {
  const { formats, content, slideIds } = request;
  if (!formats.pdf && !formats.pptx) {
    throw new Error('Bitte mindestens ein Format wählen (PDF oder PPTX).');
  }
  if (!slideIds.length) throw new Error('Bitte mindestens eine Folie auswählen.');
  const slides = resolveSlidesForExport(deck, slideIds, playVariants);
  if (!slides.length) throw new Error('Keine Folien zum Herunterladen.');

  const captures = await captureSlides(
    deck,
    slides,
    annotations,
    content,
    request.includeLessonStrokes !== false,
    onProgress,
    playVariants,
  );

  if (formats.pdf) {
    onProgress?.({ phase: 'PDF erstellen…' });
    const blob = await buildPdfDownload(captures, safeFileBase(deck));
    triggerBlobDownload(blob, buildExportFilename(deck, slideIds, 'pdf'));
  }
  if (formats.pptx) {
    onProgress?.({ phase: 'PPTX erstellen…' });
    const blob = await buildPptxDownload(captures);
    triggerBlobDownload(blob, buildExportFilename(deck, slideIds, 'pptx'));
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
