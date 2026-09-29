/** Gleiche Kanonisierung wie client/src/lib/lessonFileSharePath.ts — für Stunden-Freigaben. */
export function normalizeLessonMaterialPath(path: string): string {
  const p = String(path ?? '')
    .normalize('NFC')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/+$/, '');
  if (!p) return '';
  if (p.startsWith('git-intern/')) {
    return p.slice('git-intern/'.length);
  }
  const marker = 'J-M-Reihen/';
  const idx = p.indexOf(marker);
  if (idx >= 0) return p.slice(idx + marker.length);
  return p;
}

export function lessonMaterialPathsEqual(a: string, b: string): boolean {
  const na = normalizeLessonMaterialPath(a);
  const nb = normalizeLessonMaterialPath(b);
  return Boolean(na && nb && na === nb);
}
