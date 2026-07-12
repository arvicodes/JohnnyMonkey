import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SlideElement, slideImageUrl } from '../../lib/presentationDeck';
import {
  animationBadgeBoxSx,
  animationItemIdForElement,
  animationItemIdForElementParagraph,
  animationParagraphBadgeSx,
  animBlockIndexInRoot,
  collectAnimBlocksInRoot,
  elementHasRevealAssignment,
  findAnimBlockFromHit,
} from '../../lib/presentationAnimation';
import { isFormatBarInteracting } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection } from '../../lib/presentationFontSize';
import { filterHtmlByRevealStep, hasVisibleRevealContent, isElementVisible, shouldAnimateReveal } from '../../lib/presentationReveal';
import { handlePresentationTabKey } from '../../lib/presentationRichText';

type DragMode = 'move' | 'resize';

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  slideW: number;
  slideH: number;
  orig: SlideElement;
}

interface PresentationDraggableElementProps {
  element: SlideElement;
  scale: number;
  editable?: boolean;
  selected?: boolean;
  revealStep?: number;
  revealEnabled?: boolean;
  animationEditMode?: boolean;
  selectedAnimationTarget?: string | null;
  onAnimationTargetClick?: (itemId: string | null) => void;
  onSelect?: () => void;
  onChange?: (patch: Partial<SlideElement>) => void;
  onTextEditorFocus?: (el: HTMLElement, elementId: string) => void;
}

const MIN_SIZE = 4;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

