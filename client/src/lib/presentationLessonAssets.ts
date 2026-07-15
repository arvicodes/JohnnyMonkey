/** Johnny-Präsentation: exportierte Folien-PDFs — sollen als Unterrichtsmaterial erscheinen. */
export const LESSON_PRESENTATION_PDF_ORIGINAL = 'Praesentation_Original.pdf';
export const LESSON_PRESENTATION_PDF_EDITED = 'Praesentation_bearbeitet.pdf';

const LESSON_IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|bmp|heic|avif|tiff?)$/i;
const LESSON_INPUT_DOCS_RE = /\.(pdf|pptx?|odp|docx?|odt|rtf)$/i;

/** Interne JSON — nicht als Arbeitsmaterial listen. */
export function isLessonPresentationSystemFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return false;
  if (/^Praesentation\.(deck|annotations)(\.[^/\\]+)*\.json$/i.test(n)) return true;
  return false;
}

export function isLessonPresentationMaterialPdf(name: string): boolean {
  const n = (name || '').trim();
  return n === LESSON_PRESENTATION_PDF_ORIGINAL || n === LESSON_PRESENTATION_PDF_EDITED;
}

export function labelForLessonPresentationMaterialPdf(name: string): string | null {
  const n = (name || '').trim();
  if (n === LESSON_PRESENTATION_PDF_ORIGINAL) return 'Folien Original';
  if (n === LESSON_PRESENTATION_PDF_EDITED) return 'Folien bearbeitet';
  return null;
}

function sanitizeLessonFileStem(name: string): string {
  return (name || '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Download-Dateiname für Schüler: Stundenname statt Praesentation_*.pdf */
export function lessonPresentationDownloadFilename(
  lessonName: string,
  variant: 'original' | 'edited'
): string {
  const stem = sanitizeLessonFileStem(lessonName) || 'Praesentation';
  return variant === 'edited' ? `${stem} bearbeitet.pdf` : `${stem}.pdf`;
}

/**
 * Bilder und interne Präsentationsdateien — nicht in der Dashboard-Materialliste.
 * Unterrichtsmaterial sind nur die exportierten Praesentation_*-PDFs (siehe isLessonPresentationMaterialPdf).
 */
export function isLessonPresentationAssetFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n) return false;
  if (isLessonPresentationSystemFile(n)) return true;
  if (isLessonPresentationMaterialPdf(n)) return false;
  if (LESSON_IMAGE_EXT_RE.test(n)) return true;
  return false;
}

/** Dateien, die Schüler in der Stunden-Materialliste sehen und herunterladen dürfen. */
export function isStudentVisibleLessonMaterialFile(name: string): boolean {
  const n = (name || '').trim();
  if (!n || n.startsWith('~$')) return false;
  if (isLessonPresentationSystemFile(n)) return false;
  if (isLessonPresentationMaterialPdf(n)) return true;
  if (LESSON_IMAGE_EXT_RE.test(n)) return false;
  if (LESSON_INPUT_DOCS_RE.test(n)) return true;
  if (/\.wb$/i.test(n)) return true;
  return false;
}
