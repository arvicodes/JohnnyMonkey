import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

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

async function renderHtmlInIframe(html: string): Promise<{
  iframe: HTMLIFrameElement;
  root: HTMLElement;
}> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
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
  await waitForIframeImages(doc);

  const root =
    (doc.querySelector('.exam-shell') as HTMLElement | null) ||
    (doc.body as HTMLElement);
  const h = Math.max(root.scrollHeight, root.offsetHeight, 800);
  iframe.style.height = `${h + 40}px`;

  return { iframe, root };
}

function cleanupIframe(iframe: HTMLIFrameElement) {
  iframe.remove();
}

async function canvasFromReviewRoot(root: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(root, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#f3f3f3',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    width: root.scrollWidth || root.offsetWidth,
    height: root.scrollHeight || root.offsetHeight,
    windowWidth: root.scrollWidth || root.offsetWidth,
    windowHeight: root.scrollHeight || root.offsetHeight,
  });
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
  const margin = 4;

  for (let i = 0; i < htmlPages.length; i += 1) {
    const { iframe, root } = await renderHtmlInIframe(htmlPages[i]);
    try {
      const canvas = await canvasFromReviewRoot(root);
      const imgData = canvas.toDataURL('image/png');
      const usableW = pageWidth - margin * 2;
      const usableH = pageHeight - margin * 2;
      const imgHeightAtFullWidth = (canvas.height * usableW) / canvas.width;
      const scale = imgHeightAtFullWidth > usableH ? usableH / imgHeightAtFullWidth : 1;
      const drawW = usableW * scale;
      const drawH = imgHeightAtFullWidth * scale;

      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, margin, drawW, drawH);
    } finally {
      cleanupIframe(iframe);
    }
  }

  pdf.save(`${sanitizeFileName(fileName)}.pdf`);
}
