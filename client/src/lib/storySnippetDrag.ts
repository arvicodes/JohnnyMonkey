import {
  STORY_SNIPPET_CLASS,
  STORY_SNIPPET_HANDLE_CLASS,
  STORY_SNIPPET_DRAG_BTN_CLASS,
  STORY_SNIPPET_DELETE_BTN_CLASS,
  STORY_SNIPPET_RESIZE_BTN_CLASS,
  STORY_SNIPPET_PLACEHOLDER,
  applyStorySnippetWidth,
  ensureStorySnippetStructure,
  readStorySnippetWidthPx,
} from './storyHighlightSnippets';

/** Firefox: caretPositionFromPoint — nicht in allen TS-DOM-Typen. */
type DocumentWithCaret = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
};

function caretRangeFromPoint(clientX: number, clientY: number): Range | null {
  const doc = document;
  if (typeof doc.caretRangeFromPoint === 'function') {
    return doc.caretRangeFromPoint(clientX, clientY);
  }
  const pos = (doc as DocumentWithCaret).caretPositionFromPoint?.(clientX, clientY);
  if (!pos) return null;
  const range = doc.createRange();
  range.setStart(pos.offsetNode, pos.offset);
  range.collapse(true);
  return range;
}

export function prepareStorySnippetsInHost(host: HTMLElement): void {
  host.querySelectorAll<HTMLElement>(`.${STORY_SNIPPET_CLASS}`).forEach((el) => {
    ensureStorySnippetStructure(el);
    el.draggable = false;
  });
}

function moveSnippetToPoint(host: HTMLElement, snippet: HTMLElement, clientX: number, clientY: number): void {
  const range = caretRangeFromPoint(clientX, clientY);
  if (range && host.contains(range.startContainer) && !snippet.contains(range.startContainer)) {
    try {
      range.insertNode(snippet);
      range.setStartAfter(snippet);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    } catch {
      /* fallback */
    }
  }
  host.appendChild(snippet);
}

/** Griff ziehen (Pointer) + × löschen + Ecke für Breite — zuverlässig im contenteditable. */
export function attachStorySnippetDrag(host: HTMLElement, onMoved: () => void): () => void {
  let dragSnippet: HTMLElement | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragActive = false;
  const DRAG_THRESHOLD_PX = 4;

  let resizeSnippet: HTMLElement | null = null;
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  const clearDrag = () => {
    if (dragSnippet) dragSnippet.classList.remove('story-snippet--dragging');
    dragSnippet = null;
    dragActive = false;
  };

  const clearResize = () => {
    if (resizeSnippet) resizeSnippet.classList.remove('story-snippet--resizing');
    resizeSnippet = null;
  };

  const onMouseDown = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const resizeBtn = target.closest<HTMLElement>(`.${STORY_SNIPPET_RESIZE_BTN_CLASS}`);
    if (resizeBtn) {
      const snip = resizeBtn.closest<HTMLElement>(`.${STORY_SNIPPET_CLASS}`);
      if (!snip || !host.contains(snip)) return;
      e.preventDefault();
      e.stopPropagation();
      resizeSnippet = snip;
      resizeStartX = e.clientX;
      resizeStartWidth = readStorySnippetWidthPx(snip);
      snip.classList.add('story-snippet--resizing');
      document.body.style.cursor = 'nwse-resize';
      document.body.style.userSelect = 'none';
      return;
    }

    const dragBtn = target.closest<HTMLElement>(`.${STORY_SNIPPET_DRAG_BTN_CLASS}`);
    if (!dragBtn) return;
    const snip = dragBtn.closest<HTMLElement>(`.${STORY_SNIPPET_CLASS}`);
    if (!snip || !host.contains(snip)) return;
    e.preventDefault();
    e.stopPropagation();
    dragSnippet = snip;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragActive = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (resizeSnippet) {
      const dw = e.clientX - resizeStartX;
      applyStorySnippetWidth(resizeSnippet, resizeStartWidth + dw);
      return;
    }
    if (!dragSnippet) return;
    if (!dragActive) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      dragActive = true;
      dragSnippet.classList.add('story-snippet--dragging');
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    if (resizeSnippet) {
      clearResize();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      prepareStorySnippetsInHost(host);
      onMoved();
      return;
    }
    if (!dragSnippet) return;
    const snip = dragSnippet;
    if (dragActive) {
      moveSnippetToPoint(host, snip, e.clientX, e.clientY);
      prepareStorySnippetsInHost(host);
      onMoved();
    }
    clearDrag();
  };

  const onClick = (e: MouseEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const delBtn = target.closest<HTMLElement>(`.${STORY_SNIPPET_DELETE_BTN_CLASS}`);
    if (!delBtn) return;
    const snip = delBtn.closest<HTMLElement>(`.${STORY_SNIPPET_CLASS}`);
    if (!snip || !host.contains(snip)) return;
    e.preventDefault();
    e.stopPropagation();
    snip.remove();
    onMoved();
  };

  host.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  host.addEventListener('click', onClick, true);

  return () => {
    host.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    host.removeEventListener('click', onClick, true);
    clearDrag();
    clearResize();
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
}

export function findStorySnippetContaining(host: HTMLElement, node: Node | null): HTMLElement | null {
  if (!node) return null;
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
  const snip = el?.closest<HTMLElement>(`.${STORY_SNIPPET_CLASS}`);
  if (!snip || !host.contains(snip)) return null;
  return snip;
}

/** Leerer Zettel oder komplette Auswahl → mit Entf löschen. */
export function shouldRemoveStorySnippetOnDelete(host: HTMLElement): HTMLElement | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const snip = findStorySnippetContaining(host, range.commonAncestorContainer);
  if (!snip) return null;

  if (!range.collapsed) {
    try {
      const snippetRange = document.createRange();
      snippetRange.selectNodeContents(snip);
      const startCompare = range.compareBoundaryPoints(Range.START_TO_START, snippetRange);
      const endCompare = range.compareBoundaryPoints(Range.END_TO_END, snippetRange);
      if (startCompare <= 0 && endCompare >= 0) return snip;
    } catch {
      return snip;
    }
    return null;
  }

  const text = (snip.textContent ?? '').replace(/\u200b/g, '').trim();
  const isEmpty = !text || text === STORY_SNIPPET_PLACEHOLDER;
  if (isEmpty) return snip;

  return null;
}
