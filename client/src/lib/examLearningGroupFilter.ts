/** Kurs-/Jahrgangs-Hinweise aus dem Prüfungsdateinamen (z. B. HU_KI MSS 13 → „13“). */
export function courseMarkersFromExamFileName(fileName: string): string[] {
  const name = (fileName.split('/').pop() || fileName).replace(/\.html?$/i, '').trim();
  const markers: string[] = [];
  const mss = name.match(/MSS[_\s-]*(\d{1,2})/i);
  if (mss) markers.push(mss[1]);
  const klasse = name.match(/Klasse\s+(\d{1,2})/i);
  if (klasse) markers.push(klasse[1]);
  const kurs = name.match(/\bKurs\s*(\d{1,2})\b/i);
  if (kurs) markers.push(kurs[1]);
  return [...new Set(markers)];
}

export function learningGroupMatchesCourseMarker(groupName: string, marker: string): boolean {
  const n = String(marker || '').trim();
  if (!n) return false;
  const g = String(groupName || '').trim();
  const patterns = [
    new RegExp(`\\bGK\\s*${n}\\b`, 'i'),
    new RegExp(`\\bLK\\s*${n}\\b`, 'i'),
    new RegExp(`\\bMSS\\s*${n}\\b`, 'i'),
    new RegExp(`\\b${n}er\\b`, 'i'),
    new RegExp(`\\bKurs\\s*${n}\\b`, 'i'),
    new RegExp(`(^|[\\s_\\-–])${n}($|[\\s_\\-–])`),
  ];
  return patterns.some((re) => re.test(g));
}

/**
 * Wenn mehrere Lerngruppen denselben Ordner teilen (z. B. MSS 11 + 13 in „11-04 KI“),
 * nur die zur konkreten Prüfungsdatei passende Gruppe behalten.
 */
export function filterLearningGroupsForExamFile<T extends { id: string; name: string }>(
  groups: T[],
  examFilePath: string,
): T[] {
  if (groups.length <= 1) return groups;
  const fileName = (examFilePath.split('/').pop() || examFilePath).trim();
  const markers = courseMarkersFromExamFileName(fileName);
  if (!markers.length) return groups;

  for (const marker of markers) {
    const filtered = groups.filter((g) => learningGroupMatchesCourseMarker(g.name, marker));
    if (filtered.length === 1) return filtered;
    if (filtered.length > 1 && filtered.length < groups.length) return filtered;
  }

  const marker = markers[0];
  const filtered = groups.filter((g) => learningGroupMatchesCourseMarker(g.name, marker));
  if (filtered.length >= 1 && filtered.length < groups.length) return filtered;
  return groups;
}
