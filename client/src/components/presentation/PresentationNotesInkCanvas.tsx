import React, { useCallback, useEffect, useRef } from 'react';
import { strokeSmoothFreehand } from '../../lib/presentationDrawTools';
import type { PresentationNotesInkStroke } from '../../lib/presentationDeck';

export type NotesInkMode = 'text' | 'pen' | 'eraser';

type InkPoint = { x: number; y: number };

const ERASER_RADIUS = 16;
const MIN_INK_DIST_SQ = 0.45 * 0.45;
const INK_COMMIT_IDLE_MS = 420;

function strokeHitsPoint(stroke: PresentationNotesInkStroke, pt: InkPoint, radius: number): boolean {
  const r2 = radius * radius;
  for (const p of stroke.points) {
    const dx = p.x - pt.x;
    const dy = p.y - pt.y;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

function cloneStrokes(strokes: PresentationNotesInkStroke[]): PresentationNotesInkStroke[] {
  return strokes.map((s) => ({
    color: s.color,
    width: s.width,
    points: s.points.map((p) => ({ x: p.x, y: p.y })),
  }));
}

type PresentationNotesInkCanvasProps = {
  hostRef: React.RefObject<HTMLElement | null>;
  editorRef?: React.RefObject<HTMLElement | null>;
  strokes: PresentationNotesInkStroke[];
  mode: NotesInkMode;
  color: string;
  readOnly?: boolean;
  onChange?: (strokes: PresentationNotesInkStroke[]) => void;
  onBeforeStroke?: () => void;
};

/**
 * Stift-Ebene über den Foliennotizen — gleiches Verhalten wie die gelben Lehrer-Notizen:
 * Apple Pencil schreibt immer, Finger = Scrollen/Tippen, Maus nur im Stift/Radierer.
 */
const PresentationNotesInkCanvas: React.FC<PresentationNotesInkCanvasProps> = ({
  hostRef,
  editorRef,
  strokes,
  mode,
  color,
  readOnly = false,
  onChange,
  onBeforeStroke,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const inkRef = useRef<PresentationNotesInkStroke[]>(strokes);
  const currentStrokeRef = useRef<PresentationNotesInkStroke | null>(null);
  const lastInkPtRef = useRef<InkPoint | null>(null);
  const lastSmoothMidRef = useRef<InkPoint | null>(null);
  const drawingRef = useRef(false);
  const erasingRef = useRef(false);
  const inkPointerIdRef = useRef<number | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  const colorRef = useRef(color);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const onBeforeStrokeRef = useRef(onBeforeStroke);
  const historyPushedRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    onBeforeStrokeRef.current = onBeforeStroke;
  }, [onBeforeStroke]);

  useEffect(() => {
    if (drawingRef.current) return;
    inkRef.current = cloneStrokes(strokes);
    redrawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const applyInkStyle = (ctx: CanvasRenderingContext2D, stroke: PresentationNotesInkStroke) => {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 1.5;
    ctx.globalCompositeOperation = 'source-over';
  };

  const applyCanvasTransform = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const rect = hostRef.current?.getBoundingClientRect();
    const cssW = Math.max(1, rect?.width || canvas.clientWidth || 1);
    const cssH = Math.max(1, rect?.height || canvas.clientHeight || 1);
    ctx.setTransform(canvas.width / cssW, 0, 0, canvas.height / cssH, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  };

  const ensureCtx = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!ctxRef.current) {
      ctxRef.current = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
      }) as CanvasRenderingContext2D | null;
    }
    const ctx = ctxRef.current;
    if (ctx) applyCanvasTransform(ctx, canvas);
    return ctx;
  };

  const drawInkStroke = (ctx: CanvasRenderingContext2D, stroke: PresentationNotesInkStroke) => {
    if (stroke.points.length === 1) {
      applyInkStyle(ctx, stroke);
      const p = stroke.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, stroke.width / 2), 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (stroke.points.length < 2) return;
    applyInkStyle(ctx, stroke);
    strokeSmoothFreehand(ctx, stroke.points);
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ensureCtx();
    if (!canvas || !ctx) return;
    const rect = hostRef.current?.getBoundingClientRect();
    const cssW = Math.max(1, rect?.width || canvas.clientWidth || 1);
    const cssH = Math.max(1, rect?.height || canvas.clientHeight || 1);
    ctx.clearRect(0, 0, cssW, cssH);
    for (const stroke of inkRef.current) drawInkStroke(ctx, stroke);
    if (currentStrokeRef.current) drawInkStroke(ctx, currentStrokeRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostRef]);

  const resizeCanvas = useCallback(() => {
    if (currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const rect = host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bufW = Math.max(1, Math.round(rect.width * dpr));
    const bufH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width = bufW;
      canvas.height = bufH;
      ctxRef.current = null;
    }
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    redrawCanvas();
  }, [hostRef, redrawCanvas]);

  const pointFromClient = (clientX: number, clientY: number): InkPoint => {
    const host = hostRef.current || canvasRef.current;
    const rect = host?.getBoundingClientRect();
    if (!rect || rect.width < 1 || rect.height < 1) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const scheduleCommit = (nextInk: PresentationNotesInkStroke[]) => {
    inkRef.current = nextInk;
    if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      onChangeRef.current?.(cloneStrokes(nextInk));
    }, INK_COMMIT_IDLE_MS);
  };

  const shouldInkPointer = (pointerType: string): boolean => {
    if (readOnlyRef.current) return false;
    if (pointerType === 'pen') return true;
    const m = modeRef.current;
    return (m === 'pen' || m === 'eraser') && pointerType === 'mouse';
  };

  const ensureHistory = () => {
    if (historyPushedRef.current) return;
    historyPushedRef.current = true;
    onBeforeStrokeRef.current?.();
  };

  const strokeInkSegment = (from: InkPoint, to: InkPoint) => {
    const stroke = currentStrokeRef.current;
    const ctx = ensureCtx();
    if (!stroke || !ctx) return;
    applyInkStyle(ctx, stroke);
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const start = lastSmoothMidRef.current ?? from;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    ctx.stroke();
    lastSmoothMidRef.current = mid;
  };

  const appendInkPoint = (pt: InkPoint) => {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    const last = lastInkPtRef.current ?? stroke.points[stroke.points.length - 1];
    if (last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < MIN_INK_DIST_SQ) return;
    }
    stroke.points.push(pt);
    if (last) strokeInkSegment(last, pt);
    lastInkPtRef.current = pt;
  };

  const eraseAt = (pt: InkPoint) => {
    const next = inkRef.current.filter((s) => !strokeHitsPoint(s, pt, ERASER_RADIUS));
    if (next.length === inkRef.current.length) return;
    ensureHistory();
    scheduleCommit(next);
    redrawCanvas();
  };

  const onInkPointerDown = (e: PointerEvent) => {
    if (readOnlyRef.current) return;
    if (e.pointerType === 'touch') {
      if (modeRef.current === 'text') return;
      e.preventDefault();
      return;
    }
    if (!shouldInkPointer(e.pointerType)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    editorRef?.current?.blur();
    const canvas = canvasRef.current;
    const host = hostRef.current;
    const captureEl = host || canvas;
    if (!captureEl) return;
    try {
      captureEl.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    inkPointerIdRef.current = e.pointerId;
    drawingRef.current = true;
    historyPushedRef.current = false;
    const pt = pointFromClient(e.clientX, e.clientY);
    if (modeRef.current === 'eraser') {
      erasingRef.current = true;
      eraseAt(pt);
      return;
    }
    erasingRef.current = false;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;
    const stroke: PresentationNotesInkStroke = {
      points: [pt],
      color: colorRef.current,
      width: e.pointerType === 'pen' ? Math.max(2, Math.min(4.2, pressure * 4.2)) : 3,
    };
    currentStrokeRef.current = stroke;
    lastInkPtRef.current = pt;
    lastSmoothMidRef.current = pt;
    const ctx = ensureCtx();
    if (ctx) {
      applyInkStyle(ctx, stroke);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, Math.max(0.6, stroke.width / 2), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const onInkPointerMove = (e: PointerEvent) => {
    if (readOnlyRef.current) return;
    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) return;
    if (e.pointerType === 'touch' && (modeRef.current === 'pen' || modeRef.current === 'eraser')) {
      e.preventDefault();
      return;
    }
    if (!drawingRef.current) return;
    if (!shouldInkPointer(e.pointerType) && inkPointerIdRef.current == null) return;
    e.preventDefault();
    const applyPt = (clientX: number, clientY: number) => {
      const pt = pointFromClient(clientX, clientY);
      if (erasingRef.current || modeRef.current === 'eraser') {
        eraseAt(pt);
        return;
      }
      appendInkPoint(pt);
    };
    const coalesced = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null;
    if (coalesced && coalesced.length > 0) {
      for (const ce of coalesced) applyPt(ce.clientX, ce.clientY);
    } else {
      applyPt(e.clientX, e.clientY);
    }
  };

  const endInkStroke = (e: PointerEvent) => {
    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) return;
    if (!drawingRef.current) return;
    drawingRef.current = false;
    inkPointerIdRef.current = null;
    lastInkPtRef.current = null;
    lastSmoothMidRef.current = null;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    try {
      canvas?.releasePointerCapture(e.pointerId);
      host?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (erasingRef.current || modeRef.current === 'eraser') {
      erasingRef.current = false;
      currentStrokeRef.current = null;
      historyPushedRef.current = false;
      return;
    }
    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;
    if (!stroke || stroke.points.length < 1) {
      historyPushedRef.current = false;
      return;
    }
    if (stroke.points.length === 1) {
      stroke.points.push({ x: stroke.points[0].x + 0.01, y: stroke.points[0].y });
    }
    ensureHistory();
    historyPushedRef.current = false;
    scheduleCommit([...inkRef.current, stroke]);
    redrawCanvas();
  };

  useEffect(() => {
    let cancelled = false;
    let unbind: (() => void) | null = null;
    let ro: ResizeObserver | null = null;

    const tryBind = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const host = hostRef.current;
      if (!canvas || !host) {
        window.requestAnimationFrame(tryBind);
        return;
      }
      resizeCanvas();
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => resizeCanvas());
        ro.observe(host);
      }
      window.addEventListener('resize', resizeCanvas);
      if (readOnlyRef.current) return;
      const listenOpts: AddEventListenerOptions = { capture: true, passive: false };
      host.addEventListener('pointerdown', onInkPointerDown, listenOpts);
      host.addEventListener('pointermove', onInkPointerMove, listenOpts);
      host.addEventListener('pointerup', endInkStroke, listenOpts);
      host.addEventListener('pointercancel', endInkStroke, listenOpts);
      const blockStylusTouch = (ev: TouchEvent) => {
        const touches = Array.from(ev.touches) as Array<Touch & { touchType?: string }>;
        const stylus = touches.some((t) => t.touchType === 'stylus');
        if (stylus || modeRef.current === 'pen' || modeRef.current === 'eraser') {
          ev.preventDefault();
        }
      };
      host.addEventListener('touchstart', blockStylusTouch, listenOpts);
      host.addEventListener('touchmove', blockStylusTouch, listenOpts);
      unbind = () => {
        host.removeEventListener('pointerdown', onInkPointerDown, listenOpts);
        host.removeEventListener('pointermove', onInkPointerMove, listenOpts);
        host.removeEventListener('pointerup', endInkStroke, listenOpts);
        host.removeEventListener('pointercancel', endInkStroke, listenOpts);
        host.removeEventListener('touchstart', blockStylusTouch, listenOpts);
        host.removeEventListener('touchmove', blockStylusTouch, listenOpts);
      };
    };
    tryBind();
    return () => {
      cancelled = true;
      unbind?.();
      ro?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        onChangeRef.current?.(cloneStrokes(inkRef.current));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostRef, readOnly, resizeCanvas]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        touchAction: 'none',
        cursor: readOnly ? 'default' : mode === 'eraser' ? 'cell' : mode === 'pen' ? 'crosshair' : 'text',
        pointerEvents: readOnly || mode === 'text' ? 'none' : 'auto',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    />
  );
};

export default PresentationNotesInkCanvas;
