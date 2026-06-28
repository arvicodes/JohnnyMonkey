import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { FLYER_PAGE_H, FLYER_PAGE_W } from './constants';
import type { FlyerElement, FlyerPage } from './types';

type DragMode =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; handle: 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; orig: FlyerElement };

type Props = {
  page: FlyerPage;
  scale: number;
  selectedId: string | null;
  editingTextId: string | null;
  onSelect: (id: string | null) => void;
  onEditText: (id: string | null) => void;
  onUpdateElement: (id: string, patch: Partial<FlyerElement>, live?: boolean) => void;
  onUpdateText: (id: string, text: string) => void;
  onDragEnd?: () => void;
};

const HANDLE = 8;

function pageBg(page: FlyerPage): string {
  return page.backgroundGradient ?? page.background;
}

function renderShape(el: FlyerElement) {
  if (el.type === 'rect') {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: el.fill ?? '#ccc',
          borderRadius: `${el.borderRadius ?? 0}px`,
          border: el.stroke ? `${el.strokeWidth ?? 1}px solid ${el.stroke}` : 'none',
          opacity: el.opacity ?? 1,
        }}
      />
    );
  }
  if (el.type === 'circle') {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: el.fill ?? '#ccc',
          borderRadius: '50%',
          border: el.stroke ? `${el.strokeWidth ?? 1}px solid ${el.stroke}` : 'none',
          opacity: el.opacity ?? 1,
        }}
      />
    );
  }
  if (el.type === 'line') {
    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          width: '100%',
          borderTop: `${el.strokeWidth ?? 3}px solid ${el.stroke ?? el.fill ?? '#1c1c1c'}`,
        }}
      />
    );
  }
  if (el.type === 'image' && el.src) {
    return (
      <Box
        component="img"
        src={el.src}
        alt=""
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: `${el.borderRadius ?? 0}px`,
          display: 'block',
          opacity: el.opacity ?? 1,
        }}
      />
    );
  }
  return null;
}

