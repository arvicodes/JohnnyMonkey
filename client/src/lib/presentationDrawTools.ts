import { isFilledInkStroke, type PresentationShapeKind, type PresentationStroke } from './presentationDeck';
import { pathEndAngleRad, shaftEndPoint } from './presentationShapePaths';
import { getBoxFrame, hitTestShapeBody } from './presentationShapeTransform';

export type PresentationDrawTool =
  | 'select'
  | 'pen'
  | 'marker'
  | 'eraser'
  | 'shape-line'
  | 'shape-rect'
  | 'shape-ellipse'
  | 'shape-arrow'
  | 'shape-curved-arrow';

export const PEN_LINE_WIDTHS = [1.5, 3, 5, 8] as const;
export const MARKER_LINE_WIDTHS = [6, 10, 16, 24] as const;
export const SHAPE_LINE_WIDTHS = [2, 4, 6, 10] as const;

/** Stift / Schrift auf der Folie */
export const DEFAULT_PEN_COLOR = '#1565c0';
/** Textmarker / Markierung */
export const DEFAULT_MARKER_COLOR = '#FDD835';

export const PEN_COLORS = [
  DEFAULT_PEN_COLOR,
  DEFAULT_MARKER_COLOR,
  '#c62828',
  '#2e7d32',
  '#000000',
  '#FF9800',
  '#6A1B9A',
  '#FFFFFF',
] as const;

export function defaultColorForTool(tool: PresentationDrawTool): string {
  return tool === 'marker' ? DEFAULT_MARKER_COLOR : DEFAULT_PEN_COLOR;
}

export const ERASER_RADIUS = 32;
/** Textmarker auf der Folie — Wort muss durchscheinen. */
export const DEFAULT_MARKER_OPACITY = 0.14;
const LEGACY_MARKER_OPACITY = 0.38;
/** Stufen in der Play-Leiste (Deckkraft). */
export const MARKER_OPACITY_PRESETS = [0.08, 0.14, 0.22, 0.32, 0.48] as const;

export function resolveMarkerOpacity(stored?: number): number {
  if (stored == null || !Number.isFinite(stored)) return DEFAULT_MARKER_OPACITY;
  if (Math.abs(stored - LEGACY_MARKER_OPACITY) < 0.02) return DEFAULT_MARKER_OPACITY;
  return Math.min(0.6, Math.max(0.06, stored));
}

export function toolUsesColor(tool: PresentationDrawTool): boolean {
  return tool !== 'eraser' && tool !== 'select';
}

/** Apple Pencil / Stylus — nicht in Textfelder, sondern Tinte / Verschieben. */
export function isPenPointer(e: { pointerType?: string } | PointerEvent): boolean {
  return e.pointerType === 'pen';
}

export function toolUsesLineWidth(tool: PresentationDrawTool): boolean {
  return tool !== 'eraser';
}

export function defaultLineWidthForTool(tool: PresentationDrawTool): number {
  if (tool === 'marker') return 10;
  if (tool === 'select' || isShapeTool(tool)) return 4;
  return 3;
}

export function lineWidthsForTool(tool: PresentationDrawTool): readonly number[] {
  if (tool === 'marker') return MARKER_LINE_WIDTHS;
  if (tool === 'select' || isShapeTool(tool)) return SHAPE_LINE_WIDTHS;
  return PEN_LINE_WIDTHS;
}

export function toolLineWidth(tool: PresentationDrawTool, customWidth?: number): number {
  if (customWidth != null) return customWidth;
  return defaultLineWidthForTool(tool);
}

export function toolToShape(tool: PresentationDrawTool): PresentationShapeKind | undefined {
  switch (tool) {
    case 'shape-line':
      return 'line';
    case 'shape-rect':
      return 'rect';
    case 'shape-ellipse':
      return 'ellipse';
    case 'shape-arrow':
      return 'arrow';
    case 'shape-curved-arrow':
      return 'curved-arrow';
    default:
      return undefined;
  }
}

