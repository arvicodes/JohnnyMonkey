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

/** Legacy flipH/V → Start/Ende. Standard: waagerecht (nicht schräg). */
export function defaultShapePointsFromFlip(
  flipH?: boolean,
  flipV?: boolean,
): [ShapePoint, ShapePoint] {
  // Senkrecht
  if (flipV) {
    const y1 = flipH ? 94 : 6;
    const y2 = flipH ? 6 : 94;
    return [
      { x: 50, y: y1 },
      { x: 50, y: y2 },
    ];
  }
  // Waagerecht (Standard)
  const x1 = flipH ? 94 : 6;
  const x2 = flipH ? 6 : 94;
  return [
    { x: x1, y: 50 },
    { x: x2, y: 50 },
  ];
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
  const raw = el.arrowHeadSize ?? Math.max(14, (el.strokeWidth ?? 10.5) * 2.1);
  return clamp(raw, 4, 36);
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
  /** Element-Seitenverhältnis w/h — gegen gequetschte Spitzen in flachen Boxen. */
  boxAspect = 1,
): string {
  const ar = Number.isFinite(boxAspect) && boxAspect > 0.08 ? boxAspect : 1;
  const back = size * 1.08;
  const half = size * 0.5;
  // In „gleichmäßigem“ Raum (y' = y * ar) konstruieren, dann zurück
  const tipUy = tipY * ar;
  const ang = Math.atan2(Math.sin(angleRad) * ar, Math.cos(angleRad));
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const ubx = tipX - back * c;
  const uby = tipUy - back * s;
  const lx = ubx + half * s;
  const ly = (uby - half * c) / ar;
  const rx = ubx - half * s;
  const ry = (uby + half * c) / ar;
  return `${tipX.toFixed(2)},${tipY.toFixed(2)} ${lx.toFixed(2)},${ly.toFixed(2)} ${rx.toFixed(2)},${ry.toFixed(2)}`;
}

export function buildLinePathD(
  kind: PresentationShapeKind,
  points: ShapePoint[],
  curveControl: ShapePoint | null,
  headSize: number,
  boxAspect = 1,
): { path: string; head: string | null; shaftOnly: string } {
  if (points.length < 2) {
    return { path: '', head: null, shaftOnly: '' };
  }

  const tip = points[points.length - 1];
  const shaftEnd = shaftEndPoint(kind, points, curveControl, headSize);
  const angle = pathEndAngleRad(kind, points, curveControl);

  if (kind === 'curved-arrow' && curveControl) {
    const d = `M ${points[0].x} ${points[0].y} Q ${curveControl.x} ${curveControl.y} ${shaftEnd.x} ${shaftEnd.y}`;
    const head = arrowHeadPolygon(tip.x, tip.y, angle, headSize, boxAspect);
    return { path: d, head, shaftOnly: d };
  }

  if (kind === 'connector' || points.length > 2) {
    const parts = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length - 1; i += 1) {
      parts.push(`L ${points[i].x} ${points[i].y}`);
    }
    parts.push(`L ${shaftEnd.x} ${shaftEnd.y}`);
    const d = parts.join(' ');
    const head = arrowHeadPolygon(tip.x, tip.y, angle, headSize, boxAspect);
    return { path: d, head, shaftOnly: d };
  }

  if (kind === 'line') {
    const d = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    return { path: d, head: null, shaftOnly: d };
  }

  // arrow
  const d = `M ${points[0].x} ${points[0].y} L ${shaftEnd.x} ${shaftEnd.y}`;
  const head = arrowHeadPolygon(tip.x, tip.y, angle, headSize, boxAspect);
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

export function clientToSlidePct(
  clientX: number,
  clientY: number,
  slideLeft: number,
  slideTop: number,
  slideW: number,
  slideH: number,
  maxY = 100,
): ShapePoint {
  return {
    x: clamp(((clientX - slideLeft) / slideW) * 100, 0, 100),
    y: clamp(((clientY - slideTop) / slideH) * 100, 0, Math.max(100, maxY)),
  };
}

export function localPointsToSlide(
  el: Pick<SlideElement, 'x' | 'y' | 'w' | 'h'>,
  points: ShapePoint[],
): ShapePoint[] {
  return points.map((p) => ({
    x: el.x + (p.x / 100) * el.w,
    y: el.y + (p.y / 100) * el.h,
  }));
}

/** Endpunkt an Nachbar ausrichten: Shift = hart H/V, sonst weiches Einrasten. */
export function snapSlidePointAxis(
  point: ShapePoint,
  anchor: ShapePoint,
  hard: boolean,
): ShapePoint {
  if (hard) {
    if (Math.abs(point.x - anchor.x) >= Math.abs(point.y - anchor.y)) {
      return { x: point.x, y: anchor.y };
    }
    return { x: anchor.x, y: point.y };
  }
  const soft = 1.25;
  if (Math.abs(point.y - anchor.y) <= soft) return { x: point.x, y: anchor.y };
  if (Math.abs(point.x - anchor.x) <= soft) return { x: anchor.x, y: point.y };
  return point;
}

