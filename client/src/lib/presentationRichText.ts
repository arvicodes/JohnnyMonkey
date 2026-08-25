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
  PRESENTATION_CONTENT_FONT_PX,
  PRESENTATION_FONT_SIZE_STEPS,
  rangeFullyContainsNode,
  restoreSavedEditorSelection,
  stashEditorSelection,
  hydratePresentationHtmlFontSizes,
} from './presentationFontSize';
import {
  normalizeListsInPlace,
  normalizePresentationLists,
  indentListItemInEditor,
  outdentListItemInEditor,
  getListItemFromSelection,
  convertPastedListParagraphs,
  parsePastedListLine,
  buildNestedListFromItems,
} from './presentationListNormalize';
import { PRESENTATION_DEFAULT_FONT_FAMILY } from './presentationFonts';
import { JOHNNY_PRESENTATION, toHighlightFill } from './presentationTheme';
import { ensureNotesTablesFormatted, applyJohnnyTableFormatting, handleTableTabInEditor } from './presentationSlideTables';
import { presentationNotesImageInsertHtml, stripNotesImageChrome } from './presentationNotesImages';
import {
  convertOmmlElementsInPlace,
  hoistPastedMathHtml,
  isPresentationMathNode,
  preserveEquationImagesInPlace,
} from './presentationPasteMath';

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
  PRESENTATION_CONTENT_FONT_PX,
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

  const html = presentationNotesImageInsertHtml(src, alt);

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
 * LaTeX-/Caret-Hochzahlen in einem Textstring → Unicode-taugliche Marker,
 * die danach in echte `<sup>`-Knoten umgewandelt werden.
 * Beispiele: `10^{11}`, `10^-3`, `(10^{-3},\text{s})`
 */
export function convertCaretSuperscriptsInText(text: string): string {
  if (!text || !text.includes('^')) return text;
  let s = text;
  // \text{…} → Inhalt (mit Leerzeichen wenn nach Komma)
  s = s.replace(/,\s*\\text\{([^}]*)\}/g, ', $1');
  s = s.replace(/\\text\{([^}]*)\}/g, '$1');
  // Basis^{Exponent} (auch negativ / Komma im Exponenten vermeiden: nur bis })
  s = s.replace(/(\d+(?:[.,]\d+)?)\^\{([^}]+)\}/g, '$1\u0001sup\u0002$2\u0003');
  // Basis^Exponent (einfache Zahl, optional Minus)
  s = s.replace(/(\d+(?:[.,]\d+)?)\^(-?\d+)/g, '$1\u0001sup\u0002$2\u0003');
  // Buchstabe^Zahl (x^2)
  s = s.replace(/([A-Za-zα-ωΑ-Ω])\^(-?\d+)/g, '$1\u0001sup\u0002$2\u0003');
  // Buchstabe^{…}
  s = s.replace(/([A-Za-zα-ωΑ-Ω])\^\{([^}]+)\}/g, '$1\u0001sup\u0002$2\u0003');
  return s;
}

function materializeSupMarkersInTextNode(node: Text): boolean {
  const raw = node.textContent || '';
  if (!raw.includes('\u0001sup\u0002') && !raw.includes('^') && !raw.includes('\\text{')) {
    return false;
  }
  const marked = convertCaretSuperscriptsInText(raw);
  if (marked === raw && !marked.includes('\u0001sup\u0002')) return false;

  const parent = node.parentNode;
  if (!parent) return false;
  // Nicht innerhalb bestehender <sup>/<sub> nochmal wrappen
  if (node.parentElement?.closest('sup, sub')) {
    if (marked !== raw && !marked.includes('\u0001sup\u0002')) {
      node.textContent = marked;
      return true;
    }
    return false;
  }

  const parts = marked.split(/(\u0001sup\u0002[^\u0003]*\u0003)/);
  if (parts.length === 1 && !marked.includes('\u0001sup\u0002')) {
    if (marked !== raw) {
      node.textContent = marked;
      return true;
    }
    return false;
  }

  const frag = document.createDocumentFragment();
  for (const part of parts) {
    if (!part) continue;
    const m = part.match(/^\u0001sup\u0002([^\u0003]*)\u0003$/);
    if (m) {
      const sup = document.createElement('sup');
      sup.textContent = m[1];
      frag.appendChild(sup);
    } else {
      frag.appendChild(document.createTextNode(part));
    }
  }
  parent.replaceChild(frag, node);
  return true;
}

