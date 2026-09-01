import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { SlideElement, SLIDE_IMAGE_EDITOR_MAX, pagePctToCssPct, slideImageUrl, slideImageUrlWithoutMax } from '../../lib/presentationDeck';
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
import { isFormatBarInteracting, PRESENTATION_FORMAT_UI_BLUR_SELECTOR } from '../../lib/presentationFormatBarGuard';
import { isApplyingDeckHistory } from '../../lib/presentationEditorHistory';
import { captureEditorSelection, hydratePresentationHtmlFontSizes, PRESENTATION_CONTENT_FONT_PX } from '../../lib/presentationFontSize';
import { filterHtmlByRevealStep, hasVisibleRevealContent, isElementVisible, shouldAnimateReveal } from '../../lib/presentationReveal';
import { presentationNestedListSx } from '../../lib/presentationListStyles';
import {
  handlePresentationTabKey,
  replaceArrowShortcutsNearCursor,
  sanitizePresentationHtml,
  handlePresentationListShortcutKey,
  presentationPasteHtml,
  insertPresentationPastedHtml,
} from '../../lib/presentationRichText';
import { JOHNNY_PRESENTATION } from '../../lib/presentationTheme';
import { PRESENTATION_DEFAULT_FONT_FAMILY } from '../../lib/presentationFonts';
import { notesDropTargetHits } from '../../lib/presentationNotesImages';
import { isPenPointer } from '../../lib/presentationDrawTools';
import { imageFrameParts } from '../../lib/presentationImageFrames';
import { placeCaretBesidePresentationMath } from '../../lib/presentationPasteMath';
import {
  isDefaultTextFieldHtml,
  measureSlideBodyOrigin,
  measureTextFieldHeightPct,
  shouldAutoFitPresentationText,
  defaultEmptyTextFieldSize,
  TEXT_FIELD_PLACEHOLDER,
} from '../../lib/presentationLayouts';
import '../../styles/presentationLists.css';
import {
  effectivePresentationImageFit,
  formatImageObjectPosition,
  IMAGE_FRAME_MAX,
  IMAGE_FRAME_MIN,
  IMAGE_FRAME_SIZE_MAX,
  ensureWindowCropLock,
  imageSourceRectCss,
  isHeroSlideImage,
  isImageCropMode,
  isImageScaleHandle,
  isWindowCropMode,
  moveWindowCrop,
  normalizeImageSourceRect,
  parseImageObjectPosition,
  presentationImageElementSx,
  resizeImageFrameByHandle,
  resizeWindowCrop,
  scaleImageOnSlide,
  shouldPanCoverImageOnDrag,
  type ImageCropHandle,
} from '../../lib/presentationImageUtils';
import { SlideShapeSvg, shapeSupportsText, isLineLikeShapeKind, clientToShapeLocal } from '../../lib/presentationSlideShapes';
import { resolveCurveControl, resolveShapePoints, localPointsToSlide, clientToSlidePct, snapSlidePointAxis, rebaseShapeFromSlidePoints } from '../../lib/presentationShapePaths';
import {
  elementToRect,
  snapElementMove,
  snapElementResize,
  type ElementRect,
  type SnapGuide,
} from '../../lib/presentationElementSnap';
import {
  findTableRoot,
  getColumnWidthPercents,
  isValidPresentationTableHtml,
  setColumnWidthPercent,
} from '../../lib/presentationSlideTables';
import {
  tryStartTableResizeFromPointer,
  updateTableResizeHoverCursor,
} from '../../lib/presentationTableResize';

/** Verhindert Inline-Bilder in contentEditable beim Datei-/URL-Drop (Folie fängt den Drop ab). */
function blockFileDropIntoText(e: React.DragEvent) {
  const types = Array.from(e.dataTransfer?.types ?? []).map((t) => t.toLowerCase());
  if (
    types.includes('files') ||
    types.includes('text/uri-list') ||
    types.includes('text/html') ||
    types.includes('text/x-moz-url') ||
    types.includes('url') ||
    types.includes('application/x-moz-file')
  ) {
    e.preventDefault();
  }
}

type DragMode = 'move' | 'resize' | 'rotate' | 'shape-point' | 'shape-curve';
type ResizeCorner = 'br' | 'tr' | ImageCropHandle;

interface DragState {
  mode: DragMode;
  resizeCorner: ResizeCorner;
  startX: number;
  startY: number;
  slideW: number;
  slideH: number;
  slideLeft: number;
  slideTop: number;
  orig: SlideElement;
  imageGesture?: 'crop' | 'scale';
  shapePointIndex?: number;
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
  onDelete?: () => void;
  /** Bild auf andere Folie legen: Drop über Filmstrip-Thumbnail. */
  onMoveToSlide?: (targetSlideId: string) => void;
  /** Folien-Element in die Notizleiste legen. */
  onMoveToNotes?: (clientX: number, clientY: number) => void;
  onTextEditorFocus?: (el: HTMLElement, elementId: string, field?: 'html' | 'titleHtml') => void;
  /** Video/Embed in Präsentation bedienbar (Play, Zoom …). */
  mediaInteractive?: boolean;
  exportSnapshot?: boolean;
  imageMaxEdge?: number;
  /** Andere Elemente für Smart-Guides / Snap. */
  snapTargets?: ElementRect[];
  onSnapGuidesChange?: (guides: SnapGuide[]) => void;
  /** Wenn eine Karte gewählt ist: Bilder lassen Klicks durch (Inhalt tippen). */
  passPointerThrough?: boolean;
  /** Play: Bild mit Fingern verschieben/zuschneiden, Stift bleibt zum Malen. */
  imageEditable?: boolean;
  /** Folien-Akzent für Bildrahmen-Vorlage „Akzent“. */
  accentColor?: string;
  /** Anzahl Folienseiten (1 = 16:9, mehr = nach unten verlängert). */
  pageCount?: number;
}

