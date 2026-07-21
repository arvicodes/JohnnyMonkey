/**
 * Schriftgrößen für Präsentations-Editoren (contentEditable).
 * Größen sind immer Folien-Pixel (1920×1080-Raum), unabhängig vom Anzeige-Scale.
 */

import { isFormatBarInteracting } from './presentationFormatBarGuard';

export const PRESENTATION_CONTENT_FONT_PX = 26;

export const PRESENTATION_FONT_SIZE_STEPS = [
  14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48, 56, 64, 72, 84, 96,
] as const;

export const NOTES_FONT_SIZE_STEPS = [10, 11, 12, 13, 14, 16, 18, 20, 22, 24] as const;

function isNotesEditor(editor: HTMLElement): boolean {
  return editor.dataset.presNotesZone === 'true';
}

export function getEditorFontSizeSteps(
  editor: HTMLElement | null
): readonly number[] {
  if (editor && isNotesEditor(editor)) return NOTES_FONT_SIZE_STEPS;
  return PRESENTATION_FONT_SIZE_STEPS;
}

type SavedSelection = {
  editor: HTMLElement;
  range: Range;
};

let saved: SavedSelection | null = null;

export function clearSavedSelection() {
  saved = null;
}

/** Vor Toolbar-Klick Auswahl sichern (bleibt auch bei Popover-Klick erhalten). */
export function stashEditorSelection(editor: HTMLElement | null) {
  if (!editor) return;
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const range = sel.getRangeAt(0);
    if (!range.collapsed && editor.contains(range.commonAncestorContainer)) {
      saved = { editor, range: range.cloneRange() };
      return;
    }
  }
  if (saved?.editor === editor && !saved.range.collapsed) return;
}

/** Letzte nicht-leere Auswahl im Editor merken. */
export function captureEditorSelection(editor: HTMLElement | null) {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    if (!isFormatBarInteracting() && saved?.editor === editor) saved = null;
    return;
  }
  saved = { editor, range: range.cloneRange() };
}

function collapseAtEnd(editor: HTMLElement, node?: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (node) {
    range.selectNodeContents(node);
    range.collapse(false);
  } else if (sel.rangeCount > 0) {
    range.setStart(sel.anchorNode!, sel.anchorOffset);
    range.collapse(true);
  } else {
    return;
  }
  sel.removeAllRanges();
  sel.addRange(range);
  if (saved?.editor === editor) saved = null;
}

/** Stellt Auswahl für Toolbar-Aktionen her (live oder gespeichert). */
export function ensureEditorSelection(editor: HTMLElement | null): boolean {
  if (!editor) return false;
  const range = usableRange(editor);
  if (!range) return false;
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return false;
  try {
    sel.removeAllRanges();
    sel.addRange(range.cloneRange());
    return true;
  } catch {
    return false;
  }
}

/** Markierung nach Formatierung wiederherstellen / behalten. */
export function keepEditorSelection(editor: HTMLElement, preferred?: Range | null) {
  const sel = window.getSelection();
  if (!sel) return;
  editor.focus({ preventScroll: true });
  if (preferred && !preferred.collapsed) {
    try {
      sel.removeAllRanges();
      sel.addRange(preferred.cloneRange());
      saved = { editor, range: preferred.cloneRange() };
      return;
    } catch {
      /* fall through */
    }
  }
  if (sel.rangeCount > 0) {
    const live = sel.getRangeAt(0);
    if (editor.contains(live.commonAncestorContainer)) {
      if (!live.collapsed) {
        saved = { editor, range: live.cloneRange() };
      }
      // Auch bei Cursor (collapsed): hier lassen — nicht in alte Markierung springen
      return;
    }
  }
  if (saved?.editor === editor && !saved.range.collapsed) {
    try {
      sel.removeAllRanges();
      sel.addRange(saved.range.cloneRange());
    } catch {
      /* ignore */
    }
  }
}

/** Markierung aufheben, Cursor behalten. */
export function collapseEditorSelection(editor: HTMLElement | null, afterNode?: Node) {
  if (!editor) return;
  collapseAtEnd(editor, afterNode);
}