/** Wandelt `^` / `^{…}` / `\text{…}` in Textknoten zu echten `<sup>` um. */
export function convertCaretSuperscriptsInPlace(root: ParentNode): boolean {
  if (typeof document === 'undefined') return false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = n.textContent || '';
    if (t.includes('^') || t.includes('\\text{') || t.includes('\u0001sup\u0002')) {
      nodes.push(n as Text);
    }
  }
  let changed = false;
  for (const node of nodes) {
    if (node.parentElement && isPresentationMathNode(node.parentElement)) continue;
    if (materializeSupMarkersInTextNode(node)) changed = true;
  }
  return changed;
}

export function convertCaretSuperscriptsInHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  if (!html.includes('^') && !html.includes('\\text{')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  convertCaretSuperscriptsInPlace(doc.body);
  return doc.body.innerHTML;
}

/**
 * Auswahl oder ganzer Editor: Hochzahlen formatieren.
 * Mit Auswahl + execCommand('superscript') wenn keine `^`-Muster, sonst Caret-Konvertierung.
 */
export function formatEditorSuperscripts(editor: HTMLElement): { ok: boolean; message: string } {
  if (!editor) return { ok: false, message: 'Kein Editor aktiv' };
  const sel = window.getSelection();
  const selectedText = sel && !sel.isCollapsed && editor.contains(sel.anchorNode) ? sel.toString() : '';

  if (selectedText && (selectedText.includes('^') || selectedText.includes('\\text{'))) {
    // Auswahl mit Caret-Mustern: über insertHTML ersetzen
    const html = convertCaretSuperscriptsInHtml(`<span>${escapeHtmlText(selectedText)}</span>`);
    stashEditorSelection(editor);
    ensureEditorSelection(editor);
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* ignore */
    }
    document.execCommand('insertHTML', false, html);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, message: 'Hochzahlen formatiert' };
  }

  if (selectedText && sel && !sel.isCollapsed) {
    stashEditorSelection(editor);
    ensureEditorSelection(editor);
    document.execCommand('superscript', false);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, message: 'Hochgestellt' };
  }

  const changed = convertCaretSuperscriptsInPlace(editor);
  if (changed) {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, message: 'Hochzahlen im Text formatiert' };
  }
  return { ok: false, message: 'Keine ^-Hochzahlen gefunden — Text markieren und erneut klicken' };
}

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
 * Appweit auch über GlobalMarkdownListShortcut; hier für Folien-Editoren.
 * Nur der aktuelle Block/die aktuelle Zeile — Cursor bleibt im neuen Listenpunkt.
 */
export function tryMarkdownListShortcut(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  if (isSelectionInList(editor)) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer)) return false;

  const parsed = parseListMarkerBeforeCaret(range, editor);
  if (!parsed) return false;

  clearSavedSelection();
  editor.focus({ preventScroll: true });

  // Marker entfernen, dann Browser-Liste (zuverlässiger als manuelles <ul>)
  const delStart = parsed.deleteRange.startContainer;
  const delOffset = parsed.deleteRange.startOffset;
  parsed.deleteRange.deleteContents();
  sel.removeAllRanges();
  try {
    const caret = document.createRange();
    if (delStart.isConnected) {
      const max =
        delStart.nodeType === Node.TEXT_NODE
          ? (delStart.textContent || '').length
          : delStart.childNodes.length;
      caret.setStart(delStart, Math.min(delOffset, max));
    } else if (parsed.block?.isConnected) {
      caret.selectNodeContents(parsed.block);
    } else {
      caret.selectNodeContents(editor);
    }
    caret.collapse(true);
    sel.addRange(caret);
  } catch {
    const caret = document.createRange();
    caret.selectNodeContents(editor);
    caret.collapse(true);
    sel.addRange(caret);
  }

  const ok = document.execCommand(
    parsed.ordered ? 'insertOrderedList' : 'insertUnorderedList',
  );
  if (!ok) {
    // Fallback: manuelles Ersetzen des Blocks
    const list = document.createElement(parsed.ordered ? 'ol' : 'ul');
    const li = document.createElement('li');
    li.appendChild(document.createElement('br'));
    list.appendChild(li);
    if (parsed.block && parsed.block !== editor) {
      parsed.block.replaceWith(list);
    } else {
      const empty = editor.childNodes.length === 0 || editor.textContent === '';
      if (empty) {
        editor.innerHTML = '';
        editor.appendChild(list);
      } else {
        return false;
      }
    }
    placeCaretIn(li, sel);
  }

  normalizeListsInPlace(editor);
  editor.focus({ preventScroll: true });
  return true;
}

