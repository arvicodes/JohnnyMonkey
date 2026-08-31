/** Word-/OMML-Formeln beim Einfügen als MathML behalten. */

export const PRES_MATH_ATTR = 'data-pres-math';

const MATH_ML_TAGS = new Set([
  'MATH',
  'MROW',
  'MI',
  'MO',
  'MN',
  'MFRAC',
  'MSUP',
  'MSUB',
  'MSUBSUP',
  'MSQRT',
  'MROOT',
  'MTABLE',
  'MTR',
  'MTD',
  'MUNDER',
  'MOVER',
  'MUNDEROVER',
  'MSPACE',
  'MTEXT',
  'MSTYLE',
  'MERROR',
  'MPADDED',
  'MPHANTOM',
  'MFENCED',
  'MMULTISCRIPTS',
  'MUNDER',
]);

export function isPresentationMathNode(node: Element | null | undefined): boolean {
  if (!node) return false;
  const tag = (node.tagName || '').toUpperCase();
  if (MATH_ML_TAGS.has(tag) || tag.endsWith(':MATH')) return true;
  return Boolean(node.closest?.(`[${PRES_MATH_ATTR}]`));
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function localName(el: Element): string {
  const raw = (el.localName || el.tagName || '').toLowerCase();
  return raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
}

function ommlVal(el: Element | null): string {
  if (!el) return '';
  return (
    el.getAttribute('val') ||
    el.getAttribute('m:val') ||
    el.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/math', 'val') ||
    (el.textContent || '').trim()
  );
}

function kids(el: Element): Element[] {
  return Array.from(el.children);
}

function findNamed(el: Element, name: string): Element | null {
  if (localName(el) === name) return el;
  for (const c of kids(el)) {
    const hit = findNamed(c, name);
    if (hit) return hit;
  }
  return null;
}

function child(el: Element, name: string): Element | null {
  return kids(el).find((c) => localName(c) === name) || null;
}

function convertOmml(el: Element): string {
  const name = localName(el);
  if (
    name === 'omath' ||
    name === 'omathpara' ||
    name === 'e' ||
    name === 'r' ||
    name === 'box' ||
    name === 'borderbox' ||
    name === 'argpr' ||
    name === 'ctrlpr' ||
    name === 'rpr' ||
    name === 'ophantom'
  ) {
    return kids(el)
      .filter((c) => !['argpr', 'ctrlpr', 'rpr', 'dpr', 'mpr', 'narypr', 'radpr', 'fpr', 'sSuppr', 'ssuppr', 'ssubpr'].includes(localName(c)))
      .map(convertOmml)
      .join('');
  }
  if (name === 't') {
    const text = el.textContent || '';
    const trimmed = text.trim();
    if (/^[A-Za-zΑ-ω]$/.test(trimmed)) return `<mi>${escapeXml(trimmed)}</mi>`;
    if (/^[0-9]+([.,][0-9]+)?$/.test(trimmed)) return `<mn>${escapeXml(trimmed)}</mn>`;
    return `<mtext>${escapeXml(text)}</mtext>`;
  }
  if (name === 'ssup') {
    return `<msup><mrow>${child(el, 'e') ? convertOmml(child(el, 'e')!) : ''}</mrow><mrow>${
      child(el, 'sup') ? convertOmml(child(el, 'sup')!) : ''
    }</mrow></msup>`;
  }
  if (name === 'ssub') {
    return `<msub><mrow>${child(el, 'e') ? convertOmml(child(el, 'e')!) : ''}</mrow><mrow>${
      child(el, 'sub') ? convertOmml(child(el, 'sub')!) : ''
    }</mrow></msub>`;
  }
  if (name === 'ssubsup') {
    return `<msubsup><mrow>${child(el, 'e') ? convertOmml(child(el, 'e')!) : ''}</mrow><mrow>${
      child(el, 'sub') ? convertOmml(child(el, 'sub')!) : ''
    }</mrow><mrow>${child(el, 'sup') ? convertOmml(child(el, 'sup')!) : ''}</mrow></msubsup>`;
  }
  if (name === 'f') {
    return `<mfrac><mrow>${child(el, 'num') ? convertOmml(child(el, 'num')!) : ''}</mrow><mrow>${
      child(el, 'den') ? convertOmml(child(el, 'den')!) : ''
    }</mrow></mfrac>`;
  }
  if (name === 'rad') {
    const deg = child(el, 'deg');
    const inner = child(el, 'e') ? convertOmml(child(el, 'e')!) : '';
    if (deg && (deg.textContent || '').trim()) {
      return `<mroot><mrow>${inner}</mrow><mrow>${convertOmml(deg)}</mrow></mroot>`;
    }
    return `<msqrt><mrow>${inner}</mrow></msqrt>`;
  }
  if (name === 'd') {
    const pr = child(el, 'dpr');
    const open = (pr && ommlVal(findNamed(pr, 'begchr'))) || '(';
    const close = (pr && ommlVal(findNamed(pr, 'endchr'))) || ')';
    const inner = kids(el)
      .filter((c) => localName(c) !== 'dpr')
      .map(convertOmml)
      .join('<mo>,</mo>');
    return `<mrow><mo>${escapeXml(open)}</mo>${inner}<mo>${escapeXml(close)}</mo></mrow>`;
  }
  if (name === 'nary') {
    const pr = child(el, 'narypr');
    const chr = ((pr && ommlVal(findNamed(pr, 'chr'))) || '∑').trim() || '∑';
    const sub = child(el, 'sub');
    const sup = child(el, 'sup');
    const body = child(el, 'e') ? convertOmml(child(el, 'e')!) : '';
    if (sub && sup) {
      return `<munderover><mo>${escapeXml(chr)}</mo><mrow>${convertOmml(sub)}</mrow><mrow>${convertOmml(sup)}</mrow></munderover><mrow>${body}</mrow>`;
    }
    if (sub) {
      return `<munder><mo>${escapeXml(chr)}</mo><mrow>${convertOmml(sub)}</mrow></munder><mrow>${body}</mrow>`;
    }
    return `<mo>${escapeXml(chr)}</mo><mrow>${body}</mrow>`;
  }
  if (name === 'm') {
    const rows = kids(el).filter((c) => localName(c) === 'mr');
    const trs = rows
      .map((row) => {
        const cells = kids(row)
          .filter((c) => localName(c) === 'e')
          .map((c) => `<mtd><mrow>${convertOmml(c)}</mrow></mtd>`)
          .join('');
        return `<mtr>${cells}</mtr>`;
      })
      .join('');
    return `<mrow><mo>(</mo><mtable>${trs}</mtable><mo>)</mo></mrow>`;
  }
  if (name === 'func') {
    const fname = child(el, 'fname');
    const e = child(el, 'e');
    return `<mrow>${fname ? convertOmml(fname) : ''}<mo>⁡</mo>${e ? convertOmml(e) : ''}</mrow>`;
  }
  if (name === 'limlow' || name === 'limupp') {
    const e = child(el, 'e');
    const lim = child(el, 'lim');
    const tag = name === 'limlow' ? 'munder' : 'mover';
    return `<${tag}><mrow>${e ? convertOmml(e) : ''}</mrow><mrow>${lim ? convertOmml(lim) : ''}</mrow></${tag}>`;
  }
  if (name === 'acc') {
    const e = child(el, 'e');
    return `<mover><mrow>${e ? convertOmml(e) : ''}</mrow><mo>^</mo></mover>`;
  }
  if (name === 'bar') {
    const e = child(el, 'e');
    return `<mover><mrow>${e ? convertOmml(e) : ''}</mrow><mo>¯</mo></mover>`;
  }
  if (name === 'eqarr') {
    const rows = kids(el)
      .filter((c) => localName(c) === 'e')
      .map((c) => `<mtr><mtd><mrow>${convertOmml(c)}</mrow></mtd></mtr>`)
      .join('');
    return `<mtable columnalign="left">${rows}</mtable>`;
  }
  if (name === 'num' || name === 'den' || name === 'sub' || name === 'sup' || name === 'deg' || name === 'lim' || name === 'fname') {
    return kids(el).map(convertOmml).join('') || `<mtext>${escapeXml(el.textContent || '')}</mtext>`;
  }
  if (name.endsWith('pr')) return '';
  const inner = kids(el).map(convertOmml).join('');
  if (inner) return inner;
  const text = (el.textContent || '').trim();
  return text ? `<mtext>${escapeXml(text)}</mtext>` : '';
}

function wrapMathMl(inner: string): string {
  const body = inner.trim() || '<mtext>?</mtext>';
  return (
    `<span class="pres-math" ${PRES_MATH_ATTR}="1" contenteditable="false">` +
    `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline">${body}</math>` +
    `</span>`
  );
}

function ommlFragmentToSpan(fragment: string): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><root xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${fragment}</root>`;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    const text = fragment.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    return text ? wrapMathMl(`<mtext>${escapeXml(text)}</mtext>`) : '';
  }
  const root = doc.documentElement;
  const mathBits = Array.from(root.children).map(convertOmml).join('');
  return mathBits ? wrapMathMl(mathBits) : '';
}

/** Word packt OMML oft in bedingte Kommentare. */
export function hoistPastedMathHtml(html: string): string {
  if (!html) return html;
  let convertedAny = false;
  let out = html.replace(
    /<!--\[if[^\]]*msEquation[^\]]*\]>([\s\S]*?)<!\[endif\]-->/gi,
    (_, inner: string) => {
      const converted = ommlFragmentToSpan(inner);
      if (converted) convertedAny = true;
      return converted || inner;
    },
  );
  if (convertedAny) {
    out = out.replace(/<!--\[if\s*!msEquation\][\s\S]*?<!\[endif\]-->/gi, '');
  } else {
    out = out.replace(/<!--\[if\s*!msEquation\]>?([\s\S]*?)<!\[endif\]-->/gi, '$1');
  }
  out = out.replace(/<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/gi, (m) => ommlFragmentToSpan(m) || m);
  out = out.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/gi, (m) => ommlFragmentToSpan(m) || m);
  return out;
}

function wrapMathElement(el: Element): void {
  if (el.closest(`[${PRES_MATH_ATTR}]`)) return;
  const span = el.ownerDocument.createElement('span');
  span.className = 'pres-math';
  span.setAttribute(PRES_MATH_ATTR, '1');
  span.setAttribute('contenteditable', 'false');
  el.parentNode?.insertBefore(span, el);
  span.appendChild(el);
  if (el.tagName.toLowerCase() === 'math' && !el.getAttribute('xmlns')) {
    el.setAttribute('xmlns', 'http://www.w3.org/1998/Math/MathML');
  }
}

export function convertOmmlElementsInPlace(root: ParentNode): void {
  const all = Array.from((root as Element).querySelectorAll?.('*') ?? []);
  for (const el of all) {
    if (!el.parentNode) continue;
    const name = localName(el);
    if (name !== 'omath' && name !== 'omathpara') continue;
    const html = wrapMathMl(convertOmml(el));
    const tmp = el.ownerDocument.createElement('span');
    tmp.innerHTML = html;
    const node = tmp.firstElementChild;
    if (node) el.replaceWith(node);
    else el.remove();
  }
  Array.from((root as Element).querySelectorAll?.('math') ?? []).forEach((math) => {
    wrapMathElement(math);
  });
}

function looksLikeEquationImage(img: HTMLImageElement): boolean {
  const src = (img.getAttribute('src') || '').trim();
  const alt = (img.getAttribute('alt') || '').toLowerCase();
  const html = img.outerHTML || '';
  if (/bullet|spacer|clear\.gif|transparent/i.test(src + alt + (img.className || ''))) return false;
  const w = Number(img.getAttribute('width') || img.width || 0);
  const h = Number(img.getAttribute('height') || img.height || 0);
  if (w && h && w < 8 && h < 8) return false;
  if (/data:image\/(x-)?(emf|wmf)|v:shapes|_x0000_i/i.test(src + html)) return true;
  if (src.startsWith('data:image/') || src.startsWith('blob:')) {
    if (w && h && w / h > 1.2 && h >= 12 && h <= 220) return true;
    if (/equation|formel|math|omml/i.test(alt)) return true;
    if (w >= 24 && h >= 12 && h <= 80) return true;
  }
  return /equation|formel|math/i.test(alt);
}

export function preserveEquationImagesInPlace(root: ParentNode): void {
  const imgs = Array.from((root as Element).querySelectorAll?.('img') ?? []) as HTMLImageElement[];
  for (const img of imgs) {
    if (img.closest(`[${PRES_MATH_ATTR}]`)) continue;
    if (!looksLikeEquationImage(img)) continue;
    const span = img.ownerDocument.createElement('span');
    span.className = 'pres-math';
    span.setAttribute(PRES_MATH_ATTR, 'img');
    span.setAttribute('contenteditable', 'false');
    img.style.height = img.style.height || '1.35em';
    img.style.width = 'auto';
    img.style.verticalAlign = 'middle';
    img.setAttribute('alt', img.getAttribute('alt') || 'Formel');
    img.parentNode?.insertBefore(span, img);
    span.appendChild(img);
  }
}

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

function latexSourceFromPlain(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function renderLatexToPresentationSpan(tex: string, display = false): string {
  const trimmed = latexSourceFromPlain(tex);
  if (!trimmed) return '';
  try {
    const mathml = loadKatex().renderToString(trimmed, {
      throwOnError: false,
      displayMode: display,
      output: 'mathml',
      strict: 'ignore',
      trust: false,
    });
    const inner = mathml.replace(/^[\s\S]*?(<math[\s\S]*<\/math>)[\s\S]*$/i, '$1').trim();
    if (!inner.startsWith('<math')) return '';
    return (
      `<span class="pres-math" ${PRES_MATH_ATTR}="1" contenteditable="false" data-pres-latex="${encodeURIComponent(trimmed)}">${inner}</span>`
    );
  } catch {
    return '';
  }
}

export const PRES_LATEX_ATTR = 'data-pres-latex';

/** LaTeX-Quelle aus pres-math-Span lesen (falls vorhanden). */
export function readPresentationMathLatex(span: HTMLElement): string {
  const raw = span.getAttribute(PRES_LATEX_ATTR);
  if (raw) {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  if (span.getAttribute(PRES_MATH_ATTR) === 'img') return '';
  const math = span.querySelector('math');
  if (math) {
    return (math.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return '';
}

/** LaTeX → pres-math-HTML (Vorschau / Einfügen). */
export function renderPresentationMathHtml(latex: string, display = false): string {
  return renderLatexToPresentationSpan(latex, display);
}

/** Vorhandene Formel durch neu gerenderte ersetzen (Formatierung behalten). */
export function replacePresentationMathElement(span: HTMLElement, latex: string): HTMLElement | null {
  const trimmed = latexSourceFromPlain(latex);
  if (!trimmed) return null;
  const html = renderLatexToPresentationSpan(trimmed, false);
  if (!html) return null;
  const tpl = span.ownerDocument.createElement('template');
  tpl.innerHTML = html;
  const next = tpl.content.firstElementChild as HTMLElement | null;
  if (!next) return null;
  copyPresentationMathChrome(span, next);
  span.replaceWith(next);
  return next;
}

const MATH_STYLE_ATTRS = ['data-pres-fs', 'data-pres-color', 'data-pres-bold'] as const;

function copyPresentationMathChrome(from: HTMLElement, to: HTMLElement) {
  for (const attr of MATH_STYLE_ATTRS) {
    const v = from.getAttribute(attr);
    if (v) to.setAttribute(attr, v);
  }
  const fs = from.style.fontSize;
  const color = from.style.color;
  const weight = from.style.fontWeight;
  if (fs) to.style.setProperty('font-size', fs, 'important');
  if (color) to.style.setProperty('color', color, 'important');
  if (weight) to.style.setProperty('font-weight', weight, 'important');
}

export type PresentationMathStylePatch = {
  fontSizePx?: number;
  color?: string | null;
  bold?: boolean | 'toggle';
};

/** Formatierung direkt am Formel-Span — MathML erbt Farbe/Größe/Fett. */
export function applyPresentationMathStyle(span: HTMLElement, patch: PresentationMathStylePatch): void {
  if (patch.fontSizePx != null && Number.isFinite(patch.fontSizePx)) {
    const px = Math.round(Math.max(10, Math.min(96, patch.fontSizePx)));
    span.setAttribute('data-pres-fs', String(px));
    span.style.setProperty('font-size', `${px}px`, 'important');
  }
  if (patch.color === null) {
    span.removeAttribute('data-pres-color');
    span.style.removeProperty('color');
  } else if (typeof patch.color === 'string' && patch.color.trim()) {
    const c = patch.color.trim();
    span.setAttribute('data-pres-color', c);
    span.style.setProperty('color', c, 'important');
  }
  if (patch.bold === 'toggle') {
    const on =
      span.getAttribute('data-pres-bold') === '1' ||
      span.style.fontWeight === 'bold' ||
      parseInt(span.style.fontWeight || '0', 10) >= 600;
    patch = { ...patch, bold: !on };
  }
  if (patch.bold === true) {
    span.setAttribute('data-pres-bold', '1');
    span.style.setProperty('font-weight', '700', 'important');
  } else if (patch.bold === false) {
    span.removeAttribute('data-pres-bold');
    span.style.removeProperty('font-weight');
  }
}

/** Formel an Cursor oder in der Auswahl finden. */
export function findPresentationMathInEditor(editor: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  while (node && node !== editor) {
    if (node instanceof HTMLElement && node.hasAttribute(PRES_MATH_ATTR)) return node;
    node = node.parentNode;
  }
  const range = sel.getRangeAt(0);
  const maths = editor.querySelectorAll(`[${PRES_MATH_ATTR}]`);
  for (let i = 0; i < maths.length; i += 1) {
    const m = maths[i] as HTMLElement;
    try {
      if (range.intersectsNode(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function isInsidePresentationMath(node: Node | null): boolean {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return Boolean(el?.closest?.(`[${PRES_MATH_ATTR}]`));
}

/** Alle Formel-Spans in der aktuellen Auswahl (oder unter dem Cursor). */
export function mathElementsInSelection(editor: HTMLElement): HTMLElement[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];
  if (!editor.contains(sel.anchorNode) && !editor.contains(sel.focusNode)) return [];
  const range = sel.getRangeAt(0);
  const found: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const add = (el: HTMLElement | null) => {
    if (!el || seen.has(el) || !editor.contains(el)) return;
    seen.add(el);
    found.push(el);
  };

  editor.querySelectorAll(`[${PRES_MATH_ATTR}]`).forEach((node) => {
    const el = node as HTMLElement;
    try {
      if (range.collapsed) {
        const container = range.commonAncestorContainer;
        if (el === container || el.contains(container)) add(el);
      } else if (range.intersectsNode(el)) {
        add(el);
      }
    } catch {
      /* ignore */
    }
  });

  if (!found.length) add(findPresentationMathInEditor(editor));
  return found;
}

/** Formatierung auf ausgewählte Formeln anwenden. true = mindestens eine Formel getroffen. */
export function applyFormatToSelectedMath(
  editor: HTMLElement | null,
  patch: PresentationMathStylePatch,
): boolean {
  if (!editor) return false;
  const maths = mathElementsInSelection(editor);
  if (!maths.length) return false;
  maths.forEach((m) => applyPresentationMathStyle(m, patch));
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Neue Formel an der Cursor-Position einfügen. */
export function insertPresentationFormulaAtCursor(editor: HTMLElement, latex: string): boolean {
  const trimmed = latexSourceFromPlain(latex);
  if (!trimmed) return false;
  const html = renderLatexToPresentationSpan(trimmed, false);
  if (!html) return false;

  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  const canUseRange =
    sel &&
    sel.rangeCount > 0 &&
    editor.contains(sel.getRangeAt(0).commonAncestorContainer);
  if (!canUseRange) {
    const range = editor.ownerDocument.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  const tpl = editor.ownerDocument.createElement('template');
  tpl.innerHTML = html;
  const node = tpl.content.firstChild as HTMLElement | null;
  if (!node) return false;

  const sel2 = window.getSelection();
  if (!sel2 || sel2.rangeCount === 0) return false;
  const range = sel2.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  sel2.removeAllRanges();
  sel2.addRange(range);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

export function looksLikeFormulaPlainText(text: string): boolean {
  const s = (text || '').trim();
  if (!s) return false;
  if (/\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\(|\\\[/.test(s)) return true;
  if (
    /\\(?:frac|begin|vec|cdot|times|le|ge|sqrt|sum|int|alpha|beta|gamma|pi|theta|matrix|pmatrix|bmatrix|vmatrix|mathbf|mathrm)\b/.test(
      s,
    )
  ) {
    return true;
  }
  if (/\\begin\{(?:p|b|v)?matrix\}/i.test(s)) return true;
  if (/[A-Za-z]\s*=\s*[^=\n]{3,}/.test(s) && /\\|[_^]\{/.test(s)) return true;
  if (looksLikeAsciiMatrix(s)) return true;
  return false;
}

/** ChatGPT-/ASCII-Matrix ohne LaTeX? */
export function looksLikeAsciiMatrix(text: string): boolean {
  const lines = (text || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return false;
  const rowRe =
    /^(?:[\[\(\|⎛⎜⎝]|\\left[\(\[]|\\begin\{)\s*-?[\d.,]+\s*(?:[,;\s]\s*-?[\d.,]+\s*)+(?:[\]\)\|⎞⎟⎠]|\\right[\)\]])?$/;
  const simpleRow = /^(?:[\[\(\|]?\s*)?(?:-?[\d.,]+(?:\s+|,|;)\s*)+-?[\d.,]+\s*(?:[\]\)\|])?$/;
  let matrixRows = 0;
  for (const line of lines) {
    if (rowRe.test(line) || simpleRow.test(line.replace(/\s+/g, ' '))) matrixRows += 1;
  }
  return matrixRows >= 2 && matrixRows >= lines.length - 1;
}

/**
 * ChatGPT-/Markdown-/ASCII-Text → möglichst reines LaTeX.
 * Erhält \begin{pmatrix}… und wandelt Klammern-Matrizen um.
 */
export function normalizeChatGptMathPlain(plain: string): string {
  let s = (plain || '').replace(/\r\n/g, '\n').trim();
  if (!s) return '';

  // Markdown-Codeblöcke (```latex … ```)
  const fence = s.match(/^```(?:latex|tex|math)?\s*\n?([\s\S]*?)```$/i);
  if (fence) s = fence[1].trim();

  // Äußere $$ / \[ \] entfernen
  s = s.replace(/^\$\$\s*([\s\S]*?)\s*\$\$$/, '$1').trim();
  s = s.replace(/^\\\[\s*([\s\S]*?)\s*\\\]$/, '$1').trim();
  s = s.replace(/^\\\(\s*([\s\S]*?)\s*\\\)$/, '$1').trim();

  // Schon LaTeX-Matrix / Formel → bereinigen
  if (/\\begin\{(?:p|b|v)?matrix\}/i.test(s) || /\\frac\b|\\vec\b|\\sum\b/.test(s)) {
    return latexSourceFromPlain(s);
  }

  const asciiLatex = asciiMatrixToLatex(s);
  if (asciiLatex) return asciiLatex;

  return latexSourceFromPlain(s);
}

/** Zeilen wie `[1 2; 3 4]` oder zwei Zeilen `[1 2]` / `[3 4]` → pmatrix. */
export function asciiMatrixToLatex(text: string): string | null {
  const raw = (text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return null;

  // Einzeilig: [1 2; 3 4] oder (1,2|3,4)
  const oneLine = raw.match(
    /^[A-Za-z]?\s*=?\s*[\[\(\|]\s*((?:-?[\d.,]+(?:\s*[,;\s]\s*-?[\d.,]+)*)(?:\s*[;|]\s*-?[\d.,]+(?:\s*[,;\s]\s*-?[\d.,]+)*)+)\s*[\]\)\|]\s*$/,
  );
  if (oneLine) {
    const body = oneLine[1]
      .split(/\s*[;|]\s*/)
      .map((row) =>
        row
          .trim()
          .split(/\s*[,]\s*|\s+/)
          .filter(Boolean)
          .join(' & '),
      )
      .join(' \\\\ ');
    if (body.includes('&')) return `\\begin{pmatrix}${body}\\end{pmatrix}`;
  }

  const lines = raw
    .split(/\n+/)
    .map((l) =>
      l
        .trim()
        .replace(/^[\[\(\|⎛⎜⎝]+\s*/, '')
        .replace(/\s*[\]\)\|⎞⎟⎠]+$/, '')
        .replace(/^\\left[\(\[]\s*/, '')
        .replace(/\s*\\right[\)\]]$/, '')
        .trim(),
    )
    .filter(Boolean);
  if (lines.length < 2) return null;

  const rows: string[][] = [];
  for (const line of lines) {
    // A = ... vor der Matrix ignorieren
    const cleaned = line.replace(/^[A-Za-z][A-Za-z0-9]*\s*=\s*/, '').trim();
    const cells = cleaned
      .split(/\s*[,;]\s*|\s+/)
      .map((c) => c.trim())
      .filter((c) => /^-?[\d.,]+(?:e[-+]?\d+)?$/i.test(c) || /^[A-Za-z]$/.test(c));
    if (cells.length < 2) return null;
    rows.push(cells);
  }
  const width = rows[0].length;
  if (!rows.every((r) => r.length === width)) return null;
  const body = rows.map((r) => r.join(' & ')).join(' \\\\ ');
  return `\\begin{pmatrix}${body}\\end{pmatrix}`;
}

/** LaTeX aus ChatGPT-HTML (katex annotation, code-Blöcke). */
export function extractLatexFromPastedHtml(html: string): string | null {
  if (!html?.trim() || typeof document === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const annotation = doc.querySelector('annotation[encoding="application/x-tex"], annotation[encoding="application/x-latex"]');
  if (annotation?.textContent?.trim()) {
    return normalizeChatGptMathPlain(annotation.textContent);
  }

  const code =
    doc.querySelector('code.language-latex, code.language-tex, code.language-math, pre code') ||
    doc.querySelector('[class*="language-latex"], [class*="language-tex"]');
  if (code?.textContent?.trim()) {
    const t = normalizeChatGptMathPlain(code.textContent);
    if (looksLikeFormulaPlainText(t) || /\\begin\{/.test(t)) return t;
  }

  const plain = (doc.body.textContent || '').replace(/\u00a0/g, ' ').trim();
  if (looksLikeFormulaPlainText(plain)) return normalizeChatGptMathPlain(plain);
  return null;
}

/** Plain-Text/LaTeX → HTML mit pres-math-Blöcken (Formel-Modus / ChatGPT-Matrix). */
export function convertPlainTextWithLatexToPresentationHtml(plain: string): string {
  const normalized = normalizeChatGptMathPlain(plain);
  const source = normalized || plain.replace(/\r\n/g, '\n').trim();
  if (!source) return '<p><br></p>';

  const render = (tex: string, display: boolean) =>
    renderLatexToPresentationSpan(tex, display) || `<span>${tex}</span>`;

  // Reine Matrix / ein LaTeX-Block → eine Display-Formel
  if (
    /^\\begin\{(?:p|b|v)?matrix\}[\s\S]*\\end\{(?:p|b|v)?matrix\}$/i.test(source.trim()) ||
    (looksLikeAsciiMatrix(plain) && /^\\begin\{pmatrix\}/.test(source))
  ) {
    return `<p>${render(source.trim(), true)}</p>`;
  }

  const chunks: string[] = [];
  let rest = source;
  const patterns: Array<{ re: RegExp; display: boolean }> = [
    { re: /\$\$([\s\S]+?)\$\$/g, display: true },
    { re: /\\\[([\s\S]+?)\\\]/g, display: true },
    { re: /\\\(([\s\S]+?)\\\)/g, display: false },
    { re: /\$([^$\n]+?)\$/g, display: false },
    {
      re: /\\begin\{(?:p|b|v)?matrix\}[\s\S]*?\\end\{(?:p|b|v)?matrix\}/gi,
      display: true,
    },
  ];

  for (const { re, display } of patterns) {
    rest = rest.replace(re, (match: string, ...restArgs: unknown[]) => {
      // Ohne Capture-Group ist args[0] der Offset (Zahl) — nicht der Text.
      const maybeGroup = restArgs[0];
      const body = typeof maybeGroup === 'string' ? maybeGroup : match;
      chunks.push(render(body, display));
      return `\uE202${chunks.length - 1}\uE203`;
    });
  }

  if (/\\(?:frac|begin|vec|cdot|times|sqrt|sum|int|pmatrix|bmatrix)\b/.test(rest)) {
    rest = render(rest, /\\begin\{(?:p|b|v)?matrix\}/i.test(rest));
    return `<p>${rest}</p>`;
  }

  const lines = rest.split(/\n+/).map((line) => {
    const withFormulas = line.replace(/\uE202(\d+)\uE203/g, (_m, i: string) => chunks[Number(i)] || '');
    const trimmed = withFormulas.trim();
    if (!trimmed) return '<p><br></p>';
    if (trimmed.startsWith('<span class="pres-math"')) return `<p>${trimmed}</p>`;
    return `<p>${trimmed}</p>`;
  });
  return lines.join('') || '<p><br></p>';
}
