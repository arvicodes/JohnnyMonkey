import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';
import {
  ERASER_RADIUS,
  PresentationDrawTool,
  applyEraserToStrokes,
  DEFAULT_MARKER_OPACITY,
  resolveMarkerOpacity,
  drawPresentationStroke,
  isShapeTool,
  toolLineWidth,
  toolToShape,
} from '../../lib/presentationDrawTools';
import {
  ShapeHandle,
  drawShapeSelection,
  getBoxFrame,
  moveShape,
  pickShapeHandle,
  resizeShapeWithHandle,
  rotateShapeByDelta,
} from '../../lib/presentationShapeTransform';
import {
  Bounds,
  BoundsHandle,
  drawBoundsSelection,
  drawLassoPath,
  findStrokeAtPoint,
  getStrokesBounds,
  lassoIsMeaningful,
  moveStroke,
  pickBoundsHandle,
  pointInBounds,
  scaleStrokesFromHandle,
  strokeHitsLasso,
} from '../../lib/presentationInkSelect';

interface PresentationDrawOverlayProps {
  strokes: PresentationStroke[];
  onStrokesChange: (strokes: PresentationStroke[]) => void;
  readOnly?: boolean;
  enabled?: boolean;
  /** Folienwechsel → Overlay übernimmt Props neu */
  slideId?: string;
  tool: PresentationDrawTool;
  strokeColor: string;
  lineWidth?: number;
  selectedStrokeId?: string | null;
  selectedStrokeIds?: string[];
  onSelectedStrokeIdChange?: (id: string | null) => void;
  onSelectedStrokeIdsChange?: (ids: string[]) => void;
  markerOpacity?: number;
  scale?: number;
}

const SHAPE_MIN_PX = 6;
/** Mindestabstand zwischen Ink-Punkten (Slide-Koordinaten). */
const MIN_POINT_DIST_SQ = 0.55 * 0.55;
/** React/Parent erst nach Pause — sonst blockiert jeder Strich den nächsten Pencil. */
const COMMIT_IDLE_MS = 420;
/** GoodNotes: halten ohne Bewegung → Strich wird zur Geraden. */
const STRAIGHT_HOLD_MS = 380;
const STRAIGHT_MOVE_EPS_SQ = 2.4 * 2.4;
const STRAIGHT_ANGLE_STEP = Math.PI / 12;

function snapStraightEnd(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 8) return end;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / STRAIGHT_ANGLE_STEP) * STRAIGHT_ANGLE_STEP;
  return {
    x: start.x + Math.cos(snapped) * len,
    y: start.y + Math.sin(snapped) * len,
  };
}

type ManipState =
  | {
      kind: 'move';
      id: string;
      lastPt: { x: number; y: number };
      snapshot: PresentationStroke;
    }
  | {
      kind: 'rotate';
      id: string;
      snapshot: PresentationStroke;
      center: { x: number; y: number };
      startPointerAngle: number;
    }
  | {
      kind: 'resize';
      id: string;
      handle: ShapeHandle;
      snapshot: PresentationStroke;
    }
  | { kind: 'lasso'; points: { x: number; y: number }[] }
  | {
      kind: 'group-move';
      lastPt: { x: number; y: number };
      snapshots: PresentationStroke[];
    }
  | {
      kind: 'group-resize';
      handle: Exclude<BoundsHandle, 'move'>;
      startBounds: Bounds;
      snapshots: PresentationStroke[];
    };

