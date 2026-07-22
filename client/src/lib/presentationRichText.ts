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
  keepEditorSelection,
  nudgeEditorFontSize,
  NOTES_FONT_SIZE_STEPS,
  PRESENTATION_FONT_SIZE_STEPS,
  rangeFullyContainsNode,
  restoreSavedEditorSelection,
  stashEditorSelection,
} from './presentationFontSize';
import {
  normalizeListsInPlace,
  normalizePresentationLists,
  indentListItemInEditor,
  outdentListItemInEditor,
  getListItemFromSelection,
} from './presentationListNormalize';

// Explizite Re-Exports (HMR-sicherer als `import` + `export { … }`)
export {
  applyEditorFontSizePx,
  applyEditorFontSizeStepIndex,
  captureEditorSelection,
  clearSavedSelection,
  collapseEditorSelection,
  ensureEditorSelection,
  getEditorSelectionFontPx,
  getEditorFontSizeSteps,
  keepEditorSelection,
  nudgeEditorFontSize,
  NOTES_FONT_SIZE_STEPS,
  PRESENTATION_FONT_SIZE_STEPS,
  stashEditorSelection,
} from './presentationFontSize';

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

/** Emoji oder Text an der aktuellen Cursor-Position einfügen. */
export function insertTextAtCursor(editor: HTMLElement | null, text: string): boolean {
  if (!editor || !text) return false;
  stashEditorSelection(editor);
  ensureEditorSelection(editor) || focusEditor(editor);

  try {
    document.execCommand('insertText', false, text);
  } catch {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    const node = document.createTextNode(text);
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Bild an Cursor-Position in contentEditable einfügen (Notizen). */
export function insertImageHtmlAtCursor(
  editor: HTMLElement | null,
  src: string,
  alt = ''
): boolean {
  if (!editor || !src.trim()) return false;
  stashEditorSelection(editor);
  ensureEditorSelection(editor) || focusEditor(editor);

  const safeSrc = src.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const safeAlt = alt
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
  const html =
    `<img src="${safeSrc}" alt="${safeAlt}" data-pres-notes-img="1" ` +
    `style="max-width:100%;height:auto;display:block;margin:0.5em 0;border-radius:4px;" />`;

  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  const ok = document.execCommand('insertHTML', false, html);
  if (!ok) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const node = tpl.content.firstChild;
    if (!node) return false;
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Typografische Pfeile: `-->` → `→`, `==>` → `⇒`, usw. */
const ARROW_SHORTCUTS: Array<{ from: string; to: string }> = [
  { from: '<==>', to: '⇔' },
  { from: '<->', to: '↔' },
  { from: '==>', to: '⇒' },
  { from: '<==', to: '⇐' },
  { from: '-->', to: '→' },
  { from: '<--', to: '←' },
  { from: '->', to: '→' },
  { from: '<-', to: '←' },
];

/**
 * Ersetzt Pfeil-Kürzel links vom Cursor durch echte Pfeilzeichen.
 * @returns true wenn etwas ersetzt wurde
 */
export function replaceArrowShortcutsNearCursor(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;
  const text = node.textContent || '';
  const offset = range.startOffset;
  const before = text.slice(0, offset);

  for (const { from, to } of ARROW_SHORTCUTS) {
    if (!before.endsWith(from)) continue;
    const start = offset - from.length;
    const next = text.slice(0, start) + to + text.slice(offset);
    node.textContent = next;
    const caret = start + to.length;
    const nextRange = document.createRange();
    nextRange.setStart(node, Math.min(caret, next.length));
    nextRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nextRange);
    return true;
  }
  return false;
}

/**
 * `*` / `-` / `1.` + Leertaste → Aufzählung / nummerierte Liste.
 * Nur der aktuelle Block/die aktuelle Zeile — Cursor bleibt im neuen Listenpunkt.
 */
export function tryMarkdownListShortcut(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  if (isSelectionInList(editor)) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;

  const marker = readListMarkerAtCaret(range, editor);
  if (!marker) return false;

  clearSavedSelection();

  const list = document.createElement(marker.ordered ? 'ol' : 'ul');
  const li = document.createElement('li');
  li.appendChild(document.createElement('br'));
  list.appendChild(li);

  if (marker.block) {
    marker.block.replaceWith(list);
  } else if (marker.textNode) {
    // Text direkt im Editor / in Spans: Knoten durch Liste ersetzen
    const parent = marker.textNode.parentNode;
    if (!parent) return false;
    parent.replaceChild(list, marker.textNode);
  } else {
    return false;
  }

  normalizeListsInPlace(editor);

  const targetLi =
    (list.isConnected ? list.querySelector('li') : null) ||
    editor.querySelector(`${marker.ordered ? 'ol' : 'ul'} > li`);
  if (targetLi) {
    placeCaretIn(targetLi, sel);
  }
  editor.focus({ preventScroll: true });
  return true;
}

function normalizeMarkerText(s: string): string {
  return s.replace(/[\u00a0\u200B\uFEFF]/g, ' ').trim();
}

type ListMarkerHit = {
  ordered: boolean;
  block: HTMLElement | null;
  textNode: Text | null;
};

/** Erkennt `*` / `-` / `1.` am Cursor — Block oder reiner Textknoten. */
function readListMarkerAtCaret(range: Range, editor: HTMLElement): ListMarkerHit | null {
  const block = getBlockForListShortcut(range.startContainer, editor);
  if (block && block !== editor) {
    const full = normalizeMarkerText(block.textContent || '');
    if (/^([*•\-])$/.test(full)) return { ordered: false, block, textNode: null };
    if (/^(\d+)[.)]$/.test(full)) return { ordered: true, block, textNode: null };
    return null;
  }

  // Fallback: Textknoten (z. B. ohne umschließendes <p>)
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent || '';
  const before = normalizeMarkerText(text.slice(0, range.startOffset));
  const after = normalizeMarkerText(text.slice(range.startOffset));
  if (after) return null;
  if (/^([*•\-])$/.test(before)) return { ordered: false, block: null, textNode: node as Text };
  if (/^(\d+)[.)]$/.test(before)) return { ordered: true, block: null, textNode: node as Text };
  return null;
}

