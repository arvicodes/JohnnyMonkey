/**
 * Tabellen für Präsentationen — HTML mit colgroup (Breiten), Farben, Zeilen/Spalten.
 */
import type { SlideElement } from './presentationDeck';

export const TABLE_ACCENT = {
  headerBg: '#FFE599',
  zebraBg: '#FFF2CC',
  border: '#E8C070',
  text: '#424242',
} as const;

export const TABLE_COLOR_THEMES = [
  {
    id: 'gelb',
    label: 'Gelb',
    headerBg: '#FFE599',
    zebraBg: '#FFF2CC',
    border: '#E8C070',
  },
  {
    id: 'blau',
    label: 'Blau',
    headerBg: '#CFE2F3',
    zebraBg: '#E8F0FE',
    border: '#9FC5E8',
  },
  {
    id: 'gruen',
    label: 'Grün',
    headerBg: '#D9EAD3',
    zebraBg: '#E8F5E9',
    border: '#A2C4A0',
  },
  {
    id: 'grau',
    label: 'Grau',
    headerBg: '#E8E8E8',
    zebraBg: '#F5F5F5',
    border: '#BDBDBD',
  },
  {
    id: 'rosa',
    label: 'Rosa',
    headerBg: '#F4CCCC',
    zebraBg: '#FCE8E8',
    border: '#E8A0A0',
  },
] as const;

export type TableColorTheme = (typeof TABLE_COLOR_THEMES)[number];

export const TABLE_CELL_BG_PRESETS = [
  '#FFFFFF',
  '#FFE599',
  '#FFF2CC',
  '#D9EAD3',
  '#CFE2F3',
  '#F4CCCC',
  '#EAD1DC',
  '#D0E0E3',
] as const;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellStyle(opts: {
  bg?: string;
  border?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}): string {
  const parts = [
    `border:1px solid ${opts.border || TABLE_ACCENT.border}`,
    'padding:8px 10px',
    `color:${TABLE_ACCENT.text}`,
    `text-align:${opts.align || 'center'}`,
    'vertical-align:middle',
  ];
  if (opts.bg) parts.push(`background-color:${opts.bg}`);
  if (opts.bold) parts.push('font-weight:700');
  if (opts.italic) parts.push('font-style:italic');
  return parts.join(';');
}

