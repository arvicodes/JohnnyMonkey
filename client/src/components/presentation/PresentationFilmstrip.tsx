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
import { Box, Button, IconButton, TextField, Tooltip } from '@mui/material';
import { Add as AddIcon, DeleteOutline as DeleteIcon, DragIndicator as DragIcon } from '@mui/icons-material';
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
  selectedIds: string[];
  variantSlideIds?: string[];
  activeVariantId?: string | null;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onOpenVariant?: (id: string) => void;
  onAddVariant?: (id: string) => void;
  onDeleteVariant?: (id: string) => void;
  onAdd: () => void;
  onReorder: (activeId: string, overId: string) => void;
  onRenameSection?: (startSlideId: string, name: string) => void;
  onAddSection?: (atSlideId: string) => void;
  onDeleteSection?: (startSlideId: string) => void;
}

const THUMB_W = PRES_EDITOR_UI.filmstripThumbWidth;
const THUMB_SCALE = THUMB_W / SLIDE_REF_WIDTH;
const THUMB_H = SLIDE_REF_HEIGHT * THUMB_SCALE;
const STRIP_W = THUMB_W + 22;

function FilmstripSectionLabel({
  label,
  onRename,
  onAddSection,
  onDeleteSection,
}: {
  label: string;
  onRename?: (name: string) => void;
  onAddSection?: () => void;
  onDeleteSection?: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(label);

  React.useEffect(() => {
    if (!editing) setDraft(label);
  }, [label, editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== label) onRename?.(next);
    else setDraft(label);
  };

  return (
    <Box
      sx={{
        mx: 0.15,
        mb: 0.3,
        mt: 0.1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.25,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {editing ? (
        <TextField
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
            if (event.key === 'Escape') {
              setDraft(label);
              setEditing(false);
            }
          }}
          autoFocus
          multiline
          minRows={1}
          maxRows={2}
          size="small"
          fullWidth
          inputProps={{ 'aria-label': 'Unterkapitel' }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.2,
              py: 0.25,
              px: 0.45,
              bgcolor: '#fff',
              color: '#0d47a1',
              borderRadius: 1,
            },
          }}
        />
      ) : (
        <Box
          component="button"
          type="button"
          title="Unterkapitel umbenennen"
          onClick={() => {
            setDraft(label);
            setEditing(true);
          }}
          sx={{
            flex: 1,
            minWidth: 0,
            m: 0,
            px: 0.5,
            py: 0.3,
            borderRadius: 1,
            border: '1px solid rgba(21, 101, 192, 0.28)',
            bgcolor: 'rgba(21, 101, 192, 0.12)',
            color: '#0d47a1',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: 0,
            textAlign: 'left',
            cursor: 'text',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            fontFamily: 'inherit',
            '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.18)' },
          }}
        >
          {label}
        </Box>
      )}
      {onAddSection ? (
        <Tooltip title="Neues Unterkapitel danach (nächste Nummer, mit Endfolie)">
          <IconButton
            size="small"
            aria-label="Unterkapitel hinzufügen"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onAddSection();
            }}
            sx={{
              width: 20,
              height: 20,
              mt: 0.05,
              p: 0,
              color: '#1565c0',
              bgcolor: '#fff',
              border: '1px solid rgba(21, 101, 192, 0.28)',
              '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.12)' },
            }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      ) : null}
      {onDeleteSection ? (
        <Tooltip title="Unterkapitel löschen…">
          <IconButton
            size="small"
            aria-label="Unterkapitel löschen"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDeleteSection();
            }}
            sx={{
              width: 20,
              height: 20,
              mt: 0.05,
              p: 0,
              color: '#c62828',
              bgcolor: '#fff',
              border: '1px solid rgba(198, 40, 40, 0.28)',
              '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.1)' },
            }}
          >
            <DeleteIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}

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
    slide.sourceLessonName || '',
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
  selected: boolean;
  hasVariant: boolean;
  variantActive: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onOpenVariant?: () => void;
  onAddVariant?: () => void;
  onDeleteVariant?: () => void;
  setItemRef: (node: HTMLDivElement | null) => void;
  sectionLabel?: string;
  onRenameSection?: (name: string) => void;
  onAddSection?: () => void;
  onDeleteSection?: () => void;
}

