import {
  applyColumnWidthPercents,
  buildBlankTableHtml,
  distributeColumnsEvenly,
  distributeRowsEvenly,
  getColumnWidthPercents,
  resizeSelectedColumnsByDeltaPct,
  setColumnGroupWidthAgainstNeighbor,
  setColumnWidthPercent,
} from './presentationSlideTables';
import {
  applySmartTableRange,
  getSelectedColIndices,
  getSelectedRowIndices,
  selectTableColumns,
  stripTableSelectionHtml,
} from './presentationTableSelection';

function tableFromHtml(html: string): HTMLTableElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  const table = host.querySelector('table') as HTMLTableElement | null;
  if (!table) throw new Error('keine Tabelle');
  document.body.appendChild(host);
  return table;
}

describe('Tabellen: markieren und gleichmäßig verteilen', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('verteilt nur die markierten Spalten, der Rest bleibt', () => {
    const table = tableFromHtml(buildBlankTableHtml(3, 4));
    applyColumnWidthPercents(table, [40, 20, 20, 20]);
    expect(distributeColumnsEvenly(table, [1, 2, 3])).toBe(true);
    const widths = getColumnWidthPercents(table);
    expect(widths[0]).toBeCloseTo(40, 1);
    expect(widths[1]).toBeCloseTo(20, 1);
    expect(widths[2]).toBeCloseTo(20, 1);
    expect(widths[3]).toBeCloseTo(20, 1);
  });

  it('macht eine Spalte schmaler und gibt den Platz an die Nachbarspalte', () => {
    const table = tableFromHtml(buildBlankTableHtml(2, 3));
    applyColumnWidthPercents(table, [40, 30, 30]);
    setColumnWidthPercent(table, 0, 20);
    const widths = getColumnWidthPercents(table);
    expect(widths[0]).toBeCloseTo(20, 1);
    expect(widths[1]).toBeCloseTo(50, 1);
    expect(widths[2]).toBeCloseTo(30, 1);
  });

  it('zieht eine gleichmäßige Gruppe gegen die Nachbarspalte', () => {
    const table = tableFromHtml(buildBlankTableHtml(2, 4));
    applyColumnWidthPercents(table, [10, 30, 30, 30]);
    expect(setColumnGroupWidthAgainstNeighbor(table, [1, 2, 3], 0, 60)).toBe(true);
    const widths = getColumnWidthPercents(table);
    expect(widths[0]).toBeCloseTo(40, 1);
    expect(widths[1]).toBeCloseTo(20, 1);
    expect(widths[2]).toBeCloseTo(20, 1);
    expect(widths[3]).toBeCloseTo(20, 1);
  });

  it('skaliert markierte Spalten gegen den Rest', () => {
    const table = tableFromHtml(buildBlankTableHtml(2, 4));
    applyColumnWidthPercents(table, [40, 20, 20, 20]);
    expect(resizeSelectedColumnsByDeltaPct(table, [1, 2, 3], -15)).toBe(true);
    const widths = getColumnWidthPercents(table);
    expect(widths[0]).toBeCloseTo(55, 1);
    expect(widths[1]).toBeCloseTo(15, 1);
    expect(widths[2]).toBeCloseTo(15, 1);
    expect(widths[3]).toBeCloseTo(15, 1);
  });

  it('markiert per Kopfzeile ganze Spalten', () => {
    const table = tableFromHtml(buildBlankTableHtml(3, 4));
    const a = table.rows[0].cells[1];
    const b = table.rows[0].cells[2];
    applySmartTableRange(table, a, b);
    expect(getSelectedColIndices(table)).toEqual([1, 2]);
    expect(getSelectedRowIndices(table).length).toBe(table.rows.length);
  });

  it('entfernt die Markierung aus gespeichertem HTML', () => {
    const table = tableFromHtml(buildBlankTableHtml(2, 2));
    selectTableColumns(table, [0]);
    const raw = table.outerHTML;
    expect(raw).toContain('pres-table-cell-selected');
    expect(stripTableSelectionHtml(raw)).not.toContain('pres-table-cell-selected');
  });

  it('setzt Zeilenhöhen der Markierung gleich', () => {
    const table = tableFromHtml(buildBlankTableHtml(4, 2));
    table.rows[1].style.height = '80px';
    table.rows[2].style.height = '40px';
    expect(distributeRowsEvenly(table, [1, 2])).toBe(true);
    expect(parseFloat(table.rows[1].style.height)).toBeCloseTo(60, 0);
    expect(parseFloat(table.rows[2].style.height)).toBeCloseTo(60, 0);
  });
});
