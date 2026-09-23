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
