import type { ExamGridTaskSpec, GridSubsection } from './examGridTaskBuilder';

/** Absätze (Hinweise) ohne Teilbuchstaben; alle anderen Teile A, B, C … */
export function subsectionGetsLetter(sub: GridSubsection): boolean {
  return sub.kind !== 'paragraph';
}

export function applyAutoSubsectionLetters(spec: ExamGridTaskSpec): ExamGridTaskSpec {
  let n = 0;
  const subsections = spec.subsections.map((sub) => {
    if (!subsectionGetsLetter(sub)) {
      return { ...sub, letter: '' };
    }
    const letter = String.fromCharCode(65 + n);
    n += 1;
    return { ...sub, letter };
  });
  return { ...spec, subsections };
}
