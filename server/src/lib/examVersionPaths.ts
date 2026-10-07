import fs from 'fs';
import path from 'path';

export const EXAM_VERSIONS_META_RE = /<!--\s*EXAM_VERSIONS\s*(\{[\s\S]*?\})\s*-->/;
export const EXAM_VERSION_LETTERS_JS_RE =
  /const\s+EXAM_VERSION_LETTERS\s*=\s*\[(.*?)\]\s*;/s;

const VERSION_SUFFIX_RE = /__([A-Z])$/i;

export type ExamVersionsMeta = { letters: string[] };

export function normalizeVersionLetter(raw: string): string | null {
  const l = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!l || l.length !== 1) return null;
  return l;
}

export function defaultExamVersionLetters(): string[] {
  return ['A'];
}

/** Varianten-Dateien im gleichen Ordner (…__B.html) neben der Basis-Datei A. */
export function discoverExamVersionLettersNextToBase(baseFullPath: string): string[] {
  const dir = path.dirname(baseFullPath);
  const baseStem = baseStemFromStem(fileStemFromName(path.basename(baseFullPath)));
  const found = new Set<string>(['A']);
  if (!fs.existsSync(dir)) return ['A'];
  for (const name of fs.readdirSync(dir)) {
    if (!/\.html?$/i.test(name)) continue;
    const stem = fileStemFromName(name);
    if (stem === baseStem) continue;
    const suffix = stem.slice(baseStem.length);
    const m = suffix.match(/^__([A-Z])$/i);
    if (m) {
      const L = normalizeVersionLetter(m[1]);
      if (L) found.add(L);
    }
  }
  return [...found].sort();
}

export function mergeExamVersionLetters(metaLetters: string[], baseFullPath: string): string[] {
  const discovered = discoverExamVersionLettersNextToBase(baseFullPath);
  const merged = [...new Set([...metaLetters, ...discovered])];
  if (!merged.includes('A')) merged.unshift('A');
  return merged.sort();
}

/** A/B/C-Metadaten für eine Prüfungsfamilie (gleiche Pfadlogik wie StorageManager.readFile). */
export function buildExamVersionInfo(
  anyVariantGitPath: string,
  resolveFullFromGit: (gitPath: string) => string | null,
): { letters: string[]; paths: Record<string, string>; baseFilePath: string } {
  const baseGit = gitPathVariant(anyVariantGitPath.replace(/\\/g, '/'), 'A');
  const baseFull = resolveFullFromGit(baseGit);
  if (!baseFull || !fs.existsSync(baseFull)) {
    return { letters: ['A'], paths: { A: baseGit }, baseFilePath: baseGit };
  }
  const html = readExamHtmlFullPath(baseFull);
  const meta = parseExamVersionsMeta(html);
  const letters = mergeExamVersionLetters(meta.letters, baseFull);
  const paths: Record<string, string> = {};
  for (const letter of letters) {
    paths[letter] = gitPathVariant(baseGit, letter);
  }
  return { letters, paths, baseFilePath: baseGit };
}

export function parseExamVersionsMeta(html: string): ExamVersionsMeta {
  const m = html.match(EXAM_VERSIONS_META_RE);
  if (!m) return { letters: defaultExamVersionLetters() };
  try {
    const parsed = JSON.parse(m[1]) as { letters?: unknown };
    const letters = Array.isArray(parsed.letters)
      ? parsed.letters
          .map((x) => normalizeVersionLetter(String(x)))
          .filter((x): x is string => Boolean(x))
      : [];
    const uniq = [...new Set(letters.length ? letters : defaultExamVersionLetters())];
    if (!uniq.includes('A')) uniq.unshift('A');
    return { letters: uniq };
  } catch {
    return { letters: defaultExamVersionLetters() };
  }
}

