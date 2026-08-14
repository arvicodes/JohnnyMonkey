import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';
import {
  ERASER_RADIUS,
  PresentationDrawTool,
  applyEraserToStrokes,
  drawPresentationStroke,
  isShapeTool,
  toolLineWidth,
  toolToShape,
} from '../../lib/presentationDrawTools';
import {
  ShapeHandle,
  drawShapeSelection,
  findShapeAtPoint,
  getBoxFrame,
  moveShape,
  pickShapeHandle,
  resizeShapeWithHandle,
  rotateShapeByDelta,
} from '../../lib/presentationShapeTransform';

interface PresentationDrawOverlayProps {
  strokes: PresentationStroke[];
  onStrokesChange: (strokes: PresentationStroke[]) => void;
  readOnly?: boolean;
  enabled?: boolean;
  tool: PresentationDrawTool;
  strokeColor: string;
  lineWidth?: number;
  selectedStrokeId?: string | null;
  onSelectedStrokeIdChange?: (id: string | null) => void;
  markerOpacity?: number;
  scale?: number;
}

const SHAPE_MIN_PX = 6;
/** Mindestabstand zwischen Ink-Punkten (Slide-Koordinaten) — reduziert Rauschen, hält Kurven glatt. */
const MIN_POINT_DIST_SQ = 0.8 * 0.8;

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
    };

function getDrawCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  // desynchronized: niedrigere Latenz auf unterstützten Browsern (iPad/Chrome)
  return canvas.getContext('2d', { alpha: true, desynchronized: true }) as CanvasRenderingContext2D | null;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return `rgba(200,80,80,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function applyFreehandStyle(
  ctx: CanvasRenderingContext2D,
  stroke: PresentationStroke,
) {
  if (stroke.mode === 'marker') {
    ctx.strokeStyle = hexToRgba(stroke.color, stroke.markerOpacity ?? 0.38);
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

/** Stift/Maus zeichnen; Finger bleiben für Pinch/Pan frei (Palm-Rejection). */
function isInkPointer(tool: PresentationDrawTool, pointerType: string): boolean {
  if (tool === 'pen' || tool === 'marker') {
    return pointerType === 'pen' || pointerType === 'mouse';
  }
  // Radierer / Formen / Select: auch Finger ok
  return true;
}

const PresentationDrawOverlay: React.FC<PresentationDrawOverlayProps> = ({
  strokes,
  onStrokesChange,
  readOnly = false,
  enabled = true,
  tool,
  strokeColor,
  lineWidth,
  selectedStrokeId = null,
  onSelectedStrokeIdChange,
  markerOpacity = 0.38,
  scale = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<PresentationStroke | null>(null);
  const inkPointerIdRef = useRef<number | null>(null);
  const lastInkPtRef = useRef<{ x: number; y: number } | null>(null);
  const eraserPathRef = useRef<{ x: number; y: number }[]>([]);
  const eraseBaseRef = useRef<PresentationStroke[]>(strokes);
  const strokesDuringEraseRef = useRef<PresentationStroke[]>(strokes);
  const manipRef = useRef<ManipState | null>(null);
  const previewStrokesRef = useRef<PresentationStroke[] | null>(null);
  const strokesRef = useRef(strokes);
  const activeTouchIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    strokesRef.current = strokes;
    if (tool !== 'eraser') {
      strokesDuringEraseRef.current = strokes;
    }
  }, [strokes, tool]);

  useEffect(() => {
    if (!onSelectedStrokeIdChange) return;
    if (tool !== 'select' && selectedStrokeId != null) {
      onSelectedStrokeIdChange(null);
    }
  }, [tool, selectedStrokeId, onSelectedStrokeIdChange]);

  const strokesKey = useMemo(
    () => strokes.map((s) => `${s.id}:${s.points.length}`).join('|'),
    [strokes]
  );

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getDrawCtx(canvas);
    if (!ctx) return;
    ctx.clearRect(0, 0, SLIDE_REF_WIDTH, SLIDE_REF_HEIGHT);
    const current = previewStrokesRef.current ?? strokesRef.current;
    const base =
      tool === 'eraser' && eraserPathRef.current.length > 0
        ? strokesDuringEraseRef.current
        : current;
    const all = drawingRef.current ? [...base, drawingRef.current] : base;
    for (const s of all) drawPresentationStroke(ctx, s);

    if (tool === 'select' && selectedStrokeId && enabled && !readOnly) {
      const selected = all.find((s) => s.id === selectedStrokeId);
      if (selected) drawShapeSelection(ctx, selected);
    }

    if (tool === 'eraser' && eraserPathRef.current.length > 0 && enabled && !readOnly) {
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
  }, [strokesKey, tool, enabled, readOnly, selectedStrokeId]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const replaceStroke = (list: PresentationStroke[], id: string, next: PresentationStroke) =>
    list.map((s) => (s.id === id ? next : s));

  const clientToCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * SLIDE_REF_WIDTH,
      y: ((clientY - rect.top) / rect.height) * SLIDE_REF_HEIGHT,
    };
  };

  const toCanvasPoint = (e: { clientX: number; clientY: number }) =>
    clientToCanvasPoint(e.clientX, e.clientY);

  const currentLineWidth = toolLineWidth(tool, lineWidth);

  const startFreehand = (pt: { x: number; y: number }) => {
    const shape = toolToShape(tool);
    if (shape) {
      drawingRef.current = {
        id: `s-${Date.now()}`,
        points: [pt, pt],
        color: strokeColor,
        lineWidth: currentLineWidth,
        mode: 'pen',
        shape,
        rotation: 0,
      };
      lastInkPtRef.current = pt;
      return;
    }
    drawingRef.current = {
      id: `s-${Date.now()}`,
      points: [pt],
      color: strokeColor,
      lineWidth: currentLineWidth,
      mode: tool === 'marker' ? 'marker' : 'pen',
      markerOpacity: tool === 'marker' ? markerOpacity : undefined,
    };
    lastInkPtRef.current = pt;
  };

  /** Nur neues Segment zeichnen — kein Full-Clear (entscheidend für Apple Pencil). */
  const strokeInkSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const draft = drawingRef.current;
    const canvas = canvasRef.current;
    if (!draft || draft.shape || !canvas) return;
    const ctx = getDrawCtx(canvas);
    if (!ctx) return;
    applyFreehandStyle(ctx, draft);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
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
    const last = lastInkPtRef.current;
    if (!force && last) {
      const dx = pt.x - last.x;
      const dy = pt.y - last.y;
      if (dx * dx + dy * dy < MIN_POINT_DIST_SQ) return;
    }
    draft.points.push(pt);
    if (last) strokeInkSegment(last, pt);
    lastInkPtRef.current = pt;
  };

  const commitPreview = () => {
    if (previewStrokesRef.current) {
      onStrokesChange(previewStrokesRef.current);
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
    inkPointerIdRef.current = null;
    lastInkPtRef.current = null;
    if (!drawingRef.current) return;

    const draft = drawingRef.current;
    drawingRef.current = null;

    if (draft.shape) {
      const [a, b] = draft.points;
      if (Math.hypot(b.x - a.x, b.y - a.y) < SHAPE_MIN_PX) {
        redraw();
        return;
      }
      onStrokesChange([...strokesRef.current, draft]);
      onSelectedStrokeIdChange?.(draft.id);
      redraw();
      return;
    }

    if (draft.points.length < 2) {
      redraw();
      return;
    }
    onStrokesChange([...strokesRef.current, draft]);
    // Punkte sind schon inkrementell gezeichnet — Full-Redraw hält Layer konsistent
    redraw();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !enabled) return;

    if (e.pointerType === 'touch') {
      activeTouchIdsRef.current.add(e.pointerId);
      // Zwei Finger → Pinch-Zoom (Stage), kein Zeichnen / kein Capture
      if (activeTouchIdsRef.current.size >= 2) {
        if (inkPointerIdRef.current != null) {
          try {
            e.currentTarget.releasePointerCapture(inkPointerIdRef.current);
          } catch {
            /* ignore */
          }
          drawingRef.current = null;
          inkPointerIdRef.current = null;
          lastInkPtRef.current = null;
          redraw();
        }
        return;
      }
    }

    if (!isInkPointer(tool, e.pointerType)) {
      // Finger bei Stift/Marker: durchlassen für Pinch (kein Capture)
      return;
    }

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    inkPointerIdRef.current = e.pointerId;
    const pt = toCanvasPoint(e);

    if (tool === 'select') {
      const target = findShapeAtPoint(strokesRef.current, pt);
      if (!target) {
        onSelectedStrokeIdChange?.(null);
        redraw();
        return;
      }
      onSelectedStrokeIdChange?.(target.id);
      const handle = pickShapeHandle(target, pt);
      if (!handle || handle === 'move') {
        manipRef.current = { kind: 'move', id: target.id, lastPt: pt, snapshot: target };
      } else if (handle === 'rotate') {
        manipRef.current = beginRotate(target, pt);
      } else {
        manipRef.current = { kind: 'resize', id: target.id, handle, snapshot: target };
      }
      previewStrokesRef.current = [...strokesRef.current];
      redraw();
      return;
    }

    if (tool === 'eraser') {
      eraseBaseRef.current = strokesRef.current;
      strokesDuringEraseRef.current = strokesRef.current;
      eraserPathRef.current = [pt];
      strokesDuringEraseRef.current = applyEraserToStrokes(
        eraseBaseRef.current,
        eraserPathRef.current
      );
      redraw();
      return;
    }

    startFreehand(pt);
    // Erster Punkt: kleiner Dot, damit der Strich sofort sichtbar ist
    if (!drawingRef.current?.shape) {
      const canvas = canvasRef.current;
      const ctx = canvas ? getDrawCtx(canvas) : null;
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

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !enabled) return;

    // Multitouch während Zeichnen → abbrechen (Pinch hat Vorrang)
    if (e.pointerType === 'touch' && activeTouchIdsRef.current.size >= 2) {
      return;
    }

    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) {
      return;
    }

    if (tool === 'select' && manipRef.current && previewStrokesRef.current) {
      const pt = toCanvasPoint(e);
      const m = manipRef.current;
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
      } else if (m.kind === 'resize') {
        next = resizeShapeWithHandle(m.snapshot, m.handle, pt);
      }
      previewStrokesRef.current = replaceStroke(previewStrokesRef.current, m.id, next);
      redraw();
      return;
    }

    if (tool === 'eraser') {
      if (eraserPathRef.current.length === 0) return;
      if (inkPointerIdRef.current == null) return;
      const pt = toCanvasPoint(e);
      eraserPathRef.current.push(pt);
      strokesDuringEraseRef.current = applyEraserToStrokes(
        eraseBaseRef.current,
        eraserPathRef.current
      );
      redraw();
      return;
    }

    if (!drawingRef.current || inkPointerIdRef.current == null) return;
    e.preventDefault();

    const native = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : null;
    if (coalesced && coalesced.length > 0) {
      for (const ce of coalesced) {
        appendInkPoint(clientToCanvasPoint(ce.clientX, ce.clientY));
      }
    } else {
      appendInkPoint(toCanvasPoint(e));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      activeTouchIdsRef.current.delete(e.pointerId);
    }

    if (readOnly || !enabled) return;
    if (inkPointerIdRef.current != null && e.pointerId !== inkPointerIdRef.current) {
      return;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (tool === 'select') {
      commitPreview();
      manipRef.current = null;
      inkPointerIdRef.current = null;
      redraw();
      return;
    }

    if (tool === 'eraser') {
      if (eraserPathRef.current.length > 0) {
        onStrokesChange(applyEraserToStrokes(eraseBaseRef.current, eraserPathRef.current));
      }
      eraserPathRef.current = [];
      inkPointerIdRef.current = null;
      redraw();
      return;
    }

    finishInkStroke();
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      activeTouchIdsRef.current.delete(e.pointerId);
    }
    if (inkPointerIdRef.current === e.pointerId) {
      // Abbruch: Entwurf verwerfen statt halb committen
      drawingRef.current = null;
      inkPointerIdRef.current = null;
      lastInkPtRef.current = null;
      manipRef.current = null;
      previewStrokesRef.current = null;
      eraserPathRef.current = [];
      redraw();
    }
  };

  const cursor =
    readOnly || !enabled
      ? 'default'
      : tool === 'select'
        ? manipRef.current
          ? 'grabbing'
          : 'grab'
        : tool === 'eraser'
          ? 'grab'
          : tool === 'marker'
            ? 'cell'
            : isShapeTool(tool)
              ? 'crosshair'
              : 'crosshair';

  const displayW = SLIDE_REF_WIDTH * scale;
  const displayH = SLIDE_REF_HEIGHT * scale;
  // Stift/Marker: Touch nicht capturen → Pinch auf der Stage; Canvas blockiert Browser-Scroll
  const touchAction = enabled && !readOnly ? 'none' : 'auto';

  return (
    <canvas
      ref={canvasRef}
      width={SLIDE_REF_WIDTH}
      height={SLIDE_REF_HEIGHT}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
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
        // Verhindert Browser-Callouts / Textauswahl beim Schreiben
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    />
  );
};

export default PresentationDrawOverlay;