const PresentationDraggableElement: React.FC<PresentationDraggableElementProps> = ({
  element,
  scale,
  editable = false,
  selected = false,
  revealStep = 999,
  revealEnabled = true,
  animationEditMode = false,
  selectedAnimationTarget = null,
  onAnimationTargetClick,
  onSelect,
  onChange,
  onTextEditorFocus,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const elementItemId = animationItemIdForElement(element.id);
  const elementStep = element.revealStep ?? 0;
  const hasInnerParagraphSteps =
    element.type === 'text' && (element.html || '').includes('data-reveal-step');
  const hasAnimTextBlocks = element.type === 'text' && Boolean(element.html?.trim());
  const elementAnimSelected =
    selectedAnimationTarget === elementItemId ||
    selectedAnimationTarget?.startsWith(`elementParagraph:${element.id}:`);

  useEffect(() => {
    if (element.type === 'text' && editable && selected && textRef.current) {
      const el = textRef.current;
      if (document.activeElement === el || el.contains(document.activeElement)) return;
      if (el.innerHTML !== (element.html || '')) {
        el.innerHTML = element.html || '<p>Text hier…</p>';
      }
    }
  }, [element.type, element.html, editable, selected, element.id]);

  useEffect(() => {
    const el = textRef.current;
    if (!el || element.type !== 'text' || !editable || !selected) return undefined;
    const capture = () => captureEditorSelection(el);
    el.addEventListener('keyup', capture);
    el.addEventListener('mouseup', capture);
    document.addEventListener('selectionchange', capture);
    return () => {
      el.removeEventListener('keyup', capture);
      el.removeEventListener('mouseup', capture);
      document.removeEventListener('selectionchange', capture);
    };
  }, [element.type, editable, selected, element.id]);

  useEffect(() => {
    const el = displayRef.current;
    if (!el || !animationEditMode || element.type !== 'text') return;
    el.querySelectorAll('[data-anim-selected]').forEach((node) => node.removeAttribute('data-anim-selected'));
    if (!selectedAnimationTarget?.startsWith(`elementParagraph:${element.id}:`)) return;
    const idx = parseInt(selectedAnimationTarget.split(':')[2] || '0', 10);
    const block = collectAnimBlocksInRoot(el)[idx - 1];
    if (block) block.setAttribute('data-anim-selected', 'true');
  }, [animationEditMode, selectedAnimationTarget, element.id, element.html, element.type]);

  const pointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !onChange) return;
      const dxPct = ((e.clientX - d.startX) / d.slideW) * 100;
      const dyPct = ((e.clientY - d.startY) / d.slideH) * 100;

      if (d.mode === 'move') {
        onChange({
          x: clamp(d.orig.x + dxPct, 0, 100 - d.orig.w),
          y: clamp(d.orig.y + dyPct, 0, 100 - d.orig.h),
        });
      } else {
        onChange({
          w: clamp(d.orig.w + dxPct, MIN_SIZE, 100 - d.orig.x),
          h: clamp(d.orig.h + dyPct, MIN_SIZE, 100 - d.orig.y),
        });
      }
    },
    [onChange]
  );

  const pointerUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
    window.removeEventListener('pointermove', pointerMove);
    window.removeEventListener('pointerup', pointerUp);
  }, [pointerMove]);

  const startDrag = (e: React.PointerEvent, mode: DragMode) => {
    if (!editable || !onChange) return;
    const slide = (e.currentTarget as HTMLElement).closest('[data-pres-slide]') as HTMLElement | null;
    const rect = slide?.getBoundingClientRect();
    if (!rect) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    dragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      slideW: rect.width,
      slideH: rect.height,
      orig: { ...element },
    };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
  };

  const handleAnimationClick = (e: React.PointerEvent) => {
    if (!animationEditMode || !onAnimationTargetClick) return;
    e.preventDefault();
    e.stopPropagation();
    const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (element.type === 'text' && displayRef.current) {
      const block = findAnimBlockFromHit(displayRef.current, hit);
      if (block) {
        const idx = animBlockIndexInRoot(displayRef.current, block);
        if (idx > 0) {
          onAnimationTargetClick(animationItemIdForElementParagraph(element.id, idx));
          return;
        }
      }
    }
    onAnimationTargetClick(elementItemId);
  };

  if (!editable && !animationEditMode && !isElementVisible(element, revealStep, revealEnabled)) return null;

  if (
    !editable &&
    !animationEditMode &&
    revealEnabled &&
    element.type === 'text' &&
    hasInnerParagraphSteps &&
    elementStep <= 0 &&
    !hasVisibleRevealContent(element.html || '', revealStep)
  ) {
    return null;
  }

  const displayHtml =
    element.type === 'text' && revealEnabled && hasInnerParagraphSteps && !editable && !animationEditMode
      ? filterHtmlByRevealStep(element.html || '', revealStep, true)
      : element.html || '<p>Text</p>';

  const showTextEditor = editable && selected && !animationEditMode;
  const showEditChrome = showTextEditor;
  const showElementBadge =
    animationEditMode && elementHasRevealAssignment(element) && element.type === 'image';

  return (
    <Box
      data-pres-element={element.id}
      onPointerDown={(e) => {
        if (animationEditMode) {
          handleAnimationClick(e);
          return;
        }
        if (!editable) return;
        if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
        if ((e.target as HTMLElement).closest('[data-text-edit]') && selected) return;
        if (!selected) {
          onSelect?.();
          return;
        }
        startDrag(e, 'move');
      }}
      sx={{
        position: 'absolute',
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.w}%`,
        height: `${element.h}%`,
        zIndex: 10 + element.zIndex + (selected || elementAnimSelected ? 100 : 0) + (animationEditMode ? 50 : 0),
        animation: shouldAnimateReveal(elementStep, revealStep, revealEnabled)
          ? 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
          : undefined,
        borderRadius: `${6 * scale}px`,
        border: showEditChrome
          ? `${2 * scale}px solid #2E7D32`
          : animationEditMode && elementAnimSelected
            ? `${2 * scale}px solid #E65100`
            : editable
              ? `${1 * scale}px dashed rgba(46,125,50,0.3)`
              : animationEditMode
                ? `${1 * scale}px dashed rgba(255,152,0,0.45)`
                : undefined,
        boxSizing: 'border-box',
        cursor: animationEditMode ? 'pointer' : editable ? (dragging ? 'grabbing' : 'grab') : undefined,
        touchAction: 'none',
        pointerEvents: editable || animationEditMode ? 'auto' : 'none',
        bgcolor: element.type === 'text' && showEditChrome ? 'rgba(255,255,255,0.95)' : 'transparent',
      }}
    >
      {showElementBadge && (
        <Box sx={animationBadgeBoxSx(scale, selectedAnimationTarget === elementItemId)}>
          {element.revealStep ?? 0}
        </Box>
      )}

      {element.type === 'image' && element.src && (
        <Box
          component="img"
          src={slideImageUrl(element.src)}
          alt=""
          draggable={false}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: element.imageFit || 'contain',
            borderRadius: `${4 * scale}px`,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )}

      {element.type === 'text' &&
        (showTextEditor ? (
          <Box
            ref={textRef}
            data-text-edit
            data-pres-rich-zone
            data-pres-base-fs="22"
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
              if (textRef.current) onTextEditorFocus?.(textRef.current, element.id);
            }}
            onBlur={(e) => {
              if (isFormatBarInteracting()) return;
              const next = e.relatedTarget as HTMLElement | null;
              if (next?.closest('[data-presentation-format-bar]')) return;
              if (textRef.current && onChange) {
                onChange({ html: textRef.current.innerHTML });
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              const el = textRef.current;
              if (!el || e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
              e.preventDefault();
              e.stopPropagation();
              handlePresentationTabKey(el, e.shiftKey);
            }}
            sx={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              outline: 'none',
              fontSize: `${22 * scale}px`,
              lineHeight: 1.45,
              p: `${6 * scale}px`,
              cursor: 'text',
              color: '#424242',
              '& p': { m: 0, mb: `${4 * scale}px` },
              '& li > p': { display: 'block', listStyle: 'none' },
              '& li': { mb: `${2 * scale}px` },
              '& ul, & ol': { m: 0, pl: `${20 * scale}px` },
              '& [data-pres-fs]': { lineHeight: 'inherit' },
            }}
          />
        ) : (
          <Box
            ref={displayRef}
            sx={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              fontSize: `${22 * scale}px`,
              lineHeight: 1.45,
              p: `${6 * scale}px`,
              pointerEvents: animationEditMode ? 'auto' : 'none',
              color: '#424242',
              '& p': { m: 0 },
              '& li': { mb: `${2 * scale}px` },
              '& [data-reveal-step].pres-reveal-enter': {
                animation: 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
              },
              '& [data-pres-fs]': { lineHeight: 'inherit' },
              ...animationParagraphBadgeSx(scale, animationEditMode && hasAnimTextBlocks),
            }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ))}

      {showEditChrome && (
        <Box
          data-resize-handle
          onPointerDown={(e) => startDrag(e, 'resize')}
          sx={{
            position: 'absolute',
            right: `${-5 * scale}px`,
            bottom: `${-5 * scale}px`,
            width: `${16 * scale}px`,
            height: `${16 * scale}px`,
            bgcolor: '#2E7D32',
            borderRadius: `${3 * scale}px`,
            cursor: 'nwse-resize',
            border: `${2 * scale}px solid #fff`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}
        />
      )}
    </Box>
  );
};

export default PresentationDraggableElement;