type CanvasRect = { left: number; top: number; width: number; height: number };

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return `rgba(200,80,80,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyFreehandStyle(ctx: CanvasRenderingContext2D, stroke: PresentationStroke) {
  if (stroke.mode === 'marker') {
    ctx.strokeStyle = hexToRgba(stroke.color, resolveMarkerOpacity(stroke.markerOpacity));
    ctx.lineWidth = stroke.lineWidth * 2.2;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** UI über der Folie — Stift soll dort Werkzeuge wählen, nicht zeichnen. */
const PRES_CHROME_HIT =
  '[data-pres-toolbar], [data-pres-zoom-controls], [data-pres-back], [data-pres-chrome]';

function elementUnderCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number): HTMLElement | null {
  const prev = canvas.style.pointerEvents;
  canvas.style.pointerEvents = 'none';
  const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  canvas.style.pointerEvents = prev;
  return el;
}

function isPresChrome(el: HTMLElement | null): boolean {
  return !!el?.closest?.(PRES_CHROME_HIT);
}

function clickableInChrome(el: HTMLElement | null): HTMLElement | null {
  if (!el || !isPresChrome(el)) return null;
  return (el.closest('button, [role="button"], a, [data-pres-swatch]') as HTMLElement | null) || el;
}

function hitUnderCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const below = elementUnderCanvas(canvas, clientX, clientY);
  if (!below) return { handle: null as HTMLElement | null, host: null as HTMLElement | null };
  return {
    handle: below.closest(
      '[data-resize-handle], [data-element-delete], [data-col-resize]',
    ) as HTMLElement | null,
    host: below.closest('[data-pres-element]') as HTMLElement | null,
  };
}

function dispatchPointerTo(el: HTMLElement, e: PointerEvent, type = 'pointerdown') {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      clientX: e.clientX,
      clientY: e.clientY,
      screenX: e.screenX,
      screenY: e.screenY,
      button: e.button,
      buttons: e.buttons,
      isPrimary: e.isPrimary,
      pressure: e.pressure || 0.5,
    }),
  );
}
function isInkPointer(tool: PresentationDrawTool, pointerType: string): boolean {
  if (tool === 'pen' || tool === 'marker') {
    return pointerType === 'pen' || pointerType === 'mouse';
  }
  return true;
}

const PresentationDrawOverlay: React.FC<PresentationDrawOverlayProps> = ({
  strokes,
  onStrokesChange,
  readOnly = false,
  enabled = true,
  slideId,
  tool,
  strokeColor,
  lineWidth,
  selectedStrokeId = null,
  selectedStrokeIds,
  onSelectedStrokeIdChange,
  onSelectedStrokeIdsChange,
  markerOpacity = DEFAULT_MARKER_OPACITY,
  scale = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rectRef = useRef<CanvasRect | null>(null);
  const drawingRef = useRef<PresentationStroke | null>(null);
  const inkPointerIdRef = useRef<number | null>(null);
  const inkIsPenRef = useRef(false);
  const lastInkPtRef = useRef<{ x: number; y: number } | null>(null);
  const lastSmoothMidRef = useRef<{ x: number; y: number } | null>(null);
  const eraserPathRef = useRef<{ x: number; y: number }[]>([]);
  const eraseBaseRef = useRef<PresentationStroke[]>(strokes);
  const strokesDuringEraseRef = useRef<PresentationStroke[]>(strokes);
  const manipRef = useRef<ManipState | null>(null);
  const previewStrokesRef = useRef<PresentationStroke[] | null>(null);
  const strokesRef = useRef(strokes);
  const onStrokesChangeRef = useRef(onStrokesChange);
  const commitTimerRef = useRef<number | null>(null);
  const pendingCommitRef = useRef<PresentationStroke[] | null>(null);
  const toolRef = useRef(tool);
  const enabledRef = useRef(enabled);
  const readOnlyRef = useRef(readOnly);
  const strokeColorRef = useRef(strokeColor);
  const lineWidthRef = useRef(lineWidth);
  const markerOpacityRef = useRef(markerOpacity);
  const selectedStrokeIdRef = useRef(selectedStrokeId);
  const selectedStrokeIdsRef = useRef<string[]>(
    selectedStrokeIds ?? (selectedStrokeId ? [selectedStrokeId] : [])
  );
  const onSelectedStrokeIdChangeRef = useRef(onSelectedStrokeIdChange);
  const onSelectedStrokeIdsChangeRef = useRef(onSelectedStrokeIdsChange);
  const chromeTapRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const straightRef = useRef<{
    timer: number | null;
    snapped: boolean;
    origin: { x: number; y: number };
    lastMovePt: { x: number; y: number };
  } | null>(null);

  onStrokesChangeRef.current = onStrokesChange;
  toolRef.current = tool;
  enabledRef.current = enabled;
  readOnlyRef.current = readOnly;
  strokeColorRef.current = strokeColor;
  lineWidthRef.current = lineWidth;
  markerOpacityRef.current = markerOpacity;
  selectedStrokeIdRef.current = selectedStrokeId;
  selectedStrokeIdsRef.current = selectedStrokeIds ?? (selectedStrokeId ? [selectedStrokeId] : []);
  onSelectedStrokeIdChangeRef.current = onSelectedStrokeIdChange;
  onSelectedStrokeIdsChangeRef.current = onSelectedStrokeIdsChange;

  const emitSelection = (ids: string[]) => {
    selectedStrokeIdsRef.current = ids;
    onSelectedStrokeIdsChangeRef.current?.(ids);
    onSelectedStrokeIdChangeRef.current?.(ids[0] ?? null);
  };

  const applySlideTransform = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.setTransform(
      canvas.width / SLIDE_REF_WIDTH,
      0,
      0,
      canvas.height / SLIDE_REF_HEIGHT,
      0,
      0,
    );
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  };

  const isLiveInking = () => Boolean(drawingRef.current && !drawingRef.current.shape);

  const syncCanvasBuffer = (allowResize = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 3);
    const bufW = Math.max(1, Math.round(SLIDE_REF_WIDTH * scale * dpr));
    const bufH = Math.max(1, Math.round(SLIDE_REF_HEIGHT * scale * dpr));
    if (canvas.width !== bufW || canvas.height !== bufH) {
      if (!allowResize) return canvas;
      canvas.width = bufW;
      canvas.height = bufH;
      ctxRef.current = null;
    }
    return canvas;
  };

  const ensureCtx = (allowResize = true) => {
    const canvas = syncCanvasBuffer(allowResize);
    if (!canvas) return null;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
      }) as CanvasRenderingContext2D | null;
    }
    const ctx = ctxRef.current;
    if (ctx) applySlideTransform(ctx, canvas);
    return ctx;
  };

  const refreshRect = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const r = canvas.getBoundingClientRect();
    rectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
    return rectRef.current;
  };

  const clientToCanvasPoint = (clientX: number, clientY: number) => {
    const rect = rectRef.current ?? refreshRect();
    if (!rect || rect.width < 1 || rect.height < 1) {
      return { x: 0, y: 0 };
    }
    return {
      x: ((clientX - rect.left) / rect.width) * SLIDE_REF_WIDTH,
      y: ((clientY - rect.top) / rect.height) * SLIDE_REF_HEIGHT,
    };
  };

  const flushStrokesCommit = useCallback(() => {
    if (commitTimerRef.current != null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    const payload = pendingCommitRef.current;
    pendingCommitRef.current = null;
    if (payload) onStrokesChangeRef.current(payload);
  }, []);

  const scheduleStrokesCommit = (next: PresentationStroke[]) => {
    strokesRef.current = next;
    pendingCommitRef.current = next;
    if (commitTimerRef.current != null) window.clearTimeout(commitTimerRef.current);
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      const payload = pendingCommitRef.current;
      pendingCommitRef.current = null;
      if (payload) onStrokesChangeRef.current(payload);
    }, COMMIT_IDLE_MS);
  };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ensureCtx(!isLiveInking());
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, SLIDE_REF_WIDTH, SLIDE_REF_HEIGHT);
    const current = previewStrokesRef.current ?? strokesRef.current;
    const base =
      toolRef.current === 'eraser' && eraserPathRef.current.length > 0
        ? strokesDuringEraseRef.current
        : current;
    const draft = drawingRef.current;
    for (const s of base) drawPresentationStroke(ctx, s);
    if (draft) drawPresentationStroke(ctx, draft);

    const selIds = selectedStrokeIdsRef.current;
    if (toolRef.current === 'select' && selIds.length > 0 && enabledRef.current && !readOnlyRef.current) {
      const selected = base.filter((s) => selIds.includes(s.id));
      if (selected.length === 1 && selected[0].shape) {
        drawShapeSelection(ctx, selected[0]);
      } else {
        const bounds = getStrokesBounds(selected);
        if (bounds) drawBoundsSelection(ctx, bounds);
      }
    }
    const lasso = manipRef.current?.kind === 'lasso' ? manipRef.current.points : null;
    if (lasso && lasso.length > 1) drawLassoPath(ctx, lasso);

    if (
      toolRef.current === 'eraser' &&
      eraserPathRef.current.length > 0 &&
      enabledRef.current &&
      !readOnlyRef.current
    ) {
      const path = eraserPathRef.current;
      const r = ERASER_RADIUS;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (const p of path) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }, []);

  // Folienwechsel / Erstladen: Props übernehmen
  useEffect(() => {
    flushStrokesCommit();
    strokesRef.current = strokes;
    eraseBaseRef.current = strokes;
    strokesDuringEraseRef.current = strokes;
    drawingRef.current = null;
    inkPointerIdRef.current = null;
    previewStrokesRef.current = null;
    lastSmoothMidRef.current = null;
    eraserPathRef.current = [];
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur Folie / externe Strokes-Quelle
  }, [slideId]);

  // Zeichenmodus aus: pending flush + Props sync
  useEffect(() => {
    if (enabled) return;
    flushStrokesCommit();
    if (!drawingRef.current && inkPointerIdRef.current == null) {
      strokesRef.current = strokes;
      redraw();
    }
  }, [enabled, strokes, flushStrokesCommit, redraw]);

  // Props eingeholt (nach Idle-Commit): lokal angleichen, kein Full-Redraw nötig wenn schon gezeichnet
  useEffect(() => {
    if (!enabled) return;
    if (drawingRef.current || inkPointerIdRef.current != null) return;
    if (pendingCommitRef.current) return;
    const local = strokesRef.current;
    if (
      local.length === strokes.length &&
      local[local.length - 1]?.id === strokes[strokes.length - 1]?.id
    ) {
      strokesRef.current = strokes;
      return;
    }
    strokesRef.current = strokes;
    redraw();
  }, [strokes, enabled, redraw]);

  useEffect(() => {
    if (!onSelectedStrokeIdsChange && !onSelectedStrokeIdChange) return;
    if (tool !== 'select' && selectedStrokeIdsRef.current.length > 0) {
      emitSelection([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, selectedStrokeId, selectedStrokeIds, onSelectedStrokeIdChange, onSelectedStrokeIdsChange]);

  useEffect(() => {
    redraw();
  }, [tool, selectedStrokeId, selectedStrokeIds, redraw]);

  useLayoutEffect(() => {
    if (drawingRef.current || inkPointerIdRef.current != null) return;
    syncCanvasBuffer();
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) applySlideTransform(ctx, canvas);
    redraw();
  }, [scale, redraw]);

  useEffect(
    () => () => {
      flushStrokesCommit();
    },
    [flushStrokesCommit],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    refreshRect();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => refreshRect()) : null;
    ro?.observe(canvas);
    const invalidate = () => {
      rectRef.current = null;
    };
    window.addEventListener('scroll', invalidate, true);
    window.addEventListener('resize', invalidate);
    window.visualViewport?.addEventListener('resize', invalidate);
    window.visualViewport?.addEventListener('scroll', invalidate);
    document.addEventListener('fullscreenchange', invalidate);
    document.addEventListener('webkitfullscreenchange' as 'fullscreenchange', invalidate);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', invalidate, true);
      window.removeEventListener('resize', invalidate);
      window.visualViewport?.removeEventListener('resize', invalidate);
      window.visualViewport?.removeEventListener('scroll', invalidate);
      document.removeEventListener('fullscreenchange', invalidate);
      document.removeEventListener('webkitfullscreenchange' as 'fullscreenchange', invalidate);
    };
  }, [scale, enabled]);

  const replaceStroke = (list: PresentationStroke[], id: string, next: PresentationStroke) =>
    list.map((s) => (s.id === id ? next : s));

  const replaceStrokesById = (list: PresentationStroke[], nextById: Map<string, PresentationStroke>) =>
    list.map((s) => nextById.get(s.id) ?? s);

  const currentLineWidth = () => toolLineWidth(toolRef.current, lineWidthRef.current);

  const clearStraightHold = () => {
    const s = straightRef.current;
    if (s?.timer != null) {
      window.clearTimeout(s.timer);
      s.timer = null;
    }
  };

  const applyStraightDraft = (end: { x: number; y: number }) => {
    const draft = drawingRef.current;
    const snap = straightRef.current;
    if (!draft || draft.shape || !snap) return;
    const next = snapStraightEnd(snap.origin, end);
    draft.points = [snap.origin, next];
    lastInkPtRef.current = next;
    lastSmoothMidRef.current = next;
    redraw();
  };

  const armStraightHold = () => {
    const snap = straightRef.current;
    const draft = drawingRef.current;
    if (!snap || snap.snapped || !draft || draft.shape) return;
    clearStraightHold();
    snap.timer = window.setTimeout(() => {
      const s = straightRef.current;
      const d = drawingRef.current;
      if (!s || !d || d.shape) return;
      s.snapped = true;
      s.timer = null;
      const last = d.points[d.points.length - 1] || s.origin;
      applyStraightDraft(last);
    }, STRAIGHT_HOLD_MS);
  };

  const startFreehand = (pt: { x: number; y: number }) => {
    const t = toolRef.current;
    const shape = toolToShape(t);
    if (shape) {
      drawingRef.current = {
        id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        points: [pt, pt],
        color: strokeColorRef.current,
        lineWidth: currentLineWidth(),
        mode: 'pen',
        shape,
        rotation: 0,
      };
      lastInkPtRef.current = pt;
      return;
    }
    drawingRef.current = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      points: [pt],
      color: strokeColorRef.current,
      lineWidth: currentLineWidth(),
      mode: t === 'marker' ? 'marker' : 'pen',
      markerOpacity: t === 'marker' ? markerOpacityRef.current : undefined,
    };
    lastInkPtRef.current = pt;
    lastSmoothMidRef.current = pt;
    clearStraightHold();
    straightRef.current = { timer: null, snapped: false, origin: pt, lastMovePt: pt };
    armStraightHold();
  };

  /** Nur neues Segment — kein Full-Clear (entscheidend für Apple Pencil). */
  const strokeInkSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const draft = drawingRef.current;
    const ctx = ctxRef.current;
    if (!draft || draft.shape || !ctx) return;
    applyFreehandStyle(ctx, draft);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const start = lastSmoothMidRef.current ?? from;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    ctx.stroke();
    lastSmoothMidRef.current = mid;
  };

  const appendInkPoint = (pt: { x: number; y: number }, force = false) => {
    const draft = drawingRef.current;
    if (!draft) return;
    if (draft.shape) {
      draft.points[1] = pt;
      lastInkPtRef.current = pt;
      redraw();
      return;
    }
    const snap = straightRef.current;
    if (snap?.snapped) {
      applyStraightDraft(pt);
      return;
    }
    const last = lastInkPtRef.current;
    if (!force && last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < MIN_POINT_DIST_SQ) return;
    }
    draft.points.push(pt);
    if (last) strokeInkSegment(last, pt);
    lastInkPtRef.current = pt;
    if (snap) {
      const mx = pt.x - snap.lastMovePt.x;
      const my = pt.y - snap.lastMovePt.y;
      if (mx * mx + my * my >= STRAIGHT_MOVE_EPS_SQ) {
        snap.lastMovePt = pt;
        armStraightHold();
      }
    }
  };

  const commitPreview = () => {
    if (previewStrokesRef.current) {
      scheduleStrokesCommit(previewStrokesRef.current);
      previewStrokesRef.current = null;
    }
  };

  const beginRotate = (target: PresentationStroke, pt: { x: number; y: number }): ManipState => {
    const [p0, p1] = target.points;
    const center =
      target.shape === 'line' || target.shape === 'arrow'
        ? { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }
        : (() => {
            const f = getBoxFrame(target);
            return { x: f.cx, y: f.cy };
          })();
    return {
      kind: 'rotate',
      id: target.id,
      snapshot: target,
      center,
      startPointerAngle: Math.atan2(pt.y - center.y, pt.x - center.x),
    };
  };

  const finishInkStroke = () => {
    clearStraightHold();
    const snap = straightRef.current;
    straightRef.current = null;
    inkPointerIdRef.current = null;
    inkIsPenRef.current = false;
    lastInkPtRef.current = null;
    lastSmoothMidRef.current = null;
    if (!drawingRef.current) return;

    const draft = drawingRef.current;
    drawingRef.current = null;

    if (draft.shape) {
      const [a, b] = draft.points;
      if (Math.hypot(b.x - a.x, b.y - a.y) < SHAPE_MIN_PX) {
        redraw();
        return;
      }
      scheduleStrokesCommit([...strokesRef.current, draft]);
      onSelectedStrokeIdChangeRef.current?.(draft.id);
      redraw();
      return;
    }

    if (snap?.snapped && draft.points.length >= 2) {
      scheduleStrokesCommit([...strokesRef.current, draft]);
      redraw();
      return;
    }

    if (draft.points.length < 2) {
      redraw();
      return;
    }
    scheduleStrokesCommit([...strokesRef.current, draft]);
    // Nicht clear+redraw — die Tinte liegt schon auf dem Canvas.
  };

  const onPointerDown = (e: PointerEvent) => {
    if (readOnlyRef.current || !enabledRef.current) return;
    const t = toolRef.current;
    const canvas = e.currentTarget as HTMLCanvasElement;

    // Apple Pencil trifft oft das Canvas statt der Leiste — dann Werkzeug-Klick, nicht Tinte.
    const overChrome = clickableInChrome(elementUnderCanvas(canvas, e.clientX, e.clientY));
    if (overChrome) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof overChrome.click === 'function') overChrome.click();
      return;
    }

    // Element-Griffe (unten) auch mit Stift: Canvas liegt darüber.
    const under = hitUnderCanvas(canvas, e.clientX, e.clientY);
    if (under.handle) {
      e.preventDefault();
      e.stopPropagation();
      try {
        under.handle.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dispatchPointerTo(under.handle, e);
      return;
    }

    if (e.pointerType === 'touch' && (t === 'pen' || t === 'marker' || !e.isPrimary)) {
      e.preventDefault();
      return;
    }

    if (!isInkPointer(t, e.pointerType)) return;

    refreshRect();
    const pt = clientToCanvasPoint(e.clientX, e.clientY);

    if (t === 'select') {
      e.preventDefault();
      e.stopPropagation();

      const ids = selectedStrokeIdsRef.current;
      const selected = strokesRef.current.filter((s) => ids.includes(s.id));
      const bounds = getStrokesBounds(selected);

      const beginManip = () => {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        inkPointerIdRef.current = e.pointerId;
        inkIsPenRef.current = e.pointerType === 'pen' || e.pointerType === 'mouse';
      };

      if (bounds) {
        const bh = pickBoundsHandle(bounds, pt);
        if (bh && bh !== 'move') {
          beginManip();
          manipRef.current = {
            kind: 'group-resize',
            handle: bh,
            startBounds: bounds,
            snapshots: selected,
          };
          previewStrokesRef.current = [...strokesRef.current];
          redraw();
          return;
        }
        if (selected.length === 1 && selected[0].shape) {
          const sh = pickShapeHandle(selected[0], pt);
          if (sh === 'rotate') {
            beginManip();
            manipRef.current = beginRotate(selected[0], pt);
            previewStrokesRef.current = [...strokesRef.current];
            redraw();
            return;
          }
          if (sh && sh !== 'move') {
            beginManip();
            manipRef.current = { kind: 'resize', id: selected[0].id, handle: sh, snapshot: selected[0] };
            previewStrokesRef.current = [...strokesRef.current];
            redraw();
            return;
          }
        }
        if (bh === 'move' || pointInBounds(pt, bounds, 4)) {
          beginManip();
          manipRef.current = { kind: 'group-move', lastPt: pt, snapshots: selected };
          previewStrokesRef.current = [...strokesRef.current];
          redraw();
          return;
        }
      }

      // Stift auf Element-Griff: schon oben durchgereicht.

      const hit = findStrokeAtPoint(strokesRef.current, pt);
      if (hit) {
        beginManip();
        const nextIds = ids.includes(hit.id) ? ids : [hit.id];
        emitSelection(nextIds);
        const snaps = strokesRef.current.filter((s) => nextIds.includes(s.id));
        manipRef.current = { kind: 'group-move', lastPt: pt, snapshots: snaps };
        previewStrokesRef.current = [...strokesRef.current];
        redraw();
        return;
      }

      if (under.host && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
        dispatchPointerTo(under.host, e);
        return;
      }

      beginManip();
      emitSelection([]);
      manipRef.current = { kind: 'lasso', points: [pt] };
      redraw();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    inkPointerIdRef.current = e.pointerId;
    inkIsPenRef.current = e.pointerType === 'pen' || e.pointerType === 'mouse';

    if (t === 'eraser') {
      eraseBaseRef.current = strokesRef.current;
      strokesDuringEraseRef.current = strokesRef.current;
      eraserPathRef.current = [pt];
      strokesDuringEraseRef.current = applyEraserToStrokes(
        eraseBaseRef.current,
        eraserPathRef.current,
      );
      redraw();
      return;
    }

    startFreehand(pt);
    if (!drawingRef.current?.shape) {
      const ctx = ensureCtx();
      const draft = drawingRef.current;
      if (ctx && draft) {
        applyFreehandStyle(ctx, draft);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.5, draft.lineWidth / 2), 0, Math.PI * 2);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fill();
      }
    } else {
      redraw();
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (readOnlyRef.current || !enabledRef.current) return;
    const t = toolRef.current;
    const chrome = chromeTapRef.current;
    if (chrome && e.pointerId === chrome.pointerId) return;

    if (e.pointerType === 'touch' && (t === 'pen' || t === 'marker')) {
      e.preventDefault();
      return;
    }

    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) return;

    if (t === 'select' && manipRef.current) {
      const pt = clientToCanvasPoint(e.clientX, e.clientY);
      const m = manipRef.current;
      if (m.kind === 'lasso') {
        m.points.push(pt);
        redraw();
        return;
      }
      if (!previewStrokesRef.current) return;
      if (m.kind === 'group-move') {
        const dx = pt.x - m.lastPt.x;
        const dy = pt.y - m.lastPt.y;
        const moved = m.snapshots.map((s) => moveStroke(s, dx, dy));
        const byId = new Map(moved.map((s) => [s.id, s]));
        previewStrokesRef.current = replaceStrokesById(previewStrokesRef.current, byId);
        manipRef.current = { ...m, lastPt: pt, snapshots: moved };
        redraw();
        return;
      }
      if (m.kind === 'group-resize') {
        const scaled = scaleStrokesFromHandle(m.snapshots, m.startBounds, m.handle, pt);
        const byId = new Map(scaled.map((s) => [s.id, s]));
        previewStrokesRef.current = replaceStrokesById(previewStrokesRef.current, byId);
        redraw();
        return;
      }
      if (m.kind === 'move' || m.kind === 'rotate' || m.kind === 'resize') {
        let next = m.snapshot;
        if (m.kind === 'move') {
          const dx = pt.x - m.lastPt.x;
          const dy = pt.y - m.lastPt.y;
          next = moveShape(m.snapshot, dx, dy);
          manipRef.current = { ...m, lastPt: pt, snapshot: next };
        } else if (m.kind === 'rotate') {
          const angle = Math.atan2(pt.y - m.center.y, pt.x - m.center.x);
          const delta = angle - m.startPointerAngle;
          next = rotateShapeByDelta(m.snapshot, delta);
        } else {
          next = resizeShapeWithHandle(m.snapshot, m.handle, pt);
        }
        previewStrokesRef.current = replaceStroke(previewStrokesRef.current, m.id, next);
        redraw();
      }
      return;
    }

    if (t === 'eraser') {
      if (eraserPathRef.current.length === 0) return;
      if (inkPointerIdRef.current == null) return;
      const pt = clientToCanvasPoint(e.clientX, e.clientY);
      eraserPathRef.current.push(pt);
      strokesDuringEraseRef.current = applyEraserToStrokes(
        eraseBaseRef.current,
        eraserPathRef.current,
      );
      redraw();
      return;
    }

    if (!drawingRef.current || inkPointerIdRef.current == null) return;
    e.preventDefault();

    const coalesced =
      typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    if (coalesced && coalesced.length > 0) {
      for (const ce of coalesced) {
        appendInkPoint(clientToCanvasPoint(ce.clientX, ce.clientY));
      }
    } else {
      appendInkPoint(clientToCanvasPoint(e.clientX, e.clientY));
    }
  };

  const finishChromeTap = (e: PointerEvent) => {
    const chrome = chromeTapRef.current;
    if (!chrome || e.pointerId !== chrome.pointerId) return false;
    chromeTapRef.current = null;
    inkPointerIdRef.current = null;
    const canvas = (e.currentTarget as HTMLCanvasElement) || canvasRef.current;
    try {
      canvas?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!canvas) return true;
    if (Math.hypot(e.clientX - chrome.x, e.clientY - chrome.y) > 14) return true;
    const target = clickableInChrome(elementUnderCanvas(canvas, e.clientX, e.clientY));
    if (target && typeof target.click === 'function') target.click();
    return true;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (finishChromeTap(e)) return;
    const t = toolRef.current;
    if (e.pointerType === 'touch' && (t === 'pen' || t === 'marker')) {
      e.preventDefault();
      return;
    }

    if (readOnlyRef.current || !enabledRef.current) return;
    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) return;

    try {
      (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (t === 'select') {
      const m = manipRef.current;
      if (m?.kind === 'lasso') {
        if (lassoIsMeaningful(m.points)) {
          const ids = strokesRef.current.filter((s) => strokeHitsLasso(s, m.points)).map((s) => s.id);
          emitSelection(ids);
        } else {
          emitSelection([]);
          const canvas = canvasRef.current;
          if (canvas) {
            const under = hitUnderCanvas(canvas, e.clientX, e.clientY);
            const target = under.handle || under.host;
            if (target) dispatchPointerTo(target, e);
          }
        }
      } else {
        commitPreview();
      }
      manipRef.current = null;
      inkPointerIdRef.current = null;
      inkIsPenRef.current = false;
      redraw();
      return;
    }

    if (t === 'eraser') {
      if (eraserPathRef.current.length > 0) {
        scheduleStrokesCommit(applyEraserToStrokes(eraseBaseRef.current, eraserPathRef.current));
      }
      eraserPathRef.current = [];
      inkPointerIdRef.current = null;
      inkIsPenRef.current = false;
      redraw();
      return;
    }

    finishInkStroke();
  };

  const onPointerCancel = (e: PointerEvent) => {
    if (chromeTapRef.current && e.pointerId === chromeTapRef.current.pointerId) {
      chromeTapRef.current = null;
      inkPointerIdRef.current = null;
      try {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }
    if (e.pointerType === 'touch') {
      e.preventDefault();
      return;
    }
    if (inkPointerIdRef.current === e.pointerId && inkIsPenRef.current && drawingRef.current) {
      finishInkStroke();
      return;
    }
    if (inkPointerIdRef.current === e.pointerId) {
      clearStraightHold();
      straightRef.current = null;
      drawingRef.current = null;
      inkPointerIdRef.current = null;
      inkIsPenRef.current = false;
      lastInkPtRef.current = null;
      lastSmoothMidRef.current = null;
      manipRef.current = null;
      previewStrokesRef.current = null;
      eraserPathRef.current = [];
      redraw();
    }
  };

  // Native Pointer-Events: deutlich niedrigerer Overhead als React-Synthetic auf dem iPad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled || readOnly) return;

    const opts: AddEventListenerOptions = { passive: false };
    canvas.addEventListener('pointerdown', onPointerDown, opts);
    canvas.addEventListener('pointermove', onPointerMove, opts);
    canvas.addEventListener('pointerup', onPointerUp, opts);
    canvas.addEventListener('pointercancel', onPointerCancel, opts);

    const blockTouch = (ev: TouchEvent) => {
      if (ev.touches.length >= 2) return;
      ev.preventDefault();
    };
    canvas.addEventListener('touchstart', blockTouch, opts);
    canvas.addEventListener('touchmove', blockTouch, opts);
    canvas.addEventListener('touchend', blockTouch, opts);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('touchstart', blockTouch);
      canvas.removeEventListener('touchmove', blockTouch);
      canvas.removeEventListener('touchend', blockTouch);
    };
    // Handler schließen über Refs — nur enable/readOnly neu binden
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, readOnly]);

  const cursor =
    readOnly || !enabled
      ? 'default'
      : tool === 'select'
        ? 'grab'
        : tool === 'eraser'
          ? 'grab'
          : tool === 'marker'
            ? 'cell'
            : isShapeTool(tool)
              ? 'crosshair'
              : 'crosshair';

  const displayW = SLIDE_REF_WIDTH * scale;
  const displayH = SLIDE_REF_HEIGHT * scale;
  const touchAction = enabled && !readOnly ? 'none' : 'auto';

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: displayW,
        height: displayH,
        touchAction,
        cursor,
        pointerEvents: enabled && !readOnly ? 'auto' : 'none',
        zIndex: 2,
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    />
  );
};

export default React.memo(PresentationDrawOverlay);
