import html2canvas from 'html2canvas';
import 'katex/dist/katex.min.css';
import '../styles/presentationLists.css';
import {
  consolidateSlideNotes,
  htmlToPlain,
  type PresentationSlide,
} from './presentationDeck';
import {
  PRES_MATH_ATTR,
  readPresentationMathLatex,
} from './presentationPasteMath';
import { waitForDomImages } from './presentationPdfExportScheduler';

type KatexModule = {
  renderToString: (
    tex: string,
    options?: {
      throwOnError?: boolean;
      displayMode?: boolean;
      output?: 'html' | 'mathml' | 'htmlAndMathml';
      strict?: boolean | string;
      trust?: boolean;
    },
  ) => string;
};

function loadKatex(): KatexModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return require('katex') as KatexModule;
}

function katexToPlainText(latex: string): string {
  const trimmed = (latex || '').trim();
  if (!trimmed) return '';
  try {
    const html = loadKatex().renderToString(trimmed, {
      throwOnError: false,
      displayMode: false,
      output: 'html',
      strict: 'ignore',
      trust: false,
    });
    const div = document.createElement('div');
    div.innerHTML = html;
    return (div.textContent || '').replace(/\u00a0/g, ' ').trim();
  } catch {
    return trimmed;
  }
}

/** Lesbarer Plain-Text aus Notiz-HTML (Formeln als Unicode, keine MathML-Rohdaten). */
export function htmlToPlainForExport(html: string): string {
  if (!html?.trim()) return '';
  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll(`[${PRES_MATH_ATTR}]`).forEach((node) => {
    const el = node as HTMLElement;
    const latex = readPresentationMathLatex(el);
    const plain = latex ? katexToPlainText(latex) : (el.textContent || '').trim();
    el.replaceWith(document.createTextNode(plain || ' '));
  });

  div.querySelectorAll('math').forEach((node) => {
    const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
    node.replaceWith(document.createTextNode(t || ' '));
  });

  const blockTags = new Set(['P', 'DIV', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'BR']);
  const lines: string[] = [];
  const walk = (parent: Node) => {
    parent.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = (child.textContent || '').replace(/\u00a0/g, ' ');
        if (t.trim()) lines.push(t.replace(/\s+/g, ' ').trim());
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName;
      if (tag === 'BR') {
        lines.push('');
        return;
      }
      if (blockTags.has(tag)) {
        walk(el);
        if (tag === 'P' || tag === 'LI' || tag === 'DIV') lines.push('');
        return;
      }
      walk(el);
    });
  };
  walk(div);

  const joined = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (joined) return joined;
  return htmlToPlain(html);
}

export function speakerNotesHtmlForExport(slide: PresentationSlide): string {
  const notes = consolidateSlideNotes(slide);
  const html = (notes.speakerNotesHtml || '').trim();
  if (html && html !== '<p><br></p>') return html;
  return '';
}

/** Ein Notizfeld — konsolidiert, ohne Doppelung aus Plain + HTML + Legacy-Felder. */
export function speakerNotesTextForExport(slide: PresentationSlide): string {
  const html = speakerNotesHtmlForExport(slide);
  if (html) return htmlToPlainForExport(html);
  const legacy = [
    (slide.speakerNotes || '').trim(),
    htmlToPlainForExport(slide.materialHtml || ''),
    htmlToPlainForExport(slide.preparationHtml || ''),
  ].filter(Boolean);
  return legacy.join('\n\n').trim();
}

const NOTES_CAPTURE_WIDTH_PX = 720;

/** Notiz-HTML als Bild (Formeln, Listen) — für PDF-Notizseiten. */
export async function captureSpeakerNotesCanvas(notesHtml: string): Promise<HTMLCanvasElement | null> {
  const html = (notesHtml || '').trim();
  if (!html || html === '<p><br></p>') return null;

  const host = document.createElement('div');
  host.setAttribute('data-pres-notes-export', '1');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-12000px',
    top: '0',
    width: `${NOTES_CAPTURE_WIDTH_PX}px`,
    padding: '20px 24px',
    background: '#ffffff',
    color: '#1a1a1a',
    fontFamily: 'Calibri, "Segoe UI", sans-serif',
    fontSize: '15px',
    lineHeight: '1.45',
    boxSizing: 'border-box',
    zIndex: '-1',
  });
  host.className = 'pres-notes-export-host';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await waitForDomImages(host, 8000);
    const canvas = await html2canvas(host, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: NOTES_CAPTURE_WIDTH_PX,
      windowWidth: NOTES_CAPTURE_WIDTH_PX + 48,
    });
    return canvas;
  } finally {
    host.remove();
  }
}
