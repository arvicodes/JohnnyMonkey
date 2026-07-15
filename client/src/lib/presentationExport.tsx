import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import React from 'react';
import { jsPDF } from 'jspdf';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import {
  ANNOTATIONS_FILENAME,
  DECK_FILENAME,
  deckOriginalFilePath,
  PresentationAnnotations,
  PresentationDeck,
  PresentationSlide,
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  createEmptyAnnotations,
  loadJsonFile,
  loadPresentationAnnotations,
  normalizeDeck,
  normalizeSlide,
  saveJsonFile,
  sortSlides,
} from './presentationDeck';
import { drawPresentationStroke } from './presentationDrawTools';
import {
  waitForDomImages,
  waitForSlideRenderAssets,
} from './presentationPdfExportScheduler';
import {
  LESSON_PRESENTATION_PDF_EDITED,
  LESSON_PRESENTATION_PDF_ORIGINAL,
} from './presentationLessonAssets';
import { PRESENTATION_KEYFRAMES } from './presentationTransitions';
import '../styles/presentationLists.css';

export const DECK_ORIGINAL_SNAPSHOT = 'Praesentation.deck.original.json';
export const PDF_ORIGINAL_FILENAME = LESSON_PRESENTATION_PDF_ORIGINAL;
export const PDF_EDITED_FILENAME = LESSON_PRESENTATION_PDF_EDITED;

const EXPORT_CAPTURE_SCALE = 2;

function waitFrames(n = 2): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function injectExportStyles(host: HTMLElement): () => void {
  const style = document.createElement('style');
  style.setAttribute('data-pres-export-styles', 'true');
  style.textContent = `
    ${PRESENTATION_KEYFRAMES}
    [data-pres-export-host] {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
        'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    [data-pres-export-host] [data-pres-slide] * {
      animation: none !important;
      transition: none !important;
    }
  `;
  host.appendChild(style);
  return () => style.remove();
}

function prepareSlideCloneForCapture(clonedDoc: Document, clonedSlide: HTMLElement): void {
  const style = clonedDoc.createElement('style');
  style.textContent = `
    ${PRESENTATION_KEYFRAMES}
    [data-pres-slide] * {
      animation: none !important;
      transition: none !important;
    }
    [data-pres-rich-zone] {
      overflow: visible !important;
    }
    [data-pres-element] img,
    [data-pres-slide] img {
      background: transparent !important;
      background-color: transparent !important;
    }
  `;
  clonedDoc.head.appendChild(style);

  clonedSlide.querySelectorAll('div').forEach((node) => {
    const el = node as HTMLElement;
    const view = clonedDoc.defaultView;
    if (!view) return;
    const cs = view.getComputedStyle(el);
    if (cs.display.includes('flex') && cs.minHeight === '0px') {
      el.style.minHeight = 'auto';
    }
  });
}

function normalizeCaptureCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  if (source.width === SLIDE_REF_WIDTH && source.height === SLIDE_REF_HEIGHT) {
    return source;
  }
  const out = document.createElement('canvas');
  out.width = SLIDE_REF_WIDTH;
  out.height = SLIDE_REF_HEIGHT;
  const ctx = out.getContext('2d');
  if (!ctx) return source;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out;
}

