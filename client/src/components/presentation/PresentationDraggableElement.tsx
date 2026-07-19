import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SlideElement, SLIDE_IMAGE_EDITOR_MAX, slideImageUrl } from '../../lib/presentationDeck';
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
import { handlePresentationTabKey, replaceArrowShortcutsNearCursor, tryMarkdownListShortcut } from '../../lib/presentationRichText';
import {
  effectivePresentationImageFit,
  formatImageObjectPosition,
  IMAGE_FRAME_MAX,
  IMAGE_FRAME_MIN,
  IMAGE_FRAME_SIZE_MAX,
  isHeroSlideImage,
  isImageCropMode,
  parseImageObjectPosition,
  presentationImageElementSx,
  shouldPanCoverImageOnDrag,
} from '../../lib/presentationImageUtils';
import { SlideShapeSvg } from '../../lib/presentationSlideShapes';

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
  /** Bild auf andere Folie legen: Drop über Filmstrip-Thumbnail. */
  onMoveToSlide?: (targetSlideId: string) => void;
  onTextEditorFocus?: (el: HTMLElement, elementId: string) => void;
  /** Video/Embed in Präsentation bedienbar (Play, Zoom …). */
  mediaInteractive?: boolean;
  exportSnapshot?: boolean;
  imageMaxEdge?: number;
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
  onMoveToSlide,
  onTextEditorFocus,
  mediaInteractive = false,
  exportSnapshot = false,
  imageMaxEdge,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pendingDragRef = useRef<{
    mode: DragMode;
    resizeCorner: ResizeCorner;
    startX: number;
    startY: number;
    slideW: number;
    slideH: number;
    orig: SlideElement;
    pointerId: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Während Drag nur lokal — kein setDeck pro Pointer-Move. */
  const [liveGeom, setLiveGeom] = useState<Partial<SlideElement> | null>(null);
  const livePatchRef = useRef<Partial<SlideElement> | null>(null);
  const rafMoveRef = useRef<number | null>(null);
  const textInputTimerRef = useRef<number | null>(null);
  const DRAG_THRESHOLD_PX = 5;

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

  /** Nach Auswahl sofort tippbar — sonst fängt der erste Klick nur Drag ab. */
  useEffect(() => {
    if (element.type !== 'text' || !editable || !selected || animationEditMode) return;
    let cancelled = false;
    const focusEditor = () => {
      if (cancelled) return;
      const el = textRef.current;
      if (!el) return;
      if (document.activeElement === el || el.contains(document.activeElement)) return;
      el.focus({ preventScroll: true });
      onTextEditorFocus?.(el, element.id);
      try {
        const sel = window.getSelection();
        if (!sel) return;
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {
        /* ignore */
      }
    };
    // Doppel-rAF + kurzer Timeout: nach Toolbar-Klick bleibt sonst der Button fokussiert.
    const raf1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(focusEditor);
    });
    const t = window.setTimeout(focusEditor, 30);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.clearTimeout(t);
    };
    // absichtlich ohne onTextEditorFocus — Parent liefert oft Inline-Callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.type, element.id, editable, selected, animationEditMode]);

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

  const pointerMove = useCallback((e: PointerEvent) => {
    const pending = pendingDragRef.current;
    if (pending && !dragRef.current) {
      const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
      if (dist < DRAG_THRESHOLD_PX) return;
      dragRef.current = {
        mode: pending.mode,
        resizeCorner: pending.resizeCorner,
        startX: pending.startX,
        startY: pending.startY,
        slideW: pending.slideW,
        slideH: pending.slideH,
        orig: pending.orig,
      };
      pendingDragRef.current = null;
      setDragging(true);
      if (pending.mode === 'move' && pending.orig.type === 'image') {
        document.body.setAttribute('data-pres-element-drag', 'image');
      }
    }

    const d = dragRef.current;
    if (!d) return;
    const dxPct = ((e.clientX - d.startX) / d.slideW) * 100;
    const dyPct = ((e.clientY - d.startY) / d.slideH) * 100;

    let patch: Partial<SlideElement>;
    if (d.mode === 'move') {
      if (shouldPanCoverImageOnDrag(d.orig, { altKey: e.altKey })) {
        const pos = parseImageObjectPosition(d.orig.imageObjectPosition);
        const panGain = 1.35;
        patch = {
          imageObjectPosition: formatImageObjectPosition(
            pos.x - dxPct * panGain,
            pos.y - dyPct * panGain,
          ),
        };
      } else {
        patch = {
          x: clamp(d.orig.x + dxPct, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
          y: clamp(d.orig.y + dyPct, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
        };
      }
    } else if (d.resizeCorner === 'tr') {
      const nextW = clamp(d.orig.w + dxPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
      const nextH = clamp(d.orig.h - dyPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
      const deltaH = d.orig.h - nextH;
      patch = {
        w: nextW,
        h: nextH,
        y: clamp(d.orig.y + deltaH, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
      };
    } else {
      patch = {
        w: clamp(d.orig.w + dxPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
        h: clamp(d.orig.h + dyPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
      };
    }

    livePatchRef.current = patch;
    if (rafMoveRef.current != null) return;
    rafMoveRef.current = window.requestAnimationFrame(() => {
      rafMoveRef.current = null;
      if (livePatchRef.current) setLiveGeom(livePatchRef.current);
    });
  }, []);

  const pointerUp = useCallback(
    (e: PointerEvent) => {
      const wasDragging = Boolean(dragRef.current);
      const pending = pendingDragRef.current;
      const finalPatch = livePatchRef.current;
      const dragMode = dragRef.current?.mode;
      pendingDragRef.current = null;
      dragRef.current = null;
      livePatchRef.current = null;
      if (rafMoveRef.current != null) {
        window.cancelAnimationFrame(rafMoveRef.current);
        rafMoveRef.current = null;
      }
      setDragging(false);
      setLiveGeom(null);
      document.body.removeAttribute('data-pres-element-drag');
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);

      // Bild auf Filmstrip-Folie fallen lassen → verschieben
      if (wasDragging && dragMode === 'move' && element.type === 'image' && onMoveToSlide) {
        const hit = document.elementFromPoint(e.clientX, e.clientY);
        const thumb = hit?.closest('[data-pres-filmstrip-slide]') as HTMLElement | null;
        const targetSlideId = thumb?.getAttribute('data-pres-filmstrip-slide');
        if (targetSlideId) {
          onMoveToSlide(targetSlideId);
          try {
            (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
          } catch {
            /* ignore */
          }
          return;
        }
      }

      if (wasDragging && finalPatch && onChange) {
        onChange(finalPatch);
      }

      // Klick ohne Ziehen auf Text → Editor fokussieren
      if (
        !wasDragging &&
        pending &&
        pending.mode === 'move' &&
        element.type === 'text' &&
        editable &&
        !animationEditMode
      ) {
        window.requestAnimationFrame(() => {
          const el = textRef.current;
          if (!el) return;
          el.focus();
          onTextEditorFocus?.(el, element.id);
        });
      }

      try {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [
      pointerMove,
      element.type,
      element.id,
      editable,
      animationEditMode,
      onTextEditorFocus,
      onChange,
      onMoveToSlide,
    ]
  );

  const startDrag = (e: React.PointerEvent, mode: DragMode, resizeCorner: ResizeCorner = 'br') => {
    if (!editable || !onChange) return;
    const slide = (e.currentTarget as HTMLElement).closest('[data-pres-slide]') as HTMLElement | null;
    const rect = slide?.getBoundingClientRect();
    if (!rect) return;
    e.stopPropagation();
    // Kein preventDefault beim ersten Down — sonst bekommt contentEditable keinen Fokus.
    onSelect?.();
    pendingDragRef.current = {
      mode,
      resizeCorner,
      startX: e.clientX,
      startY: e.clientY,
      slideW: rect.width,
      slideH: rect.height,
      orig: { ...element },
      pointerId: e.pointerId,
    };
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

  const view = liveGeom ? { ...element, ...liveGeom } : element;

  if (!editable && !animationEditMode && !isElementVisible(element, revealStep, revealEnabled)) return null;

  if (
    element.type === 'image' &&
    !element.src?.trim() &&
    !editable &&
    !animationEditMode
  ) {
    return null;
  }

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

  const isImageElement = element.type === 'image';
  const heroImage = isImageElement && isHeroSlideImage(view);
  const cropMode = isImageElement && isImageCropMode(view);
  const imageFit = effectivePresentationImageFit(view.src, view.imageFit);
  /** Contain: Rahmen/Handles am sichtbaren Bild, nicht am leeren Elementkasten. */
  const hugImageChrome =
    isImageElement && Boolean(element.src?.trim()) && !heroImage && imageFit !== 'cover';
  const showSelectionChrome = editable && selected && !animationEditMode;
  const showTextEditor = showSelectionChrome && element.type === 'text';
  const showResizeHandle = showSelectionChrome && element.type !== 'text';
  const isShapeElement = element.type === 'shape';
  const isFullscreenish = view.w >= 96 && view.h >= 96;
  const nearBottomEdge = view.y + view.h >= 88;
  const handleOnTop = !heroImage && (isFullscreenish || nearBottomEdge);
  const handleOnBottom = heroImage;
  const handleInsetPx = (isFullscreenish ? 12 : 8) * scale;
  const handleSizePx = (isFullscreenish ? 24 : 18) * scale;

  const showElementBadge =
    animationEditMode && elementHasRevealAssignment(element) && element.type === 'image';
  const isMediaElement = element.type === 'video' || element.type === 'embed';
  const mediaInteract = isMediaElement && mediaInteractive && !editable;
  const mediaAllowZoom = element.type === 'embed' && mediaInteractive && !editable;

  const imageSelectionBorder =
    hugImageChrome
      ? undefined
      : isImageElement || isShapeElement
        ? animationEditMode && elementAnimSelected
          ? `${2 * scale}px solid #E65100`
          : showSelectionChrome
            ? `${2 * scale}px solid #2E7D32`
            : undefined
        : showSelectionChrome
          ? `${2 * scale}px solid #2E7D32`
          : animationEditMode && elementAnimSelected
            ? `${2 * scale}px solid #E65100`
            : editable
              ? `${1 * scale}px dashed rgba(46,125,50,0.3)`
              : animationEditMode
                ? `${1 * scale}px dashed rgba(255,152,0,0.45)`
                : undefined;

  /** Keine Dauer-Ränder um Bilder — Rahmen nur bei Auswahl / Animationsziel. */
  const hugChromeBorder =
    showSelectionChrome
      ? `${2 * scale}px solid #2E7D32`
      : animationEditMode && elementAnimSelected
        ? `${2 * scale}px solid #E65100`
        : undefined;

  const resizeHandleSx = {
    position: 'absolute' as const,
    ...(handleOnTop
      ? { top: `${handleInsetPx}px`, right: `${handleInsetPx}px` }
      : { bottom: `${handleInsetPx}px`, right: `${handleInsetPx}px` }),
    width: `${handleSizePx}px`,
    height: `${handleSizePx}px`,
    bgcolor: heroImage ? 'rgba(46,125,50,0.82)' : '#2E7D32',
    borderRadius: `${3 * scale}px`,
    cursor: 'nwse-resize' as const,
    border: heroImage ? 'none' : `${2 * scale}px solid #fff`,
    boxShadow: heroImage ? '0 1px 6px rgba(0,0,0,0.28)' : '0 2px 8px rgba(0,0,0,0.35)',
    zIndex: 30,
    pointerEvents: 'auto' as const,
  };

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
        if (!selected) onSelect?.();
        startDrag(e, 'move');
      }}
      sx={{
        position: 'absolute',
        left: `${view.x}%`,
        top: `${view.y}%`,
        width: `${view.w}%`,
        height: `${view.h}%`,
        zIndex:
          10 +
          element.zIndex +
          (dragging ? 200 : 0) +
          (animationEditMode && elementAnimSelected ? 50 : 0),
        animation: shouldAnimateReveal(elementStep, revealStep, revealEnabled)
          ? 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1)'
          : undefined,
        borderRadius: isImageElement || isShapeElement ? 0 : `${6 * scale}px`,
        overflow: showSelectionChrome || exportSnapshot || isShapeElement ? 'visible' : 'hidden',
        border: imageSelectionBorder,
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
        willChange: dragging ? 'left, top, width, height' : undefined,
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
            ...(heroImage ? { position: 'absolute', inset: 0 } : undefined),
          }}
        >
          <Box
            sx={{
              position: 'relative',
              maxWidth: '100%',
              maxHeight: '100%',
              lineHeight: 0,
              boxSizing: 'border-box',
              border: hugImageChrome ? hugChromeBorder : undefined,
              overflow: cropMode || hugImageChrome ? 'hidden' : 'visible',
              width: '100%',
              height: '100%',
            }}
          >
            <Box
              component="img"
              src={slideImageUrl(
                element.src,
                exportSnapshot ? undefined : imageMaxEdge ?? SLIDE_IMAGE_EDITOR_MAX
              )}
              alt=""
              draggable={false}
              decoding="async"
              loading={exportSnapshot ? undefined : 'lazy'}
              sx={{
                ...(heroImage
                  ? {
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                    }
                  : undefined),
                ...presentationImageElementSx(
                  element.src,
                  view.imageFit,
                  view.imageObjectPosition,
                ),
              }}
            />
            {showResizeHandle && hugImageChrome && (
              <Box
                data-resize-handle
                onPointerDown={(e) => startDrag(e, 'resize', 'br')}
                sx={{
                  ...resizeHandleSx,
                  top: 'auto',
                  bottom: `${4 * scale}px`,
                  right: `${4 * scale}px`,
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {element.type === 'image' && !element.src && editable && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${8 * scale}px`,
            bgcolor: 'transparent',
            color: 'rgba(46,125,50,0.72)',
            pointerEvents: 'none',
            userSelect: 'none',
            px: `${12 * scale}px`,
            textAlign: 'center',
            fontSize: `${14 * scale}px`,
            fontWeight: 600,
            lineHeight: 1.35,
          }}
        >
          Bild hierher ziehen
        </Box>
      )}

      {isShapeElement && (
        <Box sx={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
          <SlideShapeSvg
            kind={element.shapeKind || 'arrow'}
            strokeColor={element.strokeColor}
            fillColor={element.fillColor}
            strokeWidth={element.strokeWidth ?? 3}
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
              if (textInputTimerRef.current) {
                window.clearTimeout(textInputTimerRef.current);
                textInputTimerRef.current = null;
              }
              if (textRef.current && onChange) {
                onChange({ html: textRef.current.innerHTML });
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onInput={() => {
              if (!textRef.current || !onChange) return;
              replaceArrowShortcutsNearCursor(textRef.current);
              const html = textRef.current.innerHTML;
              if (textInputTimerRef.current) window.clearTimeout(textInputTimerRef.current);
              textInputTimerRef.current = window.setTimeout(() => {
                onChange({ html });
              }, 600);
            }}
            onKeyDown={(e) => {
              const el = textRef.current;
              if (!el) return;
              if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (tryMarkdownListShortcut(el)) {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange?.({ html: el.innerHTML });
                  return;
                }
              }
              if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
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

      {showResizeHandle && !hugImageChrome && (
        <Box
          data-resize-handle
          onPointerDown={(e) =>
            startDrag(e, 'resize', handleOnTop ? 'tr' : handleOnBottom ? 'br' : 'br')
          }
          sx={resizeHandleSx}
        />
      )}
    </Box>
  );
};

export default PresentationDraggableElement;
