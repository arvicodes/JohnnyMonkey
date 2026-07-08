/** Zuverlässige Rich-Text-Befehle für contentEditable (Farben, Größe). */

let savedRange: Range | null = null;
let savedEditor: HTMLElement | null = null;

export function focusEditor(editor: HTMLElement | null) {
  if (!editor) return;
  editor.focus();
}

/** Auswahl merken, bevor die Toolbar den Fokus übernimmt. */
export function bookmarkSelection(editor: HTMLElement | null) {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  savedRange = range.cloneRange();
  savedEditor = editor;
}

function restoreBookmark(): boolean {
  if (!savedRange || !savedEditor) return false;
  const sel = window.getSelection();
  if (!sel) return false;
  savedEditor.focus();
  try {
    sel.removeAllRanges();
    sel.addRange(savedRange);
    return true;
  } catch {
    return false;
  }
}

/** Alte <font>-Tags in Inline-Styles umwandeln (sonst überschreibt CSS die Farbe). */
const FONT_SIZE_PX: Record<string, string> = {
  '2': '14px',
  '3': '18px',
  '4': '24px',
  '5': '32px',
  '6': '42px',
  '7': '56px',
};

export function normalizeRichHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll('font').forEach((font) => {
    const span = doc.createElement('span');
    const color = font.getAttribute('color');
    const face = font.getAttribute('face');
    const size = font.getAttribute('size');
    if (color) span.style.color = color.startsWith('#') ? color : color;
    if (face) span.style.fontFamily = face;
    if (size) {
      const px = FONT_SIZE_PX[size] || undefined;
      if (px) span.style.fontSize = px;
    }
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  return doc.body.innerHTML;
}

export function execFormat(editor: HTMLElement | null, cmd: string, value?: string) {
  if (!editor) return;
  focusEditor(editor);
  restoreBookmark();
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  document.execCommand(cmd, false, value);
}

function wrapSelectionWithStyle(editor: HTMLElement, style: Record<string, string>) {
  restoreBookmark();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;

  const span = document.createElement('span');
  Object.assign(span.style, style);
  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }
  sel.removeAllRanges();
  const nr = document.createRange();
  nr.selectNodeContents(span);
  nr.collapse(false);
  sel.addRange(nr);
  savedRange = nr.cloneRange();
  savedEditor = editor;
  return true;
}

function applyInlineStyle(editor: HTMLElement, style: Record<string, string>) {
  focusEditor(editor);
  restoreBookmark();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return;

  const range = sel.getRangeAt(0);
  if (!range.collapsed) {
    wrapSelectionWithStyle(editor, style);
    return;
  }

  const span = document.createElement('span');
  Object.assign(span.style, style);
  span.appendChild(document.createTextNode('\u200B'));
  range.insertNode(span);
  const textNode = span.firstChild!;
  const nr = document.createRange();
  nr.setStart(textNode, 1);
  nr.collapse(true);
  sel.removeAllRanges();
  sel.addRange(nr);
  savedRange = nr.cloneRange();
  savedEditor = editor;
}

export function applyTextColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  applyInlineStyle(editor, { color });
}

export function applyHighlightColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  applyInlineStyle(editor, { backgroundColor: color });
}

export function applyFontSize(editor: HTMLElement | null, sizeKey: string) {
  if (!editor) return;
  const px = FONT_SIZE_PX[sizeKey] || '18px';
  applyInlineStyle(editor, { fontSize: px });
}

function unwrapElement(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function elementsInRange(editor: HTMLElement, range: Range): HTMLElement[] {
  const found: HTMLElement[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    try {
      if (range.intersectsNode(el)) found.push(el);
    } catch {
      /* ignore */
    }
  }
  return found;
}

/** Textfarbe oder Markierung aus der Auswahl entfernen. */
export function clearInlineFormatting(
  editor: HTMLElement | null,
  mode: 'color' | 'highlight' | 'both'
) {
  if (!editor) return;
  focusEditor(editor);
  restoreBookmark();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const targets = elementsInRange(editor, range);
  for (const el of targets) {
    if (mode === 'highlight' || mode === 'both') {
      if (el.tagName === 'MARK') {
        unwrapElement(el);
        continue;
      }
      el.style.backgroundColor = '';
    }
    if (mode === 'color' || mode === 'both') {
      el.style.color = '';
    }
    const styleAttr = el.getAttribute('style')?.trim();
    if (
      el.tagName === 'MARK' &&
      (mode === 'highlight' || mode === 'both') &&
      !styleAttr
    ) {
      unwrapElement(el);
    } else if ((el.tagName === 'SPAN' || el.tagName === 'FONT') && !styleAttr) {
      unwrapElement(el);
    }
  }

  try {
    document.execCommand('styleWithCSS', false, 'true');
    if (mode === 'highlight' || mode === 'both') {
      document.execCommand('backColor', false, 'transparent');
    }
    if (mode === 'color' || mode === 'both') {
      document.execCommand('foreColor', false, 'inherit');
    }
  } catch {
    /* ignore */
  }
}
