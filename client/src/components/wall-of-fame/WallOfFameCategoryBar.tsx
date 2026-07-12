import React, { useEffect, useRef, useState } from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import {
  CenterFocusStrong as CenterFocusStrongIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import {
  getCategoryColor,
  reorderCategories,
  saveSettings,
  type WallOfFameCategory,
  type WallOfFameSettings,
} from '../../lib/wallOfFame';
import { wallCategoryChipSx, wallOfFamePalette } from '../../lib/wallOfFameUi';

type Props = {
  categories: WallOfFameCategory[];
  settings: WallOfFameSettings;
  onSettingsChange: (settings: WallOfFameSettings) => void;
  activeCategories: Set<string>;
  pinnedCategory: string | null;
  onToggleCategory: (name: string) => void;
  onFocusCategory: (name: string) => void;
};

type CatDrag = {
  name: string;
  pointerId: number;
  startX: number;
  moved: boolean;
};

const DRAG_THRESHOLD = 8;

export function WallOfFameCategoryBar({
  categories,
  settings,
  onSettingsChange,
  activeCategories,
  pinnedCategory,
  onToggleCategory,
  onFocusCategory,
}: Props) {
  const chipRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const colorInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const catDragRef = useRef<CatDrag | null>(null);
  const [catDrag, setCatDrag] = useState<CatDrag | null>(null);
  const [hoverChip, setHoverChip] = useState<string | null>(null);
  const [blockClick, setBlockClick] = useState(false);

  const persistSettings = (next: WallOfFameSettings) => {
    onSettingsChange(next);
    saveSettings(next);
  };

  const findDropIndex = (clientX: number): number => {
    const order = settingsRef.current.categoryOrder;
    const entries = order
      .map((name, index) => ({ name, index, el: chipRefs.current.get(name) }))
      .filter((e) => e.el);

    for (const entry of entries) {
      const rect = entry.el!.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (clientX < mid) return entry.index;
    }
    return order.length;
  };

  useEffect(() => {
    if (!catDrag) return;

    const onMove = (e: PointerEvent) => {
      const d = catDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      const moved = d.moved || Math.abs(e.clientX - d.startX) > DRAG_THRESHOLD;
      if (!moved) return;

      if (!d.moved) {
        const next = { ...d, moved: true };
        catDragRef.current = next;
        setCatDrag(next);
      }
    };

    const onUp = (e: PointerEvent) => {
      const d = catDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      if (d.moved) {
        const current = settingsRef.current;
        const fromIndex = current.categoryOrder.indexOf(d.name);
        const toIndex = findDropIndex(e.clientX);
        const clampedTo = Math.min(Math.max(0, toIndex), current.categoryOrder.length - 1);
        if (fromIndex >= 0 && clampedTo !== fromIndex) {
          const nextOrder = reorderCategories(current.categoryOrder, d.name, clampedTo);
          persistSettings({ ...current, categoryOrder: nextOrder });
        }
        setBlockClick(true);
        window.setTimeout(() => setBlockClick(false), 50);
      }

      catDragRef.current = null;
      setCatDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [catDrag?.pointerId, catDrag?.name]);

  const onGripPointerDown = (e: React.PointerEvent, name: string) => {
    e.stopPropagation();
    e.preventDefault();
    const next = { name, pointerId: e.pointerId, startX: e.clientX, moved: false };
    catDragRef.current = next;
    setCatDrag(next);
  };

  const setCategoryColor = (name: string, color: string) => {
    persistSettings({
      ...settings,
      categoryColors: { ...settings.categoryColors, [name]: color },
    });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        flex: 1,
        minWidth: 0,
        overflowX: 'auto',
        touchAction: 'pan-x',
        '&::-webkit-scrollbar': { height: 0 },
      }}
    >
      {settings.categoryOrder.map((name) => {
        const cat = categories.find((c) => c.name === name);
        if (!cat) return null;

        const index = settings.categoryOrder.indexOf(name);
        const color = getCategoryColor(name, index, settings);
        const active = activeCategories.has(cat.name);
        const pinned = pinnedCategory === cat.name;
        const isDragging = catDrag?.name === cat.name && catDrag.moved;

        return (
          <Box
            key={cat.name}
            ref={(el: HTMLDivElement | null) => {
              if (el) chipRefs.current.set(cat.name, el);
              else chipRefs.current.delete(cat.name);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              opacity: isDragging ? 0.55 : 1,
            }}
          >
            <Box
              title="Ziehen zum Sortieren"
              onPointerDown={(e) => onGripPointerDown(e, cat.name)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                pl: 0.25,
                cursor: 'grab',
                color: wallOfFamePalette.textMuted,
                touchAction: 'none',
                '&:active': { cursor: 'grabbing' },
                '& .MuiSvgIcon-root': { fontSize: 14 },
              }}
            >
              <DragIndicatorIcon />
            </Box>

            <input
              ref={(el) => {
                if (el) colorInputRefs.current.set(cat.name, el);
                else colorInputRefs.current.delete(cat.name);
              }}
              type="color"
              value={color}
              onChange={(e) => setCategoryColor(cat.name, e.target.value)}
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                opacity: 0,
                pointerEvents: 'none',
              }}
              tabIndex={-1}
            />

            <Chip
              label={cat.name}
              size="small"
              onClick={() => {
                if (!blockClick) onToggleCategory(cat.name);
              }}
              onDelete={active ? () => onFocusCategory(cat.name) : undefined}
              deleteIcon={
                <Tooltip title={pinned ? 'Übersicht' : 'Fokus'}>
                  <CenterFocusStrongIcon
                    sx={{
                      fontSize: '13px !important',
                      color: pinned ? color : undefined,
                    }}
                  />
                </Tooltip>
              }
              icon={
                <Tooltip title="Farbe wählen">
                  <Box
                    component="span"
                    onClick={(e) => {
                      e.stopPropagation();
                      colorInputRefs.current.get(cat.name)?.click();
                    }}
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: color,
                      border: '1px solid rgba(0,0,0,0.12)',
                      ml: 0.5,
                      flexShrink: 0,
                      cursor: 'pointer',
                    }}
                  />
                </Tooltip>
              }
              onMouseEnter={() => setHoverChip(cat.name)}
              onMouseLeave={() => setHoverChip((prev) => (prev === cat.name ? null : prev))}
              sx={{
                ...wallCategoryChipSx(active || pinned, color),
                flexShrink: 0,
                ...(pinned && {
                  boxShadow: `0 0 0 1px ${color}55`,
                }),
                ...(hoverChip === cat.name && { transform: 'translateY(-1px)' }),
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
