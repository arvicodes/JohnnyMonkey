/** Google Fonts + Stacks für Handschrift (Folien & Prüfungs-Kommentare). */

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

export const teacherHandwritingDocumentCss = `
.jm-teacher-handwriting {
  font-family: ${EXAM_TEACHER_COMMENT_FONT};
  font-size: 1.15em;
  line-height: 1.45;
  font-weight: 400;
}
.jm-task-teacher-comment {
  margin-top: 10px;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-left: 4px solid #81c784;
  background: #f1f8e9;
  border-radius: 4px;
}
.jm-task-teacher-comment-label {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: #2e7d32;
  margin-bottom: 4px;
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
