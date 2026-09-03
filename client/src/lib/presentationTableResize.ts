/**
 * Tabellen-Größen per Ziehen an Spalten-/Zeilenrändern (Folientext & Tabellen-Elemente).
 * Spalten: linke und rechte Kante jeder Zelle (inkl. äußerer Ränder).
 * Zeilen: untere und obere Kante.
 */
import {
  findTableRoot,
  getColumnWidthPercents,
  setColumnWidthPercent,
} from './presentationSlideTables';

const EDGE_PX = 5;
const MIN_ROW_PX = 24;
const MIN_TABLE_PX = 100;

export type TableResizeHit =
  | {
      kind: 'col';
      table: HTMLTableElement;
      /** Linke Spalte des Paares, das angepasst wird. */
      colIndex: number;
      /**
       * +1: Ziehen nach rechts vergrößert colIndex (innere Kante / rechte Kante von colIndex).
       * -1: Ziehen nach rechts vergrößert die rechte Spalte des Paares (äußere Kanten).
       */
      sign: 1 | -1;
    }
  | {
      kind: 'row';
      table: HTMLTableElement;
      rowIndex: number;
      sign: 1 | -1;
    }
  | {
      kind: 'table-width';
      table: HTMLTableElement;
    };

function cellFromPoint(clientX: number, clientY: number): HTMLTableCellElement | null {
  const node = document.elementFromPoint(clientX, clientY);
  if (!(node instanceof Element)) return null;
  return node.closest('td, th') as HTMLTableCellElement | null;
}

/** Trifft Spalten- oder Zeilenrand nahe dem Pointer? */
export function hitTestTableBorder(
  root: HTMLElement,
  clientX: number,
  clientY: number,
  edgePx = EDGE_PX,
): TableResizeHit | null {
  const cell = cellFromPoint(clientX, clientY);
  if (!cell || !root.contains(cell)) return null;
  const table = findTableRoot(cell);
  if (!table || !root.contains(table)) return null;

  const rect = cell.getBoundingClientRect();
  const nearLeft = clientX >= rect.left - edgePx && clientX <= rect.left + edgePx;
  const nearRight = clientX >= rect.right - edgePx && clientX <= rect.right + edgePx;
  const nearTop = clientY >= rect.top - edgePx && clientY <= rect.top + edgePx;
  const nearBottom = clientY >= rect.bottom - edgePx && clientY <= rect.bottom + edgePx;

  const colIndex = cell.cellIndex;
  const colCount = table.rows[0]?.cells.length || 0;
  const rowIndex =
    cell.parentElement instanceof HTMLTableRowElement ? cell.parentElement.rowIndex : -1;
  const rowCount = table.rows.length;

  // Gesamte Breite: äußere rechte Kante der letzten Spalte
  if (nearRight && colIndex === colCount - 1) {
    return { kind: 'table-width', table };
  }

  // Spalten: rechte Kante bevorzugen wenn beide (schmale Zelle)
  if (nearRight || nearLeft) {
    if (colCount < 2 || colIndex < 0) {
      /* skip */
    } else if (nearRight && colIndex < colCount - 1) {
      // Innere Kante rechts → Paar (colIndex, colIndex+1)
      return { kind: 'col', table, colIndex, sign: 1 };
    } else if (nearLeft && colIndex > 0) {
      // Innere Kante links → dieselbe Grenze wie rechts der Vorgänger-Spalte
      return { kind: 'col', table, colIndex: colIndex - 1, sign: 1 };
    } else if (nearLeft && colIndex === 0) {
      // Äußere linke Kante: nicht als Spalten-Resize (Zelle bleibt tippbar)
    }
  }

  // Zeilen: untere / obere Kante
  if (nearBottom || nearTop) {
    if (rowCount < 2 || rowIndex < 0) {
      /* skip */
    } else if (nearBottom && rowIndex < rowCount - 1) {
      return { kind: 'row', table, rowIndex, sign: 1 };
    } else if (nearTop && rowIndex > 0) {
      return { kind: 'row', table, rowIndex: rowIndex - 1, sign: 1 };
    } else if (nearTop && rowIndex === 0) {
      return { kind: 'row', table, rowIndex: 0, sign: -1 };
    } else if (nearBottom && rowIndex === rowCount - 1) {
      return { kind: 'row', table, rowIndex: rowCount - 2, sign: -1 };
    }
  }

  return null;
}

export function tableResizeCursor(hit: TableResizeHit | null): string | null {
  if (!hit) return null;
  if (hit.kind === 'table-width') return 'ew-resize';
  return hit.kind === 'col' ? 'col-resize' : 'row-resize';
}

