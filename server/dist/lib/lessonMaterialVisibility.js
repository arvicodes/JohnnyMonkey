"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LESSON_PRESENTATION_PDF_EDITED = exports.LESSON_PRESENTATION_PDF_ORIGINAL = void 0;
exports.isLessonPresentationSystemFile = isLessonPresentationSystemFile;
exports.isLessonPresentationMaterialPdf = isLessonPresentationMaterialPdf;
exports.isStudentVisibleLessonMaterialFile = isStudentVisibleLessonMaterialFile;
/** Johnny-Präsentation: exportierte Folien-PDFs — für Schüler freigeben. */
exports.LESSON_PRESENTATION_PDF_ORIGINAL = 'Praesentation_Original.pdf';
exports.LESSON_PRESENTATION_PDF_EDITED = 'Praesentation_bearbeitet.pdf';
const LESSON_IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|svg|bmp|heic|avif|tiff?)$/i;
const LESSON_INPUT_DOCS_RE = /\.(pdf|pptx?|odp|docx?|odt|rtf)$/i;
function isLessonPresentationSystemFile(name) {
    const n = ((name || '').trim().split(/[/\\]/).pop() || '');
    if (!n)
        return false;
    // Praesentation.deck.json, .deck.original.json, .deck.*.json.bak*, annotations, version.*
    return /^Praesentation\.(deck|annotations|version)(\.|$)/i.test(n);
}
function isLessonPresentationMaterialPdf(name) {
    const n = (name || '').trim();
    return n === exports.LESSON_PRESENTATION_PDF_ORIGINAL || n === exports.LESSON_PRESENTATION_PDF_EDITED;
}
/** Dateien, die Schüler in der Stunden-Materialliste sehen und herunterladen dürfen. */
function isStudentVisibleLessonMaterialFile(name) {
    const n = (name || '').trim();
    if (!n || n.startsWith('~$'))
        return false;
    if (isLessonPresentationSystemFile(n))
        return false;
    if (isLessonPresentationMaterialPdf(n))
        return true;
    if (LESSON_IMAGE_EXT_RE.test(n))
        return false;
    if (LESSON_INPUT_DOCS_RE.test(n))
        return true;
    if (/\.wb$/i.test(n))
        return true;
    return false;
}
//# sourceMappingURL=lessonMaterialVisibility.js.map