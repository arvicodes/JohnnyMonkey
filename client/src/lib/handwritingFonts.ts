/** Google Fonts + Stacks für Handschrift (Folien & Prüfungs-Kommentare). */

import { EXAM_TEACHER_RED } from './examTeacherSignature';

export const GOOGLE_HANDWRITING_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Caveat:wght@400;600&family=Indie+Flower&family=Kalam:wght@400;700&family=Patrick+Hand&family=Shadows+Into+Light&display=swap';

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

/** Nur Abstand — kein Kasten, kein Hintergrund. */
export const EXAM_TEACHER_COMMENT_CONTAINER_STYLE =
  'margin: 18px 0 14px; padding: 0; background: transparent; border: none; display: block; width: 100%; box-shadow: none;';

export const teacherHandwritingDocumentCss = `
.jm-teacher-handwriting {
  font-family: ${EXAM_TEACHER_COMMENT_FONT};
  font-size: 2rem;
  line-height: 1.35;
  font-weight: 700;
  color: ${EXAM_TEACHER_RED};
  white-space: pre-wrap;
}
.jm-task-teacher-comment,
.jm-exam-teacher-comment {
  margin: 18px 0 14px;
  padding: 0;
  background: transparent;
  border: none;
}
`;

/** HTML für eingebettete Prüfungs-Kommentare (escaped plain text). */
export function examTeacherCommentMarkup(plainText: string): string {
  const safe = String(plainText || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<div class="jm-exam-teacher-comment" style="${EXAM_TEACHER_COMMENT_CONTAINER_STYLE}"><div class="jm-teacher-handwriting">${safe}</div></div>`;
}

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
