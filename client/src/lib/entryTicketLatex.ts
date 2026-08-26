import 'katex/dist/katex.min.css';

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
  // katex 0.16 legt types nur unter exports ab — CRA (moduleResolution: node) sieht sie nicht.
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  return require('katex') as KatexModule;
}

const LATEX_MARK = '\uE200';
const LATEX_END = '\uE201';

function latexSourceFromMatch(raw: string): string {
  return (raw || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function renderEntryTicketLatexHtml(tex: string, display = false): string {
  const trimmed = latexSourceFromMatch(tex);
  if (!trimmed) return '';
  try {
    return loadKatex().renderToString(trimmed, {
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

/** `\\begin` (doppelt escaped) → `\begin`, ohne `\\` als Zeilenumbruch in Matrizen anzufassen. */
function normalizeDoubleEscapedCommands(s: string): string {
  if (!/\\\\(?:begin|end|frac|cdot|times|vec|le|ge|left|right|mathbf|mathrm)\b/.test(s)) return s;
  return s.replace(
    /\\\\(begin|end|frac|cdot|times|vec|le|ge|left|right|mathbf|mathrm)\b/g,
    '\\$1',
  );
}

/**
 * Vor `\begin{pmatrix}` liegt oft dieselbe Matrix nochmal als platte Klammern
 * `(1234)⋅(56)` — die würde neben der echten Formel stehen.
 */
function stripDuplicatePlainMatrix(s: string): string {
  return s.replace(
    /(?:[A-Za-zÄÖÜäöü⃗\\ ]{0,12}=\s*)?\([^()\n]{2,}\)(?:\s*[\^²\d]{0,4}\s*[⋅·×*]\s*\([^()\n]{1,}\))*\s*(?=(?:(?:\\[a-zA-Z]+\s*)?[A-Za-zÄÖÜäöü⃗\\ ]{0,12}=\s*)?\\begin\{(?:p|b)?matrix\})/g,
    '',
  );
}

function flattenForCompare(s: string): string {
  return s
    .replace(/\\times|×/g, 'x')
    .replace(/\\cdot|[⋅·]/g, '')
    .replace(/\\le|≤/g, '<=')
    .replace(/\\ge|≥/g, '>=')
    .replace(/\\vec\s*/g, '')
    .replace(/\\begin\{[^}]+\}/g, '')
    .replace(/\\end\{[^}]+\}/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[_^{}&\\\s,]/g, '')
    .toLowerCase();
}

function gluedPlainStart(full: string, texStart: number, tex: string): number {
  const flatTex = flattenForCompare(tex);
  if (flatTex.length < 2) return texStart;
  let i = texStart;
  while (i > 0) {
    const ch = full[i - 1];
    if (ch === '\\' || ch === '\n' || ch === '<' || ch === '>') break;
    if (!/[A-Za-zÄÖÜäöü0-9×⋅·≤≥⃗()[\]+\-=,^_{}]/.test(ch)) break;
    i -= 1;
  }
  const plain = full.slice(i, texStart);
  if (!plain) return texStart;
  const tryStrip = (chunk: string, from: number): number | null => {
    const flatPlain = flattenForCompare(chunk);
    if (flatPlain.length < 2) return null;
    if (flatTex === flatPlain || flatTex.startsWith(flatPlain)) return from;
    if (flatPlain.length >= 3 && flatTex.includes(flatPlain)) return from;
    return null;
  };
  const whole = tryStrip(plain, i);
  if (whole != null) return whole;
  for (let k = 1; k < plain.length; k += 1) {
    const hit = tryStrip(plain.slice(k), i + k);
    if (hit != null) return hit;
  }
  return texStart;
}

const ENV_PIECE = String.raw`\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\}?`;
const ENV_JOIN = String.raw`(?:\s*\^\{?\d+\}?)?(?:\s*(?:\\cdot|\\times|[+\-])\s*)`;
const ASSIGN_PREFIX = String.raw`(?:(?:\\[a-zA-Z]+\s*)?[A-Za-z][A-Za-z0-9]*⃗?\s*=\s*)`;
const ENV_CHAIN = new RegExp(`${ASSIGN_PREFIX}?${ENV_PIECE}(?:${ENV_JOIN}${ASSIGN_PREFIX}?${ENV_PIECE})*(?:\\s*\\^\\{?\\d+\\}?)?`, 'g');

const UNDELIMITED =
  /[A-Za-z0-9]*\s*(?:\\[a-zA-Z]+|[A-Za-z][_^]\{)(?:\\[a-zA-Z]+\s*|\\[^A-Za-z\n]|[_^{}A-Za-z0-9+=()|&,.\\ \t]|-(?![A-Za-zÄÖÜäöü])|\s(?=\\))*[A-Za-z0-9_^{}+=()|&,.\\]*/g;

function collectLatexRanges(source: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const add = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(source))) {
      ranges.push({ start: m.index, end: m.index + m[0].length });
    }
  };
  add(/\$\$[\s\S]+?\$\$/g);
  add(/\\\[[\s\S]+?\\\]/g);
  add(ENV_CHAIN);
  add(/\\\([\s\S]+?\\\)/g);
  add(/\$[^$\n]+?\$/g);
  add(UNDELIMITED);
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) continue;
    merged.push({ ...r });
  }
  return merged;
}