const SortableFilmstripThumb = React.memo(
  ({
    slide,
    index,
    active,
    selected,
    hasVariant,
    variantActive,
    onSelect,
    onOpenVariant,
    onAddVariant,
    onDeleteVariant,
    setItemRef,
    sectionLabel,
    onRenameSection,
    onAddSection,
    onDeleteSection,
  }: SortableThumbProps) => {
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

    const ring = active
      ? `0 0 0 2px ${PRES_EDITOR_UI.accent}, 0 2px 8px rgba(46,125,50,0.15)`
      : selected
        ? `0 0 0 2px rgba(46,125,50,0.55)`
        : isDragging
          ? '0 4px 14px rgba(0,0,0,0.18)'
          : '0 1px 3px rgba(0,0,0,0.08)';

    return (
      <Box
        ref={mergedRef}
        data-pres-filmstrip-slide={slide.id}
        sx={{
          mb: 0.75,
          position: 'relative',
          width: THUMB_W,
          mx: 'auto',
          flexShrink: 0,
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.82 : selected || active ? 1 : 0.92,
        zIndex: isDragging ? 3 : 1,
      }}
    >
        {sectionLabel ? (
          <FilmstripSectionLabel
            label={sectionLabel}
            onRename={onRenameSection}
            onAddSection={onAddSection}
            onDeleteSection={onDeleteSection}
          />
        ) : null}
        <Box
          onClick={onSelect}
          sx={{
            position: 'relative',
            width: THUMB_W,
            borderRadius: 1,
            overflow: 'hidden',
            cursor: isDragging ? 'grabbing' : 'grab',
            boxShadow: ring,
            bgcolor: selected && !active ? 'rgba(46,125,50,0.06)' : undefined,
            '&:hover': {
              boxShadow: active || selected
                ? ring
                : `0 0 0 1px ${PRES_EDITOR_UI.accentHover}, 0 1px 3px rgba(0,0,0,0.08)`,
            },
            'body[data-pres-element-drag] &': {
              outline: `2px dashed ${PRES_EDITOR_UI.accent}`,
              outlineOffset: 2,
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
              contentVisibility: 'auto',
              containIntrinsicSize: `${THUMB_W}px ${THUMB_H}px`,
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
                showInkStrokes={false}
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
              bgcolor: active || selected ? PRES_EDITOR_UI.accent : 'rgba(0,0,0,0.55)',
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
        {hasVariant ? (
          <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 0.3, mt: 0.35 }}>
            <Button
              size="small"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpenVariant?.();
              }}
              sx={{
                minWidth: 0,
                flex: 1,
                height: 20,
                px: 0.5,
                fontSize: 9,
                fontWeight: 800,
                lineHeight: 1,
                textTransform: 'none',
                borderRadius: 0.75,
                color: variantActive ? '#fff' : PRES_EDITOR_UI.accent,
                bgcolor: variantActive ? PRES_EDITOR_UI.accent : '#fff',
                border: `1px solid ${variantActive ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.panelBorder}`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                '&:hover': {
                  bgcolor: variantActive ? PRES_EDITOR_UI.accent : PRES_EDITOR_UI.accentSoft,
                },
              }}
            >
              Variante
            </Button>
            {onDeleteVariant ? (
              <Tooltip title="Variante löschen…">
                <IconButton
                  size="small"
                  aria-label="Variante löschen"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDeleteVariant();
                  }}
                  sx={{
                    width: 20,
                    height: 20,
                    p: 0,
                    color: '#c62828',
                    bgcolor: '#fff',
                    border: '1px solid rgba(198, 40, 40, 0.28)',
                    '&:hover': { bgcolor: 'rgba(198, 40, 40, 0.1)' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            ) : null}
          </Box>
        ) : onAddVariant ? (
          <Button
            size="small"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onAddVariant();
            }}
            sx={{
              mt: 0.35,
              minWidth: 0,
              width: '100%',
              height: 20,
              px: 0.5,
              fontSize: 9,
              fontWeight: 800,
              lineHeight: 1,
              textTransform: 'none',
              borderRadius: 0.75,
              color: '#1565c0',
              bgcolor: '#fff',
              border: '1px dashed rgba(21, 101, 192, 0.45)',
              '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.1)' },
            }}
          >
            + Variante
          </Button>
        ) : null}
      </Box>
    );
  },
  (prev, next) =>
    prev.active === next.active &&
    prev.selected === next.selected &&
    prev.hasVariant === next.hasVariant &&
    prev.variantActive === next.variantActive &&
    prev.index === next.index &&
    prev.sectionLabel === next.sectionLabel &&
    slideThumbSignature(prev.slide) === slideThumbSignature(next.slide)
);

