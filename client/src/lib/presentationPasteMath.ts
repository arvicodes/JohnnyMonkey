/** Word-/OMML-Formeln beim Einfügen als MathML behalten. */

export const PRES_MATH_ATTR = 'data-pres-math';

const PRES_MATH_STASH = '\uE000PMATH';

/** pres-math-Blöcke vor Legacy-LaTeX-Konvertierung schützen (Vorschau / Sanitize). */
export function stashPresentationMathInHtml(html: string): { html: string; blocks: string[] } {
  const blocks: string[] = [];
  const out = (html || '').replace(/<span\b[^>]*\bdata-pres-math\b[^>]*>[\s\S]*?<\/span>/gi, (tag) => {
    const token = `${PRES_MATH_STASH}${blocks.length}\uE001`;
    blocks.push(tag);
    return token;
  });
  return { html: out, blocks };
}

export function restorePresentationMathInHtml(html: string, blocks: string[]): string {
  if (!blocks.length) return html;
  return html.replace(/\uE000PMATH(\d+)\uE001/g, (_, i) => blocks[Number(i)] || '');
}

export function htmlHasPresentationMath(html: string): boolean {
  return /\bdata-pres-math\b/i.test(html || '');
}
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
  let s = String(raw ?? '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .trim();
  const wrapped =
    s.match(/^\$\$([\s\S]*)\$\$$/) ||
    s.match(/^\$([^$]*)\$$/) ||
    s.match(/^\\\(([\s\S]*)\\\)$/) ||
    s.match(/^\\\[([\s\S]*)\\\]$/);
  if (wrapped) s = wrapped[1].trim();
  return s;
}

/** LaTeX-Quelle ohne $…$ / \(…\). */
export function normalizePresentationLatexSource(raw: unknown): string {
  return latexSourceFromPlain(raw);
}

