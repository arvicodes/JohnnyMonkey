import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import React from 'react';
import { jsPDF } from 'jspdf';
import PresentationSlideView from '../components/presentation/PresentationSlideView';
import {
  ANNOTATIONS_FILENAME,
  DECK_FILENAME,
  DECK_ORIGINAL_FILENAME,
  PresentationAnnotations,
  PresentationDeck,
  PresentationSlide,
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
  createEmptyAnnotations,
  isOriginalDeckFrozen,
  loadPresentationAnnotations,
  loadPresentationOriginalDeck,
  normalizeDeck,
  normalizeSlide,
  slideLogicalHeight,
  saveJsonFile,
  sortSlides,
  stripOriginalFreezeMeta,
  writeNamedVersionSnapshot,
  writeOriginalDeckSnapshot,
} from './presentationDeck';
import { drawPresentationStroke } from './presentationDrawTools';
import {
  waitForDomImages,
  waitForSlideRenderAssets,
} from './presentationPdfExportScheduler';
import {
  buildNamedJohnnyPresentationPdfName,
  namedVersionSlugFromLabel,
  LESSON_PRESENTATION_PDF_EDITED,
  LESSON_PRESENTATION_PDF_ORIGINAL,
} from './presentationLessonAssets';
import { PRESENTATION_KEYFRAMES } from './presentationTransitions';
import { PRESENTATION_DEFAULT_FONT_FAMILY } from './presentationFonts';
import '../styles/presentationLists.css';

export const DECK_ORIGINAL_SNAPSHOT = DECK_ORIGINAL_FILENAME;
export const PDF_ORIGINAL_FILENAME = LESSON_PRESENTATION_PDF_ORIGINAL;
export const PDF_EDITED_FILENAME = LESSON_PRESENTATION_PDF_EDITED;

