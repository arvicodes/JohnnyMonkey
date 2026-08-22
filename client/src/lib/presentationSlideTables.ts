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
  /** Fertiges Tabellen-HTML (z. B. aus Zwischenablage/Matrix). */
  html?: string;
  /** Zell-Matrix; erzeugt HTML inkl. Kopfzeile. */
  matrix?: string[][];
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

/**
 * Tabellarischer Plain-Text (Tabs, |, oder ≥2 Leerzeichen) → Zeilen/Spalten-Matrix.
 * Mindestens 2×2, sonst null.
 */
export function parseTabularPlainText(text: string): string[][] | null {
  const raw = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!raw) return null;
  const lines = raw.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const splitLine = (line: string): string[] => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim());
    }
    if (line.includes('|')) {
      return line
        .split('|')
        .map((c) => c.trim())
        .filter((c, i, arr) => !(c === '' && (i === 0 || i === arr.length - 1)));
    }
    // Mehrfach-Leerzeichen / Spalten wie in kopierten Word-Tabellen ohne Tabs
    if (/\s{2,}/.test(line)) {
      return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    }
    return [line.trim()];
  };

  const matrix = lines.map(splitLine);
  const colCount = Math.max(...matrix.map((r) => r.length));
  if (colCount < 2) return null;
  // Zeilen auf gleiche Spaltenzahl auffüllen
  const normalized = matrix.map((row) => {
    const next = row.slice(0, colCount);
    while (next.length < colCount) next.push('');
    return next;
  });
  return normalized;
}

/** Matrix → Johnny-Tabellen-HTML (1. Zeile = Kopf). */
export function buildTableHtmlFromMatrix(
  matrix: string[][],
  theme: TableColorTheme = TABLE_COLOR_THEMES[0],
  opts?: { headerRow?: boolean },
): string {
  if (!matrix.length || !matrix[0]?.length) return buildBlankTableHtml(3, 3, theme);
  const headerRow = opts?.headerRow !== false;
  const cols = Math.max(...matrix.map((r) => r.length));
  const pct = (100 / cols).toFixed(4);
  const colgroup = Array.from({ length: cols }, () => `<col style="width:${pct}%" />`).join('');
  const pad = (row: string[]) => {
    const next = row.slice(0, cols);
    while (next.length < cols) next.push('');
    return next;
  };

  let headHtml = '';
  let bodyStart = 0;
  if (headerRow) {
    const head = pad(matrix[0]);
    headHtml =
      `<thead><tr>` +
      head
        .map(
          (cell) =>
            `<th style="${cellStyle({ bg: theme.headerBg, border: theme.border, bold: true, align: 'left' })}">${esc(cell) || '<br>'}</th>`,
        )
        .join('') +
      `</tr></thead>`;
    bodyStart = 1;
  }

  const bodyRows = matrix.slice(bodyStart).map((row, ri) => {
    const bg = ri % 2 === 1 ? theme.zebraBg : '#ffffff';
    const cells = pad(row)
      .map(
        (cell) =>
          `<td style="${cellStyle({ bg, border: theme.border, align: 'left' })}">${esc(cell) || '<br>'}</td>`,
      )
      .join('');
    return `<tr>${cells}</tr>`;
  });

  return (
    `<table data-pres-table="1" data-pres-table-theme="${theme.id}" ` +
    `style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:inherit">` +
    `<colgroup>${colgroup}</colgroup>` +
    headHtml +
    `<tbody>${bodyRows.join('')}</tbody>` +
    `</table>`
  );
}

/**
 * Bestehende HTML-Tabelle (z. B. Paste ohne Johnny-Styles) voll formatieren:
 * Theme, Rahmen, Kopfzeile, Zebra, colgroup.
 */
