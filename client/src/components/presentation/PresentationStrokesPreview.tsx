import React, { useEffect, useMemo, useRef } from 'react';
import {
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from '../../lib/presentationDeck';
import { drawPresentationStroke } from '../../lib/presentationDrawTools';

interface PresentationStrokesPreviewProps {
  strokes: PresentationStroke[];
  scale: number;
}

/** Read-only stroke layer for Laptop/review — no parent callbacks, no interaction hooks. */
const PresentationStrokesPreview: React.FC<PresentationStrokesPreviewProps> = ({
  strokes,
  scale,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesKey = useMemo(
    () => strokes.map((s) => `${s.id}:${s.points.length}`).join('|'),
    [strokes]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SLIDE_REF_WIDTH, SLIDE_REF_HEIGHT);
    for (const stroke of strokes) drawPresentationStroke(ctx, stroke);
  }, [strokes, strokesKey]);

  if (strokes.length === 0) return null;

  const displayW = SLIDE_REF_WIDTH * scale;
  const displayH = SLIDE_REF_HEIGHT * scale;

  return (
    <canvas
      ref={canvasRef}
      width={SLIDE_REF_WIDTH}
      height={SLIDE_REF_HEIGHT}
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: displayW,
        height: displayH,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
};

export default PresentationStrokesPreview;
