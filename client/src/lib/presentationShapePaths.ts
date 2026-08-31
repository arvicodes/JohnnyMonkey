/**
 * Pfeil-/Linien-Geometrie: Punkte in lokaler Box (0–100), Pfeilspitze, Bögen, Ecken.
 */
import type { PresentationShapeKind, SlideElement } from './presentationDeck';

export type ShapePoint = { x: number; y: number };

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function isLineLikeShapeKind(kind?: PresentationShapeKind): boolean {
  return kind === 'arrow' || kind === 'curved-arrow' || kind === 'line' || kind === 'connector';
}

export function shapeHasArrowHead(kind?: PresentationShapeKind): boolean {
  return kind === 'arrow' || kind === 'curved-arrow' || kind === 'connector';
}

/** Legacy flipH/V → Start/Ende in lokaler Box. */
export function defaultShapePointsFromFlip(
  flipH?: boolean,
  flipV?: boolean,
): [ShapePoint, ShapePoint] {
  const x1 = flipH ? 94 : 6;
  const y1 = flipV ? 94 : 6;
  const x2 = flipH ? 6 : 94;
  const y2 = flipV ? 6 : 94;
  return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
}

export function defaultShapePoints(kind: PresentationShapeKind, flipH?: boolean, flipV?: boolean): ShapePoint[] {
  if (kind === 'connector') {
    return [
      { x: 8, y: 80 },
      { x: 8, y: 20 },
      { x: 92, y: 20 },
    ];
  }
  const [a, b] = defaultShapePointsFromFlip(flipH, flipV);
  return [a, b];
}

export function resolveShapePoints(el: Pick<SlideElement, 'shapeKind' | 'shapePoints' | 'flipH' | 'flipV'>): ShapePoint[] {
  const kind = el.shapeKind || 'arrow';
  if (Array.isArray(el.shapePoints) && el.shapePoints.length >= 2) {
    return el.shapePoints.map((p) => ({ x: p.x, y: p.y }));
  }
  return defaultShapePoints(kind, el.flipH, el.flipV);
}

export function resolveCurveControl(
  points: ShapePoint[],
  el: Pick<SlideElement, 'shapeCurveControl' | 'curveBend'>,
): ShapePoint {
  if (el.shapeCurveControl) return { ...el.shapeCurveControl };
  const bend = el.curveBend ?? 35;
  return {
    x: (points[0].x + points[points.length - 1].x) / 2,
    y: (points[0].y + points[points.length - 1].y) / 2 + bend,
  };
}

export function resolveArrowHeadSize(el: Pick<SlideElement, 'arrowHeadSize' | 'strokeWidth'>): number {
  const raw = el.arrowHeadSize ?? Math.max(8, (el.strokeWidth ?? 4) * 2.2);
  return clamp(raw, 4, 28);
}

export function normalizeShapeElement(el: SlideElement): SlideElement {
  if (el.type !== 'shape' || !isLineLikeShapeKind(el.shapeKind)) return el;
  const kind = el.shapeKind || 'arrow';
  const points = resolveShapePoints(el);
  const next: SlideElement = {
    ...el,
    shapePoints: points,
  };
  if (kind === 'curved-arrow' && !el.shapeCurveControl) {
    next.shapeCurveControl = resolveCurveControl(points, el);
  }
  if (shapeHasArrowHead(kind) && el.arrowHeadSize == null) {
    next.arrowHeadSize = resolveArrowHeadSize(el);
  }
  return next;
}