export type CreateTableOptions = {
  rows?: number;
  cols?: number;
  themeId?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export function getTableTheme(themeId?: string): TableColorTheme {
  return TABLE_COLOR_THEMES.find((t) => t.id === themeId) || TABLE_COLOR_THEMES[0];
}

/** Leere Tabelle mit Kopfzeile, colgroup-Breiten und Farbthema. */
export function buildBlankTableHtml(
  rows = 4,
  cols = 4,
  theme: TableColorTheme = TABLE_COLOR_THEMES[0],
): string {
  const r = Math.max(2, Math.min(20, Math.round(rows)));
  const c = Math.max(2, Math.min(12, Math.round(cols)));
  const pct = (100 / c).toFixed(4);
  const colgroup = Array.from(
    { length: c },
    () => `<col style="width:${pct}%" />`,
  ).join('');
  const headCells = Array.from({ length: c }, (_, i) => {
    const label = `Spalte ${i + 1}`;
    return `<th style="${cellStyle({ bg: theme.headerBg, border: theme.border, bold: true })}">${esc(label)}</th>`;
  }).join('');
  const bodyRows = Array.from({ length: r - 1 }, (_, ri) => {
    const bg = ri % 2 === 1 ? theme.zebraBg : '#ffffff';
    const cells = Array.from(
      { length: c },
      () => `<td style="${cellStyle({ bg, border: theme.border })}"><br></td>`,
    ).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return (
    `<table data-pres-table="1" data-pres-table-theme="${theme.id}" ` +
    `style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:inherit">` +
    `<colgroup>${colgroup}</colgroup>` +
    `<thead><tr>${headCells}</tr></thead>` +
    `<tbody>${bodyRows}</tbody>` +
    `</table>`
  );
}

export function createTableElement(
  zIndex: number,
  opts?: CreateTableOptions,
): SlideElement {
  const theme = getTableTheme(opts?.themeId);
  const rows = opts?.rows ?? 4;
  const cols = opts?.cols ?? 4;
  return {
    id: `el-table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'table',
    x: opts?.x ?? 4,
    y: opts?.y ?? 16,
    w: opts?.w ?? 92,
    h: opts?.h ?? Math.min(70, 18 + rows * 8),
    zIndex,
    html: buildBlankTableHtml(rows, cols, theme),
    stackLayer: 'foreground',
  };
}

export function findTableRoot(from: HTMLElement | null): HTMLTableElement | null {
  if (!from) return null;
  if (from.tagName === 'TABLE') return from as HTMLTableElement;
  return from.closest('table') as HTMLTableElement | null;
}

export function getCellFromSelection(editor: HTMLElement | null): HTMLTableCellElement | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node: Node | null = sel.anchorNode;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
  if (!(node instanceof Element)) return null;
  const cell = node.closest('td, th') as HTMLTableCellElement | null;
  if (!cell || !editor.contains(cell)) return null;
  return cell;
}

function ensureColgroup(table: HTMLTableElement): HTMLTableColElement[] {
  let group = table.querySelector('colgroup');
  const firstRow = table.rows[0];
  const colCount = firstRow?.cells.length || 0;
  if (!group) {
    group = table.ownerDocument.createElement('colgroup');
    table.insertBefore(group, table.firstChild);
  }
  const cols = Array.from(group.querySelectorAll('col'));
  if (cols.length === colCount && colCount > 0) return cols as HTMLTableColElement[];
  group.innerHTML = '';
  const pct = colCount > 0 ? 100 / colCount : 100;
  const created: HTMLTableColElement[] = [];
  for (let i = 0; i < colCount; i++) {
    const col = table.ownerDocument.createElement('col');
    col.style.width = `${pct}%`;
    group.appendChild(col);
    created.push(col);
  }
  return created;
}

function reindexZebra(table: HTMLTableElement, zebraBg: string = TABLE_ACCENT.zebraBg) {
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  rows.forEach((tr, i) => {
    const bg = i % 2 === 1 ? zebraBg : '#ffffff';
    tr.querySelectorAll('td').forEach((td) => {
      (td as HTMLElement).style.backgroundColor = bg;
    });
  });
}

export function tableAddRow(table: HTMLTableElement): boolean {
  const body = table.tBodies[0] || table.createTBody();
  const cols = ensureColgroup(table).length || table.rows[0]?.cells.length || 3;
  const themeId = table.getAttribute('data-pres-table-theme') || 'gelb';
  const theme = getTableTheme(themeId);
  const tr = table.ownerDocument.createElement('tr');
  for (let i = 0; i < cols; i++) {
    const td = table.ownerDocument.createElement('td');
    td.setAttribute('style', cellStyle({ bg: '#ffffff', border: theme.border }));
    td.innerHTML = '<br>';
    tr.appendChild(td);
  }
  body.appendChild(tr);
  reindexZebra(table, theme.zebraBg);
  return true;
}

export function tableAddColumn(table: HTMLTableElement): boolean {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return false;
  const themeId = table.getAttribute('data-pres-table-theme') || 'gelb';
  const theme = getTableTheme(themeId);
  const cols = ensureColgroup(table);
  const newCount = cols.length + 1;
  const pct = 100 / newCount;
  cols.forEach((col) => {
    col.style.width = `${pct}%`;
  });
  const newCol = table.ownerDocument.createElement('col');
  newCol.style.width = `${pct}%`;
  table.querySelector('colgroup')?.appendChild(newCol);

  rows.forEach((tr, ri) => {
    const isHead = Boolean(tr.closest('thead'));
    const cell = table.ownerDocument.createElement(isHead ? 'th' : 'td');
    const bg = isHead
      ? theme.headerBg
      : (ri - (table.tHead ? table.tHead.rows.length : 0)) % 2 === 1
        ? theme.zebraBg
        : '#ffffff';
    cell.setAttribute(
      'style',
      cellStyle({ bg, border: theme.border, bold: isHead, align: 'center' }),
    );
    cell.innerHTML = isHead ? `Spalte ${newCount}` : '<br>';
    tr.appendChild(cell);
  });
  return true;
}

export function tableDeleteRow(table: HTMLTableElement, cell: HTMLTableCellElement): boolean {
  const tr = cell.parentElement as HTMLTableRowElement | null;
  if (!tr || tr.closest('thead')) return false;
  const body = table.tBodies[0];
  if (!body || body.rows.length <= 1) return false;
  tr.remove();
  const theme = getTableTheme(table.getAttribute('data-pres-table-theme') || undefined);
  reindexZebra(table, theme.zebraBg);
  return true;
}

/** Letzte Datenzeile entfernen (ohne Zellenauswahl). */
export function tableDeleteLastRow(table: HTMLTableElement): boolean {
  const body = table.tBodies[0];
  if (!body || body.rows.length <= 1) return false;
  body.rows[body.rows.length - 1].remove();
  const theme = getTableTheme(table.getAttribute('data-pres-table-theme') || undefined);
  reindexZebra(table, theme.zebraBg);
  return true;
}

export function tableDeleteColumn(table: HTMLTableElement, cell: HTMLTableCellElement): boolean {
  const idx = cell.cellIndex;
  if (idx < 0) return false;
  const rows = Array.from(table.querySelectorAll('tr'));
  const firstRow = rows[0];
  if (!firstRow || firstRow.cells.length <= 1) return false;
  rows.forEach((tr) => {
    const c = tr.cells[idx];
    if (c) c.remove();
  });
  const cols = ensureColgroup(table);
  if (cols[idx]) cols[idx].remove();
  const remaining = ensureColgroup(table);
  const pct = remaining.length > 0 ? 100 / remaining.length : 100;
  remaining.forEach((col) => {
    col.style.width = `${pct}%`;
  });
  return true;
}

/** Letzte Spalte entfernen (ohne Zellenauswahl). */
export function tableDeleteLastColumn(table: HTMLTableElement): boolean {
  const firstRow = table.rows[0];
  if (!firstRow || firstRow.cells.length <= 1) return false;
  return tableDeleteColumn(table, firstRow.cells[firstRow.cells.length - 1]);
}

/**
 * Zeilen und Spalten vertauschen (Transponieren).
 * Baut die neue Tabelle atomar — kein leerer Zwischenstand (sonst speichert onInput Müll).
 */
export function tableTranspose(table: HTMLTableElement): boolean {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return false;
  const theme = getTableTheme(table.getAttribute('data-pres-table-theme') || undefined);
  type CellSnap = { html: string; style: string };
  const matrix: CellSnap[][] = [];
  let maxCols = 0;
  rows.forEach((tr) => {
    const cells = Array.from(tr.cells).map((cell) => ({
      html: cell.innerHTML,
      style: cell.getAttribute('style') || '',
    }));
    maxCols = Math.max(maxCols, cells.length);
    matrix.push(cells);
  });
  if (maxCols === 0) return false;
  matrix.forEach((row) => {
    while (row.length < maxCols) {
      row.push({
        html: '<br>',
        style: cellStyle({ bg: '#ffffff', border: theme.border }),
      });
    }
  });

  const rowCount = matrix.length;
  const transposed: CellSnap[][] = Array.from({ length: maxCols }, (_, c) =>
    Array.from({ length: rowCount }, (_, r) => matrix[r][c]),
  );

  const newColCount = rowCount;
  const pct = (100 / Math.max(1, newColCount)).toFixed(4);
  const colgroup = Array.from(
    { length: newColCount },
    () => `<col style="width:${pct}%" />`,
  ).join('');

  const headCells = transposed[0]
    .map((snap) => {
      const style =
        snap.style ||
        cellStyle({ bg: theme.headerBg, border: theme.border, bold: true });
      return `<th style="${style}">${snap.html}</th>`;
    })
    .join('');

  const bodyRows = transposed
    .slice(1)
    .map((row, ri) => {
      const bg = ri % 2 === 1 ? theme.zebraBg : '#ffffff';
      const cells = row
        .map((snap) => {
          const style = snap.style || cellStyle({ bg, border: theme.border });
          return `<td style="${style}">${snap.html}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  // Ein Schreibvorgang — contentEditable feuert höchstens einmal mit vollständiger Tabelle.
  table.innerHTML =
    `<colgroup>${colgroup}</colgroup>` +
    `<thead><tr>${headCells}</tr></thead>` +
    `<tbody>${bodyRows}</tbody>`;

  table.querySelectorAll('thead th, thead td').forEach((cell) => {
    const el = cell as HTMLElement;
    el.style.backgroundColor = theme.headerBg;
    el.style.fontWeight = '700';
    el.style.borderColor = theme.border;
  });
  reindexZebra(table, theme.zebraBg);
  return true;
}

/** True, wenn HTML eine Tabelle mit mindestens einer Zeile enthält. */
export function isValidPresentationTableHtml(html: string | undefined | null): boolean {
  if (!html || !html.trim()) return false;
  if (typeof document === 'undefined') {
    return /<tr[\s>]/i.test(html) && /<t[hd][\s>]/i.test(html);
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return false;
  return table.rows.length > 0 && (table.rows[0]?.cells.length || 0) > 0;
}

export function applyCellBackground(cell: HTMLTableCellElement, color: string): void {
  cell.style.backgroundColor = color;
}

export function applyTableTheme(table: HTMLTableElement, theme: TableColorTheme): void {
  table.setAttribute('data-pres-table-theme', theme.id);
  table.querySelectorAll('thead th, thead td').forEach((cell) => {
    const el = cell as HTMLElement;
    el.style.backgroundColor = theme.headerBg;
    el.style.borderColor = theme.border;
    el.style.fontWeight = '700';
  });
  table.querySelectorAll('td, th').forEach((cell) => {
    (cell as HTMLElement).style.borderColor = theme.border;
  });
  reindexZebra(table, theme.zebraBg);
}

export function applyZebraStriping(table: HTMLTableElement): void {
  const theme = getTableTheme(table.getAttribute('data-pres-table-theme') || undefined);
  reindexZebra(table, theme.zebraBg);
}

/** Alle Spalten auf gleiche Breite (%). */
export function distributeColumnsEvenly(table: HTMLTableElement): boolean {
  const cols = ensureColgroup(table);
  if (cols.length === 0) return false;
  const pct = `${(100 / cols.length).toFixed(4)}%`;
  cols.forEach((col) => {
    col.style.width = pct;
  });
  table.style.tableLayout = 'fixed';
  table.style.width = '100%';
  return true;
}

/** Alle Zeilen auf gleiche Höhe (% der Tabellenhöhe). */
export function distributeRowsEvenly(table: HTMLTableElement): boolean {
  const rows = Array.from(table.rows);
  if (rows.length === 0) return false;
  const pct = `${(100 / rows.length).toFixed(4)}%`;
  table.style.height = '100%';
  rows.forEach((tr) => {
    tr.style.height = pct;
  });
  return true;
}

/** Spalten und Zeilen gleichmäßig. */
export function distributeTableEvenly(table: HTMLTableElement): boolean {
  const colsOk = distributeColumnsEvenly(table);
  const rowsOk = distributeRowsEvenly(table);
  return colsOk || rowsOk;
}

/** Spaltenbreite in % setzen (Nachbar-Spalte gleicht aus). */
export function setColumnWidthPercent(
  table: HTMLTableElement,
  colIndex: number,
  widthPercent: number,
): void {
  const cols = ensureColgroup(table);
  if (colIndex < 0 || colIndex >= cols.length - 1) return;
  const left = cols[colIndex];
  const right = cols[colIndex + 1];
  const leftCur = parseFloat(left.style.width) || 100 / cols.length;
  const rightCur = parseFloat(right.style.width) || 100 / cols.length;
  const pair = leftCur + rightCur;
  const nextLeft = Math.min(pair - 8, Math.max(8, widthPercent));
  const nextRight = pair - nextLeft;
  left.style.width = `${nextLeft}%`;
  right.style.width = `${nextRight}%`;
}

export function getColumnWidthPercents(table: HTMLTableElement): number[] {
  const cols = ensureColgroup(table);
  return cols.map((col) => parseFloat(col.style.width) || 100 / Math.max(1, cols.length));
}

export function mutateTableHtml(
  html: string,
  mutator: (table: HTMLTableElement) => void,
): string {
  if (typeof document === 'undefined') return html;
  const doc = new DOMParser().parseFromString(
    html?.includes('<table') ? html : `<table>${html || ''}</table>`,
    'text/html',
  );
  const table = doc.querySelector('table') as HTMLTableElement | null;
  if (!table) return html;
  mutator(table);
  return table.outerHTML;
}

export function applyTableMutation(opts: {
  html: string;
  liveEditor?: HTMLElement | null;
  mutator: (table: HTMLTableElement, cell: HTMLTableCellElement | null) => boolean | void;
}): string | null {
  const { html, liveEditor, mutator } = opts;
  if (liveEditor) {
    const table =
      findTableRoot(liveEditor) ||
      (liveEditor.querySelector('table') as HTMLTableElement | null);
    if (table) {
      liveEditor.setAttribute('data-pres-table-mutating', '1');
      try {
        const cell = getCellFromSelection(liveEditor);
        mutator(table, cell);
        const next =
          (liveEditor.querySelector('table') as HTMLTableElement | null) || table;
        const out = next.outerHTML;
        if (!isValidPresentationTableHtml(out) && isValidPresentationTableHtml(html)) {
          return html;
        }
        return out;
      } finally {
        liveEditor.removeAttribute('data-pres-table-mutating');
      }
    }
  }
  let result: string | null = null;
  const next = mutateTableHtml(html, (table) => {
    mutator(table, null);
    result = table.outerHTML;
  });
  const out = result ?? next;
  if (!isValidPresentationTableHtml(out) && isValidPresentationTableHtml(html)) {
    return html;
  }
  return out;
}

/** Spaltenanzahl aus HTML lesen. */
export function readTableDimensions(html: string | undefined): { rows: number; cols: number } {
  if (!html || typeof document === 'undefined') return { rows: 0, cols: 0 };
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return { rows: 0, cols: 0 };
  const cols = table.rows[0]?.cells.length || 0;
  const rows = table.rows.length;
  return { rows, cols };
}
