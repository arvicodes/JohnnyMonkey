export type ProtokollTabStop = {
  node: Node;
  offset: number;
};

function rangeFromStop(stop: ProtokollTabStop): Range {
  const range = document.createRange();
  range.setStart(stop.node, stop.offset);
  range.collapse(true);
  return range;
}

/** Alle Tab-Stop-Positionen (direkt nach jedem .proto-tab) in Lesereihenfolge. */
export function collectProtokollTabStops(root: HTMLElement): ProtokollTabStop[] {
  const protokoll = root.querySelector('.vel-protokoll');
  if (!protokoll) return [];

  const stops: ProtokollTabStop[] = [];
  protokoll.querySelectorAll('.proto-tab').forEach((tab) => {
    const parent = tab.parentNode;
    if (!parent) return;
    const offset = Array.from(parent.childNodes).indexOf(tab) + 1;
    stops.push({ node: parent, offset });
  });

  return dedupeStops(stops);
}

function dedupeStops(stops: ProtokollTabStop[]): ProtokollTabStop[] {
  const result: ProtokollTabStop[] = [];
  for (const stop of stops) {
    const dup = result.some((s) => s.node === stop.node && s.offset === stop.offset);
    if (!dup) result.push(stop);
  }
  return result;
}

function caretStopIndex(stops: ProtokollTabStop[], selection: Selection): number {
  if (stops.length === 0) return -1;
  const caret = selection.getRangeAt(0).cloneRange();
  caret.collapse(true);

  let index = -1;
  for (let i = 0; i < stops.length; i += 1) {
    const stopRange = rangeFromStop(stops[i]);
    if (stopRange.compareBoundaryPoints(Range.START_TO_START, caret) <= 0) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

export function isSelectionInProtokoll(root: HTMLElement, selection: Selection | null): boolean {
  if (!selection || selection.rangeCount === 0) return false;
  const protokoll = root.querySelector('.vel-protokoll');
  if (!protokoll) return false;
  const anchor = selection.anchorNode;
  return !!anchor && protokoll.contains(anchor);
}

/** Tab / Shift+Tab zwischen Protokoll-Tab-Lücken — true wenn behandelt. */
export function moveProtokollTabStop(root: HTMLElement, direction: 'next' | 'prev'): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  if (!isSelectionInProtokoll(root, selection)) return false;

  const stops = collectProtokollTabStops(root);
  if (stops.length === 0) return false;

  const current = caretStopIndex(stops, selection);
  let nextIndex: number;

  if (direction === 'next') {
    if (current < 0) nextIndex = 0;
    else if (current >= stops.length - 1) return true;
    else nextIndex = current + 1;
  } else if (current <= 0) {
    return true;
  } else {
    nextIndex = current - 1;
  }

  selection.removeAllRanges();
  selection.addRange(rangeFromStop(stops[nextIndex]));
  root.focus();
  return true;
}
