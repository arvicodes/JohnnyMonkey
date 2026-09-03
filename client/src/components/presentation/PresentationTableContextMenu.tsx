import React, { useEffect, useRef, useState } from 'react';
import { Divider, Menu, MenuItem, Typography } from '@mui/material';
import {
  distributeColumnsEvenly,
  distributeRowsEvenly,
  findTableRoot,
  getCellFromSelection,
  setColumnNarrow,
  tableAddColumn,
  tableAddRow,
  tableDeleteColumn,
  tableDeleteRow,
} from '../../lib/presentationSlideTables';
import { hitTestTableBorder } from '../../lib/presentationTableResize';
import {
  PRES_TABLE_SELECTING_ATTR,
  applySmartTableRange,
  cellFromNode,
  clearTableSelection,
  getSelectedColIndices,
  getSelectedRowIndices,
  isTableCellSelected,
  selectTableCellRange,
  tableEditorFromNode,
  toggleTableColumn,
} from '../../lib/presentationTableSelection';

const LONG_PRESS_MS = 520;

type MenuState = {
  x: number;
  y: number;
  table: HTMLTableElement;
  editor: HTMLElement;
  cell: HTMLTableCellElement | null;
};

interface PresentationTableContextMenuHostProps {
  onMutated?: (editor: HTMLElement) => void;
}

function persist(editor: HTMLElement, onMutated?: (editor: HTMLElement) => void) {
  editor.dispatchEvent(new Event('input', { bubbles: true }));
  onMutated?.(editor);
}

