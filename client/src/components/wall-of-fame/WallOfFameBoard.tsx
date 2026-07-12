import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import {
  type WallOfFameCategory,
  type WallOfFameImage,
  type WallOfFameSettings,
  buildViewKey,
  computeMosaicGrid,
  computeViewportLayout,
  getOrderedVisibleImages,
  pointerToSlot,
  saveSettings,
  slotToPosition,
  swapSlotsInOrder,
} from '../../lib/wallOfFame';
import { wallBoardBgSx, wallMosaicTileSx, wallPhotoSx } from '../../lib/wallOfFameUi';

type Props = {
  images: WallOfFameImage[];
  categories: WallOfFameCategory[];
  settings: WallOfFameSettings;
  onSettingsChange: (settings: WallOfFameSettings) => void;
  activeCategories: Set<string>;
  pinnedCategory: string | null;
  onImageClick?: (imageId: string) => void;
};

type DragState = {
  imageId: string;
  sourceSlot: number;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  offsetX: number;
  offsetY: number;
  moved: boolean;
  url: string;
  w: number;
  h: number;
};

const DRAG_THRESHOLD = 4;

type TileProps = {
  image: WallOfFameImage;
  x: number;
  y: number;
  w: number;
  h: number;
  slot: number;
  tileRef: (el: HTMLDivElement | null) => void;
  onPointerDown: (e: React.PointerEvent) => void;
};

const MosaicTile = memo(function MosaicTile({
  image,
  x,
  y,
  w,
  h,
  slot,
  tileRef,
  onPointerDown,
}: TileProps) {
  return (
    <Box
      ref={tileRef}
      data-wall-photo
      data-slot={slot}
      onPointerDown={onPointerDown}
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        cursor: 'grab',
        zIndex: 10,
        touchAction: 'none',
        ...wallMosaicTileSx(false, false),
      }}
    >
      <Box
        component="img"
        src={image.url}
        alt=""
        draggable={false}
        loading="lazy"
        sx={{
          ...wallPhotoSx(false, false, 'thumb'),
          width: '100%',
          height: '100%',
        }}
      />
    </Box>
  );
});

