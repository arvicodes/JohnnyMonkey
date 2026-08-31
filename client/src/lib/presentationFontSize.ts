/**
 * Schriftgrößen für Präsentations-Editoren (contentEditable).
 * Größen sind immer Folien-Pixel (1920×1080-Raum), unabhängig vom Anzeige-Scale.
 */

import { isFormatBarInteracting, isPresentationFormatUiTarget } from './presentationFormatBarGuard';
import { toHighlightFill } from './presentationTheme';
import {
  applyFormatToSelectedMath,
  isInsidePresentationMath,
  mathElementsInSelection,
} from './presentationPasteMath';

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

function selectionIsInEditor(editor: HTMLElement, range: Range): boolean {
  try {
    return editor.contains(range.commonAncestorContainer);
  } catch {
    return false;
  }
}

function otherEditableHasFocus(editor: HTMLElement): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === editor) return false;
  if (editor.contains(active)) return false;
  if (isPresentationFormatUiTarget(active)) return false;
  return Boolean(
    active.isContentEditable ||
      active.closest('[contenteditable="true"]') ||
      active.closest('[data-pres-rich-zone]'),
  );
}

/** Vor Toolbar-Klick Auswahl sichern (bleibt auch bei Popover-Klick erhalten). */
export function stashEditorSelection(editor: HTMLElement | null) {
  if (!editor) return;
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const range = sel.getRangeAt(0);
    if (!selectionIsInEditor(editor, range)) return;
    if (!range.collapsed) {
      saved = { editor, range: range.cloneRange() };
      return;
    }
    if (
      isFormatBarInteracting() ||
      isPresentationFormatUiTarget(document.activeElement)
    ) {
      return;
    }
    if (saved?.editor === editor) saved = null;
    return;
  }
  if (saved?.editor === editor && !saved.range.collapsed) return;
}

