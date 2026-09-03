/**
 * Zell-/Spalten-/Zeilenmarkierung in Folien- und Notiz-Tabellen.
 * Klassen nur in der Live-Ansicht — vor dem Speichern wieder entfernen.
 */
import { findTableRoot } from './presentationSlideTables';

export const PRES_TABLE_CELL_SELECTED = 'pres-table-cell-selected';
export const PRES_TABLE_SELECTING_ATTR = 'data-pres-table-selecting';

export type TableSelection = {
  table: HTMLTableElement;
  colIndices: number[];
  rowIndices: number[];
};

export function presentationTableSelectionSx() {
  return {
    [`& td.${PRES_TABLE_CELL_SELECTED}, & th.${PRES_TABLE_CELL_SELECTED}`]: {
      boxShadow: 'inset 0 0 0 2px #1565C0',
      backgroundColor: 'rgba(21, 101, 192, 0.18) !important',
    },
    [`&[${PRES_TABLE_SELECTING_ATTR}] td, &[${PRES_TABLE_SELECTING_ATTR}] th`]: {
      userSelect: 'none',
    },
  };
}

export function tableEditorFromNode(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  return node.closest(
    '[data-pres-table-edit], [data-pres-notes-zone="true"], [data-pres-rich-zone][contenteditable="true"]',
  ) as HTMLElement | null;
}

export function cellFromNode(node: EventTarget | null): HTMLTableCellElement | null {
  if (!(node instanceof Element)) return null;
  return node.closest('td, th') as HTMLTableCellElement | null;
}

function rowIndexOfCell(cell: HTMLTableCellElement): number {
  const row = cell.parentElement;
  return row instanceof HTMLTableRowElement ? row.rowIndex : -1;
}

export function clearTableSelection(root: ParentNode | null): void {
  if (!root) return;
  root.querySelectorAll(`.${PRES_TABLE_CELL_SELECTED}`).forEach((el) => {
    el.classList.remove(PRES_TABLE_CELL_SELECTED);
    el.removeAttribute('data-pres-table-selected');
  });
}

function markCell(cell: HTMLTableCellElement): void {
  cell.classList.add(PRES_TABLE_CELL_SELECTED);
  cell.setAttribute('data-pres-table-selected', '1');
}

export function selectTableCellRange(
  table: HTMLTableElement,
  a: HTMLTableCellElement,
  b: HTMLTableCellElement,
): void {
  const c0 = Math.min(a.cellIndex, b.cellIndex);
  const c1 = Math.max(a.cellIndex, b.cellIndex);
  const r0 = Math.min(rowIndexOfCell(a), rowIndexOfCell(b));
  const r1 = Math.max(rowIndexOfCell(a), rowIndexOfCell(b));
  clearTableSelection(table);
  Array.from(table.rows).forEach((row) => {
    if (row.rowIndex < r0 || row.rowIndex > r1) return;
    Array.from(row.cells).forEach((cell) => {
      if (cell.cellIndex >= c0 && cell.cellIndex <= c1) markCell(cell);
    });
  });
}

export function selectTableColumns(table: HTMLTableElement, colIndices: number[]): void {
  const set = new Set(colIndices.filter((i) => i >= 0));
  clearTableSelection(table);
  Array.from(table.rows).forEach((row) => {
    Array.from(row.cells).forEach((cell) => {
      if (set.has(cell.cellIndex)) markCell(cell);
    });
  });
}

export function selectTableRows(table: HTMLTableElement, rowIndices: number[]): void {
  const set = new Set(rowIndices.filter((i) => i >= 0));
  clearTableSelection(table);
  Array.from(table.rows).forEach((row) => {
    if (!set.has(row.rowIndex)) return;
    Array.from(row.cells).forEach((cell) => markCell(cell));
  });
}

export function toggleTableColumn(table: HTMLTableElement, colIndex: number): void {
  const current = getSelectedColIndices(table);
  const next = current.includes(colIndex)
    ? current.filter((i) => i !== colIndex)
    : [...current, colIndex];
  if (next.length === 0) {
    clearTableSelection(table);
    return;
  }
  selectTableColumns(table, next);
}

export function getSelectedColIndices(table: HTMLTableElement | null): number[] {
  if (!table) return [];
  const set = new Set<number>();
  table.querySelectorAll(`td.${PRES_TABLE_CELL_SELECTED}, th.${PRES_TABLE_CELL_SELECTED}`).forEach((node) => {
    const cell = node as HTMLTableCellElement;
    if (cell.cellIndex >= 0) set.add(cell.cellIndex);
  });
  return [...set].sort((a, b) => a - b);
}

export function getSelectedRowIndices(table: HTMLTableElement | null): number[] {
  if (!table) return [];
  const set = new Set<number>();
  table.querySelectorAll(`td.${PRES_TABLE_CELL_SELECTED}, th.${PRES_TABLE_CELL_SELECTED}`).forEach((node) => {
    const cell = node as HTMLTableCellElement;
    const ri = rowIndexOfCell(cell);
    if (ri >= 0) set.add(ri);
  });
  return [...set].sort((a, b) => a - b);
}

export function readTableSelection(from: HTMLElement | null): TableSelection | null {
  if (!from) return null;
  const cell = from.querySelector(`.${PRES_TABLE_CELL_SELECTED}`) as HTMLTableCellElement | null;
  const table = (cell && findTableRoot(cell)) || (from.querySelector('table') as HTMLTableElement | null);
  if (!table) return null;
  return {
    table,
    colIndices: getSelectedColIndices(table),
    rowIndices: getSelectedRowIndices(table),
  };
}

export function isTableCellSelected(cell: HTMLTableCellElement): boolean {
  return cell.classList.contains(PRES_TABLE_CELL_SELECTED);
}

export function contiguousIndexRange(indices: number[]): { min: number; max: number } | null {
  if (indices.length < 2) return null;
  const min = indices[0];
  const max = indices[indices.length - 1];
  if (max - min + 1 !== indices.length) return null;
  return { min, max };
}

/** Markierung aus gespeichertem HTML entfernen. */
export function stripTableSelectionHtml(html: string): string {
  if (!html || !html.includes(PRES_TABLE_CELL_SELECTED)) return html;
  if (typeof document === 'undefined') {
    return html
      .replace(new RegExp(`\\s*${PRES_TABLE_CELL_SELECTED}`, 'g'), '')
      .replace(/\s*data-pres-table-selected="1"/g, '');
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  clearTableSelection(doc.body);
  return doc.body.innerHTML;
}

export function bothInThead(a: HTMLTableCellElement, b: HTMLTableCellElement): boolean {
  return Boolean(a.closest('thead') && b.closest('thead'));
}

export function applySmartTableRange(
  table: HTMLTableElement,
  start: HTMLTableCellElement,
  end: HTMLTableCellElement,
): void {
  if (bothInThead(start, end)) {
    const c0 = Math.min(start.cellIndex, end.cellIndex);
    const c1 = Math.max(start.cellIndex, end.cellIndex);
    selectTableColumns(
      table,
      Array.from({ length: c1 - c0 + 1 }, (_, i) => c0 + i),
    );
    return;
  }
  if (start.cellIndex === 0 && end.cellIndex === 0 && start !== end) {
    const r0 = Math.min(rowIndexOfCell(start), rowIndexOfCell(end));
    const r1 = Math.max(rowIndexOfCell(start), rowIndexOfCell(end));
    selectTableRows(
      table,
      Array.from({ length: r1 - r0 + 1 }, (_, i) => r0 + i),
    );
    return;
  }
  selectTableCellRange(table, start, end);
}
