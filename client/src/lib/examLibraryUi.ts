export type ExamLibraryType = 'KA' | 'KU' | 'HU' | 'QZ' | '';

export function examTypeFromFileName(fileName: string): ExamLibraryType {
  const n = String(fileName || '').trim();
  if (/^KA_/i.test(n)) return 'KA';
  if (/^KU_/i.test(n)) return 'KU';
  if (/^HU_/i.test(n) || /^HÜ_/i.test(n)) return 'HU';
  if (/^QZ_/i.test(n)) return 'QZ';
  return '';
}

/** Typ-Streifen links (Breite + Farbe). Zeile bleibt neutral weiß. */
export type ExamMaterialRowStyle = {
  accent: string;
  accentWidth: number;
};

export function examMaterialRowStyle(fileName: string): ExamMaterialRowStyle {
  switch (examTypeFromFileName(fileName)) {
    case 'KA':
      return { accent: '#c62828', accentWidth: 6 };
    case 'HU':
      return { accent: '#ef6c00', accentWidth: 3 };
    case 'QZ':
      return { accent: '#f9a825', accentWidth: 2 };
    case 'KU':
      return { accent: '#5e35b1', accentWidth: 5 };
    default:
      return { accent: '#90a4ae', accentWidth: 3 };
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