/** Letzte nicht-leere Auswahl im Editor merken. */
export function captureEditorSelection(editor: HTMLElement | null) {
  if (!editor) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!selectionIsInEditor(editor, range)) return;
  if (range.collapsed) {
    if (
      isFormatBarInteracting() ||
      isPresentationFormatUiTarget(document.activeElement)
    ) {
      return;
    }
    // Toolbar/Popover hat den Fokus — gespeicherte Markierung behalten.
    if (document.activeElement !== editor && !editor.contains(document.activeElement)) {
      return;
    }
    if (saved?.editor === editor) saved = null;
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
  if (otherEditableHasFocus(editor)) return false;
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const live = sel.getRangeAt(0);
    if (selectionIsInEditor(editor, live)) {
      editor.focus({ preventScroll: true });
      return true;
    }
  }
  const range = usableRange(editor);
  if (!range) {
    editor.focus({ preventScroll: true });
    return false;
  }
  editor.focus({ preventScroll: true });
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
  if (otherEditableHasFocus(editor)) return;
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
    if (selectionIsInEditor(editor, live)) {
      if (!live.collapsed) saved = { editor, range: live.cloneRange() };
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

function textSlicesInRange(range: Range): { node: Text; start: number; end: number }[] {
  const root = range.commonAncestorContainer;
  const walkRoot =
    root.nodeType === Node.ELEMENT_NODE ? (root as Node) : root.parentNode;
  if (!walkRoot) return [];

  const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT);
  const slices: { node: Text; start: number; end: number }[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const text = current as Text;
    if (!text.length) continue;
    if (isInsidePresentationMath(text)) continue;
    let start = 0;
    let end = text.length;
    try {
      if (range.comparePoint(text, 0) > 0) continue;
      if (range.comparePoint(text, text.length) < 0) continue;
      if (range.startContainer === text) start = range.startOffset;
      if (range.endContainer === text) end = range.endOffset;
    } catch {
      continue;
    }
    start = Math.max(0, Math.min(start, text.length));
    end = Math.max(0, Math.min(end, text.length));
    if (start >= end) continue;
    slices.push({ node: text, start, end });
  }
  return slices;
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

function applyPxAcrossRange(range: Range, px: number): HTMLSpanElement[] {
  const slices = textSlicesInRange(range);
  if (!slices.length) return [];

  const spans: HTMLSpanElement[] = [];
  for (let i = slices.length - 1; i >= 0; i -= 1) {
    const { node, start, end } = slices[i];
    if (!node.isConnected) continue;
    const sub = document.createRange();
    try {
      sub.setStart(node, start);
      sub.setEnd(node, end);
    } catch {
      continue;
    }
    const span = applyPxToTextRange(sub, px);
    if (span) spans.unshift(span);
  }
  return spans;
}

function rangeFromSpans(spans: HTMLSpanElement[]): Range | null {
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

/** Wendet Pixel-Größe nur auf die Markierung an und behält sie. */
export function applyEditorFontSizePx(
  editor: HTMLElement | null,
  px: number,
  explicitRange?: Range | null,
): boolean {
  if (!editor || !Number.isFinite(px) || px < 8) return false;

  const maths = mathElementsInSelection(editor);
  if (maths.length) {
    applyFormatToSelectedMath(editor, { fontSizePx: px });
    // Nur Formeln markiert → fertig (kein Wrap in MathML)
    const sel = window.getSelection();
    const range =
      explicitRange && !explicitRange.collapsed
        ? explicitRange
        : sel?.rangeCount
          ? sel.getRangeAt(0)
          : null;
    if (range) {
      const onlyMath =
        range.collapsed ||
        (() => {
          try {
            const walker = document.createTreeWalker(
              range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
                ? (range.commonAncestorContainer as Node)
                : range.commonAncestorContainer.parentNode || editor,
              NodeFilter.SHOW_TEXT,
            );
            let n: Node | null;
            while ((n = walker.nextNode())) {
              if (!range.intersectsNode(n)) continue;
              if (!(n.textContent || '').replace(/\u00a0/g, ' ').trim()) continue;
              if (!isInsidePresentationMath(n)) return false;
            }
            return true;
          } catch {
            return maths.length > 0;
          }
        })();
      if (onlyMath) {
        keepEditorSelection(editor);
        return true;
      }
    } else {
      keepEditorSelection(editor);
      return true;
    }
  }

  const range =
    explicitRange && !explicitRange.collapsed
      ? explicitRange.cloneRange()
      : liveRange(editor) ??
        (saved?.editor === editor && !saved.range.collapsed ? saved.range.cloneRange() : null);
  if (!range || range.collapsed) {
    return maths.length > 0;
  }
  if (!editor.contains(range.commonAncestorContainer)) return maths.length > 0;

  saved = { editor, range: range.cloneRange() };

  editor.focus({ preventScroll: true });
  const sel = window.getSelection();
  if (sel) {
    try {
      sel.removeAllRanges();
      sel.addRange(range.cloneRange());
    } catch {
      return maths.length > 0;
    }
  }

  const work = range.cloneRange();
  stripFontSizingInRange(editor, work);

  const spans = applyPxAcrossRange(work, px);
  const keep = rangeFromSpans(spans);
  if (!keep) return maths.length > 0;

  editor.dispatchEvent(new Event('input', { bubbles: true }));
  keepEditorSelection(editor, keep);
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
 * HTML für Anzeige/Editor: data-pres-fs → sichtbare inline font-size
 * (Import & Formatleiste speichern sonst nur das Attribut).
 */
export function hydratePresentationHtmlFontSizes(html: string): string {
  if (!html || typeof document === 'undefined') return html;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.body.querySelectorAll('[data-pres-fs]').forEach((node) => {
      const el = node as HTMLElement;
      const n = parseInt(el.getAttribute('data-pres-fs') || '', 10);
      if (!Number.isFinite(n) || n <= 0) return;
      el.style.setProperty('font-size', `${Math.round(n)}px`, 'important');
    });
    doc.body.querySelectorAll('[data-pres-highlight], mark').forEach((node) => {
      const el = node as HTMLElement;
      const raw = el.getAttribute('data-pres-highlight') || el.style.backgroundColor || '';
      if (!raw) return;
      el.style.setProperty('background-color', toHighlightFill(raw), 'important');
    });
    doc.body.querySelectorAll('[data-pres-color]').forEach((node) => {
      const el = node as HTMLElement;
      const raw = (el.getAttribute('data-pres-color') || '').trim();
      if (!raw) return;
      el.style.setProperty('color', raw, 'important');
    });
    doc.body.querySelectorAll('[data-pres-bold="1"]').forEach((node) => {
      const el = node as HTMLElement;
      el.style.setProperty('font-weight', '700', 'important');
    });
    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

/** @deprecated Alias — nutze hydratePresentationHtmlFontSizes */
export function hydrateNotesHtmlFontSizes(html: string): string {
  return hydratePresentationHtmlFontSizes(html);
}