const PresentationFilmstrip: React.FC<PresentationFilmstripProps> = ({
  slides,
  activeId,
  selectedIds,
  variantSlideIds,
  activeVariantId,
  onSelect,
  onOpenVariant,
  onAddVariant,
  onDeleteVariant,
  onAdd,
  onReorder,
  onRenameSection,
  onAddSection,
  onDeleteSection,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const slideIds = useMemo(() => slides.map((slide) => slide.id), [slides]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const variantSet = useMemo(() => new Set(variantSlideIds ?? []), [variantSlideIds]);

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
            {slides.map((slide, idx) => {
              const hourLabel = (slide.sourceLessonName || '').trim();
              const prevHour = (slides[idx - 1]?.sourceLessonName || '').trim();
              const showHour = Boolean(hourLabel) && hourLabel !== prevHour;
              return (
                  <SortableFilmstripThumb
                    key={slide.id}
                    slide={slide}
                    index={idx}
                    active={slide.id === activeId}
                    selected={selectedSet.has(slide.id)}
                    hasVariant={variantSet.has(slide.id)}
                    variantActive={activeVariantId === slide.id}
                    onSelect={(event) => onSelect(slide.id, event)}
                    onOpenVariant={onOpenVariant ? () => onOpenVariant(slide.id) : undefined}
                    onAddVariant={onAddVariant ? () => onAddVariant(slide.id) : undefined}
                    onDeleteVariant={onDeleteVariant ? () => onDeleteVariant(slide.id) : undefined}
                    setItemRef={(node) => {
                      itemRefs.current[slide.id] = node;
                    }}
                    sectionLabel={showHour ? hourLabel : undefined}
                    onRenameSection={
                      showHour && onRenameSection
                        ? (name) => onRenameSection(slide.id, name)
                        : undefined
                    }
                    onAddSection={
                      showHour && onAddSection ? () => onAddSection(slide.id) : undefined
                    }
                    onDeleteSection={
                      showHour && onDeleteSection ? () => onDeleteSection(slide.id) : undefined
                    }
                  />
              );
            })}
          </SortableContext>
        </DndContext>
      </Box>

      <Box
        sx={{
          py: 0.75,
          px: 0.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.5,
          flexShrink: 0,
        }}
      >
        <Tooltip title="Neue Folie">
          <IconButton
            size="small"
            onClick={onAdd}
            sx={{
              alignSelf: 'center',
              width: 34,
              height: 34,
              bgcolor: '#fff',
              color: PRES_EDITOR_UI.accent,
              border: `1px solid ${PRES_EDITOR_UI.panelBorder}`,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
              '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft },
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        {onAddSection && activeId ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            aria-label="Unterkapitel hinzufügen"
            onClick={() => onAddSection(activeId)}
            sx={{
              minWidth: 0,
              px: 0.5,
              py: 0.25,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1.15,
              textTransform: 'none',
              color: '#1565c0',
              borderColor: 'rgba(21, 101, 192, 0.4)',
              bgcolor: '#fff',
              '& .MuiButton-startIcon': { mr: 0.4, ml: 0 },
              '&:hover': { bgcolor: 'rgba(21, 101, 192, 0.1)', borderColor: '#1565c0' },
            }}
          >
            Unterkapitel
          </Button>
        ) : null}
        {onAddVariant && activeId && !variantSet.has(activeId) ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            aria-label="Variante hinzufügen"
            onClick={() => onAddVariant(activeId)}
            sx={{
              minWidth: 0,
              px: 0.5,
              py: 0.25,
              fontSize: 10,
              fontWeight: 700,
              lineHeight: 1.15,
              textTransform: 'none',
              color: PRES_EDITOR_UI.accent,
              borderColor: 'rgba(46, 125, 50, 0.4)',
              bgcolor: '#fff',
              '& .MuiButton-startIcon': { mr: 0.4, ml: 0 },
              '&:hover': { bgcolor: PRES_EDITOR_UI.accentSoft, borderColor: PRES_EDITOR_UI.accent },
            }}
          >
            Variante
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};

export default React.memo(PresentationFilmstrip);