/**
 * Leertaste-Handler: `*` / `-` / `1.` → Liste (appweite Regel).
 * @returns true wenn umgewandelt (Event wurde preventDefault).
 */
export function handlePresentationListShortcutKey(
  e: {
    key: string;
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    preventDefault: () => void;
    stopPropagation: () => void;
  },
  editor: HTMLElement | null,
): boolean {
  if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey) return false;
  if (!tryMarkdownListShortcut(editor)) return false;
  e.preventDefault();
  e.stopPropagation();
  return true;
}

/** Alias — gleiche Regel in der gesamten App. */
export const handleMarkdownListShortcutKey = handlePresentationListShortcutKey;

function normalizeMarkerText(s: string): string {
  return s.replace(/[\u00a0\u200B\uFEFF]/g, ' ').trim();
}

type ParsedListMarker = {
  ordered: boolean;
  block: HTMLElement | null;
  /** Range, die den Marker (ohne trailing Space) abdeckt — zum Löschen. */
  deleteRange: Range;
};

/**
 * Erkennt `*` / `-` / `1.` unmittelbar vor dem Cursor (Zeilenanfang).
 * Leertaste ist noch nicht eingefügt (keydown).
 */
function parseListMarkerBeforeCaret(range: Range, editor: HTMLElement): ParsedListMarker | null {
  const block = getBlockForListShortcut(range.startContainer, editor);
  const scope = block && block !== editor ? block : editor;

  const pre = document.createRange();
  try {
    pre.selectNodeContents(scope);
    pre.setEnd(range.startContainer, range.startOffset);
  } catch {
    return null;
  }

  const rawBefore = pre.toString().replace(/[\u00a0\u200B\uFEFF]/g, ' ');
  // Chrome hängt oft `\n` wegen <br> an — leere letzte Zeile ignorieren
  const lines = rawBefore.split(/\r?\n/);
  while (lines.length > 1 && normalizeMarkerText(lines[lines.length - 1] || '') === '') {
    lines.pop();
  }
  const lineRaw = lines.pop() ?? '';
  const line = lineRaw.replace(/[ \t]+$/g, '');
  const trimmed = normalizeMarkerText(line);

  let ordered: boolean | null = null;
  let markerLen = 0;
  if (/^([*•\-])$/.test(trimmed)) {
    ordered = false;
    markerLen = 1;
  } else {
    const m = trimmed.match(/^(\d+)[.)]$/);
    if (m) {
      ordered = true;
      markerLen = m[0].length;
    }
  }
  if (ordered === null || markerLen <= 0) return null;

  const deleteRange = document.createRange();
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    const offset = range.startOffset;
    let end = offset;
    while (end > 0 && /[ \t]/.test(text[end - 1]!)) end -= 1;
    const start = end - markerLen;
    if (start < 0) return null;
    const slice = text.slice(start, end);
    if (normalizeMarkerText(slice) !== trimmed) return null;
    deleteRange.setStart(node, start);
    deleteRange.setEnd(node, offset);
  } else {
    const full = normalizeMarkerText(scope.textContent || '');
    const onlyMarker = full === trimmed || new RegExp(
      `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
    ).test(full);
    if (onlyMarker) {
      deleteRange.selectNodeContents(scope);
    } else {
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      let lastText: Text | null = null;
      let n: Node | null;
      while ((n = walker.nextNode())) lastText = n as Text;
      if (!lastText) return null;
      const t = lastText.textContent || '';
      let end = t.length;
      while (end > 0 && /[ \t]/.test(t[end - 1]!)) end -= 1;
      const start = end - markerLen;
      if (start < 0) return null;
      deleteRange.setStart(lastText, start);
      deleteRange.setEnd(lastText, end);
    }
  }

  return {
    ordered,
    block: block && block !== editor ? block : null,
    deleteRange,
  };
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

/** Plain-Text-Zeile → Listen-Marker + Rest, oder null. */
function parsePlainListLine(line: string) {
  return parsePastedListLine(line);
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Plain-Text → Folien-HTML: Zeilen mit `*` / `-` / `1.` werden zu Listen.
 * Standard-Schrift Aptos wird gestempelt.
 */
export function plainTextToPresentationHtml(text: string): string {
  if (!text) return '<p><br></p>';
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const parts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const parsed = parsePlainListLine(lines[i]);
    if (!parsed) {
      const line = lines[i];
      parts.push(line.trim() ? `<p>${escapeHtmlText(line)}</p>` : '<p><br></p>');
      i += 1;
      continue;
    }
    const items = [parsed];
    let j = i + 1;
    while (j < lines.length) {
      const next = parsePlainListLine(lines[j]);
      if (!next) break;
      items.push(next);
      j += 1;
    }
    const list = buildNestedListFromItems(
      items.map((it) => ({
        ordered: it.ordered,
        level: it.level,
        html: it.rest.trim() ? escapeHtmlText(it.rest) : '<br>',
        olStyle: it.olStyle,
      })),
    );
    parts.push(list.outerHTML);
    i = j;
  }
  return stampDefaultPresentationFontHtml(parts.join('') || '<p><br></p>');
}

function unwrapElementKeepChildren(el: Element) {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function removeHtmlComments(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) comments.push(current as Comment);
  comments.forEach((c) => c.remove());
}

/** Word/Pages/Google-Docs: o:p, Klassen, Zeilenhöhen, Ränder, Fremd-Ausrichtung. */
function stripForeignPasteChrome(root: ParentNode) {
  removeHtmlComments(root);
  root.querySelectorAll('style, script, meta, link, xml, title').forEach((el) => el.remove());
  Array.from(root.querySelectorAll('*')).forEach((node) => {
    if (isPresentationMathNode(node)) return;
    const tag = node.tagName || '';
    if (tag.includes(':')) unwrapElementKeepChildren(node);
  });
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (isPresentationMathNode(el)) return;
    el.removeAttribute('class');
    el.removeAttribute('lang');
    el.removeAttribute('align');
    el.removeAttribute('dir');
    if (el.tagName !== 'IMG') {
      el.removeAttribute('width');
      el.removeAttribute('height');
      el.removeAttribute('valign');
      el.removeAttribute('border');
      el.removeAttribute('cellspacing');
      el.removeAttribute('cellpadding');
    }
    const style = el.style;
    if (!style) return;
    const keep = new Set<string>();
    if (el.tagName === 'IMG') {
      keep.add('width');
      keep.add('height');
    }
    const toRemove: string[] = [];
    for (let i = 0; i < style.length; i++) {
      const prop = style.item(i);
      if (!keep.has(prop) && !prop.startsWith('--')) toRemove.push(prop);
    }
    toRemove.forEach((prop) => style.removeProperty(prop));
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
}

function unwrapPointlessSpans(root: ParentNode) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.querySelectorAll('span')).forEach((span) => {
      if (
        span.hasAttribute('data-pres-font') ||
        span.hasAttribute('data-pres-fs') ||
        span.hasAttribute('data-pres-color') ||
        span.hasAttribute('data-pres-highlight') ||
        span.hasAttribute('data-pres-back') ||
        span.hasAttribute('data-pres-math')
      ) {
        return;
      }
      if (span.getAttribute('style')?.trim()) return;
      unwrapElementKeepChildren(span);
      changed = true;
    });
  }
}

function demoteHeadingsToParagraphs(root: ParentNode) {
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    const p = heading.ownerDocument.createElement('p');
    const bold = heading.ownerDocument.createElement('b');
    while (heading.firstChild) bold.appendChild(heading.firstChild);
    p.appendChild(bold);
    heading.replaceWith(p);
  });
}

/**
 * Setzt Aptos (und optional Folien-Schriftgröße) auf Textblöcke.
 * `force`: vorhandene Paste-Schriften/-Größen überschreiben.
 */
function stampDefaultPresentationFont(root: ParentNode, fontPx?: number, force = false) {
  const face = PRESENTATION_DEFAULT_FONT_FAMILY;
  const color = JOHNNY_PRESENTATION.textPrimary;
  const stampColor = fontPx != null;
  if (force) {
    root.querySelectorAll('[data-pres-font], [data-pres-fs], [data-pres-color]').forEach((node) => {
      const el = node as HTMLElement;
      if (isPresentationMathNode(el)) return;
      el.removeAttribute('data-pres-font');
      el.removeAttribute('data-pres-fs');
      if (stampColor) el.removeAttribute('data-pres-color');
      el.style?.removeProperty('font-family');
      el.style?.removeProperty('font-size');
      if (stampColor) el.style?.removeProperty('color');
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    });
    unwrapPointlessSpans(root);
  }
  root.querySelectorAll('p, li, h1, h2, h3, h4, td, th').forEach((node) => {
    const el = node as HTMLElement;
    if ((el.tagName === 'TD' || el.tagName === 'TH') && el.querySelector('p, li, table')) {
      return;
    }
    if (!force) {
      if (el.hasAttribute('data-pres-font') && (fontPx == null || el.hasAttribute('data-pres-fs'))) return;
      if (el.querySelector('[data-pres-font]') && (fontPx == null || el.querySelector('[data-pres-fs]'))) {
        return;
      }
    }
    const span = document.createElement('span');
    span.setAttribute('data-pres-font', face);
    span.style.setProperty('font-family', face, 'important');
    if (fontPx != null && Number.isFinite(fontPx)) {
      const px = Math.round(fontPx);
      span.setAttribute('data-pres-fs', String(px));
      span.style.setProperty('font-size', `${px}px`, 'important');
    }
    if (stampColor) {
      span.setAttribute('data-pres-color', color);
      span.style.setProperty('color', color, 'important');
    }
    while (el.firstChild) span.appendChild(el.firstChild);
    if (!span.firstChild) span.appendChild(document.createElement('br'));
    el.appendChild(span);
  });
}

export function stampDefaultPresentationFontHtml(
  html: string,
  fontPx: number = PRESENTATION_CONTENT_FONT_PX,
): string {
  if (!html || typeof document === 'undefined') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  stampDefaultPresentationFont(doc.body, fontPx, true);
  return doc.body.innerHTML || html;
}

function stampSlideTextAlign(root: ParentNode, align: 'justify' | 'left' | 'center' | 'right') {
  root.querySelectorAll('p, li').forEach((node) => {
    const el = node as HTMLElement;
    if (el.closest('th')) return;
    el.style.setProperty('text-align', align);
  });
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
      if (isPresentationMathNode(span)) return;
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
    if (isPresentationMathNode(el) || el.hasAttribute('data-pres-fs')) return;
    el.style?.removeProperty('font-size');
    if (el.tagName === 'FONT') el.removeAttribute('size');
    const styleAttr = el.getAttribute('style')?.trim() ?? '';
    if (!styleAttr) el.removeAttribute('style');
  });
}

function stripExternalColors(root: ParentNode) {
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (isPresentationMathNode(el) || el.hasAttribute('data-pres-color')) return;
    el.style?.removeProperty('color');
    if (el.tagName === 'FONT') el.removeAttribute('color');
    const styleAttr = el.getAttribute('style')?.trim() ?? '';
    if (!styleAttr) el.removeAttribute('style');
  });
}

function stripExternalFontFamilies(root: ParentNode) {
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (isPresentationMathNode(el) || el.hasAttribute('data-pres-font')) return;
    el.style?.removeProperty('font-family');
    if (el.tagName === 'FONT') el.removeAttribute('face');
    const styleAttr = el.getAttribute('style')?.trim() ?? '';
    if (!styleAttr) el.removeAttribute('style');
  });
}

export type PasteSanitizeOptions = {
  /** Folien: Aptos + Standardgröße, Word-Formatierung verwerfen. */
  slideDefaults?: boolean;
  fontPx?: number;
  /** Folien-Text: Standard Blocksatz. */
  textAlign?: 'justify' | 'left' | 'center' | 'right';
};

/** Bereinigt eingefügtes HTML (Pages/Word) für editierbare Zonen. */
export function sanitizePastedHtml(html: string, options?: PasteSanitizeOptions): string {
  if (!html || typeof document === 'undefined') return html;
  const slideDefaults = options?.slideDefaults === true;
  const fontPx = slideDefaults
    ? options?.fontPx ?? PRESENTATION_CONTENT_FONT_PX
    : options?.fontPx;
  const withMath = hoistPastedMathHtml(html);
  const doc = new DOMParser().parseFromString(withMath, 'text/html');
  convertOmmlElementsInPlace(doc.body);
  preserveEquationImagesInPlace(doc.body);
  doc.body.querySelectorAll('font').forEach((font) => {
    if (isPresentationMathNode(font)) return;
    const span = doc.createElement('span');
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });
  unwrapIllegalSpanBlocks(doc.body);
  convertPastedListParagraphs(doc.body);
  stripForeignPasteChrome(doc.body);
  stripExternalFontSizing(doc.body);
  stripExternalFontFamilies(doc.body);
  stripExternalColors(doc.body);
  unwrapPointlessSpans(doc.body);
  demoteHeadingsToParagraphs(doc.body);
  convertPastedListParagraphs(doc.body);
  normalizeListsInPlace(doc.body);
  convertCaretSuperscriptsInPlace(doc.body);
  stampDefaultPresentationFont(doc.body, fontPx, slideDefaults);
  if (slideDefaults) {
    stampSlideTextAlign(doc.body, options?.textAlign ?? 'justify');
  }
  doc.body.querySelectorAll('table').forEach((node) => {
    applyJohnnyTableFormatting(node as HTMLTableElement);
  });
  doc.body.querySelectorAll('span.Apple-converted-space, br.Apple-interchange-newline').forEach((el) => {
    el.replaceWith(doc.createTextNode(' '));
  });
  return normalizeRichHtml(doc.body.innerHTML);
}

/**
 * Einfügen in Folien-Editoren: HTML oder Plain-Text → bereinigt, Listen, Aptos 26, Blocksatz.
 */
export function presentationPasteHtml(
  clipboardData: DataTransfer,
  options?: { fontPx?: number; textAlign?: 'justify' | 'left' | 'center' | 'right' },
): string {
  const pastedHtml = clipboardData.getData('text/html');
  const pastedText = clipboardData.getData('text/plain');
  const fontPx = options?.fontPx ?? PRESENTATION_CONTENT_FONT_PX;
  const textAlign = options?.textAlign ?? 'justify';
  if (pastedHtml?.trim()) {
    return sanitizePastedHtml(pastedHtml, { slideDefaults: true, fontPx, textAlign }) || '<p><br></p>';
  }
  const html = stampDefaultPresentationFontHtml(
    plainTextToPresentationHtml(pastedText || ''),
    fontPx,
  );
  const doc = new DOMParser().parseFromString(html, 'text/html');
  convertCaretSuperscriptsInPlace(doc.body);
  stampSlideTextAlign(doc.body, textAlign);
  return doc.body.innerHTML || '<p><br></p>';
}

/** Erlaubte Link-Ziele in Folien (http(s), mailto, relative App-Pfade, Anker). */
export function isSafePresentationHref(href: string): boolean {
  const raw = (href || '').trim();
  if (!raw) return false;
  if (raw.startsWith('#') || raw.startsWith('/')) return true;
  if (/^mailto:[^\s]+$/i.test(raw)) return true;
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'https://example.local');
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** `<a>` absichern: nur sichere href, in neuem Tab öffnen. */
export function normalizePresentationAnchorsInPlace(root: ParentNode): void {
  root.querySelectorAll('a').forEach((node) => {
    const a = node as HTMLAnchorElement;
    const href = (a.getAttribute('href') || '').trim();
    if (!isSafePresentationHref(href)) {
      const span = a.ownerDocument.createElement('span');
      while (a.firstChild) span.appendChild(a.firstChild);
      a.replaceWith(span);
      return;
    }
    a.setAttribute('href', href);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    // data-pres-lesson-file bleibt erhalten (Datei-Verknüpfung aus dem Stundenordner)
  });
}

/** Klick auf Folien-Navigation überspringen, wenn ein Link getroffen wurde. */
export function isPresentationLinkClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('a[href]'));
}

const PRES_LESSON_FILE_ATTR = 'data-pres-lesson-file';

/** URL-Eingabe normalisieren (www. → https://, Leerzeichen trimmen). */
export function normalizePresentationLinkInput(raw: string): string {
  let href = (raw || '').trim();
  if (!href) return '';
  if (/^www\./i.test(href)) href = `https://${href}`;
  return href;
}

export function getPresentationLinkAtSelection(
  editor: HTMLElement | null,
): { anchor: HTMLAnchorElement; href: string; lessonFilePath: string } | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
  if (!(node instanceof Element) || !editor.contains(node)) return null;
  const anchor = node.closest('a[href]') as HTMLAnchorElement | null;
  if (!anchor || !editor.contains(anchor)) return null;
  return {
    anchor,
    href: (anchor.getAttribute('href') || '').trim(),
    lessonFilePath: (anchor.getAttribute(PRES_LESSON_FILE_ATTR) || '').trim(),
  };
}

