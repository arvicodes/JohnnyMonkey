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
import PresentationMediaFrame from './PresentationMediaFrame';
import { resolveMediaEmbed } from '../../lib/presentationMediaEmbed';
import { isFormatBarInteracting } from '../../lib/presentationFormatBarGuard';
import { captureEditorSelection } from '../../lib/presentationFontSize';
import { filterHtmlByRevealStep, hasVisibleRevealContent, isElementVisible, shouldAnimateReveal } from '../../lib/presentationReveal';
import { presentationNestedListSx } from '../../lib/presentationListStyles';
import { handlePresentationTabKey } from '../../lib/presentationRichText';
import {
  effectivePresentationImageFit,
  isAlphaFriendlyImageSrc,
  presentationTransparentImageSx,
} from '../../lib/presentationImageUtils';

type DragMode = 'move' | 'resize';
type ResizeCorner = 'br' | 'tr';

interface DragState {
  mode: DragMode;
  resizeCorner: ResizeCorner;
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
  /** Video/Embed in Präsentation bedienbar (Play, Zoom …). */
  mediaInteractive?: boolean;
  exportSnapshot?: boolean;
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
  mediaInteractive = false,
  exportSnapshot = false,
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
      } else if (d.resizeCorner === 'tr') {
        const nextW = clamp(d.orig.w + dxPct, MIN_SIZE, 100 - d.orig.x);
        const nextH = clamp(d.orig.h - dyPct, MIN_SIZE, 100 - d.orig.y);
        const deltaH = d.orig.h - nextH;
        onChange({
          w: nextW,
          h: nextH,
          y: clamp(d.orig.y + deltaH, 0, d.orig.y + d.orig.h - MIN_SIZE),
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

  const startDrag = (e: React.PointerEvent, mode: DragMode, resizeCorner: ResizeCorner = 'br') => {
    if (!editable || !onChange) return;
    const slide = (e.currentTarget as HTMLElement).closest('[data-pres-slide]') as HTMLElement | null;
    const rect = slide?.getBoundingClientRect();
    if (!rect) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.();
    dragRef.current = {
      mode,
      resizeCorner,
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

  const showSelectionChrome = editable && selected && !animationEditMode;
  const showTextEditor = showSelectionChrome && element.type === 'text';
  const showResizeHandle = showSelectionChrome && element.type !== 'text';
  const isFullscreenish = element.w >= 96 && element.h >= 96;
  const nearBottomEdge = element.y + element.h >= 88;
  const handleOnTop = isFullscreenish || nearBottomEdge;
  const handleInsetPx = (isFullscreenish ? 12 : 8) * scale;
  const handleSizePx = (isFullscreenish ? 24 : 18) * scale;

  const showElementBadge =
    animationEditMode && elementHasRevealAssignment(element) && element.type === 'image';
  const isMediaElement = element.type === 'video' || element.type === 'embed';
  const mediaInteract = isMediaElement && mediaInteractive && !editable;
  const mediaAllowZoom = element.type === 'embed' && mediaInteractive && !editable;

  return (
    <Box
      data-pres-element={element.id}
      onPointerDown={(e) => {
        if (animationEditMode) {
          handleAnimationClick(e);
          return;
        }
        if (!editable) return;
        if (isMediaElement && mediaInteractive) return;
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
        overflow: showSelectionChrome || exportSnapshot ? 'visible' : 'hidden',
        border: showSelectionChrome
          ? `${2 * scale}px solid #2E7D32`
          : animationEditMode && elementAnimSelected
            ? `${2 * scale}px solid #E65100`
            : editable
              ? `${1 * scale}px dashed rgba(46,125,50,0.3)`
              : animationEditMode
                ? `${1 * scale}px dashed rgba(255,152,0,0.45)`
                : undefined,
        boxSizing: 'border-box',
        cursor: animationEditMode
          ? 'pointer'
          : editable
            ? dragging
              ? 'grabbing'
              : showSelectionChrome
                ? 'grab'
                : 'pointer'
            : isMediaElement && mediaInteractive
              ? 'default'
              : undefined,
        touchAction: isMediaElement && mediaInteractive ? 'manipulation' : 'none',
        pointerEvents:
          editable || animationEditMode || (isMediaElement && mediaInteractive) ? 'auto' : 'none',
        bgcolor: element.type === 'text' && showTextEditor ? 'rgba(255,255,255,0.95)' : 'transparent',
      }}
    >
      {showElementBadge && (
        <Box sx={animationBadgeBoxSx(scale, selectedAnimationTarget === elementItemId)}>
          {element.revealStep ?? 0}
        </Box>
      )}

      {element.type === 'image' && element.src && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <Box
            component="img"
            src={slideImageUrl(element.src)}
            alt=""
            draggable={false}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: isAlphaFriendlyImageSrc(element.src) ? 'auto' : '100%',
              height: isAlphaFriendlyImageSrc(element.src) ? 'auto' : '100%',
              objectFit: effectivePresentationImageFit(element.src, element.imageFit),
              borderRadius: `${4 * scale}px`,
              userSelect: 'none',
              ...presentationTransparentImageSx,
            }}
          />
        </Box>
      )}

      {isMediaElement && (
        <PresentationMediaFrame
          mode={resolveMediaEmbed(element.src)?.mode ?? (element.type === 'video' ? 'video' : 'iframe')}
          src={element.src || ''}
          scale={scale}
          allowZoom={mediaAllowZoom}
          allowInteract={mediaInteract}
          initialZoom={element.mediaZoom ?? 1}
          placeholder={
            element.type === 'video'
              ? 'Video-Link einfügen (YouTube oder MP4-Pfad)'
              : 'Referenz-URL einfügen (z. B. /wall-of-fame)'
          }
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
              ...presentationNestedListSx({ scale, listPaddingPx: 20 * scale, itemGapPx: 2 * scale }),
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
              '& li > p': { display: 'block', listStyle: 'none' },
              ...presentationNestedListSx({ scale, listPaddingPx: 20 * scale, itemGapPx: 2 * scale }),
              '& [data-reveal-step].pres-reveal-enter': {
                animation: 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
              },
              '& [data-pres-fs]': { lineHeight: 'inherit' },
              ...animationParagraphBadgeSx(scale, animationEditMode && hasAnimTextBlocks),
            }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ))}

      {showResizeHandle && (
        <Box
          data-resize-handle
          onPointerDown={(e) => startDrag(e, 'resize', handleOnTop ? 'tr' : 'br')}
          sx={{
            position: 'absolute',
            ...(handleOnTop
              ? { top: `${handleInsetPx}px`, right: `${handleInsetPx}px` }
              : { bottom: `${handleInsetPx}px`, right: `${handleInsetPx}px` }),
            width: `${handleSizePx}px`,
            height: `${handleSizePx}px`,
            bgcolor: '#2E7D32',
            borderRadius: `${3 * scale}px`,
            cursor: 'nwse-resize',
            border: `${2 * scale}px solid #fff`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            zIndex: 30,
            pointerEvents: 'auto',
          }}
        />
      )}
      {showSelectionChrome && handleOnTop && element.type === 'image' && (
        <Box
          sx={{
            position: 'absolute',
            top: `${handleInsetPx + handleSizePx + 6 * scale}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            px: `${10 * scale}px`,
            py: `${4 * scale}px`,
            bgcolor: 'rgba(46,125,50,0.92)',
            color: '#fff',
            fontSize: `${11 * scale}px`,
            fontWeight: 600,
            borderRadius: `${4 * scale}px`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            zIndex: 30,
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Ziehen · oben rechts kleiner machen
        </Box>
      )}
    </Box>
  );
};

export default PresentationDraggableElement;
