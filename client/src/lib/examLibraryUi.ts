export type ExamLibraryType = 'KA' | 'KU' | 'HU' | 'QZ' | '';

export function examTypeFromFileName(fileName: string): ExamLibraryType {
  const n = String(fileName || '').trim();
  if (/^KA_/i.test(n)) return 'KA';
  if (/^KU_/i.test(n)) return 'KU';
  if (/^HU_/i.test(n) || /^HÜ_/i.test(n)) return 'HU';
  if (/^QZ_/i.test(n)) return 'QZ';
  return '';
}

/** Zeilen-Stil im Prüfungs-Dashboard (Streifenbreite + kräftige Farbe). */
export type ExamMaterialRowStyle = {
  accent: string;
  /** Vertikaler Typ-Streifen links (px). */
  accentWidth: number;
  rowBg: string;
  rowBorder: string;
};

export function examMaterialRowStyle(fileName: string): ExamMaterialRowStyle {
  switch (examTypeFromFileName(fileName)) {
    case 'KA':
      return {
        accent: '#b71c1c',
        accentWidth: 8,
        rowBg: '#ffcdd2',
        rowBorder: '#e53935',
      };
    case 'HU':
      return {
        accent: '#e65100',
        accentWidth: 4,
        rowBg: '#ffe0b2',
        rowBorder: '#fb8c00',
      };
    case 'QZ':
      return {
        accent: '#f9a825',
        accentWidth: 2,
        rowBg: '#fff9c4',
        rowBorder: '#fdd835',
      };
    case 'KU':
      return {
        accent: '#4527a0',
        accentWidth: 6,
        rowBg: '#d1c4e9',
        rowBorder: '#7e57c2',
      };
    default:
      return {
        accent: '#b71c1c',
        accentWidth: 5,
        rowBg: '#ffffff',
        rowBorder: '#e0e0e0',
      };
  }
}

/** Nur Streifenfarbe (Legacy). */
export function examAccentColorForFileName(fileName: string): string {
  return examMaterialRowStyle(fileName).accent;
}

export const EXAM_TYPE_LABELS: Record<Exclude<ExamLibraryType, ''>, string> = {
  KA: 'Klassenarbeit (KA)',
  KU: 'Kursarbeit (KU)',
  HU: 'Hausaufgabenüberprüfung (HÜ)',
  QZ: 'Quiz (QZ)',
};
