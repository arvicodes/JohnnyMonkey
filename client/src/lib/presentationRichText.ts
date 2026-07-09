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
import { normalizeListsInPlace, normalizePresentationLists } from './presentationListNormalize';

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

function stripExternalColors(root: ParentNode) {
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (el.hasAttribute('data-pres-color')) return;
    el.style?.removeProperty('color');
    if (el.tagName === 'FONT') el.removeAttribute('color');
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
  stripExternalColors(doc.body);
  normalizeListsInPlace(doc.body);
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
  normalizeListsInPlace(doc.body);
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
  doc.body.querySelectorAll('p, div, blockquote').forEach((node) => {
    const el = node as HTMLElement;
    NOTES_INDENT_PROPS.forEach((prop) => el.style.removeProperty(prop));
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
  doc.body.querySelectorAll('li').forEach((node) => {
    const el = node as HTMLElement;
    ['margin', 'margin-left', 'margin-right', 'text-indent'].forEach((prop) =>
      el.style.removeProperty(prop)
    );
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
  return doc.body.innerHTML;
}

/** @deprecated Alias */
export function normalizeNotesHtml(html: string): string {
  return normalizePresentationLists(stripNotesBlockIndent(html));
}

const LIST_FORMAT_COMMANDS = new Set([
  'insertUnorderedList',
  'insertOrderedList',
  'indent',
  'outdent',
]);

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
  if (LIST_FORMAT_COMMANDS.has(cmd)) {
    normalizeListsInPlace(editor);
  } else {
    collapseEditorSelection(editor);
  }
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

function unwrapNestedAttrSpans(root: DocumentFragment | ParentNode, attr: string) {
  root.querySelectorAll?.(`span[${attr}]`)?.forEach((inner) => {
    const parent = inner.parentNode;
    if (!parent) return;
    while (inner.firstChild) parent.insertBefore(inner.firstChild, inner);
    parent.removeChild(inner);
  });
}

function stripColorInRange(editor: HTMLElement, range: Range) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    try {
      if (!range.intersectsNode(el)) continue;
    } catch {
      continue;
    }
    el.style?.removeProperty('color');
    el.removeAttribute('data-pres-color');
    if (el.tagName === 'FONT') el.removeAttribute('color');
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  }
}

function stripHighlightInRange(editor: HTMLElement, range: Range) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    try {
      if (!range.intersectsNode(el)) continue;
    } catch {
      continue;
    }
    if (el.tagName === 'MARK') {
      unwrapElement(el);
      continue;
    }
    el.style?.removeProperty('background-color');
    el.removeAttribute('data-pres-highlight');
    if (!el.getAttribute('style')?.trim() && el.tagName === 'SPAN') {
      unwrapElement(el);
    }
  }
}

function stripColorFromFragment(root: DocumentFragment | HTMLElement) {
  const nodes: HTMLElement[] = [];
  if ('querySelectorAll' in root) {
    root.querySelectorAll('*').forEach((el) => nodes.push(el as HTMLElement));
    if (root instanceof HTMLElement) nodes.push(root);
  }
  nodes.forEach((el) => {
    el.style?.removeProperty('color');
    el.removeAttribute('data-pres-color');
    if (el.tagName === 'FONT') el.removeAttribute('color');
    if (!el.getAttribute('style')?.trim() && (el.tagName === 'SPAN' || el.tagName === 'FONT')) {
      unwrapElement(el);
    }
  });
  unwrapNestedAttrSpans(root, 'data-pres-color');
}

function stripHighlightFromFragment(root: DocumentFragment | HTMLElement) {
  const nodes: HTMLElement[] = [];
  if ('querySelectorAll' in root) {
    root.querySelectorAll('*').forEach((el) => nodes.push(el as HTMLElement));
    if (root instanceof HTMLElement) nodes.push(root);
  }
  nodes.forEach((el) => {
    if (el.tagName === 'MARK') {
      unwrapElement(el);
      return;
    }
    el.style?.removeProperty('background-color');
    el.removeAttribute('data-pres-highlight');
    if (!el.getAttribute('style')?.trim() && el.tagName === 'SPAN') {
      unwrapElement(el);
    }
  });
  unwrapNestedAttrSpans(root, 'data-pres-highlight');
}

function textNodesInRange(editor: HTMLElement, range: Range): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent ?? '';
      if (!text.replace(/\u00a0/g, ' ').trim()) return NodeFilter.FILTER_REJECT;
      try {
        return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      } catch {
        return NodeFilter.FILTER_REJECT;
      }
    },
  });
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);
  return nodes;
}

function applyStyleToTextRange(range: Range, style: Record<string, string>): HTMLSpanElement | null {
  const span = makeStyleSpan(style);
  try {
    const extracted = range.extractContents();
    if (!fragmentHasText(extracted)) return null;
    if (style.color) stripColorFromFragment(extracted);
    if (style.backgroundColor) stripHighlightFromFragment(extracted);
    span.appendChild(extracted);
    range.insertNode(span);
    return span;
  } catch {
    return null;
  }
}

function applyStyleAcrossRange(
  editor: HTMLElement,
  range: Range,
  style: Record<string, string>
): HTMLSpanElement | null {
  const textNodes = textNodesInRange(editor, range);
  if (!textNodes.length) return null;

  let firstSpan: HTMLSpanElement | null = null;
  for (let i = textNodes.length - 1; i >= 0; i -= 1) {
    const textNode = textNodes[i];
    const sub = document.createRange();
    const start =
      textNode === range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startOffset
        : 0;
    const end =
      textNode === range.endContainer && range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endOffset
        : textNode.length;
    if (start >= end) continue;
    sub.setStart(textNode, start);
    sub.setEnd(textNode, end);
    const span = applyStyleToTextRange(sub, style);
    if (span && !firstSpan) firstSpan = span;
  }
  return firstSpan;
}

function applyInlineStyleToSelection(editor: HTMLElement, style: Record<string, string>): boolean {
  stashEditorSelection(editor);
  if (!ensureEditorSelection(editor)) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;

  const work = range.cloneRange();
  if (style.color) stripColorInRange(editor, work);
  if (style.backgroundColor) stripHighlightInRange(editor, work);

  const wrapped =
    applyStyleToTextRange(work, style) ?? applyStyleAcrossRange(editor, work, style);
  if (!wrapped) return false;

  collapseEditorSelection(editor, wrapped);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function wrapSelectionWithStyle(editor: HTMLElement, style: Record<string, string>): boolean {
  return applyInlineStyleToSelection(editor, style);
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
  applyInlineStyleToSelection(editor, { color });
}

export function applyHighlightColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  applyInlineStyleToSelection(editor, { backgroundColor: color });
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
      el.style.removeProperty('background-color');
      el.removeAttribute('data-pres-highlight');
    }
    if (mode === 'color' || mode === 'both') {
      el.style.removeProperty('color');
      el.removeAttribute('data-pres-color');
      if (el.tagName === 'FONT') el.removeAttribute('color');
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
