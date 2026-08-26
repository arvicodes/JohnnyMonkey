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

function isGluedPlainDump(s: string): boolean {
  if (!s || s.length < 3 || /\s/.test(s)) return false;
  if (/[×⋅·≤≥⃗]/.test(s)) return true;
  if (/[()=]/.test(s) && /[A-Za-z]/.test(s) && /[0-9]/.test(s)) return true;
  if (/^[A-Za-z]{2,}=[A-Za-z0-9+\-()]+$/.test(s)) return true;
  if (/^[A-Za-z]=\([A-Za-z0-9]+\)$/.test(s)) return true;
  return false;
}

function longestPlainDumpPrefix(dump: string): number {
  for (let len = dump.length; len >= 3; len -= 1) {
    if (isGluedPlainDump(dump.slice(0, len))) return len;
  }
  return 0;
}

/**
 * In den LK-Karten klebt oft dieselbe Formel nochmal ohne Backslash davor:
 * `n×mn\times m`, `1≤i≤n1\le i\le n`, `M⋅v⃗M\cdot\vec v`.
 */
function stripGluedPlainDuplicates(s: string): string {
  const starts: number[] = [];
  const re = /\\[a-zA-Z]+|[A-Za-z][_^]\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) starts.push(m.index);
  let out = s;
  for (let i = starts.length - 1; i >= 0; i -= 1) {
    let texHead = starts[i];
    if (texHead > out.length) continue;
    while (texHead > 0 && /[A-Za-z0-9]/.test(out[texHead - 1])) texHead -= 1;
    let from = texHead;
    while (from > 0 && /[A-Za-zÄÖÜäöü0-9()×⋅·≤≥⃗+\-=]/.test(out[from - 1])) from -= 1;
    const dump = out.slice(from, texHead);
    const take = longestPlainDumpPrefix(dump);
    if (!take) continue;
    out = out.slice(0, from) + out.slice(from + take);
    for (let j = 0; j < i; j += 1) {
      if (starts[j] >= from + take) starts[j] -= take;
      else if (starts[j] > from) starts[j] = from;
    }
  }
  return out;
}

const ENV_PIECE = String.raw`\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\}?`;
const ENV_JOIN = String.raw`(?:\s*\^\{?\d+\}?)?(?:\s*(?:\\cdot|\\times|[+\-])\s*)`;
const ASSIGN_PREFIX = String.raw`(?:(?:\\[a-zA-Z]+\s*)?[A-Za-z][A-Za-z0-9]*⃗?\s*=\s*)`;
const ENV_CHAIN = new RegExp(
  `${ASSIGN_PREFIX}?${ENV_PIECE}(?:${ENV_JOIN}${ASSIGN_PREFIX}?${ENV_PIECE})*(?:\\s*\\^\\{?\\d+\\}?)?`,
  'g',
);

/** Prefix nur angeklebt (`1\le`, `n\times`) — kein Leerzeichen davor, sonst wird „mit a_{ij}“ zu einer Formel. */
const UNDELIMITED =
  /[A-Za-z0-9]*(?:\\[a-zA-Z]+|[A-Za-z][_^]\{)(?:\\[a-zA-Z]+\s*|\\[^A-Za-z\n]|[_^{}A-Za-z0-9+=()|&,.\\]|-(?![A-Za-zÄÖÜäöü])|\s(?=\\))*[A-Za-z0-9_^{}+=()|&,.\\]*/g;

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
