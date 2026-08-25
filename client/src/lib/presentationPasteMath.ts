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
