export function normalizeVersionLetter(raw: string): string | null {
  const l = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (!l || l.length !== 1) return null;
  return l;
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
  const res = await fetch(
    `/api/file-system-paths/get-examination-versions?filePath=${encodeURIComponent(baseFilePath)}`,
  );
  if (!res.ok) {
    return { letters: ['A'], paths: { A: baseFilePath }, baseFilePath };
  }
  const data = (await res.json()) as {
    letters?: string[];
    paths?: Record<string, string>;
    baseFilePath?: string;
  };
  const letters = data.letters?.length ? data.letters : ['A'];
  return {
    letters,
    paths: data.paths || { A: baseFilePath },
    baseFilePath: data.baseFilePath || baseFilePath,
  };
}

export function resolveVersionFilePath(
  paths: Record<string, string>,
  baseFilePath: string,
  letter: string,
): string {
  const L = normalizeVersionLetter(letter) || 'A';
  return paths[L] || paths.A || baseFilePath;
}
