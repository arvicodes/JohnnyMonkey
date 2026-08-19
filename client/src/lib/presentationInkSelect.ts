import type { PresentationStroke } from './presentationDeck';
import { hitTestShapeBody, isSelectableShape, type Pt } from './presentationShapeTransform';

export type Bounds = { x: number; y: number; w: number; h: number };
export type BoundsHandle = 'move' | 'nw' | 'ne' | 'se' | 'sw';

/** Slide-Koordinaten — Stift braucht mehr als Finger-Hit-Slop. */
const HANDLE_R = 44;
const INK_HIT_PAD = 10;
const LASSO_MIN_SPAN = 28;

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function pointInPolygon(pt: Pt, poly: Pt[]): boolean {
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

export function hitTestInkStroke(stroke: PresentationStroke, pt: Pt, pad = INK_HIT_PAD): boolean {
  if (stroke.shape) return hitTestShapeBody(stroke, pt, pad);
  const pts = stroke.points;
  if (pts.length === 0) return false;
  if (pts.length === 1) return Math.hypot(pt.x - pts[0].x, pt.y - pts[0].y) <= pad + stroke.lineWidth;
  const thresh = pad + stroke.lineWidth;
  for (let i = 1; i < pts.length; i++) {
    if (distPointToSegment(pt.x, pt.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= thresh) {
      return true;
    }
  }
  return false;
}

export function findStrokeAtPoint(strokes: PresentationStroke[], pt: Pt): PresentationStroke | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    if (s.shape && isSelectableShape(s) && hitTestShapeBody(s, pt)) return s;
    if (!s.shape && hitTestInkStroke(s, pt)) return s;
  }
  return null;
}

export function getStrokesBounds(strokes: PresentationStroke[]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    const pad = (s.lineWidth || 0) / 2;
    for (const p of s.points) {
      minX = Math.min(minX, p.x - pad);
      minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad);
      maxY = Math.max(maxY, p.y + pad);
    }
  }
  if (!Number.isFinite(minX) || maxX - minX < 1 || maxY - minY < 1) {
    if (!Number.isFinite(minX)) return null;
    return { x: minX - 8, y: minY - 8, w: 16, h: 16 };
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pointInBounds(pt: Pt, b: Bounds, pad = 8): boolean {
  return pt.x >= b.x - pad && pt.x <= b.x + b.w + pad && pt.y >= b.y - pad && pt.y <= b.y + b.h + pad;
}

export function pickBoundsHandle(b: Bounds, pt: Pt, radius = HANDLE_R): BoundsHandle | null {
  const corners: { handle: BoundsHandle; x: number; y: number }[] = [
    { handle: 'nw', x: b.x, y: b.y },
    { handle: 'ne', x: b.x + b.w, y: b.y },
    { handle: 'se', x: b.x + b.w, y: b.y + b.h },
    { handle: 'sw', x: b.x, y: b.y + b.h },
  ];
  for (const c of corners) {
    if (Math.hypot(pt.x - c.x, pt.y - c.y) <= radius) return c.handle;
  }
  if (pointInBounds(pt, b, 4)) return 'move';
  return null;
}

function segmentsIntersect(a1: Pt, a2: Pt, b1: Pt, b2: Pt): boolean {
  const d = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const o1 = d(a1, a2, b1);
  const o2 = d(a1, a2, b2);
  const o3 = d(b1, b2, a1);
  const o4 = d(b1, b2, a2);
  if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) return false;
  return o1 * o2 <= 0 && o3 * o4 <= 0;
}

export function strokeHitsLasso(stroke: PresentationStroke, lasso: Pt[]): boolean {
  if (lasso.length < 3) return false;
  for (const p of stroke.points) {
    if (pointInPolygon(p, lasso)) return true;
  }
  for (let i = 1; i < stroke.points.length; i++) {
    const a = stroke.points[i - 1];
    const b = stroke.points[i];
    for (let j = 0; j < lasso.length; j++) {
      const c = lasso[j];
      const d = lasso[(j + 1) % lasso.length];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
}

export function lassoIsMeaningful(lasso: Pt[]): boolean {
  if (lasso.length < 6) return false;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of lasso) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return maxX - minX >= LASSO_MIN_SPAN || maxY - minY >= LASSO_MIN_SPAN;
}

export function moveStroke(stroke: PresentationStroke, dx: number, dy: number): PresentationStroke {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  };
}

export function scaleStroke(
  stroke: PresentationStroke,
  origin: Pt,
  sx: number,
  sy: number
): PresentationStroke {
  const nx = Number.isFinite(sx) && Math.abs(sx) > 0.05 ? sx : 1;
  const ny = Number.isFinite(sy) && Math.abs(sy) > 0.05 ? sy : 1;
  const mag = Math.sqrt(Math.abs(nx * ny));
  return {
    ...stroke,
    lineWidth: Math.max(0.6, stroke.lineWidth * mag),
    points: stroke.points.map((p) => ({
      x: origin.x + (p.x - origin.x) * nx,
      y: origin.y + (p.y - origin.y) * ny,
    })),
  };
}

export function scaleStrokesFromHandle(
  snapshots: PresentationStroke[],
  startBounds: Bounds,
  handle: Exclude<BoundsHandle, 'move'>,
  pointer: Pt
): PresentationStroke[] {
  const left = startBounds.x;
  const right = startBounds.x + startBounds.w;
  const top = startBounds.y;
  const bottom = startBounds.y + startBounds.h;
  let origin: Pt;
  let sx: number;
  let sy: number;
  switch (handle) {
    case 'se':
      origin = { x: left, y: top };
      sx = (pointer.x - origin.x) / Math.max(8, startBounds.w);
      sy = (pointer.y - origin.y) / Math.max(8, startBounds.h);
      break;
    case 'nw':
      origin = { x: right, y: bottom };
      sx = (origin.x - pointer.x) / Math.max(8, startBounds.w);
      sy = (origin.y - pointer.y) / Math.max(8, startBounds.h);
      break;
    case 'ne':
      origin = { x: left, y: bottom };
      sx = (pointer.x - origin.x) / Math.max(8, startBounds.w);
      sy = (origin.y - pointer.y) / Math.max(8, startBounds.h);
      break;
    case 'sw':
      origin = { x: right, y: top };
      sx = (origin.x - pointer.x) / Math.max(8, startBounds.w);
      sy = (pointer.y - origin.y) / Math.max(8, startBounds.h);
      break;
    default:
      return snapshots;
  }
  sx = Math.max(0.12, Math.min(8, sx));
  sy = Math.max(0.12, Math.min(8, sy));
  return snapshots.map((s) => scaleStroke(s, origin, sx, sy));
}

export function drawLassoPath(ctx: CanvasRenderingContext2D, points: Pt[], accent = '#FF9800') {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = 'rgba(255,152,0,0.12)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawBoundsSelection(ctx: CanvasRenderingContext2D, b: Bounds, accent = '#FF9800') {
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = 'rgba(255,152,0,0.06)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff';
  const corners = [
    { x: b.x, y: b.y },
    { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h },
    { x: b.x, y: b.y + b.h },
  ];
  const hs = 7;
  for (const c of corners) {
    ctx.beginPath();
    ctx.rect(c.x - hs, c.y - hs, hs * 2, hs * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}
