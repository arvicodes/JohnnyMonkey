/** Rote Unterschrift auf freigegebenen Prüfungen (hinter der Note). */

export const TEACHER_SIGNATURE_RED_PNG = '/teacher-signature-red.png';

/** „Lehrerrot“ für Kommentare. */
export const EXAM_TEACHER_RED = '#c62828';

export function teacherSignatureImgUrl(origin?: string): string {
  const base = (origin || (typeof window !== 'undefined' ? window.location.origin : '')).replace(
    /\/$/,
    '',
  );
  return `${base}${TEACHER_SIGNATURE_RED_PNG}`;
}