export function isShapeTool(tool: PresentationDrawTool): boolean {
  return tool.startsWith('shape-');
}

export function isBoxShapeTool(tool: PresentationDrawTool): boolean {
  return tool === 'shape-rect' || tool === 'shape-ellipse';
}

export function isBoxInkShape(stroke: PresentationStroke): boolean {
  return stroke.shape === 'rect' || stroke.shape === 'ellipse';
}

export function inkShapeHasFill(stroke: PresentationStroke): boolean {
  if (!isBoxInkShape(stroke)) return false;
  const f = (stroke.fillColor || '').trim().toLowerCase();
  return Boolean(f) && f !== 'none' && f !== 'transparent';
}

export function inkShapeFillColor(stroke: PresentationStroke): string | null {
  return inkShapeHasFill(stroke) ? (stroke.fillColor as string) : null;
}

export function withInkStrokeColor(stroke: PresentationStroke, color: string): PresentationStroke {
  if (inkShapeHasFill(stroke)) return { ...stroke, color, fillColor: color };
  return { ...stroke, color };
}

/** Stift/Marker/Formen/Radierer — Overlay fängt Eingabe ab (nicht Lasso). */
export function isInkDrawCaptureTool(tool: PresentationDrawTool): boolean {
  return tool === 'pen' || tool === 'marker' || tool === 'eraser' || isShapeTool(tool);
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return `rgba(200,80,80,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function distPointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pointInPoly(pt: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersect =
      a.y > pt.y !== b.y > pt.y && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y + 1e-9) + a.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function polylineHitsRadius(
  points: { x: number; y: number }[],
  ep: { x: number; y: number },
  radius: number,
): boolean {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (distPointToSegment(ep.x, ep.y, a.x, a.y, b.x, b.y) < radius) return true;
  }
  return false;
}

function strokeHitByEraser(
  stroke: PresentationStroke,
  eraserPoints: { x: number; y: number }[],
  radius: number
): boolean {
  if (stroke.shape && stroke.points.length >= 2) {
    const [p0, p1] = stroke.points;
    for (const ep of eraserPoints) {
      if (stroke.shape === 'rect' || stroke.shape === 'ellipse') {
        if (hitTestShapeBody(stroke, ep, radius)) return true;
        continue;
      }
      if (distPointToSegment(ep.x, ep.y, p0.x, p0.y, p1.x, p1.y) < radius) return true;
    }
    return false;
  }

  if (isFilledInkStroke(stroke)) {
    for (const ep of eraserPoints) {
      const inOuter = pointInPoly(ep, stroke.points);
      const inHole = Boolean(stroke.holes?.some((hole) => hole.length >= 3 && pointInPoly(ep, hole)));
      if (inOuter && !inHole) return true;
      if (polylineHitsRadius(stroke.points, ep, radius)) return true;
      if (stroke.holes?.some((hole) => polylineHitsRadius(hole, ep, radius))) return true;
    }
    return false;
  }

  if (stroke.points.length < 2) return false;
  for (const ep of eraserPoints) {
    if (polylineHitsRadius(stroke.points, ep, radius)) return true;
  }
  return false;
}

export function applyEraserToStrokes(
  strokes: PresentationStroke[],
  eraserPoints: { x: number; y: number }[],
  radius = ERASER_RADIUS
): PresentationStroke[] {
  if (eraserPoints.length === 0) return strokes;
  return strokes.filter((s) => !strokeHitByEraser(s, eraserPoints, radius));
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  headLen: number
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  drawArrowHeadAtAngle(ctx, toX, toY, angle, headLen);
}

function drawArrowHeadAtAngle(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  angle: number,
  headLen: number
) {
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - headLen * Math.cos(angle - Math.PI / 6),
    tipY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - headLen * Math.cos(angle + Math.PI / 6),
    tipY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function curvedArrowControl(p0: { x: number; y: number }, p1: { x: number; y: number }, bend: number) {
  const mx = (p0.x + p1.x) / 2;
  const my = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
}

function resolveInkArrowHeadSize(stroke: PresentationStroke): number {
  if (stroke.arrowHeadSize != null && Number.isFinite(stroke.arrowHeadSize)) {
    return Math.max(4, Math.min(36, stroke.arrowHeadSize));
  }
  return Math.max(14, stroke.lineWidth * 4);
}

export function drawPresentationStroke(ctx: CanvasRenderingContext2D, stroke: PresentationStroke) {
  if (stroke.points.length < 2) return;

  if (isFilledInkStroke(stroke)) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = stroke.color;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 0.85;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.closePath();
    if (stroke.holes) {
      for (const hole of stroke.holes) {
        if (hole.length < 3) continue;
        ctx.moveTo(hole[0].x, hole[0].y);
        for (let i = 1; i < hole.length; i++) ctx.lineTo(hole[i].x, hole[i].y);
        ctx.closePath();
      }
    }
    ctx.fill('evenodd');
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.shape) {
    const [p0, p1] = stroke.points;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    switch (stroke.shape) {
      case 'line':
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        break;
      case 'rect': {
        const frame = getBoxFrame(stroke);
        ctx.save();
        ctx.translate(frame.cx, frame.cy);
        ctx.rotate(frame.rotation);
        const fill = inkShapeFillColor(stroke);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fillRect(-frame.w / 2, -frame.h / 2, frame.w, frame.h);
        }
        ctx.strokeRect(-frame.w / 2, -frame.h / 2, frame.w, frame.h);
        ctx.restore();
        break;
      }
      case 'ellipse': {
        const frame = getBoxFrame(stroke);
        ctx.save();
        ctx.translate(frame.cx, frame.cy);
        ctx.rotate(frame.rotation);
        ctx.ellipse(0, 0, Math.max(frame.w / 2, 1), Math.max(frame.h / 2, 1), 0, 0, Math.PI * 2);
        const fill = inkShapeFillColor(stroke);
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'arrow': {
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
        drawArrowHead(ctx, p0.x, p0.y, p1.x, p1.y, resolveInkArrowHeadSize(stroke));
        break;
      }
      case 'curved-arrow': {
        const cp = curvedArrowControl(p0, p1, stroke.curveBend ?? 35);
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y);
        ctx.stroke();
        const angle = Math.atan2(p1.y - cp.y, p1.x - cp.x);
        drawArrowHeadAtAngle(ctx, p1.x, p1.y, angle, resolveInkArrowHeadSize(stroke));
        break;
      }
      case 'connector': {
        const pts = stroke.points;
        if (pts.length < 2) break;
        const headSize = resolveInkArrowHeadSize(stroke);
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const bw = Math.max(Math.max(...xs) - minX, 1);
        const bh = Math.max(Math.max(...ys) - minY, 1);
        const local = pts.map((p) => ({
          x: ((p.x - minX) / bw) * 100,
          y: ((p.y - minY) / bh) * 100,
        }));
        const shaftEnd = shaftEndPoint('connector', local, null, headSize);
        const angle = pathEndAngleRad('connector', local, null);
        const toAbs = (p: { x: number; y: number }) => ({
          x: minX + (p.x / 100) * bw,
          y: minY + (p.y / 100) * bh,
        });
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i += 1) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        const se = toAbs(shaftEnd);
        ctx.lineTo(se.x, se.y);
        ctx.stroke();
        const tip = pts[pts.length - 1];
        drawArrowHeadAtAngle(ctx, tip.x, tip.y, angle, headSize);
        break;
      }
      default:
        break;
    }
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  if (stroke.mode === 'marker') {
    ctx.strokeStyle = hexToRgba(stroke.color, resolveMarkerOpacity(stroke.markerOpacity));
    ctx.lineWidth = stroke.lineWidth * 2.2;
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 1.5;
  strokeSmoothFreehand(ctx, stroke.points);
  ctx.globalCompositeOperation = 'source-over';
}

/** Catmull-Rom durch die Punkte — Schrift bleibt rund, nicht eckig. */
export function strokeSmoothFreehand(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
    return;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
  ctx.stroke();
}
