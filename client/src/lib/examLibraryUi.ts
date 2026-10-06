export type ExamLibraryType = 'KA' | 'KU' | 'HU' | 'QZ' | '';

export function examTypeFromFileName(fileName: string): ExamLibraryType {
  const n = String(fileName || '').trim();
  if (/^KA_/i.test(n)) return 'KA';
  if (/^KU_/i.test(n)) return 'KU';
  if (/^HU_/i.test(n) || /^HÜ_/i.test(n)) return 'HU';
  if (/^QZ_/i.test(n)) return 'QZ';
  return '';
}

/** Titelteil ohne Präfix (QZ_/KA_/…) und ohne Versions-Suffix __B */
export function examTitleFromFileName(fileName: string): string {
  const stem = String(fileName || '')
    .trim()
    .replace(/\.html?$/i, '');
  const base = stem.replace(/__([A-Z])$/i, '');
  return base.replace(/^(KA|KU|HU|HÜ|QZ)_/i, '');
}

/** Typ-Streifen links + dezenter Hintergrund. */
export type ExamMaterialRowStyle = {
  accent: string;
  accentWidth: number;
  rowBg: string;
};

export function examMaterialRowStyle(fileName: string): ExamMaterialRowStyle {
  switch (examTypeFromFileName(fileName)) {
    case 'KA':
      return { accent: '#c62828', accentWidth: 6, rowBg: 'rgba(198, 40, 40, 0.07)' };
    case 'HU':
      return { accent: '#ef6c00', accentWidth: 3, rowBg: 'rgba(239, 108, 0, 0.06)' };
    case 'QZ':
      return { accent: '#f9a825', accentWidth: 2, rowBg: 'rgba(249, 168, 37, 0.08)' };
    case 'KU':
      return { accent: '#5e35b1', accentWidth: 5, rowBg: 'rgba(94, 53, 177, 0.06)' };
    default:
      return { accent: '#90a4ae', accentWidth: 3, rowBg: '#ffffff' };
  }
}

export function examAccentColorForFileName(fileName: string): string {
  return examMaterialRowStyle(fileName).accent;
}

export const EXAM_TYPE_LABELS: Record<Exclude<ExamLibraryType, ''>, string> = {
  KA: 'Klassenarbeit (KA)',
  KU: 'Kursarbeit (KU)',
  HU: 'Hausaufgabenüberprüfung (HÜ)',
  QZ: 'Quiz (QZ)',
};