export function FlyerStudioCanvas({
  page,
  scale,
  selectedId,
  editingTextId,
  onSelect,
  onEditText,
  onUpdateElement,
  onUpdateText,
  onDragEnd,
}: Props) {
  const dragRef = useRef<DragMode | null>(null);
  const [snapGuides] = useState<{ x?: number; y?: number }>({});

  const toCanvas = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => ({
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale,
    }),
    [scale],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const canvas = document.getElementById('flyer-studio-page');
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const { x, y } = toCanvas(e.clientX, e.clientY, rect);

      if (drag.kind === 'move') {
        onUpdateElement(
          drag.id,
          {
            x: Math.round(drag.origX + (x - drag.startX)),
            y: Math.round(drag.origY + (y - drag.startY)),
          },
          true,
        );
      } else if (drag.kind === 'resize') {
        const o = drag.orig;
        let { x: nx, y: ny, width: nw, height: nh } = o;
        const dx = x - drag.startX;
        const dy = y - drag.startY;
        if (drag.handle.includes('e')) nw = Math.max(24, o.width + dx);
        if (drag.handle.includes('s')) nh = Math.max(24, o.height + dy);
        if (drag.handle.includes('w')) {
          nw = Math.max(24, o.width - dx);
          nx = o.x + (o.width - nw);
        }
        if (drag.handle.includes('n')) {
          nh = Math.max(24, o.height - dy);
          ny = o.y + (o.height - nh);
        }
        onUpdateElement(drag.id, { x: nx, y: ny, width: nw, height: nh }, true);
      }
    },
    [onUpdateElement, toCanvas],
  );

  const onPointerUp = useCallback(() => {
    const wasDragging = Boolean(dragRef.current);
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    if (wasDragging) onDragEnd?.();
  }, [onPointerMove, onDragEnd]);

  useEffect(() => () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }, [onPointerMove, onPointerUp]);

  const startDrag = (e: React.PointerEvent, el: FlyerElement) => {
    if (editingTextId === el.id) return;
    e.stopPropagation();
    onSelect(el.id);
    const canvas = document.getElementById('flyer-studio-page');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = toCanvas(e.clientX, e.clientY, rect);
    dragRef.current = { kind: 'move', id: el.id, startX: x, startY: y, origX: el.x, origY: el.y };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const startResize = (e: React.PointerEvent, el: FlyerElement, handle: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    const canvas = document.getElementById('flyer-studio-page');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = toCanvas(e.clientX, e.clientY, rect);
    dragRef.current = { kind: 'resize', id: el.id, handle, startX: x, startY: y, orig: { ...el } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflow: 'auto',
        p: 3,
        bgcolor: '#2b2b3d',
        minHeight: 0,
      }}
      onClick={() => {
        onSelect(null);
        onEditText(null);
      }}
    >
      <Box
        id="flyer-studio-page"
        sx={{
          width: FLYER_PAGE_W * scale,
          height: FLYER_PAGE_H * scale,
          position: 'relative',
          flexShrink: 0,
          boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
          background: pageBg(page),
          transformOrigin: 'top center',
        }}
      >
        <Box
          sx={{
            width: FLYER_PAGE_W,
            height: FLYER_PAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            position: 'relative',
          }}
        >
          {sorted.map((el) => {
            const selected = selectedId === el.id;
            const editing = editingTextId === el.id;
            return (
              <Box
                key={el.id}
                onPointerDown={(e) => startDrag(e, el)}
                onDoubleClick={(e) => {
                  if (el.type === 'text') {
                    e.stopPropagation();
                    onSelect(el.id);
                    onEditText(el.id);
                  }
                }}
                sx={{
                  position: 'absolute',
                  left: el.x,
                  top: el.y,
                  width: el.width,
                  height: el.height,
                  zIndex: el.zIndex,
                  transform: `rotate(${el.rotation}deg)`,
                  transformOrigin: 'top left',
                  cursor: editing ? 'text' : 'grab',
                  outline: selected ? '2px solid #00e5ff' : 'none',
                  outlineOffset: 2,
                  '&:active': { cursor: editing ? 'text' : 'grabbing' },
                }}
              >
                {el.type === 'text' ? (
                  editing ? (
                    <Box
                      contentEditable
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateText(el.id, e.currentTarget.innerText)}
                      onClick={(e) => e.stopPropagation()}
                      sx={{
                        width: '100%',
                        height: '100%',
                        fontSize: el.fontSize ?? 18,
                        fontFamily: el.fontFamily,
                        fontWeight: el.fontWeight ?? 400,
                        fontStyle: el.fontStyle ?? 'normal',
                        color: el.color ?? '#1c1c1c',
                        textAlign: el.textAlign ?? 'left',
                        lineHeight: el.lineHeight ?? 1.4,
                        letterSpacing: el.letterSpacing ?? 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        outline: 'none',
                      }}
                    >
                      {el.text}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        fontSize: el.fontSize ?? 18,
                        fontFamily: el.fontFamily,
                        fontWeight: el.fontWeight ?? 400,
                        fontStyle: el.fontStyle ?? 'normal',
                        color: el.color ?? '#1c1c1c',
                        textAlign: el.textAlign ?? 'left',
                        lineHeight: el.lineHeight ?? 1.4,
                        letterSpacing: el.letterSpacing ?? 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        pointerEvents: 'none',
                      }}
                    >
                      {el.text}
                    </Box>
                  )
                ) : (
                  renderShape(el)
                )}

                {selected && !editing && (
                  <>
                    {(['nw', 'ne', 'sw', 'se'] as const).map((h) => (
                      <Box
                        key={h}
                        onPointerDown={(e) => startResize(e, el, h)}
                        sx={{
                          position: 'absolute',
                          width: HANDLE,
                          height: HANDLE,
                          bgcolor: '#fff',
                          border: '2px solid #00e5ff',
                          borderRadius: 1,
                          ...(h === 'nw' && { left: -HANDLE / 2, top: -HANDLE / 2, cursor: 'nwse-resize' }),
                          ...(h === 'ne' && { right: -HANDLE / 2, top: -HANDLE / 2, cursor: 'nesw-resize' }),
                          ...(h === 'sw' && { left: -HANDLE / 2, bottom: -HANDLE / 2, cursor: 'nesw-resize' }),
                          ...(h === 'se' && { right: -HANDLE / 2, bottom: -HANDLE / 2, cursor: 'nwse-resize' }),
                        }}
                      />
                    ))}
                  </>
                )}
              </Box>
            );
          })}

          {snapGuides.x !== undefined && (
            <Box sx={{ position: 'absolute', left: snapGuides.x, top: 0, bottom: 0, width: 1, bgcolor: '#00e5ff', opacity: 0.6 }} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
