/** Johnny-Präsentation: exportierte Folien-PDFs — für Schüler freigeben. */
export const LESSON_PRESENTATION_PDF_ORIGINAL = 'Praesentation_Original.pdf';
export const LESSON_PRESENTATION_PDF_EDITED = 'Praesentation_bearbeitet.pdf';
export const LESSON_PRESENTATION_PDF_STAND = 'Praesentation_Stand.pdf';

const LESSON_IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|bmp|heic|avif|tiff?)$/i;
const LESSON_INPUT_DOCS_RE = /\.(pdf|pptx?|odp|docx?|odt|rtf)$/i;

export function isLessonPresentationSystemFile(name: string): boolean {
  const n = ((name || '').trim().split(/[/\\]/).pop() || '');
  if (!n) return false;
  // Praesentation.deck.json, .deck.original.json, .deck.*.json.bak*, annotations, version.*, play-variants
  return /^Praesentation\.(deck|annotations|version|play-variants)(\.|$)/i.test(n);
}

export function isLessonPresentationMaterialPdf(name: string): boolean {
  const n = (name || '').trim();
  return n === LESSON_PRESENTATION_PDF_ORIGINAL || n === LESSON_PRESENTATION_PDF_EDITED;
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