export function WallOfFameBoard({
  images,
  categories,
  settings,
  onSettingsChange,
  activeCategories,
  pinnedCategory,
  onImageClick,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const flyImgRef = useRef<HTMLImageElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const gridRef = useRef(computeMosaicGrid(0, 0, 0));
  const imageOrderRef = useRef<string[]>([]);
  const settingsRef = useRef(settings);
  const viewKeyRef = useRef('');
  const rafRef = useRef(0);
  const listenersRef = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(
    null,
  );

  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  const viewKey = buildViewKey(activeCategories, pinnedCategory);
  viewKeyRef.current = viewKey;
  settingsRef.current = settings;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setViewportSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const orderedImages = useMemo(
    () => getOrderedVisibleImages(images, activeCategories, pinnedCategory, settings),
    [images, activeCategories, pinnedCategory, settings],
  );

  const placedImages = useMemo(
    () =>
      computeViewportLayout(
        orderedImages,
        categories,
        settings,
        viewportSize.w,
        viewportSize.h,
      ),
    [orderedImages, categories, settings, viewportSize],
  );

  const grid = useMemo(
    () => computeMosaicGrid(orderedImages.length, viewportSize.w, viewportSize.h),
    [orderedImages.length, viewportSize],
  );
  gridRef.current = grid;

  imageOrderRef.current = orderedImages.map((img) => img.id);

  const getPointerInViewport = useCallback((clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const hideDropIndicator = () => {
    const el = dropRef.current;
    if (!el) return;
    el.style.display = 'none';
  };

  const showDropIndicator = (slot: number, sourceSlot: number) => {
    const el = dropRef.current;
    if (!el || slot < 0 || slot === sourceSlot) {
      hideDropIndicator();
      return;
    }
    const g = gridRef.current;
    const pos = slotToPosition(slot, g);
    el.style.display = 'block';
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.width = `${g.tileW}px`;
    el.style.height = `${g.tileH}px`;
  };

  const updateFlyPosition = (clientX: number, clientY: number) => {
    const d = dragRef.current;
    const fly = flyRef.current;
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!d || !fly || !rect) return;
    fly.style.left = `${clientX - rect.left - d.offsetX}px`;
    fly.style.top = `${clientY - rect.top - d.offsetY}px`;
  };

  const endDrag = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;

      if (listenersRef.current) {
        window.removeEventListener('pointermove', listenersRef.current.move);
        window.removeEventListener('pointerup', listenersRef.current.up);
        window.removeEventListener('pointercancel', listenersRef.current.up);
        listenersRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);

      const sourceEl = tileRefs.current.get(d.imageId);
      if (sourceEl) sourceEl.style.opacity = '';

      if (flyRef.current) flyRef.current.style.display = 'none';
      hideDropIndicator();

      if (!d.moved) {
        onImageClick?.(d.imageId);
      } else {
        const pos = getPointerInViewport(e.clientX, e.clientY);
        const targetSlot = pos ? pointerToSlot(pos.x, pos.y, gridRef.current) : -1;
        if (targetSlot >= 0 && targetSlot !== d.sourceSlot) {
          const key = viewKeyRef.current;
          const currentSettings = settingsRef.current;
          const nextOrder = swapSlotsInOrder(imageOrderRef.current, d.sourceSlot, targetSlot);
          const next: WallOfFameSettings = {
            ...currentSettings,
            imageOrders: { ...currentSettings.imageOrders, [key]: nextOrder },
          };
          onSettingsChange(next);
          saveSettings(next);
        }
      }

      dragRef.current = null;
    },
    [getPointerInViewport, onImageClick, onSettingsChange],
  );

  const onPhotoPointerDown = (e: React.PointerEvent, image: WallOfFameImage, sourceSlot: number, placed: { x: number; y: number; w: number; h: number }) => {
    if (e.button !== 0 || dragRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = getPointerInViewport(e.clientX, e.clientY);
    if (!pos) return;

    const next: DragState = {
      imageId: image.id,
      sourceSlot,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: pos.x - placed.x,
      offsetY: pos.y - placed.y,
      moved: false,
      url: image.url,
      w: placed.w,
      h: placed.h,
    };
    dragRef.current = next;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d || ev.pointerId !== d.pointerId) return;

      const moved =
        d.moved ||
        Math.abs(ev.clientX - d.startClientX) > DRAG_THRESHOLD ||
        Math.abs(ev.clientY - d.startClientY) > DRAG_THRESHOLD;

      if (moved && !d.moved) {
        d.moved = true;
        const sourceEl = tileRefs.current.get(d.imageId);
        if (sourceEl) sourceEl.style.opacity = '0.28';
        const fly = flyRef.current;
        const flyImg = flyImgRef.current;
        if (fly && flyImg) {
          fly.style.display = 'block';
          fly.style.width = `${d.w}px`;
          fly.style.height = `${d.h}px`;
          if (flyImg.src !== d.url) flyImg.src = d.url;
        }
      }

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updateFlyPosition(ev.clientX, ev.clientY);
        const p = getPointerInViewport(ev.clientX, ev.clientY);
        if (!p || !dragRef.current?.moved) return;
        const slot = pointerToSlot(p.x, p.y, gridRef.current);
        showDropIndicator(slot, dragRef.current.sourceSlot);
      });
    };

    const onUp = (ev: PointerEvent) => endDrag(ev);

    listenersRef.current = { move: onMove, up: onUp };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  useEffect(
    () => () => {
      if (listenersRef.current) {
        window.removeEventListener('pointermove', listenersRef.current.move);
        window.removeEventListener('pointerup', listenersRef.current.up);
        window.removeEventListener('pointercancel', listenersRef.current.up);
      }
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return (
    <Box
      ref={viewportRef}
      sx={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        m: 0,
        p: 0,
        touchAction: 'none',
        userSelect: 'none',
        ...wallBoardBgSx,
      }}
    >
      <Box
        ref={dropRef}
        sx={{
          display: 'none',
          position: 'absolute',
          borderRadius: '2px',
          border: '2px dashed rgba(255, 152, 0, 0.65)',
          bgcolor: 'rgba(255, 224, 178, 0.25)',
          pointerEvents: 'none',
          zIndex: 15,
        }}
      />

      {placedImages.map(({ image, x, y, w, h, slot }) => (
        <MosaicTile
          key={image.id}
          image={image}
          x={x}
          y={y}
          w={w}
          h={h}
          slot={slot}
          tileRef={(el) => {
            if (el) tileRefs.current.set(image.id, el);
            else tileRefs.current.delete(image.id);
          }}
          onPointerDown={(e) => onPhotoPointerDown(e, image, slot, { x, y, w, h })}
        />
      ))}

      <Box
        ref={flyRef}
        sx={{
          display: 'none',
          position: 'absolute',
          zIndex: 30,
          pointerEvents: 'none',
          willChange: 'left, top',
          boxSizing: 'border-box',
          borderRadius: '2px',
          overflow: 'hidden',
          border: '1px solid rgba(255, 152, 0, 0.75)',
          boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)',
        }}
      >
        <Box
          component="img"
          ref={flyImgRef}
          alt=""
          draggable={false}
          sx={{
            ...wallPhotoSx(true, true, 'thumb'),
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </Box>
    </Box>
  );
}
