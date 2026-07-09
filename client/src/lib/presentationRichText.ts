/** Rich-Text-Hilfen für Präsentations-Editoren (Farben, Listen, Fett …). */

import {
  applyEditorFontSizePx,
  applyEditorFontSizeStepIndex,
  captureEditorSelection,
  clearSavedSelection,
  collapseEditorSelection,
  ensureEditorSelection,
  getEditorSelectionFontPx,
  getEditorFontSizeSteps,
  nudgeEditorFontSize,
  NOTES_FONT_SIZE_STEPS,
  PRESENTATION_FONT_SIZE_STEPS,
  restoreSavedEditorSelection,
  stashEditorSelection,
} from './presentationFontSize';

export {
  applyEditorFontSizePx,
  applyEditorFontSizeStepIndex,
  captureEditorSelection,
  clearSavedSelection,
  collapseEditorSelection,
  ensureEditorSelection,
  getEditorSelectionFontPx,
  getEditorFontSizeSteps,
  nudgeEditorFontSize,
  NOTES_FONT_SIZE_STEPS,
  PRESENTATION_FONT_SIZE_STEPS,
  stashEditorSelection,
};

/** @deprecated Alias */
export const bookmarkSelection = captureEditorSelection;

/** @deprecated Alias */
export function getSelectionFontSizePx(editor: HTMLElement | null): number | null {
  return getEditorSelectionFontPx(editor);
}

/** @deprecated Alias */
export function applyFontSizePx(editor: HTMLElement | null, px: number): boolean {
  return applyEditorFontSizePx(editor, px);
}

/** @deprecated Alias */
export function nudgeFontSize(editor: HTMLElement | null, direction: 1 | -1): number | null {
  return nudgeEditorFontSize(editor, direction);
}

/** @deprecated Alias */
export function applyFontSizePresetIndex(editor: HTMLElement | null, index: number): number | null {
  return applyEditorFontSizeStepIndex(editor, index);
}

export function restoreBookmark(): boolean {
  return restoreSavedEditorSelection();
}

export function focusEditor(editor: HTMLElement | null) {
  if (!editor) return;
  editor.focus({ preventScroll: true });
}

const FONT_SIZE_PX: Record<string, string> = {
  '1': '12px',
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
      if (px) {
        const n = parseInt(px, 10);
        if (Number.isFinite(n)) {
          span.setAttribute('data-pres-fs', String(n));
          span.style.setProperty('font-size', px, 'important');
        }
      }
    }
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  return doc.body.innerHTML;
}

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'LI', 'UL', 'OL', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
]);

function unwrapIllegalSpanBlocks(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('span')).forEach((span) => {
      const hasBlockChild = Array.from(span.children).some((child) =>
        BLOCK_TAGS.has(child.tagName)
      );
      if (!hasBlockChild) return;
      const parent = span.parentNode;
      if (!parent) return;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
      changed = true;
    });
  }
}

function stripExternalFontSizing(root: ParentNode) {
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (el.hasAttribute('data-pres-fs')) return;
    el.style?.removeProperty('font-size');
    if (el.tagName === 'FONT') el.removeAttribute('size');
    const styleAttr = el.getAttribute('style')?.trim() ?? '';
    if (!styleAttr) el.removeAttribute('style');
  });
}

/** Bereinigt eingefügtes HTML (Pages/Word) für editierbare Zonen. */
export function sanitizePastedHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll('font').forEach((font) => {
    const span = doc.createElement('span');
    const color = font.getAttribute('color');
    if (color) span.style.color = color;
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  unwrapIllegalSpanBlocks(doc.body);
  stripExternalFontSizing(doc.body);
  doc.body.querySelectorAll('span.Apple-converted-space, br.Apple-interchange-newline').forEach((el) => {
    if (el.tagName === 'BR') {
      el.replaceWith(doc.createTextNode(' '));
    } else {
      el.replaceWith(doc.createTextNode(' '));
    }
  });
  return normalizeRichHtml(doc.body.innerHTML);
}

/** Struktur bereinigen ohne absichtliche data-pres-fs zu entfernen. */
export function sanitizePresentationHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  const base = normalizeRichHtml(html);
  const doc = new DOMParser().parseFromString(base, 'text/html');
  unwrapIllegalSpanBlocks(doc.body);
  return doc.body.innerHTML;
}