function tableWidthParentMaxPx(table: HTMLTableElement): number {
  const parent = table.parentElement;
  const fromParent = parent?.clientWidth || 0;
  return fromParent > 0 ? fromParent : Math.max(table.getBoundingClientRect().width, MIN_TABLE_PX);
}

export function setTableWidthPx(table: HTMLTableElement, widthPx: number): void {
  const maxW = tableWidthParentMaxPx(table);
  const next = Math.min(maxW, Math.max(MIN_TABLE_PX, Math.round(widthPx)));
  table.style.width = `${next}px`;
  table.style.maxWidth = '100%';
}

/** Zeilenhöhe in px setzen (Zellen der Zeile). */
export function setRowHeightPx(
  table: HTMLTableElement,
  rowIndex: number,
  heightPx: number,
): void {
  const row = table.rows[rowIndex];
  if (!row) return;
  const h = Math.max(MIN_ROW_PX, Math.round(heightPx));
  row.style.height = `${h}px`;
  Array.from(row.cells).forEach((cell) => {
    (cell as HTMLElement).style.height = `${h}px`;
    (cell as HTMLElement).style.minHeight = `${h}px`;
  });
}

export function getRowHeightPx(table: HTMLTableElement, rowIndex: number): number {
  const row = table.rows[rowIndex];
  if (!row) return MIN_ROW_PX;
  const rect = row.getBoundingClientRect();
  return Math.max(MIN_ROW_PX, rect.height);
}

/**
 * Startet Resize-Geste (pointermove/up am window).
 * @returns true wenn gestartet
 */
export function startTableBorderResize(
  hit: TableResizeHit,
  startClientX: number,
  startClientY: number,
  opts?: {
    onUpdate?: () => void;
    onDone?: () => void;
  },
): boolean {
  if (hit.kind === 'table-width') {
    const table = hit.table;
    const startW = table.getBoundingClientRect().width || MIN_TABLE_PX;
    const onMove = (ev: PointerEvent) => {
      setTableWidthPx(table, startW + (ev.clientX - startClientX));
      opts?.onUpdate?.();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      opts?.onDone?.();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return true;
  }

  if (hit.kind === 'col') {
    const widths = getColumnWidthPercents(hit.table);
    if (hit.colIndex < 0 || hit.colIndex >= widths.length - 1) return false;
    const startLeftPct = widths[hit.colIndex] || 100 / widths.length;
    const tableWidthPx = hit.table.getBoundingClientRect().width || 1;
    const table = hit.table;
    const colIndex = hit.colIndex;
    const sign = hit.sign;

    const onMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startClientX) / tableWidthPx) * 100;
      setColumnWidthPercent(table, colIndex, startLeftPct + sign * dxPct);
      opts?.onUpdate?.();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      opts?.onDone?.();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return true;
  }

  const pairBottom = hit.rowIndex + 1;
  if (pairBottom >= hit.table.rows.length) return false;
  const startH = getRowHeightPx(hit.table, hit.rowIndex);
  const startNextH = getRowHeightPx(hit.table, pairBottom);
  const pairTotal = startH + startNextH;
  const table = hit.table;
  const rowIndex = hit.rowIndex;
  const sign = hit.sign;

  const onMove = (ev: PointerEvent) => {
    const dy = (ev.clientY - startClientY) * sign;
    const nextH = Math.min(pairTotal - MIN_ROW_PX, Math.max(MIN_ROW_PX, startH + dy));
    setRowHeightPx(table, rowIndex, nextH);
    setRowHeightPx(table, pairBottom, pairTotal - nextH);
    opts?.onUpdate?.();
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    opts?.onDone?.();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  return true;
}

/**
 * PointerDown auf Editor: wenn Rand getroffen → Resize starten.
 * @returns true wenn Resize aktiv (Event sollte preventDefault/stopPropagation)
 */
export function tryStartTableResizeFromPointer(
  root: HTMLElement | null,
  e: { clientX: number; clientY: number; button?: number },
  opts?: { onUpdate?: () => void; onDone?: () => void },
): boolean {
  if (!root || (e.button != null && e.button !== 0)) return false;
  const hit = hitTestTableBorder(root, e.clientX, e.clientY);
  if (!hit) return false;
  return startTableBorderResize(hit, e.clientX, e.clientY, opts);
}

/** Mousemove: Cursor col-/row-resize am Rand setzen. */
export function updateTableResizeHoverCursor(
  root: HTMLElement | null,
  clientX: number,
  clientY: number,
): void {
  if (!root) return;
  const hit = hitTestTableBorder(root, clientX, clientY);
  const cursor = tableResizeCursor(hit);
  if (cursor) {
    root.style.cursor = cursor;
  } else if (
    root.style.cursor === 'col-resize' ||
    root.style.cursor === 'row-resize' ||
    root.style.cursor === 'ew-resize'
  ) {
    root.style.cursor = '';
  }
}
