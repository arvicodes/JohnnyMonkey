/** Einheitlicher Pfad für Freigabe-Vergleich (git-intern vs. absoluter J-M-Reihen-Pfad). */
export function normalizeLessonMaterialPath(path: string): string {
  const p = (path || '').replace(/\\/g, '/').trim();
  if (p.startsWith('git-intern/')) {
    return p.slice('git-intern/'.length);
  }
  const marker = 'J-M-Reihen/';
  const idx = p.indexOf(marker);
  if (idx >= 0) return p.slice(idx + marker.length);
  return p;
}

export function isLessonFileShared(filePath: string, sharedPaths: string[]): boolean {
  const norm = normalizeLessonMaterialPath(filePath);
  return sharedPaths.some((sp) => normalizeLessonMaterialPath(sp) === norm);
}