const MIN_SIZE = 4;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Leerer Editor-Inhalt (inkl. nur-BR / Whitespace). */
function isEffectivelyEmptyHtml(html: string): boolean {
  const t = (html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u200B\uFEFF\s]/g, '');
  return !t;
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
  onDelete,
  onMoveToSlide,
  onMoveToNotes,
  onTextEditorFocus,
  mediaInteractive = false,
  exportSnapshot = false,
  imageMaxEdge,
  snapTargets = [],
  onSnapGuidesChange,
  passPointerThrough = false,
  imageEditable = false,
  accentColor,
  pageCount = 1,
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastFitRef = useRef({ w: 0, h: 0 });
  const autoEditOnceRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const pendingDragRef = useRef<{
    mode: DragMode;
    resizeCorner: ResizeCorner;
    startX: number;
    startY: number;
    slideW: number;
    slideH: number;
    slideLeft: number;
    slideTop: number;
    orig: SlideElement;
    pointerId: number;
    cardZone?: 'title' | 'body' | null;
    /** Tippen ohne Zug → Text/Form-Box bearbeiten (Stift: Ziehen verschiebt). */
    editOnClick?: 'text' | 'shape' | null;
    pointerType?: string;
    imageGesture?: 'crop' | 'scale';
    shapePointIndex?: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Während Drag nur lokal — kein setDeck pro Pointer-Move. */
  const [liveGeom, setLiveGeom] = useState<Partial<SlideElement> | null>(null);
  const livePatchRef = useRef<Partial<SlideElement> | null>(null);
  const rafMoveRef = useRef<number | null>(null);
  const textInputTimerRef = useRef<number | null>(null);
  const snapTargetsRef = useRef(snapTargets);
  snapTargetsRef.current = snapTargets;
  const onSnapGuidesChangeRef = useRef(onSnapGuidesChange);
  onSnapGuidesChangeRef.current = onSnapGuidesChange;
  /** Text / Form-Box erst per Doppelklick editieren. */
  const [textEditing, setTextEditing] = useState(false);
  /** Nur Titel braucht Extra-Modus; Karten-Inhalt ist bei Auswahl immer tippbar. */
  const [cardTitleEditing, setCardTitleEditing] = useState(false);
  const cardTitleRef = useRef<HTMLDivElement>(null);
  const cardBodyRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableColWidths, setTableColWidths] = useState<number[]>([]);
  const colResizeRef = useRef<{
    colIndex: number;
    startX: number;
    startLeftPct: number;
    tableWidthPx: number;
  } | null>(null);
  const selectedRef = useRef(selected);
  const lastPointerTypeRef = useRef<string>('mouse');
  selectedRef.current = selected;
  const DRAG_THRESHOLD_PX = 5;

  const elementItemId = animationItemIdForElement(element.id);
  const elementStep = element.revealStep ?? 0;
  const hasInnerParagraphSteps =
    element.type === 'text' && (element.html || '').includes('data-reveal-step');
  const hasAnimTextBlocks = element.type === 'text' && Boolean(element.html?.trim());
  const elementAnimSelected =
    selectedAnimationTarget === elementItemId ||
    selectedAnimationTarget?.startsWith(`elementParagraph:${element.id}:`);

  // Beim Öffnen des Editors Inhalt setzen (freie Textfelder per Doppelklick)
  useEffect(() => {
    if (!textEditing) return;
    if (element.type !== 'text') return;
    const el = textRef.current;
    if (!el) return;
    // Nur seeden wenn leer — sonst tippten Inhalt nicht überschreiben
    if (isEffectivelyEmptyHtml(el.innerHTML)) {
      el.innerHTML = hydratePresentationHtmlFontSizes(element.html || '<p><br></p>');
    }
    el.focus({ preventScroll: true });
    if (isDefaultTextFieldHtml(el.innerHTML) || isDefaultTextFieldHtml(element.html)) {
      const range = el.ownerDocument.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    onTextEditorFocus?.(el, element.id, 'html');
    // nur beim Eintritt in den Edit-Modus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textEditing]);

  useEffect(() => {
    if (!selected) {
      autoEditOnceRef.current = false;
      setTextEditing(false);
      setCardTitleEditing(false);
      setTableColWidths([]);
    }
  }, [selected]);

  /** Neues/leeres Textfeld: sofort tippen, Standardtext ist markiert. */
  useEffect(() => {
    if (element.type !== 'text' || !editable || !selected || animationEditMode) return;
    if (autoEditOnceRef.current) return;
    if (!isDefaultTextFieldHtml(element.html)) return;
    autoEditOnceRef.current = true;
    setTextEditing(true);
  }, [element.type, element.id, element.html, editable, selected, animationEditMode]);

  const fitTextBoxToContent = useCallback(() => {
    if (!shouldAutoFitPresentationText(element) || !editable || animationEditMode) return;
    if (dragRef.current) return;
    const contentEl = textRef.current || displayRef.current;
    const slideEl = (rootRef.current?.closest('[data-pres-slide]') as HTMLElement | null) ?? null;
    if (!contentEl || !slideEl || !onChange) return;
    const origin = measureSlideBodyOrigin(slideEl);
    const empty =
      isDefaultTextFieldHtml(contentEl.innerHTML) || isDefaultTextFieldHtml(element.html);
    if (empty) {
      const next = defaultEmptyTextFieldSize(origin.maxW);
      const prev = lastFitRef.current;
      if (Math.abs(next.w - prev.w) < 0.12 && Math.abs(next.h - prev.h) < 0.12) return;
      if (Math.abs(next.w - element.w) < 0.12 && Math.abs(next.h - element.h) < 0.12) {
        lastFitRef.current = next;
        return;
      }
      lastFitRef.current = next;
      onChange({ w: next.w, h: next.h });
      return;
    }
    const nextH = measureTextFieldHeightPct(contentEl, slideEl, 4 * scale);
    if (nextH == null) return;
    const prev = lastFitRef.current;
    if (Math.abs(nextH - prev.h) < 0.08) return;
    if (Math.abs(nextH - element.h) < 0.08) {
      lastFitRef.current = { w: element.w, h: nextH };
      return;
    }
    lastFitRef.current = { w: element.w, h: nextH };
    onChange({ h: nextH });
  }, [element, editable, animationEditMode, onChange, scale]);

  useLayoutEffect(() => {
    if (element.type !== 'text' || !textEditing) return;
    const id = window.requestAnimationFrame(() => fitTextBoxToContent());
    return () => window.cancelAnimationFrame(id);
  }, [element.type, textEditing, fitTextBoxToContent]);

  // Form-Box-Text: einmalig seeden; danach DOM behalten (kein Remount beim Auswählen)
  useLayoutEffect(() => {
    if (!shapeSupportsText(element) || !editable || animationEditMode) return;
    const el = textRef.current;
    if (!el) return;
    if (!isEffectivelyEmptyHtml(el.innerHTML)) return;
    el.innerHTML = hydratePresentationHtmlFontSizes(
      element.html || '<p style="text-align:center"><br></p>',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.id, element.type, element.shapeKind, editable, animationEditMode]);

  // Karten-Titel: beim Öffnen Inhalt vor dem Paint setzen
  useLayoutEffect(() => {
    if (element.type !== 'card' || !cardTitleEditing) return;
    const el = cardTitleRef.current;
    if (!el) return;
    el.innerHTML = hydratePresentationHtmlFontSizes(
      element.titleHtml || '<p style="text-align:center"><strong>Titel</strong></p>',
    );
    el.focus({ preventScroll: true });
    onTextEditorFocus?.(el, element.id, 'titleHtml');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardTitleEditing, element.id]);

  // Karten-Inhalt: Editor bleibt gemountet — nur initial seeden, nie beim Klick leeren
  useLayoutEffect(() => {
    if (element.type !== 'card' || !editable || animationEditMode) return;
    const el = cardBodyRef.current;
    if (!el) return;
    if (!isEffectivelyEmptyHtml(el.innerHTML)) return;
    el.innerHTML = hydratePresentationHtmlFontSizes(element.html || '<p></p>');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.id, element.type, editable, animationEditMode]);

  /** Infobox gewählt → Inhalt fokussieren (sonst wirkt contentEditable erst nach 2. Klick). */
  useEffect(() => {
    if (element.type !== 'card' || !editable || !selected || animationEditMode || cardTitleEditing)
      return;
    if (lastPointerTypeRef.current === 'pen') return;
    let cancelled = false;
    const focusBody = () => {
      if (cancelled) return;
      const el = cardBodyRef.current;
      if (!el) return;
      if (document.activeElement === el || el.contains(document.activeElement)) return;
      if (isEffectivelyEmptyHtml(el.innerHTML)) {
        el.innerHTML = hydratePresentationHtmlFontSizes(element.html || '<p></p>');
      }
      el.focus({ preventScroll: true });
      onTextEditorFocus?.(el, element.id, 'html');
    };
    const t = window.setTimeout(focusBody, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.type, element.id, editable, selected, animationEditMode, cardTitleEditing]);

  /** Nach Doppelklick tippbar — freie Textfelder. */
  useEffect(() => {
    if (element.type !== 'text' || !editable || !selected || animationEditMode || !textEditing)
      return;
    let cancelled = false;
    const focusEditor = () => {
      if (cancelled) return;
      const el = textRef.current;
      if (!el) return;
      if (document.activeElement === el || el.contains(document.activeElement)) return;
      el.focus({ preventScroll: true });
      onTextEditorFocus?.(el, element.id, 'html');
    };
    const raf1 = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(focusEditor);
    });
    const t = window.setTimeout(focusEditor, 20);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.type, element.id, editable, selected, animationEditMode, textEditing]);

  /** Tabelle: bei Auswahl Inhalt laden (sonst leerer Editor). */
  useEffect(() => {
    if (element.type !== 'table' || !editable || !selected || animationEditMode) return;
    let cancelled = false;
    const sync = () => {
      if (cancelled) return;
      const el = tableRef.current;
      if (!el) return;
      const hydrated = hydratePresentationHtmlFontSizes(element.html || '<table></table>');
      if (
        !isValidPresentationTableHtml(hydrated) &&
        el.querySelector('tr')
      ) {
        return;
      }
      const active = document.activeElement === el || el.contains(document.activeElement);
      if (!active || !el.querySelector('table')) {
        el.innerHTML = hydrated;
      }
      const table = el.querySelector('table') as HTMLTableElement | null;
      if (table) setTableColWidths(getColumnWidthPercents(table));
      if (!active) onTextEditorFocus?.(el, element.id, 'html');
    };
    const t0 = window.setTimeout(sync, 0);
    const t1 = window.setTimeout(sync, 40);
    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element.type, element.id, element.html, editable, selected, animationEditMode]);

  useEffect(() => {
    const el =
      element.type === 'table'
        ? tableRef.current
        : element.type === 'text' || (shapeSupportsText(element) && selected)
          ? textRef.current
          : null;
    if (
      !el ||
      (element.type !== 'text' &&
        element.type !== 'table' &&
        !(shapeSupportsText(element) && selected)) ||
      !editable ||
      !selected
    ) {
      return undefined;
    }
    const capture = () => captureEditorSelection(el);
    el.addEventListener('keyup', capture);
    el.addEventListener('mouseup', capture);
    document.addEventListener('selectionchange', capture);
    return () => {
      el.removeEventListener('keyup', capture);
      el.removeEventListener('mouseup', capture);
      document.removeEventListener('selectionchange', capture);
    };
  }, [element.type, element.shapeKind, editable, selected, element.id, textEditing]);

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
        slideLeft: pending.slideLeft,
        slideTop: pending.slideTop,
        orig: pending.orig,
        imageGesture: pending.imageGesture,
        shapePointIndex: pending.shapePointIndex,
      };
      pendingDragRef.current = null;
      setDragging(true);
      if (pending.mode === 'move') {
        document.body.setAttribute('data-pres-element-drag', pending.orig.type || 'element');
      }
    }

    const d = dragRef.current;
    if (!d) return;
    const pages = Math.max(1, pageCount);
    const pageH = d.slideH / pages;
    const yMax = 100 * pages;
    const dxPct = ((e.clientX - d.startX) / d.slideW) * 100;
    const dyPct = ((e.clientY - d.startY) / pageH) * 100;
    const snapEnabled = !e.metaKey && !e.ctrlKey;

    let patch: Partial<SlideElement>;
    let guides: SnapGuide[] = [];
    const slideRect = {
      left: d.slideLeft,
      top: d.slideTop,
      width: d.slideW,
      height: d.slideH,
    } as DOMRect;

    if (d.mode === 'shape-point' && d.shapePointIndex != null && isLineLikeShapeKind(d.orig.shapeKind)) {
      const idx = d.shapePointIndex;
      const slidePoints = localPointsToSlide(d.orig, resolveShapePoints(d.orig));
      const adjIdx = idx === 0 ? 1 : idx - 1;
      const adj = slidePoints[adjIdx] || slidePoints[0];
      let next = clientToSlidePct(e.clientX, e.clientY, d.slideLeft, d.slideTop, d.slideW, pageH, yMax);
      next = snapSlidePointAxis(next, adj, e.shiftKey);
      const nextSlide = slidePoints.map((p, i) => (i === idx ? next : p));
      let curveSlide: { x: number; y: number } | null = null;
      if (d.orig.shapeKind === 'curved-arrow') {
        const ctrl = resolveCurveControl(resolveShapePoints(d.orig), d.orig);
        curveSlide = localPointsToSlide(d.orig, [ctrl])[0];
      }
      patch = rebaseShapeFromSlidePoints(d.orig, nextSlide, { curveSlide });
    } else if (d.mode === 'shape-curve' && d.orig.shapeKind === 'curved-arrow') {
      const slidePoints = localPointsToSlide(d.orig, resolveShapePoints(d.orig));
      const curveSlide = clientToSlidePct(
        e.clientX,
        e.clientY,
        d.slideLeft,
        d.slideTop,
        d.slideW,
        pageH,
        yMax,
      );
      patch = rebaseShapeFromSlidePoints(d.orig, slidePoints, { curveSlide });
    } else if (d.mode === 'rotate') {
      const cx = d.slideLeft + ((d.orig.x + d.orig.w / 2) / 100) * d.slideW;
      const cy = d.slideTop + ((d.orig.y + d.orig.h / 2) / 100) * pageH;
      const a0 = Math.atan2(d.startY - cy, d.startX - cx);
      const a1 = Math.atan2(e.clientY - cy, e.clientX - cx);
      let rot = (d.orig.rotation ?? 0) + ((a1 - a0) * 180) / Math.PI;
      if (e.shiftKey) {
        rot = Math.round(rot / 15) * 15;
      } else {
        const quarter = Math.round(rot / 90) * 90;
        if (Math.abs(rot - quarter) < 6) rot = quarter;
      }
      rot = ((rot % 360) + 360) % 360;
      patch = { rotation: Math.round(rot) };
    } else if (d.mode === 'move') {
      if (isWindowCropMode(d.orig)) {
        patch = moveWindowCrop(d.orig, dxPct, dyPct);
      } else if (shouldPanCoverImageOnDrag(d.orig, { shiftKey: e.shiftKey })) {
        const pos = parseImageObjectPosition(d.orig.imageObjectPosition);
        const panGain = 1.35;
        patch = {
          imageObjectPosition: formatImageObjectPosition(
            pos.x - dxPct * panGain,
            pos.y - dyPct * panGain,
          ),
        };
      } else {
        const proposed = {
          ...elementToRect(d.orig),
          x: clamp(d.orig.x + dxPct, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
          y: clamp(d.orig.y + dyPct, IMAGE_FRAME_MIN, yMax),
        };
        const snapped = snapElementMove(proposed, snapTargetsRef.current, {
          enabled: snapEnabled,
          yMax,
        });
        patch = { x: snapped.x, y: snapped.y };
        guides = snapped.guides;
      }
    } else if (d.mode === 'resize' && d.imageGesture === 'scale') {
      patch = scaleImageOnSlide(d.orig, d.resizeCorner as ImageCropHandle, dxPct, dyPct, MIN_SIZE, yMax);
    } else if (d.mode === 'resize' && d.resizeCorner !== 'br' && d.resizeCorner !== 'tr') {
      patch = isWindowCropMode(d.orig)
        ? resizeWindowCrop(d.orig, d.resizeCorner, dxPct, dyPct, MIN_SIZE)
        : resizeImageFrameByHandle(d.orig, d.resizeCorner, dxPct, dyPct, MIN_SIZE, yMax);
    } else if (d.resizeCorner === 'tr') {
      if (isWindowCropMode(d.orig)) {
        patch = scaleImageOnSlide(d.orig, 'ne', dxPct, dyPct, MIN_SIZE, yMax);
      } else {
        const nextW = clamp(d.orig.w + dxPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
        const nextH = clamp(d.orig.h - dyPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
        const deltaH = d.orig.h - nextH;
        const proposed = {
          ...elementToRect(d.orig),
          w: nextW,
          h: nextH,
          y: clamp(d.orig.y + deltaH, IMAGE_FRAME_MIN, yMax),
        };
        const snapped = snapElementResize(proposed, 'tr', snapTargetsRef.current, {
          enabled: snapEnabled,
          yMax,
        });
        patch = { x: snapped.x, y: snapped.y, w: snapped.w, h: snapped.h };
        guides = snapped.guides;
      }
    } else if (isWindowCropMode(d.orig)) {
      patch = scaleImageOnSlide(d.orig, 'se', dxPct, dyPct, MIN_SIZE, yMax);
    } else {
      const proposed = {
        ...elementToRect(d.orig),
        w: clamp(d.orig.w + dxPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
        h: clamp(d.orig.h + dyPct, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
      };
        const snapped = snapElementResize(proposed, 'br', snapTargetsRef.current, {
          enabled: snapEnabled,
          yMax,
        });
      patch = { w: snapped.w, h: snapped.h };
      guides = snapped.guides;
    }

    livePatchRef.current = patch;
    onSnapGuidesChangeRef.current?.(guides);
    if (rafMoveRef.current != null) return;
    rafMoveRef.current = window.requestAnimationFrame(() => {
      rafMoveRef.current = null;
      if (livePatchRef.current) setLiveGeom(livePatchRef.current);
    });
  }, [pageCount]);

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
      onSnapGuidesChangeRef.current?.([]);
      window.removeEventListener('pointermove', pointerMove, true);
      window.removeEventListener('pointerup', pointerUp, true);
      window.removeEventListener('pointercancel', pointerUp, true);

      // Element auf Filmstrip-Folie oder in Notizen fallen lassen
      if (wasDragging && dragMode === 'move') {
        if (onMoveToNotes && notesDropTargetHits(e.clientX, e.clientY)) {
          onMoveToNotes(e.clientX, e.clientY);
          try {
            (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
          } catch {
            /* ignore */
          }
          return;
        }
        if (onMoveToSlide) {
          const thumbs = document.querySelectorAll('[data-pres-filmstrip-slide]');
          let targetSlideId: string | null = null;
          thumbs.forEach((thumb) => {
            if (targetSlideId) return;
            const r = thumb.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
              targetSlideId = thumb.getAttribute('data-pres-filmstrip-slide');
            }
          });
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
      }

      if (wasDragging && finalPatch && onChange) {
        onChange(finalPatch);
      }

      // Karte: Klick ohne Ziehen auf Titelkopf → Titel tippen
      if (
        !wasDragging &&
        pending &&
        pending.mode === 'move' &&
        pending.pointerType !== 'pen' &&
        element.type === 'card' &&
        editable &&
        !animationEditMode &&
        selectedRef.current &&
        pending.cardZone === 'title'
      ) {
        setCardTitleEditing(true);
      }

      // Text/Form: Klick ohne Zug → tippen; Ziehen (auch Stift) → verschieben
      if (
        !wasDragging &&
        pending?.pointerType !== 'pen' &&
        pending?.editOnClick === 'text' &&
        editable &&
        !animationEditMode
      ) {
        setTextEditing(true);
      }
      if (
        !wasDragging &&
        pending?.pointerType !== 'pen' &&
        pending?.editOnClick === 'shape' &&
        editable &&
        !animationEditMode
      ) {
        window.setTimeout(() => {
          const el = textRef.current;
          if (!el) return;
          if (isEffectivelyEmptyHtml(el.innerHTML)) {
            el.innerHTML = hydratePresentationHtmlFontSizes(
              element.html || '<p style="text-align:center"><br></p>',
            );
          }
          el.focus({ preventScroll: true });
          onTextEditorFocus?.(el, element.id, 'html');
        }, 50);
      }

      try {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [pointerMove, element.type, element.html, editable, animationEditMode, onChange, onMoveToSlide, onMoveToNotes, onTextEditorFocus, element.id]
  );

  const imageOnlyEdit = Boolean(imageEditable && element.type === 'image' && onChange);
  const canEdit = Boolean(editable || imageOnlyEdit);

  const startDrag = (
    e: React.PointerEvent,
    mode: DragMode,
    resizeCorner: ResizeCorner = 'br',
    cardZone: 'title' | 'body' | null = null,
    editOnClick: 'text' | 'shape' | null = null,
  ) => {
    if (!canEdit || !onChange) return;
    if (imageOnlyEdit && e.pointerType === 'pen') return;
    const slide = (e.currentTarget as HTMLElement).closest('[data-pres-slide]') as HTMLElement | null;
    const rect = slide?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    if (textEditing) setTextEditing(false);
    if (cardTitleEditing && mode === 'move' && e.detail < 2) setCardTitleEditing(false);
    onSelect?.();
    let orig: SlideElement = { ...element };
    let imageGesture: 'crop' | 'scale' | undefined;
    if (mode === 'resize' && orig.type === 'image' && resizeCorner !== 'br' && resizeCorner !== 'tr') {
      // Ecken = Größe auf der Folie; Kanten = Ausschnitt (auch nach Zuschneiden).
      if (isImageScaleHandle(resizeCorner)) {
        imageGesture = 'scale';
      } else {
        imageGesture = 'crop';
        if (!normalizeImageSourceRect(orig.imageSourceRect)) {
          const img = (e.currentTarget as HTMLElement).closest('[data-pres-element]')?.querySelector('img');
          const natural =
            img && img.naturalWidth > 0 && img.naturalHeight > 0
              ? { w: img.naturalWidth, h: img.naturalHeight }
              : null;
          orig = ensureWindowCropLock(orig, natural);
          onChange({
            x: orig.x,
            y: orig.y,
            w: orig.w,
            h: orig.h,
            imageSourceRect: orig.imageSourceRect,
            imageFit: 'contain',
          });
        }
      }
    }
    pendingDragRef.current = {
      mode,
      resizeCorner,
      startX: e.clientX,
      startY: e.clientY,
      slideW: rect.width,
      slideH: rect.height,
      slideLeft: rect.left,
      slideTop: rect.top,
      orig,
      pointerId: e.pointerId,
      cardZone,
      editOnClick,
      pointerType: e.pointerType,
      imageGesture,
    };
    // currentTarget = Element-Box bzw. Resize-Handle — zuverlässiger als innere Targets
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    window.addEventListener('pointermove', pointerMove, true);
    window.addEventListener('pointerup', pointerUp, true);
    window.addEventListener('pointercancel', pointerUp, true);
  };

  const startShapeHandleDrag = (
    e: React.PointerEvent,
    mode: 'shape-point' | 'shape-curve',
    pointIndex?: number,
  ) => {
    if (!canEdit || !onChange) return;
    const slide = (e.currentTarget as HTMLElement).closest('[data-pres-slide]') as HTMLElement | null;
    const rect = slide?.getBoundingClientRect();
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.();
    pendingDragRef.current = {
      mode,
      resizeCorner: 'br',
      startX: e.clientX,
      startY: e.clientY,
      slideW: rect.width,
      slideH: rect.height,
      slideLeft: rect.left,
      slideTop: rect.top,
      orig: { ...element },
      pointerId: e.pointerId,
      shapePointIndex: pointIndex,
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    window.addEventListener('pointermove', pointerMove, true);
    window.addEventListener('pointerup', pointerUp, true);
    window.addEventListener('pointercancel', pointerUp, true);
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

  const isLineShape =
    view.type === 'shape' && isLineLikeShapeKind(view.shapeKind || 'arrow');
  const shapePointsView = isLineShape ? resolveShapePoints(view) : [];
  const shapeCurveView =
    view.shapeKind === 'curved-arrow' ? resolveCurveControl(shapePointsView, view) : null;

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

  const displayHtml = hydratePresentationHtmlFontSizes(
    element.type === 'text' && revealEnabled && hasInnerParagraphSteps && !editable && !animationEditMode
      ? filterHtmlByRevealStep(element.html || '', revealStep, true)
      : element.type === 'table'
        ? element.html || '<table></table>'
        : element.html || '<p><br></p>',
  );

  const isImageElement = element.type === 'image';
  const pictureFrame = imageFrameParts(
    element.imageFrame,
    scale,
    accentColor || JOHNNY_PRESENTATION.primary,
  );
  const pictureFrameOn = isImageElement && pictureFrame.active;
  const heroImage = isImageElement && isHeroSlideImage(view);
  const windowCropRect = isImageElement ? normalizeImageSourceRect(view.imageSourceRect) : null;
  const windowCrop = Boolean(windowCropRect);
  const cropMode = isImageElement && (windowCrop || isImageCropMode(view) || imageOnlyEdit);
  const imageFit = effectivePresentationImageFit(view.src, view.imageFit);
  /** Contain: Rahmen/Handles am sichtbaren Bild, nicht am leeren Elementkasten. */
  const hugImageChrome =
    isImageElement &&
    Boolean(element.src?.trim()) &&
    !heroImage &&
    !windowCrop &&
    imageFit !== 'cover';
  const showSelectionChrome = canEdit && selected && !animationEditMode;
  const isShapeElement = element.type === 'shape';
  const isShapeBox = shapeSupportsText(element);
  /** Freie Textfelder: Doppelklick. Form-Boxen: bei Auswahl sofort tippbar (wie Karten). */
  const showTextEditor =
    showSelectionChrome &&
    (element.type === 'text'
      ? textEditing
      : isShapeBox
        ? true
        : false);
  const isTableElement = element.type === 'table';
  const showTableEditor = showSelectionChrome && isTableElement;
  const isCardElement = element.type === 'card';
  const showCardTitleEditor = showSelectionChrome && isCardElement && cardTitleEditing;
  /** Inhalt bei Auswahl immer tippbar — kein Extra-Klick-Tanz. */
  const showCardBodyEditor = showSelectionChrome && isCardElement;
  /** Größe immer anpassen können — auch während Tippen (Handle außerhalb). */
  const showResizeHandle = showSelectionChrome;
  const shapeBodyHtml = hydratePresentationHtmlFontSizes(
    element.html || '<p style="text-align:center"><br></p>',
  );
  const textFill = element.type === 'text' ? element.fillColor : undefined;
  const textBaseFs = PRESENTATION_CONTENT_FONT_PX;
  const cardAccent = element.strokeColor || '#1565C0';
  const cardHeaderBg = element.fillColor || 'rgba(21,101,192,0.14)';
  const cardTitleHtml = hydratePresentationHtmlFontSizes(
    element.titleHtml || '<p style="text-align:center"><strong>Titel</strong></p>',
  );
  const cardBodyHtml = hydratePresentationHtmlFontSizes(element.html || '<p></p>');
  const isFullscreenish = view.w >= 96 && view.h >= 96;
  const nearBottomEdge = view.y + view.h >= 88;
  const handleOnTop = !heroImage && (isFullscreenish || nearBottomEdge);
  const handleOnBottom = heroImage;
  const handleInsetPx = (isFullscreenish ? 6 : 4) * scale;
  const handleSizePx = (isFullscreenish ? 20 : 16) * scale;

  const showElementBadge =
    animationEditMode && elementHasRevealAssignment(element) && element.type === 'image';
  const isMediaElement = element.type === 'video' || element.type === 'embed';
  const mediaInteract = isMediaElement && mediaInteractive && !editable;
  const mediaAllowZoom = element.type === 'embed' && mediaInteractive && !editable;
  const htmlHasEntryTicketLink =
    typeof element.html === 'string' &&
    (/data-pres-entry-ticket/.test(element.html) || /jm=lesson-entry/.test(element.html));
  const htmlHasClickableLink =
    htmlHasEntryTicketLink ||
    (typeof element.html === 'string' && /<a\s[^>]*href=/i.test(element.html));
  /** Play/TABLET: Links (v. a. Entry-Ticket-E) müssen tippbar sein — auch unter pointer-events:none-Ahnen. */
  const playLinkHitTarget = !editable && !animationEditMode && htmlHasClickableLink;

  const imageSelectionBorder =
    hugImageChrome || pictureFrameOn
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
            : undefined;

  /** Keine Dauer-Ränder um Bilder — Rahmen nur bei Auswahl / Animationsziel, außer Bildrahmen. */
  const hugChromeBorder =
    pictureFrameOn
      ? undefined
      : showSelectionChrome
        ? `${2 * scale}px solid #2E7D32`
        : animationEditMode && elementAnimSelected
          ? `${2 * scale}px solid #E65100`
          : undefined;

  const pictureSelectOutline =
    pictureFrameOn && (showSelectionChrome || (animationEditMode && elementAnimSelected))
      ? `${2 * scale}px solid ${animationEditMode && elementAnimSelected ? '#E65100' : '#2E7D32'}`
      : undefined;

  const resizeHandleSx = {
    position: 'absolute' as const,
    ...(handleOnTop
      ? { top: `${handleInsetPx}px`, right: `${handleInsetPx}px` }
      : { bottom: `${handleInsetPx}px`, right: `${handleInsetPx}px` }),
    width: `${handleSizePx}px`,
    height: `${handleSizePx}px`,
    bgcolor: heroImage ? 'rgba(46,125,50,0.82)' : '#2E7D32',
    borderRadius: `${2 * scale}px`,
    cursor: 'nwse-resize' as const,
    border: heroImage ? 'none' : `${1.5 * scale}px solid #fff`,
    boxShadow: heroImage ? '0 1px 4px rgba(0,0,0,0.28)' : '0 1px 4px rgba(0,0,0,0.35)',
    zIndex: 30,
    pointerEvents: 'auto' as const,
    touchAction: 'none' as const,
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: `${-18 * scale}px`,
    },
  };

  return (
    <Box
      ref={rootRef}
      data-pres-element={element.id}
      data-pres-element-type={element.type}
      onDragOver={blockFileDropIntoText}
      onDrop={blockFileDropIntoText}
      onPointerDown={(e) => {
        lastPointerTypeRef.current = e.pointerType || 'mouse';
        if (animationEditMode) {
          handleAnimationClick(e);
          return;
        }
        if (placeCaretBesidePresentationMath(e.nativeEvent)) {
          e.stopPropagation();
          onSelect?.();
          if (element.type === 'text') setTextEditing(true);
          return;
        }
        if (!canEdit) return;
        if (imageOnlyEdit && e.pointerType === 'pen') return;
        if (imageOnlyEdit) {
          e.preventDefault();
          e.stopPropagation();
          onSelect?.();
          startDrag(e, 'move');
          return;
        }
        if (isMediaElement && mediaInteractive) return;
        if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
        if ((e.target as HTMLElement).closest('[data-rotate-handle]')) return;
        if ((e.target as HTMLElement).closest('[data-col-resize]')) return;
        if ((e.target as HTMLElement).closest('[data-element-delete]')) return;
        const hit = e.target as HTMLElement;
        const onCardTitle = Boolean(hit.closest('[data-card-title]'));
        const onCardBody = Boolean(hit.closest('[data-card-body]'));
        const onTableDrag = Boolean(hit.closest('[data-table-drag]'));
        const onTextEdit = Boolean(hit.closest('[data-text-edit], [data-shape-body]'));
        const mouseSelectingText =
          e.pointerType === 'mouse' &&
          onTextEdit &&
          (textEditing || document.activeElement === textRef.current);

        // Textfeld: Doppelklick → tippen
        if (e.detail >= 2 && element.type === 'text') {
          e.stopPropagation();
          onSelect?.();
          setTextEditing(true);
          return;
        }

        // Form-Box: Ziehen (auch Stift) verschiebt; Tippen ohne Zug → tippen
        if (isShapeBox) {
          const onShapeText = Boolean(hit.closest('[data-shape-body], [data-text-edit]'));
          if (onShapeText && !mouseSelectingText) {
            e.preventDefault();
            startDrag(e, 'move', 'br', null, 'shape');
            return;
          }
        }

        // Tabelle: Ziehen nur am Griff oben; Zellen tippen sonst
        if (isTableElement && !onTableDrag) {
          e.stopPropagation();
          onSelect?.();
          if (!isPenPointer(e)) {
            window.setTimeout(() => tableRef.current?.focus({ preventScroll: true }), 0);
          }
          return;
        }

        // Karte: Inhalt nicht ziehen — Auswahl + Tippen (Stift: verschieben, nicht tippen)
        if (isCardElement && onCardBody && !onCardTitle) {
          if (isPenPointer(e)) {
            e.preventDefault();
            startDrag(e, 'move', 'br', 'body');
            return;
          }
          e.stopPropagation();
          onSelect?.();
          setCardTitleEditing(false);
          window.setTimeout(() => {
            const el = cardBodyRef.current;
            if (!el) return;
            if (isEffectivelyEmptyHtml(el.innerHTML)) {
              el.innerHTML = hydratePresentationHtmlFontSizes(element.html || '<p></p>');
            }
            el.focus({ preventScroll: true });
            onTextEditorFocus?.(el, element.id, 'html');
          }, 50);
          return;
        }

        // Karte: Doppelklick / Klick auf Titel → Titel tippen oder ziehen
        if (isCardElement && onCardTitle && e.detail >= 2) {
          e.stopPropagation();
          onSelect?.();
          setCardTitleEditing(true);
          return;
        }

        if (mouseSelectingText) return;

        if (element.type === 'text' && onTextEdit && !mouseSelectingText) {
          e.preventDefault();
          startDrag(e, 'move', 'br', null, 'text');
          return;
        }

        if (!selected) onSelect?.();
        startDrag(
          e,
          'move',
          'br',
          isCardElement ? (onCardTitle ? 'title' : onCardBody ? 'body' : null) : null,
          element.type === 'text' ? 'text' : isShapeBox ? 'shape' : null,
        );
      }}
      onClick={(e) => {
        if (!imageOnlyEdit) return;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        if (!editable || animationEditMode) return;
        if (element.type === 'text') {
          e.stopPropagation();
          onSelect?.();
          setTextEditing(true);
          return;
        }
        if (isShapeBox) {
          e.stopPropagation();
          onSelect?.();
          window.setTimeout(() => {
            textRef.current?.focus({ preventScroll: true });
            if (textRef.current) onTextEditorFocus?.(textRef.current, element.id, 'html');
          }, 0);
          return;
        }
        if (element.type === 'card') {
          e.stopPropagation();
          onSelect?.();
          const hit = e.target as HTMLElement;
          if (hit.closest('[data-card-title]')) {
            setCardTitleEditing(true);
          } else {
            setCardTitleEditing(false);
            window.setTimeout(() => cardBodyRef.current?.focus({ preventScroll: true }), 0);
          }
        }
      }}
      sx={{
        position: 'absolute',
        left: `${view.x}%`,
        top: `${pagePctToCssPct(view.y, pageCount)}%`,
        width: `${view.w}%`,
        height: `${pagePctToCssPct(view.h, pageCount)}%`,
        zIndex:
          10 +
          element.zIndex +
          (dragging ? 200 : 0) +
          (showSelectionChrome ? 80 : 0) +
          (animationEditMode && elementAnimSelected ? 50 : 0),
        animation: shouldAnimateReveal(elementStep, revealStep, revealEnabled)
          ? 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both'
          : undefined,
        borderRadius: isImageElement || isShapeElement ? 0 : isCardElement ? `${10 * scale}px` : `${6 * scale}px`,
        overflow:
          showSelectionChrome ||
          exportSnapshot ||
          isShapeElement ||
          isCardElement ||
          pictureFrameOn
            ? 'visible'
            : 'hidden',
        transform:
          isShapeElement && typeof view.rotation === 'number' && view.rotation % 360 !== 0
            ? `rotate(${view.rotation}deg)`
            : undefined,
        transformOrigin: 'center center',
        border: isCardElement
          ? undefined
          : imageSelectionBorder,
        boxSizing: 'border-box',
        bgcolor:
          element.type === 'text' && textFill
            ? textFill
            : element.type === 'text' && showTextEditor
              ? 'rgba(255,255,255,0.97)'
              : isCardElement
                ? 'transparent'
                : 'transparent',
        boxShadow:
          element.type === 'text' && element.strokeColor
            ? `inset 0 0 0 ${Math.max(1, (element.strokeWidth || 2) * scale)}px ${element.strokeColor}`
            : undefined,
        cursor: animationEditMode
          ? 'pointer'
          : imageOnlyEdit
            ? dragging
              ? 'move'
              : showSelectionChrome
                ? 'grab'
                : 'pointer'
          : editable
            ? dragging
              ? cropMode
                ? 'move'
                : 'grabbing'
              : showTextEditor ||
                  showTableEditor ||
                  showCardTitleEditor ||
                  showCardBodyEditor
                ? 'text'
                : cropMode && showSelectionChrome
                  ? 'move'
                  : showSelectionChrome
                    ? 'grab'
                    : 'pointer'
            : isMediaElement && mediaInteractive
              ? 'default'
              : undefined,
        touchAction:
          isMediaElement && mediaInteractive
            ? 'manipulation'
            : playLinkHitTarget
              ? 'manipulation'
              : 'none',
        // Karten: Rahmen durchlässig für Bilder darüber; Titel+Inhalt immer greifbar.
        // Bilder: durchlassen, wenn eine Karte gewählt ist (Inhalt tippen).
        pointerEvents:
          passPointerThrough && isImageElement && !selected
            ? 'none'
            : isCardElement
              ? editable || animationEditMode
                ? 'auto'
                : 'none'
              : editable ||
                  animationEditMode ||
                  imageOnlyEdit ||
                  (isMediaElement && mediaInteractive) ||
                  playLinkHitTarget
                ? 'auto'
                : 'none',
        // Links in Folien-HTML bleiben klickbar (CSS: [data-pres-html] a)
        '& a[href]': {
          pointerEvents: 'auto',
          cursor: 'pointer',
          color: htmlHasEntryTicketLink ? '#fff' : '#1565C0',
          textDecoration: htmlHasEntryTicketLink ? 'none' : 'underline',
          position: 'relative',
          zIndex: 2,
          WebkitTapHighlightColor: 'rgba(30,136,229,0.35)',
          touchAction: 'manipulation',
        },
        willChange: dragging ? 'left, top, width, height' : undefined,
        outline: isCardElement && showSelectionChrome ? `${2 * scale}px solid #2E7D32` : undefined,
        outlineOffset: isCardElement && showSelectionChrome ? `${2 * scale}px` : undefined,
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
              overflow: pictureFrameOn ? 'visible' : windowCrop || cropMode || hugImageChrome ? 'hidden' : 'visible',
              width: '100%',
              height: '100%',
              ...(pictureFrameOn ? pictureFrame.wrap : undefined),
              outline: pictureSelectOutline,
              outlineOffset: pictureSelectOutline ? `${2 * scale}px` : undefined,
              ...(cropMode && showSelectionChrome
                ? {
                    boxShadow: `inset 0 0 0 ${2 * scale}px #2E7D32`,
                  }
                : undefined),
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: windowCrop ? 'hidden' : undefined,
                ...(pictureFrameOn ? pictureFrame.inner : undefined),
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
              onError={(event) => {
                const img = event.currentTarget;
                if (img.dataset.presRetry === '1') return;
                const next = slideImageUrlWithoutMax(img.currentSrc || img.src);
                if (next && next !== img.src) {
                  img.dataset.presRetry = '1';
                  img.src = next;
                }
              }}
              sx={{
                ...(heroImage
                  ? {
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                    }
                  : undefined),
                ...(windowCrop && windowCropRect
                  ? imageSourceRectCss(
                      { x: view.x, y: view.y, w: view.w, h: view.h },
                      windowCropRect,
                    )
                  : presentationImageElementSx(
                      element.src,
                      view.imageFit,
                      view.imageObjectPosition,
                    )),
                ...(pictureFrameOn ? pictureFrame.img : undefined),
              }}
            />
            </Box>
            {showResizeHandle && hugImageChrome && (
              <Box
                data-resize-handle
                onPointerDown={(e) => startDrag(e, 'resize', 'br')}
                sx={{
                  ...resizeHandleSx,
                  top: 'auto',
                  bottom: `${3 * scale}px`,
                  right: `${3 * scale}px`,
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
        <Box sx={{ width: '100%', height: '100%', pointerEvents: 'none', position: 'relative' }}>
          <SlideShapeSvg element={view} />
          {isShapeBox &&
            (editable && !animationEditMode && !exportSnapshot ? (
              <Box
                ref={textRef}
                data-shape-body
                {...(showSelectionChrome ? { 'data-text-edit': true } : {})}
                data-pres-rich-zone
                data-pres-base-fs={String(textBaseFs)}
                contentEditable={showSelectionChrome}
                suppressContentEditableWarning
                onFocus={() => {
                  if (textRef.current) onTextEditorFocus?.(textRef.current, element.id, 'html');
                }}
                onBlur={(e) => {
                  if (isApplyingDeckHistory() || isFormatBarInteracting()) return;
                  const next = e.relatedTarget as HTMLElement | null;
                  if (next?.closest(PRESENTATION_FORMAT_UI_BLUR_SELECTOR)) return;
                  if (textInputTimerRef.current) {
                    window.clearTimeout(textInputTimerRef.current);
                    textInputTimerRef.current = null;
                  }
                  if (textRef.current && onChange) {
                    onChange({ html: sanitizePresentationHtml(textRef.current.innerHTML) });
                  }
                }}
                onPointerDown={(e) => {
                  if (!showSelectionChrome) return;
                  if (placeCaretBesidePresentationMath(e.nativeEvent)) {
                    e.stopPropagation();
                    return;
                  }
                  const mouseSelecting =
                    e.pointerType === 'mouse' &&
                    (document.activeElement === textRef.current || e.currentTarget.contains(document.activeElement));
                  if (mouseSelecting) {
                    e.stopPropagation();
                    return;
                  }
                  e.preventDefault();
                  startDrag(e, 'move', 'br', null, 'shape');
                }}
                onPaste={(e) => {
                  if (!showSelectionChrome) return;
                  e.preventDefault();
                  const cleaned = presentationPasteHtml(e.clipboardData);
                  if (textRef.current) insertPresentationPastedHtml(textRef.current, cleaned);
                  if (textRef.current) {
                    onChange?.({ html: sanitizePresentationHtml(textRef.current.innerHTML) });
                  }
                }}
                onInput={() => {
                  if (!showSelectionChrome || !textRef.current || !onChange) return;
                  const html = textRef.current.innerHTML;
                  if (textInputTimerRef.current) window.clearTimeout(textInputTimerRef.current);
                  textInputTimerRef.current = window.setTimeout(() => {
                    onChange({ html: sanitizePresentationHtml(html) });
                  }, 400);
                }}
                onKeyDown={(e) => {
                  if (!showSelectionChrome) return;
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (textInputTimerRef.current) {
                      window.clearTimeout(textInputTimerRef.current);
                      textInputTimerRef.current = null;
                    }
                    if (textRef.current && onChange) {
                      onChange({ html: sanitizePresentationHtml(textRef.current.innerHTML) });
                    }
                    textRef.current?.blur();
                    return;
                  }
                  if (handlePresentationListShortcutKey(e, textRef.current)) {
                    if (textRef.current) {
                      onChange?.({ html: sanitizePresentationHtml(textRef.current.innerHTML) });
                    }
                    return;
                  }
                }}
                sx={{
                  position: 'absolute',
                  inset: '14%',
                  outline: showSelectionChrome ? `1px dashed ${(element.strokeColor || '#1565C0')}66` : 'none',
                  borderRadius: `${4 * scale}px`,
                  fontSize: `${textBaseFs * scale}px`,
                  fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
                  lineHeight: 1.35,
                  color: JOHNNY_PRESENTATION.textPrimary,
                  textAlign: 'center',
                  overflow: 'auto',
                  cursor: showSelectionChrome ? 'text' : 'inherit',
                  bgcolor: showSelectionChrome ? 'rgba(255,255,255,0.45)' : 'transparent',
                  p: `${4 * scale}px`,
                  boxSizing: 'border-box',
                  pointerEvents: showSelectionChrome ? 'auto' : 'none',
                  '& p': { m: 0, mb: `${2 * scale}px` },
                }}
              />
            ) : (
              <Box
                data-shape-body
                data-pres-html
                sx={{
                  position: 'absolute',
                  inset: '14%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  fontSize: `${textBaseFs * scale}px`,
                  fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
                  lineHeight: 1.35,
                  color: JOHNNY_PRESENTATION.textPrimary,
                  textAlign: 'center',
                  pointerEvents: 'none',
                  '& p': { m: 0, mb: `${2 * scale}px` },
                }}
                dangerouslySetInnerHTML={{ __html: shapeBodyHtml }}
              />
            ))}
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

      {isCardElement && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: `${10 * scale}px`,
            overflow: 'hidden',
            border: `${Math.max(2, (element.strokeWidth || 2.5) * scale)}px solid ${cardAccent}`,
            bgcolor: 'transparent',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            '& [data-card-title], & [data-card-body], & [data-text-edit]': {
              pointerEvents: 'auto',
            },
          }}
        >
          <Box
            data-card-title
            onDoubleClick={(e) => {
              if (!editable || animationEditMode) return;
              e.stopPropagation();
              onSelect?.();
              setCardTitleEditing(true);
            }}
            sx={{
              flex: '0 0 auto',
              minHeight: `${36 * scale}px`,
              bgcolor: cardHeaderBg,
              borderBottom: `${Math.max(1.5, scale)}px solid ${cardAccent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: `${10 * scale}px`,
              py: `${8 * scale}px`,
              color: cardAccent,
              pointerEvents: 'auto',
              cursor: editable
                ? showCardTitleEditor
                  ? 'text'
                  : 'grab'
                : undefined,
            }}
          >
            {showCardTitleEditor ? (
              <Box
                ref={cardTitleRef}
                data-text-edit
                data-pres-rich-zone
                data-pres-base-fs={String(Math.round(textBaseFs * 1.05))}
                contentEditable
                suppressContentEditableWarning
                onFocus={() => {
                  if (cardTitleRef.current) {
                    onTextEditorFocus?.(cardTitleRef.current, element.id, 'titleHtml');
                  }
                }}
                onBlur={(e) => {
                  if (isApplyingDeckHistory() || isFormatBarInteracting()) return;
                  const next = e.relatedTarget as HTMLElement | null;
                  if (next?.closest(PRESENTATION_FORMAT_UI_BLUR_SELECTOR)) return;
                  if (cardTitleRef.current && onChange) {
                    onChange({
                      titleHtml: sanitizePresentationHtml(cardTitleRef.current.innerHTML),
                    });
                  }
                  setCardTitleEditing(false);
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === 'pen' || e.pointerType === 'touch') {
                    e.preventDefault();
                    startDrag(e, 'move', 'br', 'title');
                    return;
                  }
                  e.stopPropagation();
                }}
                onInput={() => {
                  if (!cardTitleRef.current || !onChange) return;
                  const titleHtml = cardTitleRef.current.innerHTML;
                  if (textInputTimerRef.current) window.clearTimeout(textInputTimerRef.current);
                  textInputTimerRef.current = window.setTimeout(() => {
                    onChange({ titleHtml: sanitizePresentationHtml(titleHtml) });
                  }, 400);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (cardTitleRef.current && onChange) {
                      onChange({
                        titleHtml: sanitizePresentationHtml(cardTitleRef.current.innerHTML),
                      });
                    }
                    setCardTitleEditing(false);
                  }
                }}
                sx={{
                  width: '100%',
                  outline: 'none',
                  fontSize: `${textBaseFs * 1.05 * scale}px`,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: cardAccent,
                  textAlign: 'center',
                  cursor: 'text',
                  '& p': { m: 0 },
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  fontSize: `${textBaseFs * 1.05 * scale}px`,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: cardAccent,
                  textAlign: 'center',
                  '& p': { m: 0 },
                  '& strong': { fontWeight: 800 },
                }}
                dangerouslySetInnerHTML={{ __html: cardTitleHtml }}
              />
            )}
          </Box>
          <Box
            data-card-body
            sx={{
              flex: 1,
              minHeight: 0,
              bgcolor: 'transparent',
              px: `${8 * scale}px`,
              py: `${8 * scale}px`,
              // Immer greifbar zum Auswählen/Tippen — sonst geht der Klick „durch“ die Box
              pointerEvents: editable && !animationEditMode ? 'auto' : 'none',
              position: 'relative',
            }}
          >
            {editable && !animationEditMode && !exportSnapshot ? (
              <Box
                ref={cardBodyRef}
                {...(showCardBodyEditor ? { 'data-text-edit': true } : {})}
                data-pres-rich-zone
                data-pres-base-fs={String(textBaseFs)}
                contentEditable={showCardBodyEditor}
                suppressContentEditableWarning
                onFocus={() => {
                  if (!showCardBodyEditor) return;
                  if (cardBodyRef.current) {
                    onTextEditorFocus?.(cardBodyRef.current, element.id, 'html');
                  }
                }}
                onBlur={(e) => {
                  if (isApplyingDeckHistory() || isFormatBarInteracting()) return;
                  const next = e.relatedTarget as HTMLElement | null;
                  if (next?.closest(PRESENTATION_FORMAT_UI_BLUR_SELECTOR)) return;
                  if (textInputTimerRef.current) {
                    window.clearTimeout(textInputTimerRef.current);
                    textInputTimerRef.current = null;
                  }
                  if (cardBodyRef.current && onChange) {
                    onChange({ html: sanitizePresentationHtml(cardBodyRef.current.innerHTML) });
                  }
                }}
                onPointerDown={(e) => {
                  if (!showCardBodyEditor) return;
                  if (placeCaretBesidePresentationMath(e.nativeEvent)) {
                    e.stopPropagation();
                    return;
                  }
                  if (isPenPointer(e)) {
                    e.preventDefault();
                    return;
                  }
                  e.stopPropagation();
                }}
                onPaste={(e) => {
                  if (!showCardBodyEditor) return;
                  e.preventDefault();
                  const cleaned = presentationPasteHtml(e.clipboardData);
                  if (cardBodyRef.current) insertPresentationPastedHtml(cardBodyRef.current, cleaned);
                  if (cardBodyRef.current) {
                    onChange?.({ html: sanitizePresentationHtml(cardBodyRef.current.innerHTML) });
                  }
                }}
                onInput={() => {
                  if (!showCardBodyEditor || !cardBodyRef.current || !onChange) return;
                  const html = cardBodyRef.current.innerHTML;
                  if (textInputTimerRef.current) window.clearTimeout(textInputTimerRef.current);
                  textInputTimerRef.current = window.setTimeout(() => {
                    onChange({ html: sanitizePresentationHtml(html) });
                  }, 400);
                }}
                onKeyDown={(e) => {
                  if (!showCardBodyEditor) return;
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (textInputTimerRef.current) {
                      window.clearTimeout(textInputTimerRef.current);
                      textInputTimerRef.current = null;
                    }
                    if (cardBodyRef.current && onChange) {
                      onChange({ html: sanitizePresentationHtml(cardBodyRef.current.innerHTML) });
                    }
                    cardBodyRef.current?.blur();
                    return;
                  }
                  if (handlePresentationListShortcutKey(e, cardBodyRef.current)) {
                    if (cardBodyRef.current) {
                      onChange?.({ html: sanitizePresentationHtml(cardBodyRef.current.innerHTML) });
                    }
                    return;
                  }
                }}
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: `${64 * scale}px`,
                  overflow: showCardBodyEditor ? 'auto' : 'hidden',
                  outline: showCardBodyEditor ? `1px dashed ${cardAccent}66` : 'none',
                  fontSize: `${textBaseFs * scale}px`,
                  fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
                  lineHeight: 1.4,
                  color: JOHNNY_PRESENTATION.textPrimary,
                  cursor: showCardBodyEditor ? 'text' : editable ? 'pointer' : 'inherit',
                  boxSizing: 'border-box',
                  bgcolor: showCardBodyEditor ? 'rgba(255,255,255,0.55)' : 'transparent',
                  borderRadius: `${4 * scale}px`,
                  p: `${6 * scale}px`,
                  pointerEvents: editable && !animationEditMode ? 'auto' : 'none',
                  '& p': { mt: 0, mr: 0, mb: `${4 * scale}px` },
                }}
              />
            ) : (
              <Box
                data-pres-html
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: `${48 * scale}px`,
                  overflow: 'hidden',
                  fontSize: `${textBaseFs * scale}px`,
                  fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
                  lineHeight: 1.4,
                  color: JOHNNY_PRESENTATION.textPrimary,
                  pointerEvents: 'none',
                  '& p': { mt: 0, mr: 0, mb: `${4 * scale}px` },
                }}
                dangerouslySetInnerHTML={{ __html: cardBodyHtml }}
              />
            )}
          </Box>
        </Box>
      )}

      {isTableElement && (
        <>
          {showTableEditor && (
            <Box
              data-table-drag
              title="Tabelle verschieben"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (!selected) onSelect?.();
                startDrag(e, 'move', 'br');
              }}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: `${14 * scale}px`,
                zIndex: 12,
                cursor: 'grab',
                bgcolor: 'rgba(46,125,50,0.18)',
                borderBottom: `${1 * scale}px solid rgba(46,125,50,0.45)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${9 * scale}px`,
                fontWeight: 700,
                color: '#2E7D32',
                userSelect: 'none',
              }}
            >
              ↕ ziehen
            </Box>
          )}
          {showTableEditor ? (
            <Box
              ref={tableRef}
              data-text-edit
              data-pres-rich-zone
              data-pres-table-edit
              data-pres-base-fs={String(textBaseFs)}
              contentEditable
              suppressContentEditableWarning
              onFocus={() => {
                if (tableRef.current) onTextEditorFocus?.(tableRef.current, element.id);
              }}
              onBlur={(e) => {
                if (isApplyingDeckHistory() || isFormatBarInteracting()) return;
                const next = e.relatedTarget as HTMLElement | null;
                if (next?.closest(PRESENTATION_FORMAT_UI_BLUR_SELECTOR)) return;
                if (next?.closest('[data-presentation-table-tools]')) return;
                if (textInputTimerRef.current) {
                  window.clearTimeout(textInputTimerRef.current);
                  textInputTimerRef.current = null;
                }
                if (tableRef.current && onChange) {
                  const html = sanitizePresentationHtml(tableRef.current.innerHTML);
                  if (
                    !isValidPresentationTableHtml(html) &&
                    isValidPresentationTableHtml(element.html)
                  ) {
                    return;
                  }
                  onChange({ html });
                }
              }}
              onPointerDown={(e) => {
                if (isPenPointer(e)) {
                  e.preventDefault();
                  return;
                }
                e.stopPropagation();
                if (
                  tryStartTableResizeFromPointer(tableRef.current, e, {
                    onUpdate: () => {
                      const tbl = tableRef.current?.querySelector(
                        'table',
                      ) as HTMLTableElement | null;
                      if (tbl) setTableColWidths(getColumnWidthPercents(tbl));
                    },
                    onDone: () => {
                      if (tableRef.current && onChange) {
                        const html = sanitizePresentationHtml(tableRef.current.innerHTML);
                        if (
                          !isValidPresentationTableHtml(html) &&
                          isValidPresentationTableHtml(element.html)
                        ) {
                          return;
                        }
                        onChange({ html });
                      }
                      if (tableRef.current) tableRef.current.style.cursor = '';
                    },
                  })
                ) {
                  e.preventDefault();
                }
              }}
              onMouseMove={(e) => {
                updateTableResizeHoverCursor(tableRef.current, e.clientX, e.clientY);
              }}
              onMouseLeave={() => {
                if (tableRef.current) tableRef.current.style.cursor = '';
              }}
              onPaste={(e) => {
                e.preventDefault();
                const raw =
                  e.clipboardData.getData('text/html') ||
                  e.clipboardData.getData('text/plain') ||
                  '';
                const cleaned = sanitizePresentationHtml(
                  raw.includes('<') ? raw : raw.replace(/\n/g, '<br>'),
                );
                document.execCommand('insertHTML', false, cleaned);
                if (tableRef.current) onChange?.({ html: tableRef.current.innerHTML });
              }}
              onInput={() => {
                if (!tableRef.current || !onChange) return;
                if (tableRef.current.getAttribute('data-pres-table-mutating') === '1') return;
                const html = tableRef.current.innerHTML;
                const table = tableRef.current.querySelector('table') as HTMLTableElement | null;
                if (table) setTableColWidths(getColumnWidthPercents(table));
                if (textInputTimerRef.current) window.clearTimeout(textInputTimerRef.current);
                textInputTimerRef.current = window.setTimeout(() => {
                  if (!tableRef.current || !onChange) return;
                  if (tableRef.current.getAttribute('data-pres-table-mutating') === '1') return;
                  const next = tableRef.current.innerHTML;
                  if (
                    !isValidPresentationTableHtml(next) &&
                    isValidPresentationTableHtml(element.html)
                  ) {
                    return;
                  }
                  onChange({ html: next });
                }, 600);
              }}
              onKeyDown={(e) => {
                const el = tableRef.current;
                if (!el) return;
                if ((e.key === 'Backspace' || e.key === 'Delete') && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.();
                }
              }}
              sx={{
                position: 'absolute',
                top: `${14 * scale}px`,
                left: `${4 * scale}px`,
                right: `${4 * scale}px`,
                bottom: `${4 * scale}px`,
                overflow: 'auto',
                outline: 'none',
                fontSize: `${Math.max(11, textBaseFs * 0.85) * scale}px`,
                lineHeight: 1.25,
                cursor: 'text',
                color: JOHNNY_PRESENTATION.textPrimary,
                boxSizing: 'border-box',
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                },
                '& th, & td': {
                  wordBreak: 'break-word',
                },
                '& [data-pres-fs]': { lineHeight: 'inherit' },
              }}
            />
          ) : (
            <Box
              data-pres-html
              sx={{
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                fontSize: `${Math.max(11, textBaseFs * 0.85) * scale}px`,
                lineHeight: 1.25,
                p: `${4 * scale}px`,
                pointerEvents: animationEditMode ? 'auto' : 'none',
                color: JOHNNY_PRESENTATION.textPrimary,
                boxSizing: 'border-box',
                '& table': {
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                },
                '& th, & td': {
                  wordBreak: 'break-word',
                },
                '& [data-pres-fs]': { lineHeight: 'inherit' },
              }}
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          )}
          {showTableEditor &&
            tableColWidths.length > 1 &&
            tableColWidths.slice(0, -1).map((_, i) => {
              const leftPct = tableColWidths.slice(0, i + 1).reduce((a, b) => a + b, 0);
              return (
                <Box
                  key={`col-resize-${i}`}
                  data-col-resize
                  title="Spaltenbreite ziehen"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const root = tableRef.current;
                    const table = root?.querySelector('table') as HTMLTableElement | null;
                    if (!table || !root) return;
                    const widths = getColumnWidthPercents(table);
                    colResizeRef.current = {
                      colIndex: i,
                      startX: e.clientX,
                      startLeftPct: widths[i] || 0,
                      tableWidthPx: table.getBoundingClientRect().width || 1,
                    };
                    const onMove = (ev: PointerEvent) => {
                      const st = colResizeRef.current;
                      if (!st || !tableRef.current) return;
                      const tbl = tableRef.current.querySelector('table') as HTMLTableElement | null;
                      if (!tbl) return;
                      const dxPct = ((ev.clientX - st.startX) / st.tableWidthPx) * 100;
                      setColumnWidthPercent(tbl, st.colIndex, st.startLeftPct + dxPct);
                      setTableColWidths(getColumnWidthPercents(tbl));
                    };
                    const onUp = () => {
                      colResizeRef.current = null;
                      window.removeEventListener('pointermove', onMove);
                      window.removeEventListener('pointerup', onUp);
                      if (tableRef.current && onChange) {
                    const html = sanitizePresentationHtml(tableRef.current.innerHTML);
                    if (
                      !isValidPresentationTableHtml(html) &&
                      isValidPresentationTableHtml(element.html)
                    ) {
                      return;
                    }
                    onChange({ html });
                  }
                    };
                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                  }}
                  sx={{
                    position: 'absolute',
                    top: `${14 * scale}px`,
                    bottom: `${4 * scale}px`,
                    left: `calc(${4 * scale}px + (100% - ${8 * scale}px) * ${leftPct / 100})`,
                    width: `${10 * scale}px`,
                    marginLeft: `${-5 * scale}px`,
                    zIndex: 14,
                    cursor: 'col-resize',
                    bgcolor: 'transparent',
                    '&:hover': { bgcolor: 'rgba(46,125,50,0.2)' },
                  }}
                />
              );
            })}
        </>
      )}

      {element.type === 'text' &&
        (showTextEditor ? (
          <Box
            ref={textRef}
            data-text-edit
            data-pres-rich-zone
            data-pres-base-fs={String(textBaseFs)}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
              if (textRef.current) onTextEditorFocus?.(textRef.current, element.id);
            }}
            onBlur={(e) => {
              if (isApplyingDeckHistory() || isFormatBarInteracting()) return;
              const next = e.relatedTarget as HTMLElement | null;
              if (next?.closest(PRESENTATION_FORMAT_UI_BLUR_SELECTOR)) return;
              if (textInputTimerRef.current) {
                window.clearTimeout(textInputTimerRef.current);
                textInputTimerRef.current = null;
              }
              if (textRef.current && onChange) {
                onChange({
                  html: sanitizePresentationHtml(textRef.current.innerHTML),
                });
              }
            }}
            onPointerDown={(e) => {
              if (placeCaretBesidePresentationMath(e.nativeEvent)) {
                e.stopPropagation();
                return;
              }
              const mouseSelecting =
                e.pointerType === 'mouse' &&
                (textEditing || document.activeElement === textRef.current);
              if (mouseSelecting) {
                e.stopPropagation();
                return;
              }
              e.preventDefault();
              startDrag(e, 'move', 'br', null, 'text');
            }}
            onPaste={(e) => {
              e.preventDefault();
              const cleaned = presentationPasteHtml(e.clipboardData);
              if (textRef.current) insertPresentationPastedHtml(textRef.current, cleaned);
              if (textRef.current) onChange?.({ html: textRef.current.innerHTML });
              fitTextBoxToContent();
            }}
            onInput={() => {
              if (!textRef.current || !onChange) return;
              replaceArrowShortcutsNearCursor(textRef.current);
              const html = textRef.current.innerHTML;
              fitTextBoxToContent();
              if (textInputTimerRef.current) window.clearTimeout(textInputTimerRef.current);
              textInputTimerRef.current = window.setTimeout(() => {
                onChange({ html });
              }, 600);
            }}
            onKeyDown={(e) => {
              const el = textRef.current;
              if (!el) return;
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                if (textInputTimerRef.current) {
                  window.clearTimeout(textInputTimerRef.current);
                  textInputTimerRef.current = null;
                }
                onChange?.({ html: sanitizePresentationHtml(el.innerHTML) });
                setTextEditing(false);
                return;
              }
              if ((e.key === 'Backspace' || e.key === 'Delete') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.();
                return;
              }
              if (handlePresentationListShortcutKey(e, el)) {
                onChange?.({ html: el.innerHTML });
                fitTextBoxToContent();
                return;
              }
              if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
              e.preventDefault();
              e.stopPropagation();
              handlePresentationTabKey(el, e.shiftKey);
            }}
            sx={{
              // Etwas eingerückt: Rahmen der Box bleibt ziehbar, Tippen innen.
              position: 'absolute',
              inset: `${2 * scale}px`,
              overflow: 'hidden',
              outline: 'none',
              fontSize: `${textBaseFs * scale}px`,
              fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
              lineHeight: 1.35,
              p: `${2 * scale}px`,
              cursor: 'text',
              color: JOHNNY_PRESENTATION.textPrimary,
              boxSizing: 'border-box',
              textAlign: 'left',
              '& p': { mt: 0, mr: 0, mb: `${2 * scale}px` },
              '& p:last-child': { mb: 0 },
              '& p:only-child:has(> br:only-child):before': {
                content: `"${TEXT_FIELD_PLACEHOLDER}"`,
                color: 'rgba(0,0,0,0.28)',
              },
              '& li > p': { display: 'block', listStyle: 'none' },
              ...presentationNestedListSx({ scale, listPaddingPx: 20 * scale, itemGapPx: 2 * scale }),
              '& [data-pres-fs]': { lineHeight: 'inherit' },
            }}
          />
        ) : (
          <Box
            ref={displayRef}
            data-pres-html
            sx={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              fontSize: `${textBaseFs * scale}px`,
              fontFamily: PRESENTATION_DEFAULT_FONT_FAMILY,
              lineHeight: 1.35,
              p: `${2 * scale}px`,
              pointerEvents: animationEditMode || playLinkHitTarget ? 'auto' : 'none',
              color: JOHNNY_PRESENTATION.textPrimary,
              boxSizing: 'border-box',
              textAlign: 'left',
              '& a[href]': {
                pointerEvents: 'auto',
                cursor: 'pointer',
                touchAction: 'manipulation',
              },
              '& p': { mt: 0, mr: 0, mb: `${2 * scale}px` },
              '& p:last-child': { mb: 0 },
              '& p:only-child:has(> br:only-child):before': {
                content: `"${TEXT_FIELD_PLACEHOLDER}"`,
                color: 'rgba(0,0,0,0.28)',
              },
              '& li > p': { display: 'block', listStyle: 'none' },
              ...presentationNestedListSx({ scale, listPaddingPx: 20 * scale, itemGapPx: 2 * scale }),
              '& [data-reveal-step].pres-reveal-enter': {
                animation: 'presRevealIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
              },
              '& [data-pres-fs]': { lineHeight: 'inherit' },
              ...animationParagraphBadgeSx(scale, animationEditMode && hasAnimTextBlocks),
            }}
            dangerouslySetInnerHTML={{ __html: displayHtml }}
          />
        ))}

      {showSelectionChrome && isShapeElement && (
        <Box
          data-rotate-handle
          title="Drehen — ziehen"
          onPointerDown={(e) => {
            e.stopPropagation();
            startDrag(e, 'rotate');
          }}
          sx={{
            position: 'absolute',
            left: '50%',
            top: `${-28 * scale}px`,
            width: `${18 * scale}px`,
            height: `${18 * scale}px`,
            ml: `${-9 * scale}px`,
            borderRadius: '50%',
            bgcolor: '#fff',
            border: `${2 * scale}px solid #2E7D32`,
            cursor: 'grab',
            zIndex: 32,
            pointerEvents: 'auto',
            touchAction: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.28)',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: '50%',
              top: '100%',
              width: `${2 * scale}px`,
              height: `${10 * scale}px`,
              ml: `${-1 * scale}px`,
              bgcolor: '#2E7D32',
            },
            '&:active': { cursor: 'grabbing' },
          }}
        />
      )}

      {showSelectionChrome && isImageElement && (
        <>
          {(
            [
              { id: 'n', cursor: 'ns-resize', top: -7 * scale, left: '50%', w: imageOnlyEdit ? 36 : 22, h: imageOnlyEdit ? 18 : 10, ml: imageOnlyEdit ? -18 : -11 },
              { id: 's', cursor: 'ns-resize', bottom: -7 * scale, left: '50%', w: imageOnlyEdit ? 36 : 22, h: imageOnlyEdit ? 18 : 10, ml: imageOnlyEdit ? -18 : -11 },
              { id: 'e', cursor: 'ew-resize', right: -7 * scale, top: '50%', w: imageOnlyEdit ? 18 : 10, h: imageOnlyEdit ? 36 : 22, mt: imageOnlyEdit ? -18 : -11 },
              { id: 'w', cursor: 'ew-resize', left: -7 * scale, top: '50%', w: imageOnlyEdit ? 18 : 10, h: imageOnlyEdit ? 36 : 22, mt: imageOnlyEdit ? -18 : -11 },
              { id: 'nw', cursor: 'nwse-resize', top: -10 * scale, left: -10 * scale, w: imageOnlyEdit ? 28 : 12, h: imageOnlyEdit ? 28 : 12, scale: true },
              { id: 'ne', cursor: 'nesw-resize', top: -10 * scale, right: -10 * scale, w: imageOnlyEdit ? 28 : 12, h: imageOnlyEdit ? 28 : 12, scale: true },
              { id: 'sw', cursor: 'nesw-resize', bottom: -10 * scale, left: -10 * scale, w: imageOnlyEdit ? 28 : 12, h: imageOnlyEdit ? 28 : 12, scale: true },
              { id: 'se', cursor: 'nwse-resize', bottom: -10 * scale, right: -10 * scale, w: imageOnlyEdit ? 28 : 12, h: imageOnlyEdit ? 28 : 12, scale: true },
            ] satisfies Array<{
              id: ImageCropHandle;
              cursor: string;
              top?: number | string;
              bottom?: number | string;
              left?: number | string;
              right?: number | string;
              w: number;
              h: number;
              ml?: number;
              mt?: number;
              scale?: boolean;
            }>
          ).map((h) => (
            <Box
              key={h.id}
              data-resize-handle
              title={h.scale ? 'Größe ändern' : 'Zuschneiden'}
              onPointerDown={(e) => {
                e.stopPropagation();
                startDrag(e, 'resize', h.id);
              }}
              sx={{
                position: 'absolute',
                top: h.top,
                bottom: h.bottom,
                left: h.left,
                right: h.right,
                width: `${h.w * scale}px`,
                height: `${h.h * scale}px`,
                ml: h.ml != null ? `${h.ml * scale}px` : undefined,
                mt: h.mt != null ? `${h.mt * scale}px` : undefined,
                bgcolor: h.scale ? '#2E7D32' : '#fff',
                border: `${1.5 * scale}px solid #2E7D32`,
                borderRadius: h.scale ? '50%' : `${2 * scale}px`,
                cursor: h.cursor,
                zIndex: 34,
                pointerEvents: 'auto',
                touchAction: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
              }}
            />
          ))}
        </>
      )}

      {showSelectionChrome && isLineShape && (
        <>
          {shapePointsView.map((pt, i) => (
            <Box
              key={`shape-pt-${i}`}
              data-shape-point-handle
              onPointerDown={(e) => startShapeHandleDrag(e, 'shape-point', i)}
              sx={{
                position: 'absolute',
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${Math.max(10, 12 * scale)}px`,
                height: `${Math.max(10, 12 * scale)}px`,
                borderRadius: '50%',
                bgcolor: i === shapePointsView.length - 1 ? '#1565C0' : '#fff',
                border: `${2 * scale}px solid #1565C0`,
                cursor: 'grab',
                zIndex: 36,
                pointerEvents: 'auto',
                touchAction: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }}
            />
          ))}
          {view.shapeKind === 'curved-arrow' && shapeCurveView ? (
            <Box
              data-shape-curve-handle
              onPointerDown={(e) => startShapeHandleDrag(e, 'shape-curve')}
              sx={{
                position: 'absolute',
                left: `${shapeCurveView.x}%`,
                top: `${shapeCurveView.y}%`,
                transform: 'translate(-50%, -50%) rotate(45deg)',
                width: `${Math.max(10, 11 * scale)}px`,
                height: `${Math.max(10, 11 * scale)}px`,
                bgcolor: '#fff',
                border: `${2 * scale}px solid #E65100`,
                cursor: 'grab',
                zIndex: 36,
                pointerEvents: 'auto',
                touchAction: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }}
            />
          ) : null}
        </>
      )}

      {showResizeHandle && !hugImageChrome && (
        <Box
          data-resize-handle
          onPointerDown={(e) =>
            startDrag(e, 'resize', handleOnTop ? 'tr' : handleOnBottom ? 'br' : 'br')
          }
          sx={resizeHandleSx}
        />
      )}

      {showSelectionChrome && onDelete && (
        <Box
          data-element-delete
          component="button"
          type="button"
          aria-label="Element löschen"
          title="Löschen (Entf)"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (imageOnlyEdit) onDelete();
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!imageOnlyEdit) onDelete();
          }}
          sx={{
            position: 'absolute',
            top: `${(imageOnlyEdit ? -14 : -6) * scale}px`,
            right: `${(imageOnlyEdit ? -14 : -6) * scale}px`,
            width: `${(imageOnlyEdit ? 32 : 22) * scale}px`,
            height: `${(imageOnlyEdit ? 32 : 22) * scale}px`,
            borderRadius: '50%',
            border: `${2 * scale}px solid #fff`,
            bgcolor: '#c62828',
            color: '#fff',
            fontSize: `${(imageOnlyEdit ? 20 : 14) * scale}px`,
            fontWeight: 800,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 40,
            pointerEvents: 'auto',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
            p: 0,
            '&:hover': { bgcolor: '#b71c1c' },
          }}
        >
          ×
        </Box>
      )}
    </Box>
  );
};

export default PresentationDraggableElement;