function renderLatexToPresentationSpan(tex: string, _display = false): string {
  const trimmed = latexSourceFromPlain(tex);
  if (!trimmed) return '';
  try {
    const mathml = loadKatex().renderToString(trimmed, {
      throwOnError: false,
      displayMode: false,
      output: 'mathml',
      strict: 'ignore',
      trust: false,
    });
    const inner = mathml
      .replace(/^[\s\S]*?(<math[\s\S]*<\/math>)[\s\S]*$/i, '$1')
      .trim()
      .replace(/\sdisplay=["']block["']/gi, ' display="inline"');
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

const MATH_STYLE_ATTRS = [
  'data-pres-fs',
  'data-pres-color',
  'data-pres-bold',
  'data-pres-font',
  'data-pres-italic',
  'data-pres-highlight',
] as const;

function copyPresentationMathChrome(from: HTMLElement, to: HTMLElement) {
  for (const attr of MATH_STYLE_ATTRS) {
    const v = from.getAttribute(attr);
    if (v) to.setAttribute(attr, v);
  }
  const fs = from.style.fontSize;
  const color = from.style.color;
  const weight = from.style.fontWeight;
  const family = from.style.fontFamily;
  const italic = from.style.fontStyle;
  const bg = from.style.backgroundColor;
  if (fs) to.style.setProperty('font-size', fs, 'important');
  if (color) to.style.setProperty('color', color, 'important');
  if (weight) to.style.setProperty('font-weight', weight, 'important');
  if (family) to.style.setProperty('font-family', family, 'important');
  if (italic) to.style.setProperty('font-style', italic, 'important');
  if (bg) to.style.setProperty('background-color', bg, 'important');
}

export type PresentationMathStylePatch = {
  fontSizePx?: number;
  color?: string | null;
  bold?: boolean | 'toggle';
  italic?: boolean | 'toggle';
  fontFamily?: string | null;
  highlight?: string | null;
};

function isMathWrapperSpan(el: HTMLElement): boolean {
  return el.hasAttribute(PRES_MATH_ATTR);
}

function applyFontSizeToNode(el: HTMLElement, px: number) {
  const size = Math.round(Math.max(10, Math.min(96, px)));
  el.setAttribute('data-pres-fs', String(size));
  el.style.setProperty('font-size', `${size}px`, 'important');
  el.setAttribute('mathsize', `${size}px`);
  if (isMathWrapperSpan(el)) {
    const math = el.querySelector('math') as HTMLElement | null;
    if (math) {
      math.style.setProperty('font-size', `${size}px`, 'important');
      math.setAttribute('mathsize', `${size}px`);
    }
  }
}

function tokenTag(el: HTMLElement): string {
  return localName(el);
}

function applyBoldToNode(el: HTMLElement, on: boolean) {
  if (on) {
    el.setAttribute('data-pres-bold', '1');
    el.style.setProperty('font-weight', '700', 'important');
    if (!isMathWrapperSpan(el)) {
      el.setAttribute('mathvariant', tokenTag(el) === 'mi' ? 'bold-italic' : 'bold');
    }
  } else {
    el.removeAttribute('data-pres-bold');
    el.style.removeProperty('font-weight');
    if (!isMathWrapperSpan(el)) el.removeAttribute('mathvariant');
  }
}

/** Formatierung am ganzen Formel-Span oder an einem angeklickten MathML-Stück. */
export function applyPresentationMathStyle(span: HTMLElement, patch: PresentationMathStylePatch): void {
  if (patch.fontSizePx != null && Number.isFinite(patch.fontSizePx)) {
    applyFontSizeToNode(span, patch.fontSizePx);
  }
  if (patch.color === null) {
    span.removeAttribute('data-pres-color');
    span.removeAttribute('mathcolor');
    span.style.removeProperty('--pres-math-color');
    span.style.removeProperty('color');
  } else if (typeof patch.color === 'string' && patch.color.trim()) {
    const c = patch.color.trim();
    span.setAttribute('data-pres-color', c);
    span.setAttribute('mathcolor', c);
    span.style.setProperty('--pres-math-color', c);
    span.style.setProperty('color', c, 'important');
  }
  if (patch.fontFamily === null) {
    span.removeAttribute('data-pres-font');
    span.style.removeProperty('font-family');
  } else if (typeof patch.fontFamily === 'string' && patch.fontFamily.trim()) {
    const f = patch.fontFamily.trim();
    span.setAttribute('data-pres-font', f);
    span.style.setProperty('font-family', f, 'important');
  }
  if (patch.highlight === null) {
    span.removeAttribute('data-pres-highlight');
    span.style.removeProperty('background-color');
  } else if (typeof patch.highlight === 'string' && patch.highlight.trim()) {
    const h = patch.highlight.trim();
    span.setAttribute('data-pres-highlight', h);
    span.style.setProperty('background-color', h, 'important');
  }
  if (patch.bold === 'toggle') {
    const on =
      span.getAttribute('data-pres-bold') === '1' ||
      span.style.fontWeight === 'bold' ||
      parseInt(span.style.fontWeight || '0', 10) >= 600;
    patch = { ...patch, bold: !on };
  }
  if (patch.bold === true) applyBoldToNode(span, true);
  else if (patch.bold === false) applyBoldToNode(span, false);
  if (patch.italic === 'toggle') {
    const on = span.getAttribute('data-pres-italic') === '1' || span.style.fontStyle === 'italic';
    patch = { ...patch, italic: !on };
  }
  if (patch.italic === true) {
    span.setAttribute('data-pres-italic', '1');
    span.style.setProperty('font-style', 'italic', 'important');
  } else if (patch.italic === false) {
    span.removeAttribute('data-pres-italic');
    span.style.removeProperty('font-style');
  }
}

/** Farbe/Größe/Schrift vom umgebenden Text auf eine neue Formel übertragen. */
export function applySurroundingStyleToMath(span: HTMLElement, from: Node | null): void {
  let el: HTMLElement | null =
    from instanceof HTMLElement ? from : from?.parentElement ?? span.parentElement;
  if (!el) return;
  const patch: PresentationMathStylePatch = {};
  const root = span.closest('[contenteditable="true"], [data-pres-rich-zone]') as HTMLElement | null;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    if (patch.fontSizePx == null) {
      const attr = node.getAttribute('data-pres-fs');
      if (attr) {
        const n = parseInt(attr, 10);
        if (Number.isFinite(n)) patch.fontSizePx = n;
      } else {
        const m = (node.style?.fontSize || '').match(/^([\d.]+)px/i);
        if (m) patch.fontSizePx = Math.round(parseFloat(m[1]));
      }
    }
    if (patch.color == null) {
      const c = (node.getAttribute('data-pres-color') || node.style?.color || '').trim();
      if (c) patch.color = c;
    }
    if (patch.fontFamily == null) {
      const f = (node.getAttribute('data-pres-font') || node.style?.fontFamily || '').trim();
      if (f) patch.fontFamily = f;
    }
    if (patch.bold == null && (node.getAttribute('data-pres-bold') === '1' || node.tagName === 'B' || node.tagName === 'STRONG')) {
      patch.bold = true;
    }
    if (patch.italic == null && (node.getAttribute('data-pres-italic') === '1' || node.tagName === 'I' || node.tagName === 'EM' || node.style?.fontStyle === 'italic')) {
      patch.italic = true;
    }
    node = node.parentElement;
  }
  if (patch.fontSizePx == null || patch.color == null) {
    try {
      const cs = window.getComputedStyle(el);
      if (patch.fontSizePx == null) {
        const n = parseFloat(cs.fontSize);
        if (Number.isFinite(n) && n >= 8) patch.fontSizePx = Math.round(n);
      }
      if (patch.color == null && cs.color) patch.color = cs.color;
    } catch {
      /* ignore */
    }
  }
  if (
    patch.fontSizePx != null ||
    patch.color ||
    patch.bold ||
    patch.italic ||
    patch.fontFamily
  ) {
    applyPresentationMathStyle(span, patch);
  }
}

const MATH_FOCUS_ATTR = 'data-pres-math-focus';

const MATH_TOKEN_TAGS = new Set([
  'mi',
  'mo',
  'mn',
  'mtext',
  'ms',
  'mfrac',
  'msqrt',
  'mroot',
  'msup',
  'msub',
  'msubsup',
  'munder',
  'mover',
  'munderover',
  'mrow',
  'mtd',
  'mstyle',
]);

let mathFormatTarget: { editor: HTMLElement; node: HTMLElement } | null = null;

export function getMathFormatTarget(editor: HTMLElement | null): HTMLElement | null {
  if (!editor || !mathFormatTarget || mathFormatTarget.editor !== editor) return null;
  if (!editor.contains(mathFormatTarget.node)) {
    mathFormatTarget = null;
    return null;
  }
  return mathFormatTarget.node;
}

export function clearMathFormatTarget(editor?: HTMLElement | null) {
  if (!mathFormatTarget) return;
  if (editor && mathFormatTarget.editor !== editor) return;
  mathFormatTarget.node.removeAttribute(MATH_FOCUS_ATTR);
  mathFormatTarget = null;
}

export function setMathFormatTarget(editor: HTMLElement, node: HTMLElement): boolean {
  if (!editor.contains(node)) return false;
  if (mathFormatTarget?.node !== node) {
    mathFormatTarget?.node.removeAttribute(MATH_FOCUS_ATTR);
  }
  mathFormatTarget = { editor, node };
  node.setAttribute(MATH_FOCUS_ATTR, '1');
  return true;
}

/** Klickziel: einzelne Variable/Zahl/Bruch oder die ganze Formel. */
export function mathFormatNodeFromEvent(target: EventTarget | null): HTMLElement | null {
  const el = target instanceof HTMLElement ? target : (target as Node | null)?.parentElement;
  if (!el) return null;
  const wrap = el.closest(`[${PRES_MATH_ATTR}]`) as HTMLElement | null;
  if (!wrap) return null;
  let node: HTMLElement | null = el;
  while (node && node !== wrap) {
    const tag = localName(node);
    if (tag === 'math') return wrap;
    if (MATH_TOKEN_TAGS.has(tag) && tag !== 'mrow' && tag !== 'mstyle') return node;
    node = node.parentElement;
  }
  return wrap;
}

/** @deprecated — nutze setMathFormatTarget */
export function selectPresentationMath(editor: HTMLElement, span: HTMLElement): boolean {
  return setMathFormatTarget(editor, span);
}

/** Formel an Cursor oder in der Auswahl finden. */
export function findPresentationMathInEditor(editor: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  const adjacent = mathAdjacentToNode(node, sel.anchorOffset);
  if (adjacent && editor.contains(adjacent)) return adjacent;
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

const MATH_CARET_ZW = '\u200b';

function ensureZwspText(node: Node | null, create: () => Text): Text {
  if (node && node.nodeType === Node.TEXT_NODE) {
    const t = node as Text;
    if (!t.data) t.data = MATH_CARET_ZW;
    return t;
  }
  return create();
}

/** Unsichtbare Klick-/Caret-Stellen direkt vor und hinter der Formel. */
export function ensureMathCaretPads(math: HTMLElement): { before: Text; after: Text } {
  const parent = math.parentNode;
  const doc = math.ownerDocument;
  const before = ensureZwspText(math.previousSibling, () => {
    const t = doc.createTextNode(MATH_CARET_ZW);
    parent?.insertBefore(t, math);
    return t;
  });
  const after = ensureZwspText(math.nextSibling, () => {
    const t = doc.createTextNode(MATH_CARET_ZW);
    parent?.insertBefore(t, math.nextSibling);
    return t;
  });
  return { before, after };
}

function mathAdjacentToNode(node: Node | null, offset: number): HTMLElement | null {
  if (!node) return null;
  if (node instanceof HTMLElement && node.hasAttribute(PRES_MATH_ATTR)) return node;
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node as Text;
    const prev = t.previousSibling;
    const next = t.nextSibling;
    if (offset <= 0 && prev instanceof HTMLElement && prev.hasAttribute(PRES_MATH_ATTR)) return prev;
    if (offset >= (t.data?.length ?? 0) && next instanceof HTMLElement && next.hasAttribute(PRES_MATH_ATTR)) {
      return next;
    }
  }
  return null;
}

function mathTokenFromPoint(wrap: HTMLElement, x: number, y: number): HTMLElement {
  const tokens = Array.from(wrap.querySelectorAll('mi, mn, mo, mtext')) as HTMLElement[];
  const hit = tokens
    .map((t) => ({ t, r: t.getBoundingClientRect() }))
    .filter(({ r }) => r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)
    .sort((a, b) => a.r.width * a.r.height - b.r.width * b.r.height);
  if (hit[0]) return hit[0].t;
  let best: HTMLElement | null = null;
  let bestDist = Infinity;
  for (const t of tokens) {
    const r = t.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cx = Math.min(Math.max(x, r.left), r.right);
    const cy = Math.min(Math.max(y, r.top), r.bottom);
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best || wrap;
}

/** Klick am Rand → Caret davor/dahinter; innen → einzelnes Formelzeichen zum Färben. */
export function placeCaretBesidePresentationMath(e: Event): boolean {
  const target = e.target as Node | null;
  const el = target instanceof HTMLElement ? target : target?.parentElement;
  const math = el?.closest?.(`[${PRES_MATH_ATTR}]`) as HTMLElement | null;
  if (!math) return false;
  const editor = math.closest('[contenteditable="true"], [data-text-edit], [data-pres-rich-zone]') as HTMLElement | null;
  if (!editor) return false;
  e.preventDefault();
  e.stopPropagation();
  const rect = math.getBoundingClientRect();
  const x = 'clientX' in e ? (e as MouseEvent).clientX : rect.left + rect.width / 2;
  const y = 'clientY' in e ? (e as MouseEvent).clientY : rect.top + rect.height / 2;
  const edge = Math.min(14, Math.max(8, rect.width * 0.16));
  const onLeftEdge = x < rect.left + edge;
  const onRightEdge = x > rect.right - edge;
  if (onLeftEdge || onRightEdge) {
    const pads = ensureMathCaretPads(math);
    const range = editor.ownerDocument.createRange();
    if (onLeftEdge) range.setStart(pads.before, pads.before.data.length);
    else range.setStart(pads.after, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    try {
      editor.focus({ preventScroll: true });
    } catch {
      editor.focus();
    }
    clearMathFormatTarget(editor);
    return true;
  }
  const token = mathFormatNodeFromEvent(e.target) || mathTokenFromPoint(math, x, y);
  const picked = token === math || localName(token) === 'math' ? mathTokenFromPoint(math, x, y) : token;
  setMathFormatTarget(editor, picked);
  const range = editor.ownerDocument.createRange();
  try {
    range.selectNode(math);
  } catch {
    range.selectNodeContents(math);
  }
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  try {
    editor.focus({ preventScroll: true });
  } catch {
    editor.focus();
  }
  return true;
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
  const target = getMathFormatTarget(editor);
  if (target) {
    applyPresentationMathStyle(target, patch);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  const maths = mathElementsInSelection(editor);
  if (!maths.length) return false;
  maths.forEach((m) => applyPresentationMathStyle(m, patch));
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

let formulaInsertCaret: { editor: HTMLElement; range: Range } | null = null;

/** Cursor merken, bevor der Formel-Dialog den Editor-Fokus nimmt. */
export function rememberFormulaInsertCaret(editor: HTMLElement | null): void {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  try {
    if (!editor.contains(range.commonAncestorContainer)) return;
  } catch {
    return;
  }
  formulaInsertCaret = { editor, range: range.cloneRange() };
}

function rangeAtEditorEnd(editor: HTMLElement): Range {
  const range = editor.ownerDocument.createRange();
  const block =
    (editor.querySelector('p, h1, h2, h3, h4, h5, h6, li, div') as HTMLElement | null) || editor;
  const last = block.lastChild;
  if (last && last.nodeName === 'BR') {
    range.setStartBefore(last);
    range.collapse(true);
    return range;
  }
  range.selectNodeContents(block);
  range.collapse(false);
  return range;
}

function resolveEditorInsertRange(editor: HTMLElement): Range {
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    try {
      const live = sel.getRangeAt(0);
      if (editor.contains(live.commonAncestorContainer)) return live;
    } catch {
      /* ignore */
    }
  }
  if (formulaInsertCaret?.editor === editor) {
    try {
      return formulaInsertCaret.range.cloneRange();
    } catch {
      /* ignore */
    }
  }
  return rangeAtEditorEnd(editor);
}

function unwrapSingleParagraphIfInsideBlock(frag: DocumentFragment, range: Range): DocumentFragment {
  if (frag.childElementCount !== 1) return frag;
  const only = frag.firstElementChild;
  if (only?.tagName !== 'P') return frag;
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  const inBlock = (node as Element | null)?.closest?.('p, li, h1, h2, h3, h4, h5, h6');
  if (!inBlock) return frag;
  const inner = only.ownerDocument.createDocumentFragment();
  while (only.firstChild) inner.appendChild(only.firstChild);
  return inner;
}

/** HTML (inkl. MathML) per Range einfügen — nicht per execCommand (stript oft <math>). */
export function insertHtmlAtEditorCursor(editor: HTMLElement, html: string): boolean {
  const trimmed = (html || '').trim();
  if (!trimmed) return false;
  const tpl = editor.ownerDocument.createElement('template');
  tpl.innerHTML = trimmed;
  if (!tpl.content.firstChild) return false;
  const range = resolveEditorInsertRange(editor);
  const content = unwrapSingleParagraphIfInsideBlock(tpl.content, range);
  const freshMath: HTMLElement[] = [];
  const collectMath = (node: Node) => {
    if (node instanceof HTMLElement && node.hasAttribute(PRES_MATH_ATTR)) freshMath.push(node);
    node.childNodes.forEach(collectMath);
  };
  collectMath(content);
  const styleFrom = range.commonAncestorContainer;
  range.deleteContents();
  const last = content.lastChild;
  range.insertNode(content);
  freshMath.forEach((math) => {
    if (!(math.getAttribute('data-pres-fs') || math.getAttribute('data-pres-color'))) {
      applySurroundingStyleToMath(math, math.parentElement || styleFrom);
    }
    ensureMathCaretPads(math);
  });
  const lastMath = freshMath.length ? freshMath[freshMath.length - 1] : null;
  if (lastMath) {
    const pads = ensureMathCaretPads(lastMath);
    range.setStart(pads.after, 0);
    range.collapse(true);
  } else if (last) {
    range.setStartAfter(last);
    range.collapse(true);
  } else {
    range.collapse(false);
  }
  formulaInsertCaret = { editor, range: range.cloneRange() };
  try {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  } catch {
    /* Dialog kann den Fokus halten */
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Neue Formel an der Cursor-Position einfügen. */
export function insertPresentationFormulaAtCursor(editor: HTMLElement, latex: string): boolean {
  const trimmed = latexSourceFromPlain(latex);
  if (!trimmed) return false;
  const html = renderLatexToPresentationSpan(trimmed, false);
  if (!html) return false;
  return insertHtmlAtEditorCursor(editor, html);
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

type LatexRun = { start: number; end: number; tex: string; display: boolean };

function isLatexDisplay(tex: string): boolean {
  return /\\begin\{(?:equation|align|displaymath|p?matrix|bmatrix|vmatrix)/i.test(tex) || /\\displaystyle/.test(tex);
}

function markOccupied(occupied: boolean[], start: number, end: number) {
  for (let i = start; i < end; i++) occupied[i] = true;
}

function rangeOccupied(occupied: boolean[], start: number, end: number): boolean {
  for (let i = start; i < end; i++) if (occupied[i]) return true;
  return false;
}

function parseBalanced(text: string, i: number, open: string, close: string, occupied?: boolean[]): number {
  if (text[i] !== open) return -1;
  let depth = 0;
  let j = i;
  while (j < text.length) {
    if (occupied?.[j]) return -1;
    const ch = text[j];
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      j += 1;
      if (depth === 0) return j;
      continue;
    }
    j += 1;
  }
  return -1;
}

function parseBeginEnd(text: string, i: number): number {
  const m = text.slice(i).match(/^\\begin\{([a-zA-Z*]+)\}/);
  if (!m) return -1;
  const endTag = `\\end{${m[1]}}`;
  const endAt = text.indexOf(endTag, i + m[0].length);
  if (endAt < 0) return i + m[0].length;
  return endAt + endTag.length;
}

function parseLatexCommand(text: string, i: number, occupied?: boolean[]): number {
  if (text[i] !== '\\') return -1;
  const env = parseBeginEnd(text, i);
  if (env > i) return env;
  const m = text.slice(i).match(/^\\([a-zA-Z]+|.)/);
  if (!m) return -1;
  let j = i + m[0].length;
  if (text[j] === '*') j += 1;
  if (text[j] === '[') {
    const close = parseBalanced(text, j, '[', ']', occupied);
    if (close > j) j = close;
  }
  while (text[j] === '{') {
    const close = parseBalanced(text, j, '{', '}', occupied);
    if (close < 0) break;
    j = close;
  }
  return j;
}

const MATH_OP_CHAR = /[+\-*=<>/|,.;:!?'()[\]|&~]/;

function parseLatexToken(text: string, i: number, occupied?: boolean[]): number {
  if (i >= text.length || occupied?.[i]) return -1;
  if (text[i] === '\\') return parseLatexCommand(text, i, occupied);
  if (text[i] === '^' || text[i] === '_') {
    let j = i + 1;
    if (text[j] === '{') {
      const close = parseBalanced(text, j, '{', '}', occupied);
      return close > j ? close : j;
    }
    if (text[j] === '\\') {
      const cmd = parseLatexCommand(text, j, occupied);
      return cmd > j ? cmd : j;
    }
    if (j < text.length && !/\s/.test(text[j]) && !occupied?.[j]) return j + 1;
    return j;
  }
  if (text[i] === '{') return parseBalanced(text, i, '{', '}', occupied);
  if (MATH_OP_CHAR.test(text[i])) return i + 1;
  if (/\d/.test(text[i])) {
    let j = i;
    while (j < text.length && /[\d.]/.test(text[j]) && !occupied?.[j]) j += 1;
    return j;
  }
  if (/[a-zA-Z]/.test(text[i])) {
    const word = text.slice(i).match(/^[A-Za-zÄÖÜäöüß]+/);
    if (!word || word[0].length >= 2) return -1;
    return i + 1;
  }
  return -1;
}

function expandUnwrappedLatexRun(text: string, start: number, occupied?: boolean[]): LatexRun | null {
  if (text[start] !== '\\') return null;
  let i = parseLatexCommand(text, start, occupied);
  if (i < 0) return null;
  while (true) {
    let j = i;
    while (j < text.length && !occupied?.[j] && /\s/.test(text[j])) j += 1;
    const next = parseLatexToken(text, j, occupied);
    if (next < 0) break;
    i = next;
  }
  while (i > start && /\s/.test(text[i - 1])) i -= 1;
  const tex = text.slice(start, i).trim();
  if (!tex) return null;
  return { start, end: i, tex, display: isLatexDisplay(tex) };
}

/** Zusammenhängendes LaTeX als eine Formel (nicht jedes \\frac einzeln). */
function findLatexRuns(text: string): LatexRun[] {
  const occupied = new Array(text.length).fill(false);
  const runs: LatexRun[] = [];
  const delimited: Array<{ re: RegExp; display: boolean }> = [
    { re: /\$\$([\s\S]+?)\$\$/g, display: true },
    { re: /\\\[([\s\S]+?)\\\]/g, display: true },
    { re: /\\\(([\s\S]+?)\\\)/g, display: false },
    { re: /\$([^$\n]+?)\$/g, display: false },
  ];
  for (const { re, display } of delimited) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (rangeOccupied(occupied, start, end)) continue;
      markOccupied(occupied, start, end);
      runs.push({ start, end, tex: (m[1] || '').trim(), display });
    }
  }
  let i = 0;
  while (i < text.length) {
    if (occupied[i] || text[i] !== '\\' || !/[a-zA-Z]/.test(text[i + 1] || '')) {
      i += 1;
      continue;
    }
    const run = expandUnwrappedLatexRun(text, i, occupied);
    if (!run) {
      i += 1;
      continue;
    }
    markOccupied(occupied, run.start, run.end);
    runs.push(run);
    i = run.end;
  }
  runs.sort((a, b) => a.start - b.start);
  return runs;
}

function leftoverHasNormalText(text: string, latexRuns: LatexRun[]): boolean {
  let rest = '';
  let cursor = 0;
  for (const run of latexRuns) {
    rest += text.slice(cursor, run.start);
    cursor = run.end;
  }
  rest += text.slice(cursor);
  return /[A-Za-zÄÖÜäöüß]{2,}/.test(rest);
}

type TextSlice = { node: Text; start: number; end: number; globalStart: number };

function collectSelectionSlices(editor: HTMLElement, range: Range): TextSlice[] {
  const slices: TextSlice[] = [];
  let global = 0;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const textNode = current as Text;
    if (isInsidePresentationMath(textNode)) continue;
    let start = 0;
    let end = textNode.length;
    try {
      if (range.comparePoint(textNode, 0) > 0) continue;
      if (range.comparePoint(textNode, textNode.length) < 0) continue;
      if (range.startContainer === textNode) start = range.startOffset;
      if (range.endContainer === textNode) end = range.endOffset;
    } catch {
      continue;
    }
    if (start >= end) continue;
    slices.push({ node: textNode, start, end, globalStart: global });
    global += end - start;
  }
  return slices;
}

function pointAtGlobal(slices: TextSlice[], global: number): { node: Text; offset: number } | null {
  for (const slice of slices) {
    const len = slice.end - slice.start;
    if (global < slice.globalStart) return null;
    if (global <= slice.globalStart + len) {
      return { node: slice.node, offset: slice.start + (global - slice.globalStart) };
    }
  }
  const last = slices[slices.length - 1];
  if (!last) return null;
  return { node: last.node, offset: last.end };
}

function stylesOverlapping(styleRuns: TextStyleSnapshot[], from: number, to: number): TextStyleSnapshot[] {
  const out: TextStyleSnapshot[] = [];
  let pos = 0;
  for (const run of styleRuns) {
    const r0 = pos;
    const r1 = pos + run.text.length;
    const a = Math.max(r0, from);
    const b = Math.min(r1, to);
    if (a < b) out.push({ ...run, text: run.text.slice(a - r0, b - r0) });
    pos = r1;
  }
  return out;
}

function insertFormulaForLatexRun(
  editor: HTMLElement,
  slices: TextSlice[],
  run: LatexRun,
  styleRuns: TextStyleSnapshot[],
): boolean {
  const start = pointAtGlobal(slices, run.start);
  const end = pointAtGlobal(slices, run.end);
  if (!start || !end) return false;
  const r = editor.ownerDocument.createRange();
  try {
    r.setStart(start.node, start.offset);
    r.setEnd(end.node, end.offset);
  } catch {
    return false;
  }
  const tex = normalizePresentationLatexSource(run.tex);
  if (!tex) return false;
  const html = renderLatexToPresentationSpan(tex, run.display);
  if (!html) return false;
  const existing = new Set(Array.from(editor.querySelectorAll(`[${PRES_MATH_ATTR}]`)));
  formulaInsertCaret = { editor, range: r.cloneRange() };
  try {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r.cloneRange());
  } catch {
    /* ignore */
  }
  if (!insertHtmlAtEditorCursor(editor, html)) return false;
  const added = Array.from(editor.querySelectorAll(`[${PRES_MATH_ATTR}]`)).find((node) => !existing.has(node)) as
    | HTMLElement
    | undefined;
  const runStyles = stylesOverlapping(styleRuns, run.start, run.end);
  if (added && runStyles.length) applyRunsToMath(added, runStyles);
  return true;
}

function isMathGlueGap(gap: string): boolean {
  if (!/^[\s+\-*=<>/|,.;:()[\]·×±≤≥∞'′^_]*$/.test(gap)) return false;
  if (gap === '') return true;
  return /[+\-*=<>/|·×±≤≥^_]/.test(gap);
}

/** Benachbarte Formelstücke mit + / = dazwischen zu einer Formel zusammenziehen. */
export function mergeAdjacentPresentationMath(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  let changed = false;
  for (let safety = 0; safety < 40; safety += 1) {
    const maths = Array.from(editor.querySelectorAll(`span.pres-math[${PRES_MATH_ATTR}="1"]`)) as HTMLElement[];
    let did = false;
    for (let k = 0; k < maths.length - 1; k += 1) {
      const a = maths[k];
      const b = maths[k + 1];
      if (a.parentNode !== b.parentNode) continue;
      const between: Node[] = [];
      let gap = '';
      let n: ChildNode | null = a.nextSibling;
      let ok = true;
      while (n && n !== b) {
        between.push(n);
        if (n.nodeType === Node.TEXT_NODE) gap += n.textContent || '';
        else if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as HTMLElement;
          if (el.tagName === 'BR' || el.hasAttribute(PRES_MATH_ATTR) || el.querySelector('math,img,table')) {
            ok = false;
            break;
          }
          gap += el.textContent || '';
        }
        n = n.nextSibling;
      }
      if (!ok || n !== b || !isMathGlueGap(gap)) continue;
      const latexA = readPresentationMathLatex(a);
      const latexB = readPresentationMathLatex(b);
      if (!latexA || !latexB) continue;
      if (!a.getAttribute(PRES_LATEX_ATTR) || !b.getAttribute(PRES_LATEX_ATTR)) continue;
      const combined = `${latexA}${gap}${latexB}`.replace(/[ \t]*\n[ \t]*/g, ' ');
      const next = replacePresentationMathElement(a, combined);
      if (!next) continue;
      between.forEach((node) => node.parentNode?.removeChild(node));
      b.remove();
      did = true;
      changed = true;
      break;
    }
    if (!did) break;
  }
  return changed;
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

  const runs = findLatexRuns(source);
  if (
    runs.length === 1 &&
    source.slice(0, runs[0].start).trim() === '' &&
    source.slice(runs[0].end).trim() === ''
  ) {
    return `<p>${render(runs[0].tex, runs[0].display)}</p>`;
  }

  const chunks = runs.map((run) => render(run.tex, run.display));
  let rest = '';
  let cursor = 0;
  for (let i = 0; i < runs.length; i += 1) {
    rest += source.slice(cursor, runs[i].start);
    rest += `\uE202${i}\uE203`;
    cursor = runs[i].end;
  }
  rest += source.slice(cursor);

  const lines = rest.split(/\n+/).map((line) => {
    const withFormulas = line.replace(/\uE202(\d+)\uE203/g, (_m, i: string) => chunks[Number(i)] || '');
    const trimmed = withFormulas.trim();
    if (!trimmed) return '<p><br></p>';
    if (trimmed.startsWith('<span class="pres-math"')) return `<p>${trimmed}</p>`;
    return `<p>${trimmed}</p>`;
  });
  return lines.join('') || '<p><br></p>';
}

function replaceRangeWithFormula(
  editor: HTMLElement,
  node: Text,
  start: number,
  end: number,
  tex: string,
  display: boolean,
): boolean {
  const html = renderLatexToPresentationSpan(tex, display);
  if (!html) return false;
  const r = editor.ownerDocument.createRange();
  r.setStart(node, start);
  r.setEnd(node, end);
  formulaInsertCaret = { editor, range: r.cloneRange() };
  try {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  } catch {
    /* ignore */
  }
  const ok = insertHtmlAtEditorCursor(editor, html);
  if (ok) mergeAdjacentPresentationMath(editor);
  return ok;
}

/** $…$ / \(…\) / ganze Gleichung am Cursor → eine Formel (beim Tippen). */
export function convertLatexNearCursor(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;
  if (isInsidePresentationMath(range.startContainer)) return false;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = node.textContent || '';
  const offset = range.startOffset;
  const before = text.slice(0, offset);

  const tryEnd = (re: RegExp, display: boolean, group = 1): boolean => {
    const m = before.match(re);
    if (!m) return false;
    const tex = (m[group] || '').trim();
    if (!tex) return false;
    const start = offset - m[0].length;
    return replaceRangeWithFormula(editor, node as Text, start, offset, tex, display);
  };

  if (tryEnd(/\$\$([^$]+)\$\$$/, true)) return true;
  if (tryEnd(/\\\[(.+?)\\\]$/, true)) return true;
  if (tryEnd(/\\\((.+?)\\\)$/, false)) return true;
  if (tryEnd(/\$([^$\n]+)\$$/, false)) return true;

  if (!/\s$/.test(before)) return false;
  const runs = findLatexRuns(before.replace(/\s+$/, ''));
  const last = runs[runs.length - 1];
  if (!last) return false;
  const trimmed = before.replace(/\s+$/, '');
  if (last.end !== trimmed.length) return false;
  return replaceRangeWithFormula(editor, node as Text, last.start, last.end, last.tex, last.display);
}

function firstLatexHitInText(text: string): LatexRun | null {
  return findLatexRuns(text)[0] || null;
}

/** Restliches LaTeX im Feld umwandeln (nach Einfügen / Verlassen). */
export function convertLatexInEditor(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  let changed = false;
  for (let n = 0; n < 40; n++) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let hit: Text | null = null;
    while (walker.nextNode()) {
      const t = walker.currentNode as Text;
      if (isInsidePresentationMath(t)) continue;
      if (firstLatexHitInText(t.textContent || '')) {
        hit = t;
        break;
      }
    }
    if (!hit) break;
    const found = firstLatexHitInText(hit.textContent || '');
    if (!found) break;
    if (!replaceRangeWithFormula(editor, hit, found.start, found.end, found.tex, found.display)) break;
    changed = true;
  }
  if (mergeAdjacentPresentationMath(editor)) changed = true;
  return changed;
}

export function selectionIntersectsPresentationMath(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  if (mathElementsInSelection(editor).length) return true;
  return Boolean(findPresentationMathInEditor(editor));
}

type TextStyleSnapshot = {
  text: string;
  color?: string;
  fontSizePx?: number;
  bold?: boolean;
  italic?: boolean;
  fontFamily?: string;
  highlight?: string;
};

function toCssColor(raw: string): string | undefined {
  const s = (raw || '').trim();
  if (!s || s === 'transparent' || s === 'inherit') return undefined;
  const m = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const hex = [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
    return `#${hex}`;
  }
  return s;
}

function snapshotFromNode(node: Node, editor: HTMLElement): Omit<TextStyleSnapshot, 'text'> {
  let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
  const snap: Omit<TextStyleSnapshot, 'text'> = {};
  while (el && el !== editor) {
    if (snap.fontSizePx == null) {
      const attr = el.getAttribute('data-pres-fs');
      if (attr) {
        const n = parseInt(attr, 10);
        if (Number.isFinite(n)) snap.fontSizePx = n;
      } else {
        const px = (el.style?.fontSize || '').match(/^([\d.]+)px/i);
        if (px) snap.fontSizePx = Math.round(parseFloat(px[1]));
      }
    }
    if (snap.color == null) {
      const c = toCssColor(el.getAttribute('data-pres-color') || el.style?.color || '');
      if (c) snap.color = c;
    }
    if (snap.fontFamily == null) {
      const f = (el.getAttribute('data-pres-font') || el.style?.fontFamily || '').trim();
      if (f) snap.fontFamily = f;
    }
    if (
      snap.bold == null &&
      (el.getAttribute('data-pres-bold') === '1' ||
        el.tagName === 'B' ||
        el.tagName === 'STRONG' ||
        el.style.fontWeight === 'bold' ||
        parseInt(el.style.fontWeight || '0', 10) >= 600)
    ) {
      snap.bold = true;
    }
    if (
      snap.italic == null &&
      (el.getAttribute('data-pres-italic') === '1' ||
        el.tagName === 'I' ||
        el.tagName === 'EM' ||
        el.style.fontStyle === 'italic')
    ) {
      snap.italic = true;
    }
    if (snap.highlight == null) {
      const h = toCssColor(el.getAttribute('data-pres-highlight') || el.style?.backgroundColor || '');
      if (h) snap.highlight = h;
    }
    el = el.parentElement;
  }
  const host = node instanceof HTMLElement ? node : node.parentElement;
  if (host) {
    try {
      const cs = window.getComputedStyle(host);
      if (snap.fontSizePx == null) {
        const n = parseFloat(cs.fontSize);
        if (Number.isFinite(n) && n >= 8) snap.fontSizePx = Math.round(n);
      }
      if (snap.color == null) {
        const c = toCssColor(cs.color);
        if (c) snap.color = c;
      }
    } catch {
      /* ignore */
    }
  }
  return snap;
}

function sameSnapshot(a: Omit<TextStyleSnapshot, 'text'>, b: Omit<TextStyleSnapshot, 'text'>): boolean {
  return (
    a.color === b.color &&
    a.fontSizePx === b.fontSizePx &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.fontFamily === b.fontFamily &&
    a.highlight === b.highlight
  );
}

function collectSelectionStyleRuns(editor: HTMLElement, range: Range): TextStyleSnapshot[] {
  const runs: TextStyleSnapshot[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const textNode = current as Text;
    if (isInsidePresentationMath(textNode)) continue;
    let start = 0;
    let end = textNode.length;
    try {
      if (range.comparePoint(textNode, 0) > 0) continue;
      if (range.comparePoint(textNode, textNode.length) < 0) continue;
      if (range.startContainer === textNode) start = range.startOffset;
      if (range.endContainer === textNode) end = range.endOffset;
    } catch {
      continue;
    }
    if (start >= end) continue;
    const text = (textNode.data || '').slice(start, end).replace(/\u00a0/g, ' ');
    if (!text) continue;
    const style = snapshotFromNode(textNode, editor);
    const prev = runs[runs.length - 1];
    if (prev && sameSnapshot(prev, style)) prev.text += text;
    else runs.push({ text, ...style });
  }
  return runs;
}

function snapshotToPatch(s: Omit<TextStyleSnapshot, 'text'>): PresentationMathStylePatch {
  const patch: PresentationMathStylePatch = {};
  if (s.fontSizePx != null && Number.isFinite(s.fontSizePx)) patch.fontSizePx = s.fontSizePx;
  if (s.color) patch.color = s.color;
  if (s.fontFamily) patch.fontFamily = s.fontFamily;
  if (s.highlight) patch.highlight = s.highlight;
  if (s.bold) patch.bold = true;
  if (s.italic) patch.italic = true;
  return patch;
}

function patchSignature(p: PresentationMathStylePatch): string {
  return `${p.color || ''}|${p.fontSizePx ?? ''}|${p.bold ? 1 : 0}|${p.italic ? 1 : 0}|${p.fontFamily || ''}|${p.highlight || ''}`;
}

function hasStylePatch(p: PresentationMathStylePatch): boolean {
  return Boolean(p.color || p.fontSizePx || p.fontFamily || p.highlight || p.bold || p.italic);
}

function dominantStyle(runs: TextStyleSnapshot[]): PresentationMathStylePatch {
  if (!runs.length) return {};
  const scores = new Map<string, { len: number; run: TextStyleSnapshot }>();
  for (const run of runs) {
    const key = patchSignature(snapshotToPatch(run));
    const cur = scores.get(key);
    if (!cur) scores.set(key, { len: run.text.length, run });
    else cur.len += run.text.length;
  }
  let best = runs[0];
  let bestLen = -1;
  scores.forEach((v) => {
    if (v.len > bestLen) {
      bestLen = v.len;
      best = v.run;
    }
  });
  return snapshotToPatch(best);
}

function visibleLatexSymbols(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\') {
      i += 1;
      while (i < text.length && /[a-zA-Z]/.test(text[i])) i += 1;
      if (text[i] === '*') i += 1;
      continue;
    }
    if ('{}$^_&% \t\n\r'.includes(text[i])) {
      i += 1;
      continue;
    }
    if (/\d/.test(text[i])) {
      let n = '';
      while (i < text.length && /[\d.]/.test(text[i])) n += text[i++];
      if (n) out.push(n);
      continue;
    }
    out.push(text[i]);
    i += 1;
  }
  return out;
}

function applyRunsToMath(math: HTMLElement, runs: TextStyleSnapshot[]) {
  const base = dominantStyle(runs);
  if (hasStylePatch(base)) applyPresentationMathStyle(math, base);
  const tokens = Array.from(math.querySelectorAll('mi, mn, mo, mtext')) as HTMLElement[];
  if (!tokens.length) return;
  const baseKey = patchSignature(base);
  let tokenIdx = 0;
  for (const run of runs) {
    const patch = snapshotToPatch(run);
    const symbols = visibleLatexSymbols(run.text);
    const distinctive = patchSignature(patch) !== baseKey && hasStylePatch(patch);
    for (const sym of symbols) {
      while (tokenIdx < tokens.length && (tokens[tokenIdx].textContent || '').trim() !== sym) {
        tokenIdx += 1;
      }
      if (tokenIdx >= tokens.length) return;
      if (distinctive) applyPresentationMathStyle(tokens[tokenIdx], patch);
      tokenIdx += 1;
    }
  }
}

function readPatchFromMath(span: HTMLElement): PresentationMathStylePatch {
  const fs = parseInt(span.getAttribute('data-pres-fs') || '', 10);
  return {
    fontSizePx: Number.isFinite(fs) ? fs : undefined,
    color: span.getAttribute('data-pres-color') || undefined,
    fontFamily: span.getAttribute('data-pres-font') || undefined,
    highlight: span.getAttribute('data-pres-highlight') || undefined,
    bold: span.getAttribute('data-pres-bold') === '1' ? true : undefined,
    italic: span.getAttribute('data-pres-italic') === '1' ? true : undefined,
  };
}

function applyPatchToHtmlSpan(span: HTMLElement, patch: PresentationMathStylePatch) {
  if (patch.fontSizePx != null && Number.isFinite(patch.fontSizePx)) {
    span.setAttribute('data-pres-fs', String(patch.fontSizePx));
    span.style.setProperty('font-size', `${patch.fontSizePx}px`, 'important');
  }
  if (typeof patch.color === 'string' && patch.color) {
    span.setAttribute('data-pres-color', patch.color);
    span.style.setProperty('color', patch.color, 'important');
  }
  if (typeof patch.fontFamily === 'string' && patch.fontFamily) {
    span.setAttribute('data-pres-font', patch.fontFamily);
    span.style.setProperty('font-family', patch.fontFamily, 'important');
  }
  if (typeof patch.highlight === 'string' && patch.highlight) {
    span.setAttribute('data-pres-highlight', patch.highlight);
    span.style.setProperty('background-color', patch.highlight, 'important');
  }
  if (patch.bold) {
    span.setAttribute('data-pres-bold', '1');
    span.style.setProperty('font-weight', '700', 'important');
  }
  if (patch.italic) {
    span.setAttribute('data-pres-italic', '1');
    span.style.setProperty('font-style', 'italic', 'important');
  }
}

function mathSpanToStyledLatexNode(span: HTMLElement): Node {
  const tex = readPresentationMathLatex(span) || (span.textContent || '').replace(/\s+/g, ' ').trim();
  const wrapPatch = readPatchFromMath(span);
  const doc = span.ownerDocument;
  const tokens = Array.from(span.querySelectorAll('mi, mn, mo, mtext')) as HTMLElement[];
  const extras = tokens.filter((t) => {
    const p = readPatchFromMath(t);
    return hasStylePatch(p) && patchSignature(p) !== patchSignature(wrapPatch);
  });

  const wrap = doc.createElement('span');
  if (hasStylePatch(wrapPatch)) applyPatchToHtmlSpan(wrap, wrapPatch);

  if (!extras.length) {
    wrap.textContent = tex;
    return hasStylePatch(wrapPatch) ? wrap : doc.createTextNode(tex);
  }

  let pos = 0;
  extras.forEach((token) => {
    const piece = (token.textContent || '').trim();
    if (!piece) return;
    const idx = tex.indexOf(piece, pos);
    if (idx < 0) return;
    if (idx > pos) wrap.appendChild(doc.createTextNode(tex.slice(pos, idx)));
    const inner = doc.createElement('span');
    applyPatchToHtmlSpan(inner, readPatchFromMath(token));
    inner.textContent = piece;
    wrap.appendChild(inner);
    pos = idx + piece.length;
  });
  if (pos < tex.length) wrap.appendChild(doc.createTextNode(tex.slice(pos)));
  if (!wrap.childNodes.length) wrap.textContent = tex;
  return wrap;
}

/** Markierten Text: LaTeX-Teile → Formeln, normaler Text bleibt. */
export function convertSelectedTextToPresentationMath(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  try {
    if (!editor.contains(range.commonAncestorContainer)) return false;
  } catch {
    return false;
  }
  const slices = collectSelectionSlices(editor, range);
  if (!slices.length) return false;
  const styleRuns = collectSelectionStyleRuns(editor, range);
  const text = slices
    .map((s) => (s.node.data || '').slice(s.start, s.end).replace(/\u00a0/g, ' '))
    .join('');
  if (!text.trim()) return false;

  const latexRuns = findLatexRuns(text);
  const hasProse = leftoverHasNormalText(text, latexRuns);

  if (latexRuns.length > 0 && (latexRuns.length > 1 || hasProse)) {
    let changed = false;
    for (let i = latexRuns.length - 1; i >= 0; i -= 1) {
      if (insertFormulaForLatexRun(editor, slices, latexRuns[i], styleRuns)) changed = true;
    }
    return changed;
  }

  if (latexRuns.length === 0 && /[A-Za-zÄÖÜäöüß]{2,}/.test(text)) return false;

  const tex = normalizePresentationLatexSource(latexRuns[0]?.tex || text);
  if (!tex) return false;
  const html = renderLatexToPresentationSpan(tex, /\\begin\{|\\displaystyle/.test(tex));
  if (!html) return false;
  const existing = new Set(Array.from(editor.querySelectorAll(`[${PRES_MATH_ATTR}]`)));
  formulaInsertCaret = { editor, range: range.cloneRange() };
  if (!insertHtmlAtEditorCursor(editor, html)) return false;
  const added = Array.from(editor.querySelectorAll(`[${PRES_MATH_ATTR}]`)).find((node) => !existing.has(node)) as
    | HTMLElement
    | undefined;
  if (added && styleRuns.length) applyRunsToMath(added, styleRuns);
  return true;
}

/** Markierte Formel(n) → wieder LaTeX-Text (Formatierung bleibt). */
export function unwrapSelectedPresentationMath(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const maths = mathElementsInSelection(editor);
  const extra = findPresentationMathInEditor(editor);
  const targets = [...maths];
  if (extra && !targets.includes(extra)) targets.push(extra);
  if (!targets.length) return false;
  targets.forEach((span) => {
    span.replaceWith(mathSpanToStyledLatexNode(span));
  });
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}
