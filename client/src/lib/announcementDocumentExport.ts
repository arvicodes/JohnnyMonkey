import { saveAs } from 'file-saver';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import PizZip from 'pizzip';
import { ensureVereinProtokollHeader } from '../components/announcements/vereinProtokollAssets';

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'Dokument';
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraphPlainText(pXml: string): string {
  return pXml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function paragraphHasDrawing(pXml: string): boolean {
  return /<w:drawing|<w:pict|<w:object/.test(pXml);
}

function firstRunProperties(pXml: string): string {
  return pXml.match(/<w:r(?:\s[^>]*)?>\s*(<w:rPr[\s\S]*?<\/w:rPr>)?/)?.[1] ?? '';
}

function setParagraphPlainText(pXml: string, text: string): string {
  const pPr = pXml.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] ?? '';
  const rPr = firstRunProperties(pXml);
  const lines = text.split('\n');
  let runs = '';
  lines.forEach((line, index) => {
    if (index > 0) runs += `<w:r>${rPr}<w:br/></w:r>`;
    const parts = line.split('\t');
    parts.forEach((part, tabIndex) => {
      if (tabIndex > 0) runs += `<w:r>${rPr}<w:tab/></w:r>`;
      runs += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`;
    });
  });
  if (!runs) runs = `<w:r>${rPr}<w:t xml:space="preserve"></w:t></w:r>`;
  return `<w:p>${pPr}${runs}</w:p>`;
}

function normalizeBlockText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+\n/g, '\n');
}

function elementBlockText(el: Element): string | '__LOGO__' {
  if (el.tagName.toLowerCase() === 'p' && el.querySelector('img')) return '__LOGO__';

  let result = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as Element;
    const tag = child.tagName.toLowerCase();
    if (tag === 'img') return;
    if (child.classList.contains('proto-tab')) {
      result += '\t';
      return;
    }
    child.childNodes.forEach(walk);
  };

  el.childNodes.forEach(walk);
  const normalized = normalizeBlockText(result);
  return normalized.trim() === '' ? '' : normalized;
}

/** Protokoll-HTML → flache Absatzliste (Logo überspringen, Tabs aus .proto-tab). */
export function extractProtokollBlocks(html: string): string[] {
  if (typeof document === 'undefined') return extractProtokollBlocksFromMarkup(html);

  const root = document.createElement('div');
  root.innerHTML = html || '';
  const container = root.querySelector('.vel-protokoll') ?? root;
  const blocks: string[] = [];

  Array.from(container.children).forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'p') {
      if (el.classList.contains('proto-header-title')) return;
      blocks.push(elementBlockText(el));
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      el.querySelectorAll(':scope > li').forEach((li) => {
        blocks.push(elementBlockText(li));
      });
    }
  });

  return blocks;
}

function extractProtokollBlocksFromMarkup(html: string): string[] {
  const blocks: string[] = [];
  const containerMatch = html.match(/<div class="vel-protokoll">([\s\S]*)<\/div>\s*$/);
  const inner = containerMatch?.[1] ?? html;

  const tokenRe = /<(p|ul)[^>]*>([\s\S]*?)<\/\1>/g;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(inner)) !== null) {
    const tag = match[1];
    const chunk = match[0];
    const content = match[2];
    if (tag === 'p') {
      if (/class="[^"]*proto-header-title/.test(chunk)) continue;
      if (/<img[\s>]/i.test(chunk)) {
        blocks.push('__LOGO__');
      } else {
        blocks.push(markupBlockText(content));
      }
    } else {
      const liRe = /<li>([\s\S]*?)<\/li>/g;
      let liMatch: RegExpExecArray | null;
      while ((liMatch = liRe.exec(content)) !== null) {
        blocks.push(markupBlockText(liMatch[1]));
      }
    }
  }
  return blocks;
}

function markupBlockText(inner: string): string {
  let text = inner
    .replace(/<span class="proto-tab"><\/span>/g, '\t')
    .replace(/<span class="proto-tab"\s*\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
  text = normalizeBlockText(text);
  return text.trim() === '' ? '' : text;
}

export function isProtokollBodyHtml(html: string): boolean {
  return /class="vel-protokoll"/.test(html) || html.includes('vel-protokoll');
}

/** HTML aus dem Editor → Absatztexte (ohne Bilder). */
export function htmlToParagraphTexts(html: string): string[] {
  if (typeof document === 'undefined') return [];
  const root = document.createElement('div');
  root.innerHTML = html || '';
  const texts: string[] = [];

  const collectFromElement = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') return;
    if (tag === 'p' || tag === 'li') {
      texts.push(normalizeBlockText(el.textContent ?? '').trim());
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      el.querySelectorAll(':scope > li').forEach((li) => {
        texts.push(normalizeBlockText(li.textContent ?? '').trim());
      });
      return;
    }
    if (tag === 'table') {
      el.querySelectorAll('tr').forEach((row) => {
        texts.push(normalizeBlockText(row.textContent ?? '').trim());
      });
      return;
    }
    Array.from(el.children).forEach(collectFromElement);
  };

  Array.from(root.children).forEach(collectFromElement);
  if (texts.length === 0 && root.textContent?.trim()) {
    texts.push(normalizeBlockText(root.textContent).trim());
  }

  return texts;
}

export type PatchDocxOptions = {
  /** Ab diesem Absatz im Original unverändert lassen (z. B. Klassenfahrt-Anhang). */
  preserveFromText?: string;
  /** Vorstandssitzung: Logo-Kopf unverändert, Absätze 1:1 mappen. */
  protokollVorstand?: boolean;
};

function patchProtokollVorstandDocx(paragraphs: string[], bodyHtml: string): string[] {
  const blocks = extractProtokollBlocks(bodyHtml);
  if (blocks.length === 0) return paragraphs;

  const headerCount = 2;
  const patched: string[] = paragraphs.slice(0, headerCount);

  for (let htmlIndex = 1; htmlIndex < blocks.length; htmlIndex += 1) {
    const docxIndex = htmlIndex + 1;
    if (docxIndex >= paragraphs.length) break;
    const block = blocks[htmlIndex];
    if (block === '__LOGO__') continue;

    const original = paragraphs[docxIndex];
    if (paragraphHasDrawing(original) && !paragraphPlainText(original)) {
      patched.push(original);
      continue;
    }
    patched.push(setParagraphPlainText(original, block));
  }

  for (let index = patched.length; index < paragraphs.length; index += 1) {
    patched.push(paragraphs[index]);
  }

  return patched;
}

export function patchDocxBody(originalBuffer: ArrayBuffer, bodyHtml: string, options: PatchDocxOptions = {}): Blob {
  const zip = new PizZip(originalBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Word-Datei ist ungültig.');
  let docXml = docFile.asText();

  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) throw new Error('Word-Dokument ohne Textkörper.');
  const bodyInner = bodyMatch[1];
  const sectMatch = bodyInner.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectMatch?.[0] ?? '';
  const bodyWithoutSect = sectMatch ? bodyInner.slice(0, sectMatch.index) : bodyInner;
  const paragraphs = bodyWithoutSect.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  const useProtokollPatch = options.protokollVorstand ?? isProtokollBodyHtml(bodyHtml);

  let patched: string[];
  if (useProtokollPatch) {
    patched = patchProtokollVorstandDocx(paragraphs, bodyHtml);
  } else {
    let editableCount = paragraphs.length;
    if (options.preserveFromText) {
      const markerIndex = paragraphs.findIndex((p) => paragraphPlainText(p).includes(options.preserveFromText!));
      if (markerIndex >= 0) editableCount = markerIndex;
    }

    const newTexts = htmlToParagraphTexts(bodyHtml);
    let textParagraphIndex = 0;
    patched = paragraphs.map((pXml, index) => {
      if (index >= editableCount) return pXml;
      if (paragraphHasDrawing(pXml) && !paragraphPlainText(pXml)) return pXml;
      if (textParagraphIndex >= newTexts.length) return pXml;
      const updated = setParagraphPlainText(pXml, newTexts[textParagraphIndex]);
      textParagraphIndex += 1;
      return updated;
    });
  }

  const newBody = `<w:body>${patched.join('')}${sectPr}</w:body>`;
  docXml = docXml.replace(/<w:body[\s\S]*?<\/w:body>/, newBody);

  zip.file('word/document.xml', docXml);
  const bytes = zip.generate({ type: 'uint8array', compression: 'DEFLATE' });
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function buildAnnouncementDocxBlob(options: {
  sourceDocxUrl: string;
  bodyHtml: string;
  preserveFromText?: string;
  protokollVorstand?: boolean;
}): Promise<Blob> {
  const base = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const url = options.sourceDocxUrl.startsWith('/')
    ? `${base}${options.sourceDocxUrl}`
    : options.sourceDocxUrl;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('Word-Vorlage konnte nicht geladen werden.');
  const buffer = await response.arrayBuffer();
  const isProtokoll = options.protokollVorstand ?? options.sourceDocxUrl.includes('vorstandssitzung');
  const bodyHtml = isProtokoll ? ensureVereinProtokollHeader(options.bodyHtml) : options.bodyHtml;
  return patchDocxBody(buffer, bodyHtml, {
    preserveFromText: options.preserveFromText,
    protokollVorstand: isProtokoll,
  });
}

export async function exportAnnouncementDocx(options: {
  sourceDocxUrl: string;
  bodyHtml: string;
  fileName: string;
  preserveFromText?: string;
  protokollVorstand?: boolean;
}): Promise<void> {
  const blob = await buildAnnouncementDocxBlob(options);
  saveAs(blob, `${sanitizeFileName(options.fileName)}.docx`);
}

export async function exportAnnouncementPdf(element: HTMLElement, fileName: string): Promise<void> {
  const pages = element.matches('section.docx')
    ? [element]
    : (Array.from(element.querySelectorAll('section.docx')) as HTMLElement[]);

  if (pages.length > 0) {
    await exportAnnouncementPdfPages(pages, fileName);
    return;
  }

  await exportAnnouncementPdfPages([element], fileName);
}

export async function exportAnnouncementPdfPages(pages: HTMLElement[], fileName: string): Promise<void> {
  if (pages.length === 0) throw new Error('Keine Seiten für PDF-Export gefunden.');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let index = 0; index < pages.length; index += 1) {
    const pageEl = pages[index];
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: pageEl.scrollWidth,
      windowHeight: pageEl.scrollHeight,
    });
    const imgData = canvas.toDataURL('image/png');
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    if (index > 0) pdf.addPage();

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
  }

  pdf.save(`${sanitizeFileName(fileName)}.pdf`);
}

export async function waitForDocxRenderPages(host: HTMLElement, timeoutMs = 30000): Promise<HTMLElement[]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const pages = Array.from(host.querySelectorAll('section.docx')) as HTMLElement[];
    const ready = pages.length > 0 && pages.every((page) => page.offsetHeight > 8);
    if (ready) {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      return pages;
    }
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  throw new Error('Word-Dokument konnte nicht gerendert werden.');
}

/** @deprecated use waitForDocxRenderPages */
export async function waitForDocxPreviewPages(host: HTMLElement, timeoutMs = 30000): Promise<HTMLElement[]> {
  return waitForDocxRenderPages(host, timeoutMs);
}

const OFFSCREEN_RENDER_HOST_ID = 'jm-announcement-docx-export-host';

function getOffscreenDocxRenderHost(): HTMLElement {
  let host = document.getElementById(OFFSCREEN_RENDER_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = OFFSCREEN_RENDER_HOST_ID;
    host.setAttribute('aria-hidden', 'true');
    // html2canvas erfasst opacity:0 nicht — deshalb off-screen statt unsichtbar
    host.style.cssText =
      'position:fixed;left:-12000px;top:0;width:794px;min-height:1123px;overflow:visible;background:#fff;pointer-events:none;';
    document.body.appendChild(host);
  }
  host.innerHTML = '';
  return host;
}

export async function renderDocxBlobToPages(docxBlob: Blob): Promise<{ host: HTMLElement; pages: HTMLElement[] }> {
  const host = getOffscreenDocxRenderHost();
  await renderAsync(docxBlob, host, undefined, {
    className: 'docx',
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false,
    breakPages: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    useBase64URL: true,
  });
  const pages = await waitForDocxRenderPages(host);
  return { host, pages };
}

export async function exportAnnouncementPdfFromDocxBlob(docxBlob: Blob, fileName: string): Promise<void> {
  const { pages } = await renderDocxBlobToPages(docxBlob);
  await exportAnnouncementPdfPages(pages, fileName);
}
