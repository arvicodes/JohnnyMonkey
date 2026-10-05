export type ExamLibraryType = 'KA' | 'KU' | 'HU' | 'QZ' | '';

export function examTypeFromFileName(fileName: string): ExamLibraryType {
  const n = String(fileName || '').trim();
  if (/^KA_/i.test(n)) return 'KA';
  if (/^KU_/i.test(n)) return 'KU';
  if (/^HU_/i.test(n) || /^HÜ_/i.test(n)) return 'HU';
  if (/^QZ_/i.test(n)) return 'QZ';
  return '';
}

/** KA rot, HÜ orange, QZ gelb, KU violett. */
export function examAccentColorForFileName(fileName: string): string {
  switch (examTypeFromFileName(fileName)) {
    case 'KA':
      return '#c62828';
    case 'HU':
      return '#ef6c00';
    case 'QZ':
      return '#f9a825';
    case 'KU':
      return '#5e35b1';
    default:
      return '#c62828';
  }
}

export const EXAM_TYPE_LABELS: Record<Exclude<ExamLibraryType, ''>, string> = {
  KA: 'Klassenarbeit (KA)',
  KU: 'Kursarbeit (KU)',
  HU: 'Hausaufgabenüberprüfung (HÜ)',
  QZ: 'Quiz (QZ)',
};
