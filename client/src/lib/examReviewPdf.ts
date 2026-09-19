import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/** A4-Breite bei ~96 dpi — entspricht jsPDF-Seitenbreite in px */
const PDF_A4_WIDTH_PX = 794;

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'pruefung';
}

async function waitForIframeImages(doc: Document, timeoutMs = 12000): Promise<void> {
  const imgs = Array.from(doc.querySelectorAll('img'));
  const deadline = Date.now() + timeoutMs;
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          if (Date.now() > deadline) resolve();
        }),
    ),
  );
  await new Promise((r) => window.setTimeout(r, 200));
}

/** HU-Grid/Margins der Live-HTML für PDF auf volle A4-Breite zurücksetzen */
function injectPdfFullWidthStyles(doc: Document) {
  const style = doc.createElement('style');
  style.setAttribute('data-jm-pdf-layout', '1');
  style.textContent = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${PDF_A4_WIDTH_PX}px !important;
      max-width: ${PDF_A4_WIDTH_PX}px !important;
      background: #fff !important;
      overflow: visible !important;
    }
    .exam-shell {
      display: block !important;
      grid-template-columns: none !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: none !important;
      background: #fff !important;
    }
    .exam-paper {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      border-left: none !important;
      border-right: none !important;
      padding: 12px 14px 20px !important;
    }
    .task, .item, .input-group, table {
      max-width: none !important;
    }
  `;
  doc.head.appendChild(style);
}

function pickPdfCaptureRoot(doc: Document): HTMLElement {
  return (
    (doc.querySelector('.exam-paper') as HTMLElement | null) ||
    (doc.querySelector('.exam-shell') as HTMLElement | null) ||
    (doc.body as HTMLElement)
  );
}

async function renderHtmlInIframe(html: string): Promise<{
  iframe: HTMLIFrameElement;
  root: HTMLElement;
}> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${PDF_A4_WIDTH_PX}px`;
  iframe.style.maxWidth = `${PDF_A4_WIDTH_PX}px`;
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error('Vorschau konnte nicht geladen werden'));
    iframe.srcdoc = html;
  });

  const doc = iframe.contentDocument;
  if (!doc) throw new Error('Vorschau konnte nicht geladen werden');
  injectPdfFullWidthStyles(doc);
  await waitForIframeImages(doc);
  await new Promise((r) => window.setTimeout(r, 350));

  const root = pickPdfCaptureRoot(doc);
  const h = Math.max(root.scrollHeight, root.offsetHeight, 900);
  iframe.style.height = `${h + 48}px`;
  await new Promise((r) => window.setTimeout(r, 150));

  return { iframe, root };
}

function cleanupIframe(iframe: HTMLIFrameElement) {
  iframe.remove();
}

async function canvasFromReviewRoot(root: HTMLElement): Promise<HTMLCanvasElement> {
  const w = Math.max(root.scrollWidth, root.offsetWidth, PDF_A4_WIDTH_PX);
  const h = Math.max(root.scrollHeight, root.offsetHeight, 400);
  const scale = h > 6000 ? 1 : 1.5;
  try {
    return await html2canvas(root, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: w,
      height: h,
      windowWidth: w,
      windowHeight: h,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('img').forEach((img) => {
          const el = img as HTMLImageElement;
          if (el.src && !el.complete) {
            el.removeAttribute('src');
          }
        });
      },
    });
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : 'Seite konnte nicht für PDF gerendert werden',
    );
  }
}

/** Einzelne korrigierte Prüfung als PDF (mehrere Seiten bei langen HU). */
export async function downloadExamReviewPdf(html: string, fileName: string): Promise<void> {
  const { iframe, root } = await renderHtmlInIframe(html);
  try {
    const canvas = await canvasFromReviewRoot(root);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    }

    pdf.save(`${sanitizeFileName(fileName)}.pdf`);
  } finally {
    cleanupIframe(iframe);
  }
}

/**
 * Alle Abgaben in einer PDF: pro Abgabe mindestens eine Seite.
 * Lange Prüfungen werden auf die Seitenhöhe skaliert (eine Seite pro Schüler:in).
 */
export async function downloadCombinedExamReviewsPdf(
  htmlPages: string[],
  fileName: string,
): Promise<void> {
  if (htmlPages.length === 0) throw new Error('Keine korrigierten Abgaben zum Export');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < htmlPages.length; i += 1) {
    const { iframe, root } = await renderHtmlInIframe(htmlPages[i]);
    try {
      const canvas = await canvasFromReviewRoot(root);
      const imgData = canvas.toDataURL('image/png');
      const imgHeightAtFullWidth = (canvas.height * pageWidth) / canvas.width;
      const scale = imgHeightAtFullWidth > pageHeight ? pageHeight / imgHeightAtFullWidth : 1;
      const drawW = pageWidth * scale;
      const drawH = imgHeightAtFullWidth * scale;
      const offsetX = (pageWidth - drawW) / 2;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', offsetX, 0, drawW, drawH);
    } finally {
      cleanupIframe(iframe);
    }
  }

  pdf.save(`${sanitizeFileName(fileName)}.pdf`);
}