export function writeExamVersionsMeta(html: string, letters: string[]): string {
  const normalized = [...new Set(letters.map((l) => normalizeVersionLetter(l)).filter(Boolean) as string[])];
  if (!normalized.includes('A')) normalized.unshift('A');
  const payload = JSON.stringify({ letters: normalized });
  const comment = `<!-- EXAM_VERSIONS ${payload} -->`;
  if (EXAM_VERSIONS_META_RE.test(html)) {
    return html.replace(EXAM_VERSIONS_META_RE, comment);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n    ${comment}`);
  }
  return `${comment}\n${html}`;
}

export function syncExamVersionLettersJs(html: string, letters: string[]): string {
  const list = letters.map((l) => `'${l}'`).join(', ');
  const line = `const EXAM_VERSION_LETTERS = [${list}];`;
  if (EXAM_VERSION_LETTERS_JS_RE.test(html)) {
    return html.replace(EXAM_VERSION_LETTERS_JS_RE, line);
  }
  if (/const KA_KEY = /.test(html)) {
    return html.replace(/(const KA_KEY = ['"][^'"]+['"];)/, `$1\n        ${line}`);
  }
  return html;
}

export function fileStemFromName(fileName: string): string {
  return fileName.replace(/\.(html|htm)$/i, '');
}

export function versionLetterFromStem(stem: string): string {
  const m = stem.match(VERSION_SUFFIX_RE);
  return m ? m[1].toUpperCase() : 'A';
}

export function baseStemFromStem(stem: string): string {
  return stem.replace(VERSION_SUFFIX_RE, '');
}

export function variantStem(baseStem: string, letter: string): string {
  const L = normalizeVersionLetter(letter);
  if (!L || L === 'A') return baseStem;
  return `${baseStem}__${L}`;
}

export function gitPathVariant(baseGitPath: string, letter: string): string {
  const p = baseGitPath.replace(/\\/g, '/');
  const slash = p.lastIndexOf('/');
  const dir = slash >= 0 ? p.slice(0, slash + 1) : '';
  const file = slash >= 0 ? p.slice(slash + 1) : p;
  const stem = fileStemFromName(file);
  const baseStem = baseStemFromStem(stem);
  const nextStem = variantStem(baseStem, letter);
  return `${dir}${nextStem}.html`;
}

export function examFamilyStemFromKaPath(kaPath: string): string {
  const fileName = (kaPath.split(/[/\\]/).pop() || kaPath).trim();
  return baseStemFromStem(fileStemFromName(fileName)).toLowerCase();
}

export function kaPathsMatchFamily(requestPath: string, storedPath: string): boolean {
  return examFamilyStemFromKaPath(requestPath) === examFamilyStemFromKaPath(storedPath);
}

export function versionLetterFromKaPath(kaPath: string): string {
  const fileName = kaPath.split(/[/\\]/).pop() || kaPath;
  return versionLetterFromStem(fileStemFromName(fileName));
}

const VERSION_LETTER_CSS = `
        .exam-version-letter {
            display: none;
            position: absolute;
            top: 8px;
            right: 12px;
            font-size: 42px;
            font-weight: 900;
            color: #1565c0;
            line-height: 1;
            z-index: 5;
            pointer-events: none;
            user-select: none;
        }
        .exam-paper.exam-multi-version .exam-version-letter {
            display: block;
        }
        .exam-paper {
            position: relative;
        }`;

export function ensureVersionLetterMarkup(html: string, letter: string): string {
  let out = html;
  if (!out.includes('.exam-version-letter')) {
    if (out.includes('</style>')) {
      out = out.replace('</style>', `${VERSION_LETTER_CSS}\n    </style>`);
    }
  }
  if (!out.includes('id="examVersionLetter"')) {
    out = out.replace(
      /<div class="exam-paper">/,
      `<div class="exam-paper">\n    <div class="exam-version-letter" id="examVersionLetter" aria-hidden="true">${letter}</div>`,
    );
  } else {
    out = out.replace(
      /(<div class="exam-version-letter" id="examVersionLetter"[^>]*>)[^<]*(<\/div>)/,
      `$1${letter}$2`,
    );
  }
  return out;
}

export function examDisplayTitleFromKaKey(kaKey: string): string {
  const stem = String(kaKey || '').replace(/__([A-Z])$/i, '');
  return stem.replace(/^(KA|KU|HU|HÜ|QZ)_/i, '');
}

function escapeHtmlText(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function patchKaKeyInHtml(html: string, kaKey: string): string {
  let out = html.replace(/const KA_KEY = ['"](.*?)['"]/g, `const KA_KEY = '${kaKey}'`);
  out = out.replace(/KA_KEY = ['"](.*?)['"]/g, `KA_KEY = '${kaKey}'`);
  return out;
}

/** KA_KEY, Browser-Tab (<title>) und Kopfzeile (.header-title) an Dateinamen anpassen */
export function patchExamPresentationInHtml(
  html: string,
  kaKey: string,
  displayTitle?: string,
): string {
  const title = String(displayTitle || '').trim() || examDisplayTitleFromKaKey(kaKey);
  const safe = escapeHtmlText(title);
  let out = patchKaKeyInHtml(html, kaKey);
  out = out.replace(/<title>[^<]*<\/title>/gi, `<title>${safe}</title>`);
  out = out.replace(
    /<div class="header-title">([^<$][^<]*)<\/div>/gi,
    `<div class="header-title">${safe}</div>`,
  );
  return out;
}

export function extractKaKeyFromExamHtml(html: string): string | null {
  const m = html.match(/const\s+KA_KEY\s*=\s*['"]([^'"]*)['"]/);
  return m?.[1]?.trim() || null;
}

function decodeHtmlTextEntities(text: string): string {
  return String(text || '')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Tab- und Kopfzeilen-Titel an Dateiname bzw. KA_KEY anpassen (nur für read-html). */
export function syncExamPresentationForDelivery(html: string, filePath?: string): string {
  const fp = String(filePath || '').replace(/\\/g, '/');
  const base = fp.split('/').pop() || '';
  const stem = base.replace(/\.html?$/i, '').replace(/__([A-Z])$/i, '');
  const kaKey = extractKaKeyFromExamHtml(html);
  let expected = '';
  if (/^(KA|KU|HU|HÜ|QZ)_/i.test(stem)) {
    expected = examDisplayTitleFromKaKey(stem);
  } else if (kaKey) {
    expected = examDisplayTitleFromKaKey(kaKey);
  }
  if (!expected) return html;

  const titleM = html.match(/<title>([^<]*)<\/title>/i);
  const headerM = html.match(/<div class="header-title">([^<$][^<]*)<\/div>/i);
  const curTitle = decodeHtmlTextEntities(titleM?.[1]?.trim() || '');
  const curHeader = decodeHtmlTextEntities(headerM?.[1]?.trim() || '');
  if (curTitle === expected && curHeader === expected) return html;

  const keyForPatch = kaKey || stem;
  return patchExamPresentationInHtml(html, keyForPatch, expected);
}

export function patchAllExamVersionPresentationFiles(
  baseGit: string,
  letters: string[],
  resolveFullPath: (gitPath: string) => string,
  displayTitle: string,
): number {
  let patched = 0;
  for (const L of letters) {
    const vGit = gitPathVariant(baseGit, L);
    const fromFull = resolveFullPath(vGit);
    if (!fromFull || !fs.existsSync(fromFull) || !fs.statSync(fromFull).isFile()) continue;
    const content = fs.readFileSync(fromFull, 'utf8');
    const stemKey = fileStemFromName(path.basename(fromFull));
    const next = patchExamPresentationInHtml(content, stemKey, displayTitle);
    if (next !== content) {
      fs.writeFileSync(fromFull, next, 'utf8');
      patched += 1;
    }
  }
  return patched;
}

export function applyVersionsToExamHtml(
  html: string,
  letters: string[],
  fileLetter: string,
): string {
  let out = writeExamVersionsMeta(html, letters);
  out = syncExamVersionLettersJs(out, letters);
  if (letters.length > 1) {
    out = ensureVersionLetterMarkup(out, fileLetter);
    out = out.replace(
      /<div class="exam-paper">/,
      `<div class="exam-paper exam-multi-version">`,
    );
    if (!out.includes('exam-multi-version')) {
      out = out.replace(/class="exam-paper"/, 'class="exam-paper exam-multi-version"');
    }
  } else {
    out = out.replace(/\s*exam-multi-version/g, '');
  }
  return out;
}

export function resolveFullPathFromGitIntern(
  gitInternPath: string,
  devProjectRoot: string,
): string {
  if (gitInternPath.startsWith('git-intern/')) {
    const relativePath = gitInternPath.replace('git-intern/', '');
    if (process.env.NODE_ENV === 'production') {
      const jmReihenPath = path.join(process.cwd(), 'J-M-Reihen');
      return path.join(jmReihenPath, relativePath);
    }
    return path.join(devProjectRoot, 'J-M-Reihen', relativePath);
  }
  return path.resolve(gitInternPath);
}

export function readExamHtmlFullPath(fullFilePath: string): string {
  return fs.readFileSync(fullFilePath, 'utf-8');
}

export function writeExamHtmlFullPath(fullFilePath: string, html: string): void {
  fs.writeFileSync(fullFilePath, html, 'utf-8');
}