/** Gespeicherte Auswahl für den zuletzt markierten Editor wiederherstellen. */
export function restoreSavedEditorSelection(): boolean {
  return ensureEditorSelection(saved?.editor ?? null);
}

function restoreSavedSelection(): Range | null {
  if (!saved) return null;
  const { editor, range } = saved;
  if (range.collapsed) return null;
  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (!sel) return null;
  try {
    sel.removeAllRanges();
    sel.addRange(range.cloneRange());
    return range.cloneRange();
  } catch {
    return null;
  }
}

function liveRange(editor: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return null;
  if (!editor.contains(range.commonAncestorContainer)) return null;
  return range;
}

function usableRange(editor: HTMLElement): Range | null {
  const live = liveRange(editor);
  if (live) return live;

  if (saved?.editor === editor && !saved.range.collapsed) {
    try {
      return saved.range.cloneRange();
    } catch {
      saved = null;
      return null;
    }
  }

  return null;
}

function parsePx(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = String(value).trim().match(/^([\d.]+)px$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function zoneBasePx(editor: HTMLElement): number {
  const raw = editor.dataset.presBaseFs;
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : PRESENTATION_CONTENT_FONT_PX;
}

function readPxFromNode(node: Node | null, editor: HTMLElement): number | null {
  let el = node as HTMLElement | null;
  if (el?.nodeType === Node.TEXT_NODE) el = el.parentElement;
  while (el && el !== editor) {
    const attr = el.getAttribute?.('data-pres-fs');
    if (attr) {
      const n = parseInt(attr, 10);
      if (Number.isFinite(n)) return n;
    }
    const inline = parsePx(el.style?.fontSize);
    if (inline != null) return inline;
    el = el.parentElement;
  }
  return null;
}

export function getEditorSelectionFontPx(editor: HTMLElement | null): number | null {
  if (!editor) return null;
  const base = zoneBasePx(editor);
  const range = usableRange(editor);
  if (range) {
    const fromNode = readPxFromNode(range.commonAncestorContainer, editor);
    if (fromNode != null) return fromNode;
  }
  const sel = window.getSelection();
  if (sel?.anchorNode && editor.contains(sel.anchorNode)) {
    const fromAnchor = readPxFromNode(sel.anchorNode, editor);
    if (fromAnchor != null) return fromAnchor;
  }
  return base;
}

function nearestStepIndex(px: number, steps: readonly number[]): number {
  let best = 0;
  let bestDist = Infinity;
  steps.forEach((step, i) => {
    const d = Math.abs(step - px);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

function fragmentHasText(fragment: DocumentFragment | Node): boolean {
  return Boolean(fragment.textContent?.replace(/\u00a0/g, ' ').trim());
}

/** True wenn die Range den Knoten vollständig einschließt (nicht nur anschneidet). */
export function rangeFullyContainsNode(range: Range, node: Node): boolean {
  try {
    const nodeRange = document.createRange();
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent || '').length;
      nodeRange.setStart(node, 0);
      nodeRange.setEnd(node, len);
    } else {
      nodeRange.selectNodeContents(node);
    }
    return (
      range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0 &&
      range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0
    );
  } catch {
    return false;
  }
}

function stripNestedFontSpans(root: DocumentFragment | HTMLElement) {
  root.querySelectorAll?.('span[data-pres-fs]')?.forEach((inner) => {
    const parent = inner.parentNode;
    if (!parent) return;
    while (inner.firstChild) parent.insertBefore(inner.firstChild, inner);
    parent.removeChild(inner);
  });
}

/** Entfernt font-size nur in Elementen, die vollständig in der Auswahl liegen. */
export function stripFontSizingInRange(editor: HTMLElement, range: Range) {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT);
  const toStrip: HTMLElement[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const el = node as HTMLElement;
    if (!el.style?.fontSize && !el.hasAttribute('data-pres-fs') && !el.hasAttribute('size')) {
      continue;
    }
    if (!rangeFullyContainsNode(range, el)) continue;
    toStrip.push(el);
  }
  toStrip.forEach((el) => {
    el.style?.removeProperty('font-size');
    el.removeAttribute('data-pres-fs');
    el.removeAttribute('size');
  });
}

function stripAllSizingFromFragment(root: DocumentFragment | HTMLElement) {
  const nodes: HTMLElement[] = [];
  if ('querySelectorAll' in root) {
    root.querySelectorAll('*').forEach((el) => nodes.push(el as HTMLElement));
    if (root instanceof HTMLElement) nodes.push(root);
  }
  nodes.forEach((el) => {
    el.style?.removeProperty('font-size');
    el.removeAttribute('data-pres-fs');
    el.removeAttribute('size');
  });
  stripNestedFontSpans(root);
}

function makeFontSpan(px: number): HTMLSpanElement {
  const rounded = Math.round(px);
  const span = document.createElement('span');
  span.setAttribute('data-pres-fs', String(rounded));
  span.style.setProperty('font-size', `${rounded}px`, 'important');
  return span;
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

function applyPxToTextRange(range: Range, px: number): HTMLSpanElement | null {
  const span = makeFontSpan(px);
  try {
    const extracted = range.extractContents();
    if (!fragmentHasText(extracted)) return null;
    stripAllSizingFromFragment(extracted);
    span.appendChild(extracted);
    range.insertNode(span);
    return span;
  } catch {
    return null;
  }
}

function applyPxAcrossRange(editor: HTMLElement, range: Range, px: number): HTMLSpanElement | null {
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
    const span = applyPxToTextRange(sub, px);
    if (span && !firstSpan) firstSpan = span;
  }
  return firstSpan;
}

/** Wendet Folien-Pixel-Größe auf die aktuelle Auswahl an. */
export function applyEditorFontSizePx(editor: HTMLElement | null, px: number): boolean {
  if (!editor || !Number.isFinite(px) || px < 8) return false;

  stashEditorSelection(editor);
  const range = usableRange(editor);
  if (!range) return false;

  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (sel) {
    try {
      sel.removeAllRanges();
      sel.addRange(range.cloneRange());
    } catch {
      return false;
    }
  }

  const work = range.cloneRange();
  stripFontSizingInRange(editor, work);

  // Pro Textknoten wrappen — verhindert, dass extractContents zu viel mitnimmt
  let wrapped =
    applyPxAcrossRange(editor, work, px) ??
    applyPxToTextRange(work, px);

  if (!wrapped) return false;

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

export function nudgeEditorFontSize(editor: HTMLElement | null, direction: 1 | -1): number | null {
  if (!editor) return null;
  const steps = getEditorFontSizeSteps(editor);
  const current = getEditorSelectionFontPx(editor) ?? zoneBasePx(editor);
  let idx = nearestStepIndex(current, steps);
  if (direction > 0 && steps[idx] <= current && idx < steps.length - 1) {
    idx += 1;
  } else if (direction < 0 && steps[idx] >= current && idx > 0) {
    idx -= 1;
  } else {
    idx = Math.max(0, Math.min(steps.length - 1, idx + direction));
  }
  const px = steps[idx];
  return applyEditorFontSizePx(editor, px) ? px : null;
}

export function applyEditorFontSizeStepIndex(editor: HTMLElement | null, index: number): number | null {
  if (!editor) return null;
  const steps = getEditorFontSizeSteps(editor);
  if (index < 0 || index >= steps.length) return null;
  const px = steps[index];
  return applyEditorFontSizePx(editor, px) ? px : null;
}

/**
 * Notiz-HTML für Anzeige (Laptop/Present): data-pres-fs → inline font-size,
 * damit Editor-Schriftgrößen auch ohne contentEditable greifen.
 */
export function hydrateNotesHtmlFontSizes(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.body.querySelectorAll('[data-pres-fs]').forEach((node) => {
      const el = node as HTMLElement;
      const n = parseInt(el.getAttribute('data-pres-fs') || '', 10);
      if (!Number.isFinite(n) || n <= 0) return;
      el.style.setProperty('font-size', `${Math.round(n)}px`, 'important');
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}
