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
  const sanitized = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '');
  return sanitized
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
  const openTag = pXml.match(/^<w:p(?:\s[^>]*)?>/)?.[0] ?? '<w:p>';
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
  return `${openTag}${pPr}${runs}</w:p>`;
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

type DocxBodyLayout = {
  parts: Array<{ kind: 'p'; index: number } | { kind: 'other'; xml: string }>;
  paragraphXml: string[];
  sectPrXml: string;
};

/** Schließendes Tag finden — `<w:pPr` darf nicht als `<w:p` zählen. */
function findMatchingCloseTag(xml: string, start: number, qualified: string): number {
  const openRe = new RegExp(`<${qualified}(?=[\\s/>])`, 'g');
  const closeTag = `</${qualified}>`;
  let depth = 0;
  let pos = start;

  while (pos < xml.length) {
    openRe.lastIndex = pos;
    const openMatch = openRe.exec(xml);
    const nextOpen = openMatch?.index ?? -1;
    const nextClose = xml.indexOf(closeTag, pos);
    if (nextClose === -1) {
      throw new Error(`Word-Dokument unvollständig (${qualified}).`);
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      pos = xml.indexOf('>', nextOpen);
      if (pos === -1) throw new Error(`Word-Dokument unvollständig (${qualified}).`);
      pos += 1;
      continue;
    }

    depth -= 1;
    pos = nextClose + closeTag.length;
    if (depth === 0) return pos;
  }

  throw new Error(`Word-Dokument unvollständig (${qualified}).`);
}

function parseDocxBodyLayout(docXml: string): DocxBodyLayout {
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) throw new Error('Word-Dokument ohne Textkörper.');

  const bodyInner = bodyMatch[1];
  const sectMatch = bodyInner.match(/<w:sectPr[\s\S]*?<\/w:sectPr>\s*$/);
  const sectPrXml = sectMatch?.[0] ?? '';
  const content = sectMatch ? bodyInner.slice(0, sectMatch.index) : bodyInner;

  const parts: DocxBodyLayout['parts'] = [];
  const paragraphXml: string[] = [];
  let pIndex = 0;
  let i = 0;

  while (i < content.length) {
    while (i < content.length && /\s/.test(content[i])) i += 1;
    if (i >= content.length) break;

    if (content.startsWith('<w:p', i) && /^<w:p(?:[\s/>])/.test(content.slice(i))) {
      const end = findMatchingCloseTag(content, i, 'w:p');
      paragraphXml.push(content.slice(i, end));
      parts.push({ kind: 'p', index: pIndex });
      pIndex += 1;
      i = end;
      continue;
    }

    if (content.startsWith('<w:tbl', i) && /^<w:tbl(?:[\s/>])/.test(content.slice(i))) {
      const end = findMatchingCloseTag(content, i, 'w:tbl');
      parts.push({ kind: 'other', xml: content.slice(i, end) });
      i = end;
      continue;
    }

    const unknownOpen = content.slice(i).match(/^<(w:[A-Za-z0-9]+)/);
    if (!unknownOpen) break;
    const tag = unknownOpen[1];
    const end = findMatchingCloseTag(content, i, tag);
    parts.push({ kind: 'other', xml: content.slice(i, end) });
    i = end;
  }

  return { parts, paragraphXml, sectPrXml };
}

function serializeDocxBody(layout: DocxBodyLayout, patchedParagraphs: string[]): string {
  let pIdx = 0;
  const inner = layout.parts
    .map((part) => {
      if (part.kind === 'other') return part.xml;
      const next = patchedParagraphs[pIdx] ?? layout.paragraphXml[part.index];
      pIdx += 1;
      return next;
    })
    .join('');
  return `<w:body>${inner}${layout.sectPrXml}</w:body>`;
}

function replaceDocxBody(docXml: string, layout: DocxBodyLayout, patchedParagraphs: string[]): string {
  const newBody = serializeDocxBody(layout, patchedParagraphs);
  const replaced = docXml.replace(/<w:body[\s\S]*?<\/w:body>/, newBody);
  if (replaced === docXml) throw new Error('Word-Dokument konnte nicht aktualisiert werden.');
  return replaced;
}

export function patchDocxBody(originalBuffer: ArrayBuffer, bodyHtml: string, options: PatchDocxOptions = {}): Blob {
  const zip = new PizZip(originalBuffer);
  const docFile = zip.file('word/document.xml');
  if (!docFile) throw new Error('Word-Datei ist ungültig.');
  let docXml = docFile.asText();

  const layout = parseDocxBodyLayout(docXml);
  const paragraphs = layout.paragraphXml;

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

  docXml = replaceDocxBody(docXml, layout, patched);

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
      width: pageEl.scrollWidth || pageEl.offsetWidth,
      height: pageEl.scrollHeight || pageEl.offsetHeight,
      windowWidth: pageEl.scrollWidth || pageEl.offsetWidth,
      windowHeight: pageEl.scrollHeight || pageEl.offsetHeight,
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
    const pages = Array.from(
      host.querySelectorAll('section.docx, section[class*="docx"]'),
    ) as HTMLElement[];
    const ready =
      pages.length > 0 &&
      pages.every((page) => Math.max(page.offsetHeight, page.scrollHeight, page.clientHeight) > 8);
    if (ready) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
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

function prepareHostForCanvasCapture(host: HTMLElement): () => void {
  const backup = host.style.cssText;
  host.style.cssText =
    'position:fixed;left:0;top:0;width:794px;max-width:100vw;opacity:1;pointer-events:none;z-index:-1;overflow:visible;background:#fff;';
  return () => {
    host.style.cssText = backup;
  };
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
  const { host, pages } = await renderDocxBlobToPages(docxBlob);
  if (pages.length === 0) throw new Error('Keine Seiten für PDF-Export gefunden.');

  const restoreHost = prepareHostForCanvasCapture(host);
  try {
    await new Promise((resolve) => window.setTimeout(resolve, 120));
    await exportAnnouncementPdfPages(pages, fileName);
  } finally {
    restoreHost();
    host.innerHTML = '';
  }
}