function dist(a: ShapePoint, b: ShapePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pointOnSegment(a: ShapePoint, b: ShapePoint, t: number): ShapePoint {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Punkt auf Pfad kurz vor der Spitze (für Schaft-Ende). */
export function shaftEndPoint(
  kind: PresentationShapeKind,
  points: ShapePoint[],
  curveControl: ShapePoint | null,
  headSize: number,
): ShapePoint {
  const tip = points[points.length - 1];
  const headT = clamp(headSize / 100, 0.05, 0.35);

  if (kind === 'curved-arrow' && points.length >= 2 && curveControl) {
    const p0 = points[0];
    const p1 = curveControl;
    const p2 = tip;
    const t = 1 - headT;
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
  }

  if (points.length >= 2) {
    const a = points[points.length - 2];
    const b = tip;
    const len = dist(a, b) || 1;
    const pull = clamp(headSize * 0.85, 2, len * 0.45);
    const t = 1 - pull / len;
    return pointOnSegment(a, b, t);
  }
  return tip;
}

/** Winkel (Rad) am Pfadende — für Pfeilspitze. */
export function pathEndAngleRad(
  kind: PresentationShapeKind,
  points: ShapePoint[],
  curveControl: ShapePoint | null,
): number {
  const tip = points[points.length - 1];
  if (kind === 'curved-arrow' && points.length >= 2 && curveControl) {
    const dx = tip.x - curveControl.x;
    const dy = tip.y - curveControl.y;
    return Math.atan2(dy, dx);
  }
  if (points.length >= 2) {
    const a = points[points.length - 2];
    return Math.atan2(tip.y - a.y, tip.x - a.x);
  }
  return 0;
}

export function arrowHeadPolygon(
  tipX: number,
  tipY: number,
  angleRad: number,
  size: number,
): string {
  const back = size * 1.05;
  const half = size * 0.48;
  const bx = tipX - back * Math.cos(angleRad);
  const by = tipY - back * Math.sin(angleRad);
  const lx = bx + half * Math.sin(angleRad);
  const ly = by - half * Math.cos(angleRad);
  const rx = bx - half * Math.sin(angleRad);
  const ry = by + half * Math.cos(angleRad);
  return `${tipX.toFixed(2)},${tipY.toFixed(2)} ${lx.toFixed(2)},${ly.toFixed(2)} ${rx.toFixed(2)},${ry.toFixed(2)}`;
}

export function buildLinePathD(
  kind: PresentationShapeKind,
  points: ShapePoint[],
  curveControl: ShapePoint | null,
  headSize: number,
): { path: string; head: string | null; shaftOnly: string } {
  if (points.length < 2) {
    return { path: '', head: null, shaftOnly: '' };
  }

  const tip = points[points.length - 1];
  const shaftEnd = shaftEndPoint(kind, points, curveControl, headSize);
  const angle = pathEndAngleRad(kind, points, curveControl);

  if (kind === 'curved-arrow' && curveControl) {
    const d = `M ${points[0].x} ${points[0].y} Q ${curveControl.x} ${curveControl.y} ${shaftEnd.x} ${shaftEnd.y}`;
    const head = arrowHeadPolygon(tip.x, tip.y, angle, headSize);
    return { path: d, head, shaftOnly: d };
  }

  if (kind === 'connector' || points.length > 2) {
    const parts = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length - 1; i += 1) {
      parts.push(`L ${points[i].x} ${points[i].y}`);
    }
    parts.push(`L ${shaftEnd.x} ${shaftEnd.y}`);
    const d = parts.join(' ');
    const head = arrowHeadPolygon(tip.x, tip.y, angle, headSize);
    return { path: d, head, shaftOnly: d };
  }

  if (kind === 'line') {
    const d = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    return { path: d, head: null, shaftOnly: d };
  }

  // arrow
  const d = `M ${points[0].x} ${points[0].y} L ${shaftEnd.x} ${shaftEnd.y}`;
  const head = arrowHeadPolygon(tip.x, tip.y, angle, headSize);
  return { path: d, head, shaftOnly: d };
}

/** Bildschirm → lokale Shape-Koordinaten (0–100). */
export function clientToShapeLocal(
  clientX: number,
  clientY: number,
  el: Pick<SlideElement, 'x' | 'y' | 'w' | 'h'>,
  slideRect: DOMRect,
): ShapePoint {
  const left = slideRect.left + (el.x / 100) * slideRect.width;
  const top = slideRect.top + (el.y / 100) * slideRect.height;
  const w = (el.w / 100) * slideRect.width;
  const h = (el.h / 100) * slideRect.height;
  return {
    x: clamp(((clientX - left) / w) * 100, -5, 105),
    y: clamp(((clientY - top) / h) * 100, -5, 105),
  };
}

/** Slide-% → lokale Punkte + Bounding-Box für neu gezeichneten Connector. */
export function connectorElementFromSlidePoints(
  slidePoints: ShapePoint[],
  zIndex: number,
  accent: string,
): Omit<SlideElement, 'id'> {
  const pad = 3;
  const xs = slidePoints.map((p) => p.x);
  const ys = slidePoints.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const w = Math.max(maxX - minX, 4);
  const h = Math.max(maxY - minY, 4);
  const local = slidePoints.map((p) => ({
    x: ((p.x - minX) / w) * 100,
    y: ((p.y - minY) / h) * 100,
  }));
  return {
    type: 'shape',
    shapeKind: 'connector',
    x: minX,
    y: minY,
    w,
    h,
    zIndex,
    strokeColor: accent,
    strokeWidth: 4,
    fillColor: 'transparent',
    shapePoints: local,
    arrowHeadSize: 10,
  };
}