const EXPORT_CAPTURE_SCALE = 2;
/** Schneller Export für benannte/Bearbeitet-PDFs (Unterricht). */
const EXPORT_FAST = {
  captureScale: 1,
  imageFormat: 'JPEG' as const,
  jpegQuality: 0.8,
};

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
      font-family: ${PRESENTATION_DEFAULT_FONT_FAMILY};
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
  includeStrokes: boolean,
  captureScale = EXPORT_CAPTURE_SCALE
): Promise<HTMLCanvasElement> {
  const normalizedSlide = normalizeSlide(slide);
  const logicalH = slideLogicalHeight(normalizedSlide);
  const host = document.createElement('div');
  host.setAttribute('data-pres-export-host', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${SLIDE_REF_WIDTH}px`,
    `height:${logicalH}px`,
    'overflow:hidden',
    'pointer-events:none',
    'z-index:-1',
    'clip-path:inset(100%)',
    'contain:layout style paint',
  ].join(';');
  document.body.appendChild(host);

  const mount = document.createElement('div');
  mount.style.width = `${SLIDE_REF_WIDTH}px`;
  mount.style.height = `${logicalH}px`;
  host.appendChild(mount);

  const removeStyles = injectExportStyles(host);
  const root = createRoot(mount);

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

    await waitFrames(3);
    await waitForDomImages(mount);
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
    // Kurze Settle-Zeit nur wenn Bilder im DOM sind
    if (mount.querySelector('img')) {
      await new Promise<void>((r) => setTimeout(r, 120));
    }

    const target = mount.querySelector('[data-pres-slide]') as HTMLElement | null;
    if (!target) throw new Error('Folie konnte nicht gerendert werden');

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(target, {
      scale: captureScale,
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
    const ctx = normalizedCanvas.getContext('2d');
    if (ctx) {
      const slideInk = normalizedSlide.inkStrokes ?? [];
      for (const stroke of slideInk) drawPresentationStroke(ctx, stroke);
      if (includeStrokes && strokes.length > 0) {
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
  onProgress?: (current: number, total: number) => void,
  options?: { captureScale?: number; imageFormat?: 'PNG' | 'JPEG'; jpegQuality?: number }
): Promise<Blob> {
  const normalized = normalizeDeck(deck);
  const slides = sortSlides(normalized.slides);
  let pdf: jsPDF | null = null;
  const captureScale = options?.captureScale ?? EXPORT_CAPTURE_SCALE;
  const imageFormat = options?.imageFormat ?? 'PNG';
  const jpegQuality = options?.jpegQuality ?? 0.82;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const strokes = annotations.bySlideId[slide.id] ?? [];
    onProgress?.(i + 1, slides.length);
    const canvas = await captureSlideCanvas(
      normalized,
      slide,
      i,
      slides.length,
      strokes,
      includeStrokes,
      captureScale
    );
    const img =
      imageFormat === 'JPEG'
        ? canvas.toDataURL('image/jpeg', jpegQuality)
        : canvas.toDataURL('image/png');
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
    pdf.addImage(img, imageFormat, 0, 0, w, h, undefined, 'FAST');
  }

  if (!pdf) throw new Error('Keine Folien zum Export');
  return pdf.output('blob');
}

async function savePdfBlob(lessonPath: string, filename: string, blob: Blob): Promise<void> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('targetPath', lessonPath.replace(/\\/g, '/').replace(/\/$/, ''));
  const res = await fetch('/api/file-system-paths/save-file', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'PDF konnte nicht gespeichert werden');
  }
}

export type PresentationSaveResult = {
  originalPdf: string;
  editedPdf: string;
  namedPdf?: string;
  deckOriginalSnapshot: string;
  originalFrozen: boolean;
};

export type ExportPresentationPdfOptions = {
  /** Original-PDF aus diesem Snapshot (Standard: gespeicherter Original-Stand). */
  originalDeck?: PresentationDeck;
  /** Nur Bearbeitet-PDF neu erzeugen (Original unverändert lassen). */
  editedOnly?: boolean;
  /** Nur Original-PDF neu erzeugen (Bearbeitet/benannte PDFs unberührt). */
  originalOnly?: boolean;
  /** Nur die benannte PDF schreiben — andere Versionen (inkl. bearbeitet) unberührt. */
  namedOnly?: boolean;
  /** Zusätzlich Bearbeitet-PDF unter `Praesentation_<Label>.pdf` ablegen. */
  namedLabel?: string;
};

/** PDFs erzeugen: Original = Erstell-Stand ohne Striche, Bearbeitet = Live + Striche. */
export async function exportPresentationPdfVersions(
  lessonPath: string,
  workingDeck: PresentationDeck,
  annotations: PresentationAnnotations,
  onProgress?: (label: string) => void,
  options?: ExportPresentationPdfOptions
): Promise<PresentationSaveResult> {
  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  const editedDeck = normalizeDeck(stripOriginalFreezeMeta(workingDeck));
  const emptyAnn = createEmptyAnnotations(folder);

  const namedName = options?.namedLabel
    ? buildNamedJohnnyPresentationPdfName(options.namedLabel)
    : null;
  if (options?.namedLabel && !namedName) {
    throw new Error('Ungültiger Versionsname (nicht „Original“ verwenden)');
  }

  // Nur benannte Version: ausschließlich diese eine PDF — keine anderen anfassen
  if (options?.namedOnly && namedName) {
    onProgress?.(`Version ${namedName}…`);
    const namedBlob = await buildPresentationPdfBlob(
      editedDeck,
      annotations,
      true,
      (c, t) => onProgress?.(`Version ${c}/${t}`),
      EXPORT_FAST
    );
    await savePdfBlob(folder, namedName, namedBlob);
    const snapshotMeta = await loadPresentationOriginalDeck(folder);
    return {
      originalPdf: PDF_ORIGINAL_FILENAME,
      editedPdf: PDF_EDITED_FILENAME,
      namedPdf: namedName,
      deckOriginalSnapshot: DECK_ORIGINAL_SNAPSHOT,
      originalFrozen: isOriginalDeckFrozen(snapshotMeta),
    };
  }

  let originalDeck: PresentationDeck;
  if (options?.originalDeck) {
    originalDeck = normalizeDeck(options.originalDeck);
  } else {
    const loaded = await loadPresentationOriginalDeck(folder);
    // Snapshot nutzen, sobald er existiert — nicht erst nach Freeze
    originalDeck = loaded?.slides?.length ? loaded : editedDeck;
  }
  originalDeck = normalizeDeck(stripOriginalFreezeMeta(originalDeck));

  // Nur Original-PDF — Bearbeitet/benannte Dateien unberührt
  if (options?.originalOnly) {
    onProgress?.('Original-PDF…');
    const originalBlob = await buildPresentationPdfBlob(originalDeck, emptyAnn, false, (c, t) => {
      onProgress?.(`Original ${c}/${t}`);
    });
    await savePdfBlob(folder, PDF_ORIGINAL_FILENAME, originalBlob);
    const snapshotMeta = await loadPresentationOriginalDeck(folder);
    return {
      originalPdf: PDF_ORIGINAL_FILENAME,
      editedPdf: PDF_EDITED_FILENAME,
      deckOriginalSnapshot: DECK_ORIGINAL_SNAPSHOT,
      originalFrozen: isOriginalDeckFrozen(snapshotMeta),
    };
  }

  if (!options?.editedOnly) {
    onProgress?.('Original-PDF…');
    const originalBlob = await buildPresentationPdfBlob(originalDeck, emptyAnn, false, (c, t) => {
      onProgress?.(`Original ${c}/${t}`);
    });
    await savePdfBlob(folder, PDF_ORIGINAL_FILENAME, originalBlob);
  }

  onProgress?.('Bearbeitet-PDF…');
  const editedBlob = await buildPresentationPdfBlob(
    editedDeck,
    annotations,
    true,
    (c, t) => {
      onProgress?.(`Bearbeitet ${c}/${t}`);
    },
    EXPORT_FAST
  );
  await savePdfBlob(folder, PDF_EDITED_FILENAME, editedBlob);

  let namedPdf: string | undefined;
  if (namedName && namedName !== PDF_EDITED_FILENAME && namedName !== PDF_ORIGINAL_FILENAME) {
    onProgress?.(`Version ${namedName}…`);
    await savePdfBlob(folder, namedName, editedBlob);
    namedPdf = namedName;
  }

  const snapshotMeta = await loadPresentationOriginalDeck(folder);
  return {
    originalPdf: PDF_ORIGINAL_FILENAME,
    editedPdf: PDF_EDITED_FILENAME,
    namedPdf,
    deckOriginalSnapshot: DECK_ORIGINAL_SNAPSHOT,
    originalFrozen: isOriginalDeckFrozen(snapshotMeta),
  };
}

/**
 * Live („bearbeitet“) speichern:
 * - Nur Arbeitsdeck + Annotationen (+ Bearbeitet-PDF)
 * - Original und benannte Versionen bleiben unberührt
 * - Original wird höchstens einmal eingefroren (ohne Original-PDF neu zu schreiben),
 *   falls in der Erstell-Phase noch kein Freeze existiert
 */
export async function savePresentationBothVersions(
  lessonPath: string,
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  onProgress?: (label: string) => void,
  options?: { namedLabel?: string }
): Promise<PresentationSaveResult> {
  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');

  onProgress?.('JSON sichern…');
  const deckPayload = {
    ...stripOriginalFreezeMeta(normalizeDeck(deck)),
    updatedAt: new Date().toISOString(),
  };
  const annPayload = { ...annotations, updatedAt: new Date().toISOString() };
  await saveJsonFile(folder, DECK_FILENAME, deckPayload);
  await saveJsonFile(folder, ANNOTATIONS_FILENAME, annPayload);

  // Freeze nur Best-Effort aus dem bestehenden Original-Stand — nie Live → Original-PDF
  const existingOriginal = await loadPresentationOriginalDeck(folder);
  if (!isOriginalDeckFrozen(existingOriginal)) {
    onProgress?.('Original einfrieren…');
    await writeOriginalDeckSnapshot(folder, existingOriginal ?? deckPayload, 'freeze');
  }

  return exportPresentationPdfVersions(lessonPath, deckPayload, annPayload, onProgress, {
    editedOnly: true,
    namedLabel: options?.namedLabel,
  });
}

/**
 * Speichern als…: neue benannte Version (Snapshot + optional PDF).
 * Andere Versionen bleiben unverändert.
 *
 * `updateLive` false (Standard): Live/Original/aktuelle Dateien nicht anfassen.
 * `exportPdf` false: nur JSON-Snapshot — PDF kann im Hintergrund folgen.
 */
export async function savePresentationNamedVersion(
  lessonPath: string,
  deck: PresentationDeck,
  annotations: PresentationAnnotations,
  namedLabel: string,
  optionsOrProgress?:
    | {
        onProgress?: (label: string) => void;
        updateLive?: boolean;
        exportPdf?: boolean;
      }
    | ((label: string) => void)
): Promise<PresentationSaveResult> {
  const label = (namedLabel || '').trim();
  if (!label) throw new Error('Bitte einen Versionsnamen eingeben');
  const namedName = buildNamedJohnnyPresentationPdfName(label);
  const slug = namedVersionSlugFromLabel(label);
  if (!namedName || !slug) throw new Error('Ungültiger Versionsname (nicht „Original“ verwenden)');

  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  const options =
    typeof optionsOrProgress === 'function'
      ? { onProgress: optionsOrProgress }
      : optionsOrProgress;
  const onProgress = options?.onProgress;
  // Speichern als…: Standard = aktuelle Version unverändert lassen
  const updateLive = options?.updateLive === true;
  const exportPdf = options?.exportPdf !== false;

  onProgress?.('Neue Version anlegen…');
  const deckPayload = {
    ...stripOriginalFreezeMeta(normalizeDeck(deck)),
    updatedAt: new Date().toISOString(),
  };
  const annPayload = { ...annotations, updatedAt: new Date().toISOString() };

  if (updateLive) {
    await saveJsonFile(folder, DECK_FILENAME, deckPayload);
    await saveJsonFile(folder, ANNOTATIONS_FILENAME, annPayload);
    onProgress?.('Original sichern…');
    await writeOriginalDeckSnapshot(folder, deckPayload, 'freeze');
  }

  onProgress?.(`Version „${label}“ anlegen…`);
  await writeNamedVersionSnapshot(folder, label, slug, deckPayload, annPayload);

  const snapshotMeta = await loadPresentationOriginalDeck(folder);
  const baseResult: PresentationSaveResult = {
    originalPdf: PDF_ORIGINAL_FILENAME,
    editedPdf: PDF_EDITED_FILENAME,
    namedPdf: namedName,
    deckOriginalSnapshot: DECK_ORIGINAL_SNAPSHOT,
    originalFrozen: isOriginalDeckFrozen(snapshotMeta),
  };

  if (!exportPdf) {
    return baseResult;
  }

  try {
    return await exportPresentationPdfVersions(lessonPath, deckPayload, annPayload, onProgress, {
      namedOnly: true,
      namedLabel: label,
    });
  } catch (exportErr) {
    console.warn('Named PDF export failed, trying copy of existing presentation PDF', exportErr);
    onProgress?.('PDF-Kopie…');
    const copied = await copyAnyPresentationPdfAsNamed(folder, namedName);
    if (!copied) throw exportErr;
    return baseResult;
  }
}

/** Bestehende Praesentation_*.pdf unter neuem Namen speichern (Fallback). */
async function copyAnyPresentationPdfAsNamed(
  lessonPath: string,
  namedFilename: string
): Promise<boolean> {
  const folder = lessonPath.replace(/\\/g, '/').replace(/\/$/, '');
  const candidates = [PDF_EDITED_FILENAME, PDF_ORIGINAL_FILENAME];
  for (const name of candidates) {
    if (name === namedFilename) continue;
    const ok = await copyPdfFile(folder, name, namedFilename);
    if (ok) return true;
  }
  return false;
}

async function copyPdfFile(
  folder: string,
  sourceFilename: string,
  destFilename: string
): Promise<boolean> {
  const sourcePath = `${folder}/${sourceFilename}`;
  const res = await fetch(
    `/api/file-system-paths/download?filePath=${encodeURIComponent(sourcePath)}`,
    { credentials: 'include' }
  );
  if (!res.ok) return false;
  const blob = await res.blob();
  if (!blob.size) return false;
  await savePdfBlob(folder, destFilename, blob);
  return true;
}

/** @deprecated use copyAnyPresentationPdfAsNamed */
async function copyExistingEditedPdfAsNamed(
  lessonPath: string,
  namedFilename: string
): Promise<boolean> {
  return copyAnyPresentationPdfAsNamed(lessonPath, namedFilename);
}

/**
 * Nach dem Speichern im Editor:
 * - Nur Bearbeitet-PDF aus Arbeitsdeck + Striche
 * - Original-PDF nie anfassen (auch nicht in der Erstell-Phase — dort reicht JSON-Sync)
 */
export async function refreshPresentationPdfsFromLessonFolder(lessonPath: string): Promise<void> {
  const { loadPresentationDeck } = await import('./presentationDeck');
  const deck = await loadPresentationDeck(lessonPath);
  if (!deck) return;
  const annotations =
    (await loadPresentationAnnotations(lessonPath)) ?? createEmptyAnnotations(lessonPath);
  const existingOriginal = await loadPresentationOriginalDeck(lessonPath);
  // Sync nur JSON, solange Original noch nicht eingefroren — PDF bleibt unberührt
  if (!isOriginalDeckFrozen(existingOriginal)) {
    await writeOriginalDeckSnapshot(lessonPath, deck, 'sync');
  }
  await exportPresentationPdfVersions(lessonPath, deck, annotations, undefined, {
    editedOnly: true,
  });
}