/**
 * Auswahl (oder Cursor) als Link setzen.
 * Bei leerer Auswahl wird `label` bzw. der Dateiname/URL als Linktext eingefügt.
 */
export function applyPresentationLink(
  editor: HTMLElement | null,
  hrefRaw: string,
  options?: { label?: string; lessonFilePath?: string },
): boolean {
  if (!editor) return false;
  const href = normalizePresentationLinkInput(hrefRaw);
  if (!isSafePresentationHref(href)) return false;

  stashEditorSelection(editor);
  // Live-Auswahl (auch Cursor) bevorzugen — sonst greift eine alte Markierung
  const liveSel = window.getSelection();
  const liveRange =
    liveSel?.rangeCount &&
    editor.contains(liveSel.getRangeAt(0).commonAncestorContainer)
      ? liveSel.getRangeAt(0)
      : null;
  if (!liveRange) {
    if (!ensureEditorSelection(editor)) focusEditor(editor);
  } else {
    editor.focus({ preventScroll: true });
  }

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const existing = getPresentationLinkAtSelection(editor);
  if (existing?.anchor) {
    existing.anchor.setAttribute('href', href);
    existing.anchor.setAttribute('target', '_blank');
    existing.anchor.setAttribute('rel', 'noopener noreferrer');
    if (options?.lessonFilePath) {
      existing.anchor.setAttribute(PRES_LESSON_FILE_ATTR, options.lessonFilePath);
    } else {
      existing.anchor.removeAttribute(PRES_LESSON_FILE_ATTR);
    }
    keepEditorSelection(editor);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  const label =
    (options?.label || '').trim() ||
    (sel.toString() || '').trim() ||
    (options?.lessonFilePath || '').split('/').pop() ||
    href;

  const a = editor.ownerDocument.createElement('a');
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  if (options?.lessonFilePath) {
    a.setAttribute(PRES_LESSON_FILE_ATTR, options.lessonFilePath);
  }

  if (sel.isCollapsed || !(sel.toString() || '').trim()) {
    a.textContent = label;
    range.insertNode(a);
    range.setStartAfter(a);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    try {
      range.surroundContents(a);
    } catch {
      const frag = range.extractContents();
      if (!frag.textContent?.replace(/\u200b/g, '').trim()) {
        a.textContent = label;
      } else {
        a.appendChild(frag);
      }
      range.insertNode(a);
    }
    sel.removeAllRanges();
    const after = editor.ownerDocument.createRange();
    after.selectNodeContents(a);
    after.collapse(false);
    sel.addRange(after);
  }

  keepEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/** Link um die Auswahl / den Cursor entfernen (Text behalten). */
export function removePresentationLink(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  stashEditorSelection(editor);
  ensureEditorSelection(editor) || focusEditor(editor);
  const found = getPresentationLinkAtSelection(editor);
  if (!found?.anchor) return false;
  const a = found.anchor;
  const parent = a.parentNode;
  if (!parent) return false;
  while (a.firstChild) parent.insertBefore(a.firstChild, a);
  parent.removeChild(a);
  keepEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/**
 * Freistehende Inline-Inhalte (Text, &lt;b&gt;, …) auf Root-Ebene in &lt;p&gt; packen.
 * Sonst sind sie weder als Absatz editier- noch als Animationsziel anklickbar
 * (z. B. „→ Analysiere …“ direkt hinter &lt;/ul&gt;).
 */
const ROOT_BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'UL',
  'OL',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TABLE',
  'HR',
  'PRE',
  'SECTION',
  'ARTICLE',
]);

function orphanNodeHasVisibleText(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return Boolean((node.textContent || '').replace(/\u200b/g, '').trim());
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as Element;
  if (el.tagName === 'BR') return false;
  return Boolean((el.textContent || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim());
}

/** @returns true wenn etwas gewrappt wurde */
export function wrapOrphanRootInlineContent(root: HTMLElement): boolean {
  const doc = root.ownerDocument;
  let changed = false;
  let run: Node[] = [];

  const flush = () => {
    if (run.length === 0) return;
    if (!run.some(orphanNodeHasVisibleText)) {
      run = [];
      return;
    }
    const p = doc.createElement('p');
    root.insertBefore(p, run[0]);
    for (const n of run) p.appendChild(n);
    run = [];
    changed = true;
  };

  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && ROOT_BLOCK_TAGS.has((node as Element).tagName)) {
      flush();
      continue;
    }
    run.push(node);
  }
  flush();
  return changed;
}