/**
 * Lokale Punkte → neue Bounding-Box auf der Folie (Endpunkte frei ziehbar, auch H/V).
 */
export function rebaseShapeFromSlidePoints(
  el: SlideElement,
  slidePoints: ShapePoint[],
  opts?: { curveSlide?: ShapePoint | null },
): Partial<SlideElement> {
  if (slidePoints.length < 2) return {};
  const pad = 2.2;
  const xs = slidePoints.map((p) => p.x);
  const ys = slidePoints.map((p) => p.y);
  if (opts?.curveSlide) {
    xs.push(opts.curveSlide.x);
    ys.push(opts.curveSlide.y);
  }
  let minX = Math.min(...xs) - pad;
  let minY = Math.min(...ys) - pad;
  let maxX = Math.max(...xs) + pad;
  let maxY = Math.max(...ys) + pad;

  // Mindest-Dicke, damit waagerechte/senkrechte Pfeile Griffe + Spitze behalten
  const minSpan = 4;
  if (maxX - minX < minSpan) {
    const mid = (minX + maxX) / 2;
    minX = mid - minSpan / 2;
    maxX = mid + minSpan / 2;
  }
  if (maxY - minY < minSpan) {
    const mid = (minY + maxY) / 2;
    minY = mid - minSpan / 2;
    maxY = mid + minSpan / 2;
  }

  const w = Math.max(maxX - minX, 2);
  const h = Math.max(maxY - minY, 2);
  const toLocal = (p: ShapePoint): ShapePoint => ({
    x: ((p.x - minX) / w) * 100,
    y: ((p.y - minY) / h) * 100,
  });

  const patch: Partial<SlideElement> = {
    x: minX,
    y: minY,
    w,
    h,
    shapePoints: slidePoints.map(toLocal),
    flipH: undefined,
    flipV: undefined,
  };
  if (opts?.curveSlide) {
    patch.shapeCurveControl = toLocal(opts.curveSlide);
    patch.curveBend = undefined;
  }
  return patch;
}

/** Ausgewählten Pfeil waagerecht oder senkrecht ausrichten (Länge beibehalten). */
export function orientLineShape(
  el: SlideElement,
  orientation: 'horizontal' | 'vertical',
): Partial<SlideElement> {
  const points = resolveShapePoints(el);
  if (points.length < 2) return {};
  const slidePts = localPointsToSlide(el, points);
  const start = slidePts[0];
  const end = slidePts[slidePts.length - 1];
  const len = Math.max(Math.hypot(end.x - start.x, end.y - start.y), 12);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const n = Math.max(slidePts.length - 1, 1);

  let nextSlide: ShapePoint[];
  if (orientation === 'horizontal') {
    const directedRight = end.x >= start.x;
    const x0 = midX - len / 2;
    nextSlide = slidePts.map((_p, i) => {
      const t = i / n;
      return {
        x: directedRight ? x0 + t * len : x0 + len - t * len,
        y: midY,
      };
    });
  } else {
    const directedDown = end.y >= start.y;
    const y0 = midY - len / 2;
    nextSlide = slidePts.map((_p, i) => {
      const t = i / n;
      return {
        x: midX,
        y: directedDown ? y0 + t * len : y0 + len - t * len,
      };
    });
  }

  let curveSlide: ShapePoint | null = null;
  if (el.shapeKind === 'curved-arrow') {
    const bend = orientation === 'horizontal' ? -8 : 8;
    const a = nextSlide[0];
    const b = nextSlide[nextSlide.length - 1];
    curveSlide = {
      x: (a.x + b.x) / 2 + (orientation === 'vertical' ? bend : 0),
      y: (a.y + b.y) / 2 + (orientation === 'horizontal' ? bend : 0),
    };
  }
  return rebaseShapeFromSlidePoints(el, nextSlide, { curveSlide });
}

/** Slide-% → lokale Punkte + Bounding-Box für neu gezeichneten Connector. */
export function connectorElementFromSlidePoints(
  slidePoints: ShapePoint[],
  zIndex: number,
  accent: string,
): Omit<SlideElement, 'id'> {
  const base = rebaseShapeFromSlidePoints(
    {
      id: 'tmp',
      type: 'shape',
      shapeKind: 'connector',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      zIndex,
    },
    slidePoints,
  );
  return {
    type: 'shape',
    shapeKind: 'connector',
    x: base.x ?? 0,
    y: base.y ?? 0,
    w: base.w ?? 10,
    h: base.h ?? 10,
    zIndex,
    strokeColor: accent,
    strokeWidth: 10.5,
    fillColor: 'transparent',
    shapePoints: base.shapePoints,
    arrowHeadSize: 22,
  };
}
