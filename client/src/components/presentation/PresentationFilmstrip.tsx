import React, { useEffect, useMemo, useRef } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import {
  PresentationSlide,
  SLIDE_IMAGE_THUMB_MAX,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';
import { PRES_EDITOR_UI } from '../../lib/presentationEditorUi';
import PresentationSlideView from './PresentationSlideView';

interface PresentationFilmstripProps {
  slides: PresentationSlide[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (activeId: string, overId: string) => void;
}

const THUMB_W = PRES_EDITOR_UI.filmstripThumbWidth;
const THUMB_SCALE = THUMB_W / SLIDE_REF_WIDTH;
const THUMB_H = SLIDE_REF_HEIGHT * THUMB_SCALE;
const STRIP_W = THUMB_W + 12;

/** Leichte Signatur für Memo — ohne normalizeSlide. */
function slideThumbSignature(slide: PresentationSlide): string {
  const els = (slide.elements ?? [])
    .map((el) =>
      [
        el.id,
        el.type,
        el.x | 0,
        el.y | 0,
        el.w | 0,
        el.h | 0,
        el.src || '',
        (el.html || '').length,
        el.imageFit || '',
        el.shapeKind || '',
      ].join(':')
    )
    .join('|');
  return [
    slide.id,
    slide.layout || '',
    slide.imagePath || '',
    slide.accentColor || '',
    (slide.title || '').slice(0, 48),
    (slide.titleHtml || '').length,
    (slide.bodyHtml || '').length,
    (slide.body || '').length,
    (slide.subtitleHtml || '').length,
    els,
  ].join('·');
}

interface SortableThumbProps {
  slide: PresentationSlide;
  index: number;
  active: boolean;
  onSelect: () => void;
  setItemRef: (node: HTMLDivElement | null) => void;
}

const SortableFilmstripThumb = React.memo(
  ({ slide, index, active, onSelect, setItemRef }: SortableThumbProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: slide.id });

    const mergedRef = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setItemRef(node);
    };

    return (
      <Box
        ref={mergedRef}
        onClick={onSelect}
        sx={{
          mb: 0.75,
          position: 'relative',
          width: THUMB_W,
          mx: 'auto',
          borderRadius: 1,
          overflow: 'hidden',
          flexShrink: 0,
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.82 : 1,
          zIndex: isDragging ? 3 : 1,
          boxShadow: active
            ? `0 0 0 2px ${PRES_EDITOR_UI.accent}, 0 2px 8px rgba(46,125,50,0.15)`
            : isDragging
              ? '0 4px 14px rgba(0,0,0,0.18)'
              : '0 1px 3px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: active
              ? `0 0 0 2px ${PRES_EDITOR_UI.accent}, 0 2px 8px rgba(46,125,50,0.15)`
              : `0 0 0 1px ${PRES_EDITOR_UI.accentHover}, 0 1px 3px rgba(0,0,0,0.08)`,
          },
        }}
        {...attributes}
        {...listeners}
      >
        <Box
          sx={{
            width: THUMB_W,
            height: THUMB_H,
            overflow: 'hidden',
            bgcolor: '#fff',
            position: 'relative',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: SLIDE_REF_WIDTH,
              height: SLIDE_REF_HEIGHT,
              transform: `scale(${THUMB_SCALE})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <PresentationSlideView
              slide={slide}
              scale={1}
              showLogo={false}
              showShadow={false}
              revealEnabled={false}
              revealStep={999}
              imageMaxEdge={SLIDE_IMAGE_THUMB_MAX}
            />
          </Box>
        </Box>
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            left: 4,
            minWidth: 18,
            height: 18,
            px: 0.5,
            borderRadius: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: active ? PRES_EDITOR_UI.accent : 'rgba(0,0,0,0.55)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {index + 1}
        </Box>
        <Box
          sx={{
            position: 'absolute',
            right: 3,
            bottom: 3,
            width: 18,
            height: 18,
            borderRadius: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.88)',
            color: PRES_EDITOR_UI.textMuted,
            pointerEvents: 'none',
            opacity: 0.85,
          }}
        >
          <DragIcon sx={{ fontSize: 13 }} />
        </Box>
      </Box>
    );
  },
  (prev, next) =>
    prev.active === next.active &&
    prev.index === next.index &&
    slideThumbSignature(prev.slide) === slideThumbSignature(next.slide)
);

const PresentationFilmstrip: React.FC<PresentationFilmstripProps> = ({
  slides,
  activeId,
  onSelect,
  onAdd,
  onReorder,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const slideIds = useMemo(() => slides.map((slide) => slide.id), [slides]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!activeId) return;
    itemRefs.current[activeId]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  };

  return (
    <Box
      sx={{
        width: STRIP_W,
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: PRES_EDITOR_UI.pageBg,
      }}
    >
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
          px: 0.5,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
            {slides.map((slide, idx) => (
              <SortableFilmstripThumb
                key={slide.id}
                slide={slide}
                index={idx}
                active={slide.id === activeId}
                onSelect={() => onSelect(slide.id)}
                setItemRef={(node) => {
                  itemRefs.current[slide.id] = node;
                }}
              />
            ))}
          </SortableContext>
        </DndContext>
      </Box>

      <Box sx={{ py: 0.75, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <Tooltip title="Neue Folie">
          <IconButton
            size="small"
            onClick={onAdd}
            sx={{
              width: 30,
              height: 30,
              bgcolor: '#fff',
              color: PRES_EDITOR_UI.accent,
              border: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft },
            }}
          >
            <AddIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default React.memo(PresentationFilmstrip);
