import React, { useCallback, useEffect, useRef } from 'react';
import {
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return `rgba(200,80,80,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: PresentationStroke) {
  if (stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  if (stroke.mode === 'marker') {
    ctx.strokeStyle = hexToRgba(stroke.color, stroke.markerOpacity ?? 0.38);
    ctx.lineWidth = stroke.lineWidth * 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

interface PresentationDrawOverlayProps {
  strokes: PresentationStroke[];
  onStrokesChange: (strokes: PresentationStroke[]) => void;
  readOnly?: boolean;
  tool: 'pen' | 'marker';
  strokeColor: string;
  lineWidth: number;
  markerOpacity?: number;
  scale?: number;
}

const PresentationDrawOverlay: React.FC<PresentationDrawOverlayProps> = ({
  strokes,
  onStrokesChange,
  readOnly = false,
  tool,
  strokeColor,
  lineWidth,
  markerOpacity = 0.38,
  scale = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef<PresentationStroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SLIDE_REF_WIDTH, SLIDE_REF_HEIGHT);
    const all = drawingRef.current ? [...strokes, drawingRef.current] : strokes;
    for (const s of all) drawStroke(ctx, s);
  }, [strokes]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SLIDE_REF_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * SLIDE_REF_HEIGHT;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = toCanvasPoint(e);
    drawingRef.current = {
      id: `s-${Date.now()}`,
      points: [pt],
      color: strokeColor,
      lineWidth,
      mode: tool,
      markerOpacity: tool === 'marker' ? markerOpacity : undefined,
    };
    redraw();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !drawingRef.current) return;
    const pt = toCanvasPoint(e);
    drawingRef.current = {
      ...drawingRef.current,
      points: [...drawingRef.current.points, pt],
    };
    redraw();
  };

  const onPointerUp = () => {
    if (readOnly || !drawingRef.current) return;
    onStrokesChange([...strokes, drawingRef.current]);
    drawingRef.current = null;
    redraw();
  };

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
        touchAction: 'none',
        cursor: readOnly ? 'default' : 'crosshair',
        zIndex: 2,
      }}
    />
  );
};

export default PresentationDrawOverlay;