async function captureSlideCanvas(
  deck: PresentationDeck,
  slide: PresentationSlide,
  slideIndex: number,
  slideTotal: number,
  strokes: PresentationStroke[],
  includeStrokes: boolean
): Promise<HTMLCanvasElement> {
  const host = document.createElement('div');
  host.setAttribute('data-pres-export-host', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${SLIDE_REF_WIDTH}px`,
    `height:${SLIDE_REF_HEIGHT}px`,
    'overflow:hidden',
    'pointer-events:none',
    'z-index:-1',
    'clip-path:inset(100%)',
    'contain:layout style paint',
  ].join(';');
  document.body.appendChild(host);

  const mount = document.createElement('div');
  mount.style.width = `${SLIDE_REF_WIDTH}px`;
  mount.style.height = `${SLIDE_REF_HEIGHT}px`;
  host.appendChild(mount);

  const removeStyles = injectExportStyles(host);
  const root = createRoot(mount);
  const normalizedSlide = normalizeSlide(slide);

  try {
    await waitForSlideRenderAssets(normalizedSlide);

    flushSync(() => {
      root.render(
        <PresentationSlideView
          slide={normalizedSlide}
          scale={1}
          revealStep={999}
          revealEnabled={false}
          exportSnapshot
          showShadow={false}
          showSlideNumbers={deck.showSlideNumbers !== false}
          slideNumber={slideIndex + 1}
          slideTotal={slideTotal}
          showSlideFooter={deck.showSlideFooter !== false}
          slideFooter={deck.slideFooter}
          deckTitle={deck.title}
          lessonPath={deck.lessonPath}
        />
      );
    });

    await waitFrames(6);
    await waitForDomImages(mount);
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
    await new Promise<void>((r) => setTimeout(r, 420));

    const target = mount.querySelector('[data-pres-slide]') as HTMLElement | null;
    if (!target) throw new Error('Folie konnte nicht gerendert werden');

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(target, {
      scale: EXPORT_CAPTURE_SCALE,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: SLIDE_REF_WIDTH,
      height: SLIDE_REF_HEIGHT,
      windowWidth: SLIDE_REF_WIDTH,
      windowHeight: SLIDE_REF_HEIGHT,
      imageTimeout: 20000,
      onclone: (clonedDoc, clonedElement) => {
        prepareSlideCloneForCapture(clonedDoc, clonedElement);
      },
    });

    const normalizedCanvas = normalizeCaptureCanvas(canvas);

    if (includeStrokes && strokes.length > 0) {
      const ctx = normalizedCanvas.getContext('2d');
      if (ctx) {
        for (const stroke of strokes) drawPresentationStroke(ctx, stroke);
      }
    }

    return normalizedCanvas;
  } finally {
    root.unmount();
    removeStyles();
    document.body.removeChild(host);
  }
}

async function buildPresentationPdfBlob(
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  includeStrokes: boolean,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const normalized = normalizeDeck(deck);
  const slides = sortSlides(normalized.slides);
  let pdf: jsPDF | null = null;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const strokes = annotations.bySlideId[slide.id] ?? [];
    onProgress?.(i + 1, slides.length);
    const canvas = await captureSlideCanvas(normalized, slide, i, slides.length, strokes, includeStrokes);
    const img = canvas.toDataURL('image/png');
    const w = canvas.width;
    const h = canvas.height;

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
  }

  if (!pdf) throw new Error('Keine Folien zum Export');
  return pdf.output('blob');
}

async function savePdfBlob(lessonPath: string, filename: string, blob: Blob): Promise<void> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('targetPath', lessonPath.replace(/\\/g, '/').replace(/\/$/, ''));
  const res = await fetch('/api/file-system-paths/save-file', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'PDF konnte nicht gespeichert werden');
  }
}

export type PresentationSaveResult = {
  originalPdf: string;
  editedPdf: string;
  deckOriginalSnapshot: string;
};

/** Nur PDFs neu erzeugen (Deck/JSON unverändert lassen). */
export async function exportPresentationPdfVersions(
  lessonPath: string,
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  onProgress?: (label: string) => void
): Promise<PresentationSaveResult> {
  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  const normalized = normalizeDeck(deck);

  onProgress?.('Original-PDF…');
  const originalBlob = await buildPresentationPdfBlob(normalized, annotations, false, (c, t) => {
    onProgress?.(`Original ${c}/${t}`);
  });
  await savePdfBlob(folder, PDF_ORIGINAL_FILENAME, originalBlob);

  onProgress?.('Bearbeitet-PDF…');
  const editedBlob = await buildPresentationPdfBlob(normalized, annotations, true, (c, t) => {
    onProgress?.(`Bearbeitet ${c}/${t}`);
  });
  await savePdfBlob(folder, PDF_EDITED_FILENAME, editedBlob);

  return {
    originalPdf: PDF_ORIGINAL_FILENAME,
    editedPdf: PDF_EDITED_FILENAME,
    deckOriginalSnapshot: DECK_ORIGINAL_SNAPSHOT,
  };
}

/** Speichert unbearbeitete + bearbeitete PDF und sichert Deck/Annotationen als JSON. */
export async function savePresentationBothVersions(
  lessonPath: string,
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  onProgress?: (label: string) => void
): Promise<PresentationSaveResult> {
  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');

  onProgress?.('JSON sichern…');
  const deckPayload = { ...normalizeDeck(deck), updatedAt: new Date().toISOString() };
  const annPayload = { ...annotations, updatedAt: new Date().toISOString() };
  await saveJsonFile(folder, DECK_FILENAME, deckPayload);
  await saveJsonFile(folder, ANNOTATIONS_FILENAME, annPayload);
  const existingOriginal = await loadJsonFile(deckOriginalFilePath(folder));
  if (!existingOriginal) {
    await saveJsonFile(folder, DECK_ORIGINAL_SNAPSHOT, deckPayload);
  }

  return exportPresentationPdfVersions(lessonPath, deckPayload, annPayload, onProgress);
}

/** Nach dem Speichern im Editor: PDFs im Hintergrund aktualisieren. */
export async function refreshPresentationPdfsFromLessonFolder(lessonPath: string): Promise<void> {
  const { loadPresentationDeck } = await import('./presentationDeck');
  const deck = await loadPresentationDeck(lessonPath);
  if (!deck) return;
  const annotations =
    (await loadPresentationAnnotations(lessonPath)) ?? createEmptyAnnotations(lessonPath);
  await exportPresentationPdfVersions(lessonPath, deck, annotations);
}
