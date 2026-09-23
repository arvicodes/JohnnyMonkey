export function normalizeVersionLetter(raw: string): string | null {
  const l = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!l || l.length !== 1) return null;
  return l;
}

export function fileStemFromName(fileName: string): string {
  return fileName.replace(/\.(html|htm)$/i, '');
}

export function baseStemFromStem(stem: string): string {
  return stem.replace(/__([A-Z])$/i, '');
}

export function variantStem(baseStem: string, letter: string): string {
  const L = normalizeVersionLetter(letter);
  if (!L || L === 'A') return baseStem;
  return `${baseStem}__${L}`;
}

/** Basis-HTML (Version A) aus beliebigem Varianten-Pfad. */
export function gitPathVariant(baseGitPath: string, letter: string): string {
  const p = (baseGitPath || '').replace(/\\/g, '/');
  const slash = p.lastIndexOf('/');
  const dir = slash >= 0 ? p.slice(0, slash + 1) : '';
  const file = slash >= 0 ? p.slice(slash + 1) : p;
  const stem = fileStemFromName(file);
  const baseStem = baseStemFromStem(stem);
  const nextStem = variantStem(baseStem, letter);
  return `${dir}${nextStem}.html`;
}

export function examBaseGitPath(anyVariantPath: string): string {
  const p = (anyVariantPath || '').replace(/\\/g, '/').trim();
  if (!p) return p;
  return gitPathVariant(p, 'A');
}

/** Gleiche Prüfungsfamilie (A/B/C teilen einen Stamm). */
export function examFamilyKey(anyVariantPath: string): string {
  const p = (anyVariantPath || '').replace(/\\/g, '/').trim().toLowerCase();
  if (!p) return '';
  const slash = p.lastIndexOf('/');
  const dir = slash >= 0 ? p.slice(0, slash) : '';
  const file = slash >= 0 ? p.slice(slash + 1) : p;
  const stem = baseStemFromStem(fileStemFromName(file));
  return `${dir}/${stem}`;
}

export function versionLetterFromKaPath(kaPath: string): string {
  const fileName = (kaPath || '').split(/[/\\]/).pop() || kaPath || '';
  const stem = fileName.replace(/\.(html|htm)$/i, '');
  const m = stem.match(/__([A-Z])$/i);
  return m ? m[1].toUpperCase() : 'A';
}

export function examVersionStorageKey(beaconId: string, userId: string): string {
  return `jm_exam_version_${beaconId}_${userId}`;
}

const EXAM_VERSIONS_META_RE = /<!--\s*EXAM_VERSIONS\s*(\{[\s\S]*?\})\s*-->/;
const EXAM_VERSION_LETTERS_JS_RE = /const\s+EXAM_VERSION_LETTERS\s*=\s*\[(.*?)\]\s*;/s;

function uniqueLetters(raw: Array<string | null>): string[] {
  const letters = [...new Set(raw.filter((x): x is string => Boolean(x)))];
  if (!letters.includes('A')) letters.unshift('A');
  return letters.sort();
}

/** Buchstaben aus dem KA-HTML (Kommentar oder EXAM_VERSION_LETTERS). */
export function parseExamVersionLettersFromHtml(html: string): string[] {
  const meta = html.match(EXAM_VERSIONS_META_RE);
  if (meta) {
    try {
      const parsed = JSON.parse(meta[1]) as { letters?: unknown };
      if (Array.isArray(parsed.letters)) {
        return uniqueLetters(
          parsed.letters.map((x) => normalizeVersionLetter(String(x))),
        );
      }
    } catch {
      /* weiter zum JS-Array */
    }
  }
  const js = html.match(EXAM_VERSION_LETTERS_JS_RE);
  if (js) {
    const found = [...js[1].matchAll(/['"]([A-Za-z])['"]/g)].map((m) =>
      normalizeVersionLetter(m[1]),
    );
    if (found.some(Boolean)) return uniqueLetters(found);
  }
  return ['A'];
}

export function examVersionMetaFromLetters(
  anyVariantPath: string,
  letters: string[],
): { letters: string[]; paths: Record<string, string>; baseFilePath: string } {
  const baseFilePath = examBaseGitPath(anyVariantPath);
  const paths: Record<string, string> = {};
  for (const letter of letters) {
    paths[letter] = gitPathVariant(baseFilePath, letter);
  }
  return { letters, paths, baseFilePath };
}

/** Dieselbe Datei, die SuS später sehen — Versionen stehen im HTML. */
export async function fetchExamVersionLettersFromHtml(filePath: string): Promise<{
  letters: string[];
  paths: Record<string, string>;
  baseFilePath: string;
} | null> {
  const res = await fetch(
    `/api/file-system-paths/read-html?filePath=${encodeURIComponent(filePath)}`,
  );
  if (!res.ok) return null;
  const html = await res.text();
  const letters = parseExamVersionLettersFromHtml(html);
  return examVersionMetaFromLetters(filePath, letters);
}

export async function fetchExamVersionLetters(baseFilePath: string): Promise<{
  letters: string[];
  paths: Record<string, string>;
  baseFilePath: string;
}> {
  const queryPath = examBaseGitPath(baseFilePath);
  const loginCode = localStorage.getItem('loginCode')?.trim();
  const res = await fetch(
    `/api/file-system-paths/get-examination-versions?filePath=${encodeURIComponent(queryPath)}`,
    loginCode ? { headers: { 'x-login-code': loginCode } } : undefined,
  );
  if (!res.ok) {
    throw new Error(`Versionen konnten nicht geladen werden (${res.status})`);
  }
  const data = (await res.json()) as {
    letters?: string[];
    paths?: Record<string, string>;
    baseFilePath?: string;
  };
  const letters = data.letters?.length ? data.letters : ['A'];
  const base = data.baseFilePath || queryPath;
  return {
    letters,
    paths: data.paths || { A: base },
    baseFilePath: base,
  };
}

export function resolveVersionFilePath(
  paths: Record<string, string>,
  baseFilePath: string,
  letter: string,
): string {
  const L = normalizeVersionLetter(letter) || 'A';
  const fromMap = paths[L];
  if (fromMap) return fromMap;
  const computed = gitPathVariant(baseFilePath, L);
  if (L === 'A') return paths.A || baseFilePath || computed;
  return computed;
}
