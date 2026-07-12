import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { ThemeProvider, createTheme } from '@mui/material';
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
  loadJsonFile,
  saveJsonFile,
  sortSlides,
} from './presentationDeck';
import { drawPresentationStroke } from './presentationDrawTools';
import { getSlideMaxRevealSteps } from './presentationReveal';

export const DECK_ORIGINAL_SNAPSHOT = 'Praesentation.deck.original.json';
export const PDF_ORIGINAL_FILENAME = 'Praesentation_Original.pdf';
export const PDF_EDITED_FILENAME = 'Praesentation_bearbeitet.pdf';

const exportTheme = createTheme();

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

async function captureSlideCanvas(
  deck: PresentationDeck,
  slide: PresentationSlide,
  slideIndex: number,
  slideTotal: number,
  strokes: PresentationStroke[],
  includeStrokes: boolean
): Promise<HTMLCanvasElement> {
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-12000px;top:0;width:${SLIDE_REF_WIDTH}px;height:${SLIDE_REF_HEIGHT}px;overflow:hidden;pointer-events:none;`;
  document.body.appendChild(host);

  const mount = document.createElement('div');
  mount.style.width = `${SLIDE_REF_WIDTH}px`;
  mount.style.height = `${SLIDE_REF_HEIGHT}px`;
  host.appendChild(mount);

  const root = createRoot(mount);
  const revealStep = getSlideMaxRevealSteps(slide);

  try {
    flushSync(() => {
      root.render(
        <ThemeProvider theme={exportTheme}>
          <PresentationSlideView
            slide={slide}
            scale={1}
            revealStep={revealStep}
            revealEnabled={slide.revealEnabled !== false}
            showShadow={false}
            showSlideNumbers={deck.showSlideNumbers !== false}
            slideNumber={slideIndex + 1}
            slideTotal={slideTotal}
            showSlideFooter={deck.showSlideFooter !== false}
            slideFooter={deck.slideFooter}
            deckTitle={deck.title}
          />
        </ThemeProvider>
      );
    });

    await waitFrames(3);
    await new Promise<void>((r) => setTimeout(r, 120));

    const html2canvas = (await import('html2canvas')).default;
    const target = mount.firstElementChild as HTMLElement | null;
    if (!target) throw new Error('Folie konnte nicht gerendert werden');

    const canvas = await html2canvas(target, {
      width: SLIDE_REF_WIDTH,
      height: SLIDE_REF_HEIGHT,
      scale: 1,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: SLIDE_REF_WIDTH,
      windowHeight: SLIDE_REF_HEIGHT,
    });

    if (includeStrokes && strokes.length > 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        for (const stroke of strokes) drawPresentationStroke(ctx, stroke);
      }
    }

    return canvas;
  } finally {
    root.unmount();
    document.body.removeChild(host);
  }
}

async function buildPresentationPdfBlob(
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  includeStrokes: boolean,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const slides = sortSlides(deck.slides);
  let pdf: jsPDF | null = null;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const strokes = annotations.bySlideId[slide.id] ?? [];
    onProgress?.(i + 1, slides.length);
    const canvas = await captureSlideCanvas(deck, slide, i, slides.length, strokes, includeStrokes);
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

/** Speichert unbearbeitete + bearbeitete PDF und sichert Deck/Annotationen als JSON. */
export async function savePresentationBothVersions(
  lessonPath: string,
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  onProgress?: (label: string) => void
): Promise<PresentationSaveResult> {
  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');

  onProgress?.('JSON sichern…');
  const deckPayload = { ...deck, updatedAt: new Date().toISOString() };
  const annPayload = { ...annotations, updatedAt: new Date().toISOString() };
  await saveJsonFile(folder, DECK_FILENAME, deckPayload);
  await saveJsonFile(folder, ANNOTATIONS_FILENAME, annPayload);
  const existingOriginal = await loadJsonFile(deckOriginalFilePath(folder));
  if (!existingOriginal) {
    await saveJsonFile(folder, DECK_ORIGINAL_SNAPSHOT, deckPayload);
  }

  onProgress?.('Original-PDF…');
  const originalBlob = await buildPresentationPdfBlob(deck, annotations, false, (c, t) => {
    onProgress?.(`Original ${c}/${t}`);
  });
  await savePdfBlob(folder, PDF_ORIGINAL_FILENAME, originalBlob);

  onProgress?.('Bearbeitet-PDF…');
  const editedBlob = await buildPresentationPdfBlob(deck, annotations, true, (c, t) => {
    onProgress?.(`Bearbeitet ${c}/${t}`);
  });
  await savePdfBlob(folder, PDF_EDITED_FILENAME, editedBlob);

  return {
    originalPdf: PDF_ORIGINAL_FILENAME,
    editedPdf: PDF_EDITED_FILENAME,
    deckOriginalSnapshot: DECK_ORIGINAL_SNAPSHOT,
  };
}