const NOTES_INDENT_PROPS = [
  'margin',
  'margin-left',
  'margin-right',
  'padding-left',
  'text-indent',
] as const;

/** Entfernt nur Block-Einrückungen, behält Fett/Farbe/Größe. */
export function stripNotesBlockIndent(html: string): string {
  const base = normalizeRichHtml(html);
  if (!base || typeof document === 'undefined') return base;
  const doc = new DOMParser().parseFromString(base, 'text/html');
  doc.body.querySelectorAll('p, div, li, ul, ol, blockquote').forEach((node) => {
    const el = node as HTMLElement;
    NOTES_INDENT_PROPS.forEach((prop) => el.style.removeProperty(prop));
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
  return doc.body.innerHTML;
}

/** @deprecated Alias */
export function normalizeNotesHtml(html: string): string {
  return stripNotesBlockIndent(html);
}

export function execFormat(editor: HTMLElement | null, cmd: string, value?: string) {
  if (!editor) return;
  stashEditorSelection(editor);
  ensureEditorSelection(editor) || focusEditor(editor);
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  document.execCommand(cmd, false, value);
  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function makeStyleSpan(style: Record<string, string>): HTMLSpanElement {
  const span = document.createElement('span');
  Object.entries(style).forEach(([key, value]) => {
    if (key === 'color') {
      span.setAttribute('data-pres-color', value);
      span.style.setProperty('color', value, 'important');
      return;
    }
    if (key === 'backgroundColor') {
      span.setAttribute('data-pres-highlight', value);
      span.style.setProperty('background-color', value, 'important');
      return;
    }
    (span.style as unknown as Record<string, string>)[key] = value;
  });
  return span;
}

function wrapSelectionWithStyle(editor: HTMLElement, style: Record<string, string>): boolean {
  stashEditorSelection(editor);
  if (!ensureEditorSelection(editor)) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;

  const span = makeStyleSpan(style);
  try {
    const extracted = range.extractContents();
    if (!fragmentHasText(extracted)) return false;
    span.appendChild(extracted);
    range.insertNode(span);
  } catch {
    try {
      range.surroundContents(span);
    } catch {
      return false;
    }
  }
  collapseEditorSelection(editor, span);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function fragmentHasText(fragment: DocumentFragment | Node): boolean {
  return Boolean(fragment.textContent?.replace(/\u00a0/g, ' ').trim());
}

function applyInlineStyle(editor: HTMLElement, style: Record<string, string>) {
  stashEditorSelection(editor);
  if (wrapSelectionWithStyle(editor, style)) return;

  focusEditor(editor);
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return;

  const span = makeStyleSpan(style);
  span.appendChild(document.createTextNode('\u200B'));
  range.insertNode(span);
  const textNode = span.firstChild!;
  const nr = document.createRange();
  nr.setStart(textNode, 1);
  nr.collapse(true);
  sel.removeAllRanges();
  sel.addRange(nr);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyTextColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  stashEditorSelection(editor);
  if (wrapSelectionWithStyle(editor, { color })) return;
  if (!ensureEditorSelection(editor)) focusEditor(editor);
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  document.execCommand('foreColor', false, color);
  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyHighlightColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  stashEditorSelection(editor);
  if (wrapSelectionWithStyle(editor, { backgroundColor: color })) return;
  if (!ensureEditorSelection(editor)) focusEditor(editor);
  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  document.execCommand('backColor', false, color);
  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyFontSize(editor: HTMLElement | null, sizeKey: string) {
  if (!editor) return;
  const px = FONT_SIZE_PX[sizeKey] || '18px';
  applyEditorFontSizePx(editor, parseInt(px, 10));
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

export function clearInlineFormatting(
  editor: HTMLElement | null,
  mode: 'color' | 'highlight' | 'both'
) {
  if (!editor) return;
  stashEditorSelection(editor);
  if (!ensureEditorSelection(editor)) {
    focusEditor(editor);
    return;
  }
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
  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}