/** Struktur bereinigen ohne absichtliche data-pres-fs zu entfernen. */
export function sanitizePresentationHtml(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  const base = normalizeRichHtml(html);
  const doc = new DOMParser().parseFromString(base, 'text/html');
  unwrapIllegalSpanBlocks(doc.body);
  normalizeListsInPlace(doc.body);
  normalizePresentationAnchorsInPlace(doc.body);
  wrapOrphanRootInlineContent(doc.body);
  convertCaretSuperscriptsInPlace(doc.body);
  // Nur ungestylte Paste-Tabellen einmalig mit Johnny-Theme versehen
  doc.body.querySelectorAll('table:not([data-pres-table])').forEach((node) => {
    applyJohnnyTableFormatting(node as HTMLTableElement);
  });
  return hydratePresentationHtmlFontSizes(doc.body.innerHTML);
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
  const base = normalizePresentationLists(stripNotesBlockIndent(html));
  if (!base || typeof document === 'undefined') return base;
  const doc = new DOMParser().parseFromString(base, 'text/html');
  ensureNotesTablesFormatted(doc.body);
  normalizePresentationAnchorsInPlace(doc.body);
  stripNotesImageChrome(doc.body);
  return doc.body.innerHTML;
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
  if (!block || block === editor || !editor.contains(block)) return null;
  if ((block as HTMLElement).closest('table')) return null;
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

/** Tab in Präsentations-Editoren: Tabelle → neue Zeile, Listen einrücken, sonst Absatz-Einzug. */
export function handlePresentationTabKey(editor: HTMLElement, shiftKey: boolean): void {
  const sel = window.getSelection();
  const caretInEditor = !!(sel?.anchorNode && editor.contains(sel.anchorNode));
  if (!caretInEditor) {
    stashEditorSelection(editor);
    ensureEditorSelection(editor) || focusEditor(editor);
  }

  if (handleTableTabInEditor(editor, shiftKey)) {
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

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
      span.style.setProperty('background-color', toHighlightFill(value), 'important');
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
): HTMLSpanElement[] {
  const textNodes = textNodesInRange(editor, range);
  if (!textNodes.length) return [];

  const spans: HTMLSpanElement[] = [];
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
    try {
      sub.setStart(textNode, start);
      sub.setEnd(textNode, end);
    } catch {
      continue;
    }
    const span = applyStyleToTextRange(sub, style);
    if (span) spans.unshift(span);
  }
  return spans;
}

function rangeFromStyleSpans(spans: HTMLSpanElement[]): Range | null {
  if (!spans.length) return null;
  const keep = document.createRange();
  try {
    keep.selectNodeContents(spans[0]);
    if (spans.length > 1) {
      const last = spans[spans.length - 1];
      const end = document.createRange();
      end.selectNodeContents(last);
      keep.setEnd(end.endContainer, end.endOffset);
    }
    return keep;
  } catch {
    return null;
  }
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

  const spans = applyStyleAcrossRange(editor, work, style);
  const wrapped = spans[0] ?? applyStyleToTextRange(work, style);
  if (!wrapped) return false;
  if (wrapped && !spans.includes(wrapped)) spans.push(wrapped);

  const keep = rangeFromStyleSpans(spans);
  keepEditorSelection(editor, keep);
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

function stampColorOnCurrentSelection(editor: HTMLElement, color: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const nodes = elementsInRange(editor, range);
  for (const el of nodes) {
    if (!range.intersectsNode(el)) continue;
    if (el.style?.color || el.hasAttribute('color') || el.tagName === 'FONT') {
      el.setAttribute('data-pres-color', color);
      el.style.setProperty('color', color, 'important');
      if (el.tagName === 'FONT') el.removeAttribute('color');
    }
  }
}

export function applyTextColor(editor: HTMLElement | null, color: string) {
  if (!editor) return;
  if (applyInlineStyleToSelection(editor, { color })) return;
  stashEditorSelection(editor);
  if (!ensureEditorSelection(editor)) {
    applyInlineStyle(editor, { color });
    return;
  }
  try {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
  } catch {
    applyInlineStyle(editor, { color });
    return;
  }
  stampColorOnCurrentSelection(editor, color);
  keepEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
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
  keepEditorSelection(editor);
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
  keepEditorSelection(editor);
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}