function stripGluedPlainDuplicates(s: string): string {
  const ranges = collectLatexRanges(s);
  let out = s;
  for (let i = ranges.length - 1; i >= 0; i -= 1) {
    const { start, end } = ranges[i];
    const tex = out.slice(start, end);
    const from = gluedPlainStart(out, start, tex);
    if (from < start) out = out.slice(0, from) + out.slice(start);
  }
  return out;
}

function isStandaloneFormula(source: string, match: string): boolean {
  const rest = source.split(match).join('').replace(/<[^>]+>/g, '').trim();
  return rest.length === 0;
}

/**
 * Zieht Formeln raus (mit und ohne `$…$`), damit Operator-Fettung sie nicht zerreißt.
 * Platzhalter später mit restoreEntryTicketLatex ersetzen.
 */
export function extractEntryTicketLatex(source: string, rendered: string[]): string {
  if (!source) return source;
  if (!/[\\$]/.test(source) && !/[_^]\{/.test(source)) return source;

  const push = (tex: string, display: boolean): string => {
    const html = renderEntryTicketLatexHtml(tex, display);
    if (!html) return tex;
    const i = rendered.length;
    rendered.push(`<span class="et-tex${display ? ' et-tex-display' : ''}">${html}</span>`);
    return `${LATEX_MARK}${i}${LATEX_END}`;
  };

  let out = normalizeDoubleEscapedCommands(source);
  out = stripDuplicatePlainMatrix(out);
  out = stripGluedPlainDuplicates(out);

  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => push(tex, true));
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex: string) => push(tex, true));
  ENV_CHAIN.lastIndex = 0;
  out = out.replace(ENV_CHAIN, (m) => push(m, isStandaloneFormula(out, m)));
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex: string) => push(tex, false));
  out = out.replace(/\$([^$\n]+?)\$/g, (_m, tex: string) => push(tex, false));
  UNDELIMITED.lastIndex = 0;
  out = out.replace(UNDELIMITED, (m) => {
    const tex = m.trim();
    if (tex.length < 3) return m;
    if (!/\\|[_\^]\{/.test(tex)) return m;
    if (/^\\end\b/.test(tex)) return m;
    return push(tex, false);
  });
  return out;
}

export function restoreEntryTicketLatex(html: string, rendered: string[]): string {
  if (!rendered.length) return html;
  return html.replace(/\uE200(\d+)\uE201/g, (_m, i: string) => rendered[Number(i)] || '');
}