const PresentationTableContextMenuHost: React.FC<PresentationTableContextMenuHostProps> = ({
  onMutated,
}) => {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const dragRef = useRef<{
    editor: HTMLElement;
    table: HTMLTableElement;
    start: HTMLTableCellElement;
    last: HTMLTableCellElement;
    dragging: boolean;
  } | null>(null);
  const longPressRef = useRef<number | null>(null);

  const openMenu = (
    e: { clientX: number; clientY: number },
    editor: HTMLElement,
    table: HTMLTableElement,
    cell: HTMLTableCellElement | null,
  ) => {
    if (cell && !isTableCellSelected(cell)) {
      selectTableCellRange(table, cell, cell);
    }
    setMenu({ x: e.clientX, y: e.clientY, table, editor, cell });
  };

  useEffect(() => {
    const clearLongPress = () => {
      if (longPressRef.current != null) {
        window.clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const editor = tableEditorFromNode(e.target);
      const cell = cellFromNode(e.target);
      if (!editor || !cell) return;
      if (cell.closest('[data-pres-notes-img-wrap], .pres-notes-img-wrap')) return;
      const table = findTableRoot(cell);
      if (!table || !editor.contains(table)) return;
      if (hitTestTableBorder(editor, e.clientX, e.clientY)) return;

      if (e.button === 2) {
        if (cell && !isTableCellSelected(cell)) {
          selectTableCellRange(table, cell, cell);
        }
        return;
      }
      if (e.button !== 0) return;

      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        toggleTableColumn(table, cell.cellIndex);
        return;
      }
      if (e.shiftKey) {
        const selected = table.querySelector(
          'td.pres-table-cell-selected, th.pres-table-cell-selected',
        ) as HTMLTableCellElement | null;
        if (selected) {
          e.preventDefault();
          applySmartTableRange(table, selected, cell);
          return;
        }
      }

      dragRef.current = { editor, table, start: cell, last: cell, dragging: false };
      editor.setAttribute(PRES_TABLE_SELECTING_ATTR, '1');
      selectTableCellRange(table, cell, cell);

      clearLongPress();
      if (e.pointerType === 'touch') {
        const sx = e.clientX;
        const sy = e.clientY;
        longPressRef.current = window.setTimeout(() => {
          longPressRef.current = null;
          dragRef.current = null;
          editor.removeAttribute(PRES_TABLE_SELECTING_ATTR);
          openMenu({ clientX: sx, clientY: sy }, editor, table, cell);
        }, LONG_PRESS_MS);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cell = cellFromNode(document.elementFromPoint(e.clientX, e.clientY));
      if (!cell || !drag.table.contains(cell)) return;
      if (cell === drag.last) return;
      if (Math.hypot(e.clientX, e.clientY) >= 0) {
        clearLongPress();
      }
      if (!drag.dragging && cell !== drag.start) {
        drag.dragging = true;
        e.preventDefault();
      }
      drag.last = cell;
      applySmartTableRange(drag.table, drag.start, cell);
    };

    const onPointerUp = () => {
      clearLongPress();
      const drag = dragRef.current;
      if (drag) {
        drag.editor.removeAttribute(PRES_TABLE_SELECTING_ATTR);
      }
      dragRef.current = null;
    };

    const onContextMenu = (e: MouseEvent) => {
      const editor = tableEditorFromNode(e.target);
      const cell = cellFromNode(e.target);
      if (!editor || !cell) return;
      const table = findTableRoot(cell);
      if (!table || !editor.contains(table)) return;
      e.preventDefault();
      e.stopPropagation();
      openMenu(e, editor, table, cell);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const editor = tableEditorFromNode(e.target);
      if (editor) clearTableSelection(editor);
      setMenu(null);
    };

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('pointercancel', onPointerUp, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearLongPress();
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, []);

  const run = (fn: (table: HTMLTableElement, cell: HTMLTableCellElement | null) => void) => {
    if (!menu) return;
    fn(menu.table, menu.cell || getCellFromSelection(menu.editor));
    persist(menu.editor, onMutated);
    setMenu(null);
  };

  const cols = menu ? getSelectedColIndices(menu.table) : [];
  const rows = menu ? getSelectedRowIndices(menu.table) : [];
  const colLabel =
    cols.length >= 2 ? `Spalten gleichmäßig (${cols.length})` : 'Alle Spalten gleichmäßig';
  const rowLabel =
    rows.length >= 2 ? `Zeilen gleichmäßig (${rows.length})` : 'Alle Zeilen gleichmäßig';

  return (
    <Menu
      open={Boolean(menu)}
      onClose={() => setMenu(null)}
      anchorReference="anchorPosition"
      anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
      MenuListProps={{ dense: true }}
    >
      <Typography sx={{ px: 1.5, pt: 0.5, pb: 0.25, fontSize: 10, color: '#78909c', fontWeight: 700 }}>
        Tabelle
      </Typography>
      <MenuItem
        onClick={() =>
          run((table) => {
            if (cols.length >= 2) distributeColumnsEvenly(table, cols);
            else if (rows.length >= 2) distributeRowsEvenly(table, rows);
            else distributeColumnsEvenly(table);
          })
        }
      >
        Gleichmäßig verteilen
      </MenuItem>
      <MenuItem onClick={() => run((table) => distributeColumnsEvenly(table, cols.length >= 2 ? cols : undefined))}>
        {colLabel}
      </MenuItem>
      <MenuItem onClick={() => run((table) => distributeRowsEvenly(table, rows.length >= 2 ? rows : undefined))}>
        {rowLabel}
      </MenuItem>
      <MenuItem
        disabled={cols.length === 0}
        onClick={() =>
          run((table) => {
            const targets = cols.length ? cols : [menu?.cell?.cellIndex ?? 0];
            targets.forEach((i) => setColumnNarrow(table, i));
          })
        }
      >
        Markierte Spalten schmal
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => run((table) => tableAddRow(table))}>Zeile darunter</MenuItem>
      <MenuItem onClick={() => run((table) => tableAddColumn(table))}>Spalte daneben</MenuItem>
      <MenuItem
        onClick={() =>
          run((table, cell) => {
            if (cell) tableDeleteRow(table, cell);
          })
        }
      >
        Zeile löschen
      </MenuItem>
      <MenuItem
        onClick={() =>
          run((table, cell) => {
            if (cell) tableDeleteColumn(table, cell);
          })
        }
      >
        Spalte löschen
      </MenuItem>
    </Menu>
  );
};

export default PresentationTableContextMenuHost;