export function applyJohnnyTableFormatting(
  table: HTMLTableElement,
  themeId?: string,
): void {
  const theme = getTableTheme(themeId || table.getAttribute('data-pres-table-theme') || 'gelb');
  table.setAttribute('data-pres-table', '1');
  table.setAttribute('data-pres-table-theme', theme.id);
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.tableLayout = 'fixed';
  table.style.fontSize = 'inherit';

  // Erste Zeile ohne thead → zu thead befördern
  if (!table.tHead && table.rows.length > 0) {
    const first = table.rows[0];
    const thead = table.createTHead();
    const tr = table.ownerDocument.createElement('tr');
    Array.from(first.cells).forEach((cell) => {
      const th = table.ownerDocument.createElement('th');
      th.innerHTML = cell.innerHTML;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    first.remove();
  }
  // Lose <tr> unter <table> in tbody legen
  {
    let body = table.tBodies[0];
    if (!body) body = table.createTBody();
    Array.from(table.children).forEach((child) => {
      if (child.tagName === 'TR') body!.appendChild(child);
    });
  }

  ensureColgroup(table);

  table.querySelectorAll('th').forEach((cell) => {
    const el = cell as HTMLElement;
    el.style.border = `1px solid ${theme.border}`;
    el.style.padding = el.style.padding || '8px 10px';
    el.style.backgroundColor = theme.headerBg;
    el.style.fontWeight = '700';
    el.style.verticalAlign = 'middle';
    el.style.wordBreak = 'break-word';
    if (!el.style.textAlign) el.style.textAlign = 'left';
  });

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
  bodyRows.forEach((tr, ri) => {
    const bg = ri % 2 === 1 ? theme.zebraBg : '#ffffff';
    tr.querySelectorAll('td').forEach((cell) => {
      const el = cell as HTMLElement;
      el.style.border = `1px solid ${theme.border}`;
      el.style.padding = el.style.padding || '8px 10px';
      el.style.backgroundColor = bg;
      el.style.verticalAlign = 'middle';
      el.style.wordBreak = 'break-word';
    });
  });
}

/**
 * Editor-Inhalt / Auswahl → Johnny-Tabelle.
 * 1) Vorhandene Tabellen stylen
 * 2) Sonst tabellarischen Text (Auswahl oder ganzer Editor) umwandeln
 */
export function formatEditorContentAsTable(
  editor: HTMLElement,
  themeId = 'gelb',
): { ok: boolean; message: string } {
  if (!editor) return { ok: false, message: 'Kein Editor aktiv' };
  const theme = getTableTheme(themeId);

  const existing = Array.from(editor.querySelectorAll('table')) as HTMLTableElement[];
  if (existing.length > 0) {
    existing.forEach((t) => applyJohnnyTableFormatting(t, theme.id));
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true, message: existing.length === 1 ? 'Tabelle formatiert' : `${existing.length} Tabellen formatiert` };
  }

  const sel = window.getSelection();
  let sourceText = '';
  let replaceSelection = false;
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editor.contains(sel.anchorNode)) {
    sourceText = sel.toString();
    replaceSelection = true;
  } else {
    sourceText = editor.innerText || editor.textContent || '';
  }

  const matrix = parseTabularPlainText(sourceText);
  if (!matrix) {
    return {
      ok: false,
      message: 'Kein Tabellen-Text gefunden (mind. 2 Zeilen × 2 Spalten, Tabs oder |)',
    };
  }

  const html = buildTableHtmlFromMatrix(matrix, theme);
  if (replaceSelection && sel && sel.rangeCount > 0) {
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      /* ignore */
    }
    const inserted = document.execCommand('insertHTML', false, html);
    if (!inserted) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      range.insertNode(frag);
    }
  } else {
    editor.innerHTML = html;
  }
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  return { ok: true, message: 'Als Tabelle formatiert' };
}

export function createTableElement(
  zIndex: number,
  opts?: CreateTableOptions,
): SlideElement {
  const theme = getTableTheme(opts?.themeId);
  const matrix = opts?.matrix;
  const rows = matrix?.length ?? opts?.rows ?? 4;
  const cols = matrix?.[0]?.length ?? opts?.cols ?? 4;
  const html =
    opts?.html ||
    (matrix ? buildTableHtmlFromMatrix(matrix, theme) : buildBlankTableHtml(rows, cols, theme));
  return {
    id: `el-table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'table',
    x: opts?.x ?? 4,
    y: opts?.y ?? 16,
    w: opts?.w ?? 92,
    h: opts?.h ?? Math.min(70, 18 + rows * 8),
    zIndex,
    html,
    stackLayer: 'foreground',
  };
}

export function findTableRoot(from: HTMLElement | null): HTMLTableElement | null {
  if (!from) return null;
  if (from.tagName === 'TABLE') return from as HTMLTableElement;
  return from.closest('table') as HTMLTableElement | null;
}

function focusTableCell(cell: HTMLTableCellElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = cell.ownerDocument.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function tableFromSelection(editor: HTMLElement): HTMLTableElement | null {
  const cell = getCellFromSelection(editor);
  if (cell) return findTableRoot(cell);
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const nodes = [sel.anchorNode, sel.focusNode, sel.getRangeAt(0).commonAncestorContainer];
  for (const raw of nodes) {
    let node: Node | null = raw;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof Element)) continue;
    const table = node.closest('table') as HTMLTableElement | null;
    if (table && editor.contains(table)) return table;
  }
  return null;
}

/** Tab in Tabelle: neue Zeile. Shift+Tab: vorherige Zelle. */
export function handleTableTabInEditor(editor: HTMLElement, shiftKey: boolean): boolean {
  const cell = getCellFromSelection(editor);
  const table = cell ? findTableRoot(cell) : tableFromSelection(editor);
  if (!table || !editor.contains(table)) return false;
  const cells = Array.from(table.querySelectorAll('th, td')) as HTMLTableCellElement[];
  const idx = cell ? cells.indexOf(cell) : cells.length - 1;
  if (shiftKey) {
    if (idx > 0) focusTableCell(cells[idx - 1]);
    return true;
  }
  tableAddRow(table);
  const nextCells = Array.from(table.querySelectorAll('th, td')) as HTMLTableCellElement[];
  const firstNew = nextCells[cells.length] || nextCells[nextCells.length - 1];
  if (firstNew) focusTableCell(firstNew);
  return true;
}

export function getCellFromSelection(editor: HTMLElement | null): HTMLTableCellElement | null {
  if (!editor) return null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const nodes = [sel.anchorNode, sel.focusNode, sel.getRangeAt(0).commonAncestorContainer];
  for (const raw of nodes) {
    let node: Node | null = raw;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    if (!(node instanceof Element)) continue;
    const cell = node.closest('td, th') as HTMLTableCellElement | null;
    if (cell && editor.contains(cell)) return cell;
  }
  return null;
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

/**
 * Unformatierte Notiz-Tabellen (z. B. aus PPTX/Paste) mit Rahmen, Padding und Kopfzeile versehen.
 */
export function ensureNotesTablesFormatted(root: ParentNode): void {
  root.querySelectorAll('table').forEach((node) => {
    applyJohnnyTableFormatting(node as HTMLTableElement);
  });
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
