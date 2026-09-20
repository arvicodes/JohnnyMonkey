/** Google Fonts + Stacks für Handschrift (Folien & Prüfungs-Kommentare). */

export const GOOGLE_HANDWRITING_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;600&family=Indie+Flower&family=Kalam:wght@400;700&family=Patrick+Hand&family=Shadows+Into+Light&display=swap';

import { EXAM_TEACHER_RED } from './examTeacherSignature';

/** Lehrer-Kommentare in freigegebenen Prüfungen / Vorschau. */
export const EXAM_TEACHER_COMMENT_FONT =
  '"Caveat", "Segoe Script", "Bradley Hand", "Snell Roundhand", "Comic Sans MS", cursive';

export const HANDWRITING_FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Handschrift — Caveat', value: '"Caveat", "Segoe Script", cursive' },
  { label: 'Handschrift — Kalam', value: '"Kalam", "Segoe Print", cursive' },
  { label: 'Handschrift — Patrick Hand', value: '"Patrick Hand", "Comic Sans MS", cursive' },
  { label: 'Handschrift — Indie Flower', value: '"Indie Flower", "Segoe Script", cursive' },
  {
    label: 'Handschrift — Architects Daughter',
    value: '"Architects Daughter", "Segoe Print", cursive',
  },
  {
    label: 'Handschrift — Shadows Into Light',
    value: '"Shadows Into Light", "Segoe Script", cursive',
  },
  {
    label: 'Handschrift — System (Segoe Script)',
    value: '"Segoe Script", "Bradley Hand", "Snell Roundhand", cursive',
  },
];

export const teacherHandwritingDocumentCss = `
.jm-teacher-handwriting {
  font-family: ${EXAM_TEACHER_COMMENT_FONT};
  font-size: 1.55em;
  line-height: 1.4;
  font-weight: 600;
  color: ${EXAM_TEACHER_RED};
  white-space: pre-wrap;
}
.jm-task-teacher-comment {
  margin-top: 14px;
  margin-bottom: 6px;
}
`;

/** In Prüfungs-HTML (iframe / Freigabe) Webfonts + Klassen laden. */
export function injectHandwritingFontsIntoDocument(doc: Document): void {
  const head = doc.head;
  if (!head) return;
  if (!head.querySelector('[data-jm-handwriting-fonts-link]')) {
    const link = doc.createElement('link');
    link.rel = 'stylesheet';
    link.href = GOOGLE_HANDWRITING_FONTS_HREF;
    link.setAttribute('data-jm-handwriting-fonts-link', '1');
    head.appendChild(link);
  }
  if (!head.querySelector('style[data-jm-handwriting-fonts]')) {
    const style = doc.createElement('style');
    style.setAttribute('data-jm-handwriting-fonts', '1');
    style.textContent = teacherHandwritingDocumentCss;
    head.appendChild(style);
  }
}