function getBlockForListShortcut(node: Node, root: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null =
    node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  while (el && el !== root) {
    const tag = el.tagName;
    // Chrome: neue Zeile oft als <div>; Root-contentEditable nie als Block nehmen
    if (
      tag === 'P' ||
      tag === 'DIV' ||
      tag === 'LI' ||
      tag === 'H1' ||
      tag === 'H2' ||
      tag === 'H3' ||
      tag === 'H4'
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function placeCaretIn(el: HTMLElement, sel: Selection) {
  const caret = document.createRange();
  caret.selectNodeContents(el);
  caret.collapse(true);
  sel.removeAllRanges();
  sel.addRange(caret);
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
    if (face) {
      span.setAttribute('data-pres-font', face);
      span.style.setProperty('font-family', face, 'important');
    }
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

function stripExternalFontFamilies(root: ParentNode) {
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (el.hasAttribute('data-pres-font')) return;
    el.style?.removeProperty('font-family');
    if (el.tagName === 'FONT') el.removeAttribute('face');
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
  stripExternalFontFamilies(doc.body);
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

function getEditableBlock(editor: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
  if (!(node instanceof Element)) return null;
  const block = node.closest('p, li, div, blockquote');
  if (!block || !editor.contains(block)) return null;
  return block as HTMLElement;
}

function isSelectionInList(editor: HTMLElement): boolean {
  return !!getListItemFromSelection(editor);
}

function nudgeParagraphIndent(block: HTMLElement, shiftKey: boolean) {
  const px = parseInt(block.style.marginLeft || '0', 10) || 0;
  const next = shiftKey ? Math.max(0, px - 28) : px + 28;
  if (next <= 0) block.style.removeProperty('margin-left');
  else block.style.marginLeft = `${next}px`;
}

/** Tab in Präsentations-Editoren: Listen einrücken, sonst Absatz-Einzug (kein Browser-indent). */
export function handlePresentationTabKey(editor: HTMLElement, shiftKey: boolean): void {
  stashEditorSelection(editor);
  ensureEditorSelection(editor) || focusEditor(editor);

  if (isSelectionInList(editor)) {
    const changed = shiftKey
      ? outdentListItemInEditor(editor)
      : indentListItemInEditor(editor);
    if (changed) {
      collapseEditorSelection(editor);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
  }

  const block = getEditableBlock(editor);
  if (!block) return;
  nudgeParagraphIndent(block, shiftKey);
  collapseEditorSelection(editor);
}

export function execFormat(editor: HTMLElement | null, cmd: string, value?: string) {
  if (!editor) return;
  stashEditorSelection(editor);
  ensureEditorSelection(editor) || focusEditor(editor);

  if (cmd === 'indent') {
    if (getListItemFromSelection(editor)) {
      indentListItemInEditor(editor);
    } else {
      const block = getEditableBlock(editor);
      if (block) nudgeParagraphIndent(block, false);
    }
    keepEditorSelection(editor);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  if (cmd === 'outdent') {
    if (getListItemFromSelection(editor)) {
      outdentListItemInEditor(editor);
    } else {
      const block = getEditableBlock(editor);
      if (block) nudgeParagraphIndent(block, true);
    }
    keepEditorSelection(editor);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  try {
    document.execCommand('styleWithCSS', false, 'true');
  } catch {
    /* ignore */
  }
  document.execCommand(cmd, false, value);
  if (LIST_FORMAT_COMMANDS.has(cmd)) {
    normalizeListsInPlace(editor);
  }
  // Markierung behalten (nicht kollabieren)
  keepEditorSelection(editor);
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
    if (key === 'fontFamily') {
      span.setAttribute('data-pres-font', value);
      span.style.setProperty('font-family', value, 'important');
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
  const toStrip: HTMLElement[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    if (!el.style?.color && !el.hasAttribute('data-pres-color') && !(el.tagName === 'FONT' && el.hasAttribute('color'))) {
      continue;
    }
    if (!rangeFullyContainsNode(range, el)) continue;
    toStrip.push(el);
  }
  toStrip.forEach((el) => {
    el.style?.removeProperty('color');
    el.removeAttribute('data-pres-color');
    if (el.tagName === 'FONT') el.removeAttribute('color');
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
}

function stripHighlightInRange(editor: HTMLElement, range: Range) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  const toStrip: HTMLElement[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    const hasHl =
      el.tagName === 'MARK' ||
      Boolean(el.style?.backgroundColor) ||
      el.hasAttribute('data-pres-highlight');
    if (!hasHl) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    toStrip.push(el);
  }
  toStrip.forEach((el) => {
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

function stripFontInRange(editor: HTMLElement, range: Range) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  const toStrip: HTMLElement[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    const hasFont =
      Boolean(el.style?.fontFamily) ||
      el.hasAttribute('data-pres-font') ||
      (el.tagName === 'FONT' && el.hasAttribute('face'));
    if (!hasFont) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    toStrip.push(el);
  }
  toStrip.forEach((el) => {
    el.style?.removeProperty('font-family');
    el.removeAttribute('data-pres-font');
    if (el.tagName === 'FONT') el.removeAttribute('face');
    if (!el.getAttribute('style')?.trim() && el.tagName === 'SPAN') {
      unwrapElement(el);
    }
  });
}

function stripFontFromFragment(root: DocumentFragment | HTMLElement) {
  const nodes: HTMLElement[] = [];
  if ('querySelectorAll' in root) {
    root.querySelectorAll('*').forEach((el) => nodes.push(el as HTMLElement));
    if (root instanceof HTMLElement) nodes.push(root);
  }
  nodes.forEach((el) => {
    el.style?.removeProperty('font-family');
    el.removeAttribute('data-pres-font');
    if (el.tagName === 'FONT') el.removeAttribute('face');
    if (!el.getAttribute('style')?.trim() && (el.tagName === 'SPAN' || el.tagName === 'FONT')) {
      unwrapElement(el);
    }
  });
  unwrapNestedAttrSpans(root, 'data-pres-font');
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
    if (style.fontFamily) stripFontFromFragment(extracted);
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
  if (style.fontFamily) stripFontInRange(editor, work);

  const wrapped =
    applyStyleAcrossRange(editor, work, style) ?? applyStyleToTextRange(work, style);
  if (!wrapped) return false;

  // Markierung auf dem formatierten Text behalten
  try {
    const keep = document.createRange();
    keep.selectNodeContents(wrapped);
    keepEditorSelection(editor, keep);
  } catch {
    keepEditorSelection(editor);
  }
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
  applyInlineStyle(editor, { color });
}

export function applyHighlightColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  applyInlineStyle(editor, { backgroundColor: color });
}

export function applyFontFamily(editor: HTMLElement | null, fontFamily: string) {
  if (!editor || !fontFamily) return;
  applyInlineStyle(editor, { fontFamily });
}

export function clearFontFamilyInSelection(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  stashEditorSelection(editor);
  if (!ensureEditorSelection(editor)) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  stripFontInRange(editor, range);
  collapseEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
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
