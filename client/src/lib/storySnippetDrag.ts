import { STORY_SNIPPET_CLASS } from './storyHighlightSnippets';

const DRAG_MIME = 'application/x-story-snippet';

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
    el.draggable = true;
    el.setAttribute('data-story-snippet-draggable', 'true');
  });
}

/** Drag-and-Drop für Zettel im contenteditable-Editor. */
export function attachStorySnippetDrag(host: HTMLElement, onMoved: () => void): () => void {
  let dragged: HTMLElement | null = null;

  const onDragStart = (e: DragEvent) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const snip = target.closest<HTMLElement>(`.${STORY_SNIPPET_CLASS}`);
    if (!snip || !host.contains(snip)) return;
    dragged = snip;
    e.dataTransfer?.setData(DRAG_MIME, '1');
    e.dataTransfer?.setData('text/plain', '\u200b');
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    snip.classList.add('story-snippet--dragging');
  };

  const onDragEnd = () => {
    if (dragged) dragged.classList.remove('story-snippet--dragging');
    dragged = null;
  };

  const onDragOver = (e: DragEvent) => {
    if (!dragged) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent) => {
    if (!dragged) return;
    e.preventDefault();
    e.stopPropagation();
    const node = dragged;
    dragged = null;
    node.classList.remove('story-snippet--dragging');

    const range = caretRangeFromPoint(e.clientX, e.clientY);
    if (range && host.contains(range.startContainer) && !node.contains(range.startContainer)) {
      try {
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {
        host.appendChild(node);
      }
    } else {
      host.appendChild(node);
    }
    prepareStorySnippetsInHost(host);
    onMoved();
  };

  host.addEventListener('dragstart', onDragStart);
  host.addEventListener('dragend', onDragEnd);
  host.addEventListener('dragover', onDragOver);
  host.addEventListener('drop', onDrop);

  return () => {
    host.removeEventListener('dragstart', onDragStart);
    host.removeEventListener('dragend', onDragEnd);
    host.removeEventListener('dragover', onDragOver);
    host.removeEventListener('drop', onDrop);
  };
}
