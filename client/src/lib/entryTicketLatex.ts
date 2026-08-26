import katex from 'katex';
import 'katex/dist/katex.min.css';

const LATEX_MARK = '\uE200';
const LATEX_END = '\uE201';

export function renderEntryTicketLatexHtml(tex: string, display = false): string {
  const trimmed = (tex || '').trim();
  if (!trimmed) return '';
  try {
    return katex.renderToString(trimmed, {
      throwOnError: false,
      displayMode: display,
      output: 'html',
      strict: 'ignore',
      trust: false,
    });
  } catch {
    return '';
  }
}

/**
 * Zieht `$…$`, `$$…$$`, `\(...\)` und `\[…\]` raus, damit Operator-Fettung
 * die Formeln nicht zerreißt. Platzhalter später mit restoreEntryTicketLatex ersetzen.
 */
export function extractEntryTicketLatex(source: string, rendered: string[]): string {
  if (!source) return source;
  if (!/[\\$]/.test(source)) return source;

  const push = (tex: string, display: boolean): string => {
    const html = renderEntryTicketLatexHtml(tex, display);
    if (!html) return tex;
    const i = rendered.length;
    rendered.push(`<span class="et-tex">${html}</span>`);
    return `${LATEX_MARK}${i}${LATEX_END}`;
  };

  let out = source;
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => push(tex, true));
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex: string) => push(tex, true));
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex: string) => push(tex, false));
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, tex: string) => push(tex, false));
  return out;
}

export function restoreEntryTicketLatex(html: string, rendered: string[]): string {
  if (!rendered.length) return html;
  return html.replace(/\uE200(\d+)\uE201/g, (_m, i: string) => rendered[Number(i)] || '');
}
