import React, { useCallback, useEffect, useRef } from 'react';
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
  const eraserPathRef = useRef<{ x: number; y: number }[]>([]);
  const eraseBaseRef = useRef<PresentationStroke[]>(strokes);
  const strokesDuringEraseRef = useRef<PresentationStroke[]>(strokes);
  const manipRef = useRef<ManipState | null>(null);
  const previewStrokesRef = useRef<PresentationStroke[] | null>(null);

  useEffect(() => {
    if (tool !== 'eraser') {
      strokesDuringEraseRef.current = strokes;
    }
  }, [strokes, tool]);

  useEffect(() => {
    if (tool !== 'select') {
      onSelectedStrokeIdChange?.(null);
    }
  }, [tool, onSelectedStrokeIdChange]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SLIDE_REF_WIDTH, SLIDE_REF_HEIGHT);
    const current = previewStrokesRef.current ?? strokes;
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
  }, [strokes, tool, enabled, readOnly, selectedStrokeId]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const replaceStroke = (list: PresentationStroke[], id: string, next: PresentationStroke) =>
    list.map((s) => (s.id === id ? next : s));

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SLIDE_REF_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * SLIDE_REF_HEIGHT;
    return { x, y };
  };

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

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !enabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toCanvasPoint(e);

    if (tool === 'select') {
      const target = findShapeAtPoint(strokes, pt);
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
      previewStrokesRef.current = [...strokes];
      redraw();
      return;
    }

    if (tool === 'eraser') {
      eraseBaseRef.current = strokes;
      strokesDuringEraseRef.current = strokes;
      eraserPathRef.current = [pt];
      strokesDuringEraseRef.current = applyEraserToStrokes(
        eraseBaseRef.current,
        eraserPathRef.current
      );
      redraw();
      return;
    }

    startFreehand(pt);
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !enabled) return;
    const pt = toCanvasPoint(e);

    if (tool === 'select' && manipRef.current && previewStrokesRef.current) {
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
      eraserPathRef.current = [...eraserPathRef.current, pt];
      strokesDuringEraseRef.current = applyEraserToStrokes(
        eraseBaseRef.current,
        eraserPathRef.current
      );
      redraw();
      return;
    }

    if (!drawingRef.current) return;

    if (drawingRef.current.shape) {
      drawingRef.current = {
        ...drawingRef.current,
        points: [drawingRef.current.points[0], pt],
      };
    } else {
      drawingRef.current = {
        ...drawingRef.current,
        points: [...drawingRef.current.points, pt],
      };
    }
    redraw();
  };

  const onPointerUp = () => {
    if (readOnly || !enabled) return;

    if (tool === 'select') {
      commitPreview();
      manipRef.current = null;
      redraw();
      return;
    }

    if (tool === 'eraser') {
      if (eraserPathRef.current.length > 0) {
        onStrokesChange(
          applyEraserToStrokes(eraseBaseRef.current, eraserPathRef.current)
        );
      }
      eraserPathRef.current = [];
      redraw();
      return;
    }

    if (!drawingRef.current) return;

    const draft = drawingRef.current;
    drawingRef.current = null;

    if (draft.shape) {
      const [a, b] = draft.points;
      if (Math.hypot(b.x - a.x, b.y - a.y) < SHAPE_MIN_PX) {
        redraw();
        return;
      }
      onStrokesChange([...strokes, draft]);
      onSelectedStrokeIdChange?.(draft.id);
      redraw();
      return;
    }

    if (draft.points.length < 2) {
      redraw();
      return;
    }
    onStrokesChange([...strokes, draft]);
    redraw();
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

  return (
    <canvas
      ref={canvasRef}
      width={SLIDE_REF_WIDTH}
      height={SLIDE_REF_HEIGHT}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: displayW,
        height: displayH,
        touchAction: enabled && !readOnly ? 'none' : 'auto',
        cursor,
        pointerEvents: enabled && !readOnly ? 'auto' : 'none',
        zIndex: 2,
      }}
    />
  );
};

export default PresentationDrawOverlay;
