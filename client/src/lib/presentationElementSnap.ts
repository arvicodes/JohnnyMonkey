/**
 * Smart-Guides / Snap & Ausrichten für freie Präsentations-Elemente (%, Folienraum).
 */
import type { SlideElement } from './presentationDeck';
import { IMAGE_FRAME_MAX, IMAGE_FRAME_MIN, IMAGE_FRAME_SIZE_MAX } from './presentationImageUtils';

export type SnapGuide = {
  axis: 'x' | 'y';
  /** Position in % der Folienbreite/-höhe */
  pos: number;
  kind: 'edge' | 'center' | 'size' | 'spacing';
};

export type ElementRect = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type AlignKind =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom';

const MIN_SIZE = 4;
/** Snap-Toleranz in Folien-% (≈ 6–8 px bei typischer Editor-Größe). */
export const SNAP_THRESHOLD_PCT = 0.65;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function elementToRect(el: Pick<SlideElement, 'id' | 'x' | 'y' | 'w' | 'h'>): ElementRect {
  return { id: el.id, x: el.x, y: el.y, w: el.w, h: el.h };
}

function cx(r: ElementRect) {
  return r.x + r.w / 2;
}
function cy(r: ElementRect) {
  return r.y + r.h / 2;
}
function right(r: ElementRect) {
  return r.x + r.w;
}
function bottom(r: ElementRect) {
  return r.y + r.h;
}

type AxisCandidate = { value: number; guidePos: number; kind: SnapGuide['kind'] };

function pickSnap(
  axis: 'x' | 'y',
  raw: number,
  candidates: AxisCandidate[],
  threshold: number,
): { value: number; guide: SnapGuide | null; dist: number; hit: boolean } {
  let best: AxisCandidate | null = null;
  let bestDist = threshold;
  for (const c of candidates) {
    const d = Math.abs(raw - c.value);
    if (d <= bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (!best) return { value: raw, guide: null, dist: Infinity, hit: false };
  return {
    value: best.value,
    guide: { axis, pos: best.guidePos, kind: best.kind },
    dist: bestDist,
    hit: true,
  };
}

/** Folien-Ränder + Mitte als Snap-Ziele (für Kante bzw. Mitte des Elements). */
function slideEdgeCandidates(
  size: number,
  which: 'start' | 'center' | 'end',
): AxisCandidate[] {
  if (which === 'start') {
    return [
      { value: 0, guidePos: 0, kind: 'edge' },
      { value: 50 - size / 2, guidePos: 50, kind: 'center' },
      { value: 100 - size, guidePos: 100, kind: 'edge' },
    ];
  }
  if (which === 'center') {
    return [{ value: 50, guidePos: 50, kind: 'center' }];
  }
  return [
    { value: size, guidePos: 0, kind: 'edge' },
    { value: 50 + size / 2, guidePos: 50, kind: 'center' },
    { value: 100, guidePos: 100, kind: 'edge' },
  ];
}

function otherEdgeCandidates(
  others: ElementRect[],
  axis: 'x' | 'y',
): { start: AxisCandidate[]; center: AxisCandidate[]; end: AxisCandidate[] } {
  const start: AxisCandidate[] = [];
  const center: AxisCandidate[] = [];
  const end: AxisCandidate[] = [];
  for (const o of others) {
    const oStart = axis === 'x' ? o.x : o.y;
    const oMid = axis === 'x' ? cx(o) : cy(o);
    const oEnd = axis === 'x' ? right(o) : bottom(o);
    const pts: AxisCandidate[] = [
      { value: oStart, guidePos: oStart, kind: 'edge' },
      { value: oMid, guidePos: oMid, kind: 'center' },
      { value: oEnd, guidePos: oEnd, kind: 'edge' },
    ];
    start.push(...pts);
    center.push(...pts);
    end.push(...pts);
  }
  return { start, center, end };
}

/** Gleiche Abstände: Lücke links = Lücke rechts (bzw. oben/unten). */
function spacingStartCandidates(others: ElementRect[], axis: 'x' | 'y', size: number): AxisCandidate[] {
  const out: AxisCandidate[] = [];
  if (others.length < 2) return out;
  const edges: number[] = [];
  for (const o of others) {
    edges.push(axis === 'x' ? o.x : o.y);
    edges.push(axis === 'x' ? right(o) : bottom(o));
  }
  edges.sort((a, b) => a - b);
  const gaps: number[] = [];
  for (let i = 1; i < edges.length; i++) {
    const g = edges[i] - edges[i - 1];
    if (g > 0.15 && g < 80) gaps.push(g);
  }
  const uniqGaps = [...new Set(gaps.map((g) => Math.round(g * 100) / 100))];
  for (const o of others) {
    const oEnd = axis === 'x' ? right(o) : bottom(o);
    const oStart = axis === 'x' ? o.x : o.y;
    for (const g of uniqGaps) {
      // Direkt rechts/unten vom Objekt mit Abstand g
      out.push({ value: oEnd + g, guidePos: oEnd + g / 2, kind: 'spacing' });
      // Direkt links/oben: Endkante = oStart - g → start = oStart - g - size
      out.push({ value: oStart - g - size, guidePos: oStart - g / 2, kind: 'spacing' });
    }
  }
  return out;
}

export function snapElementMove(
  proposed: ElementRect,
  others: ElementRect[],
  opts?: { threshold?: number; enabled?: boolean },
): { x: number; y: number; guides: SnapGuide[] } {
  const threshold = opts?.threshold ?? SNAP_THRESHOLD_PCT;
  if (opts?.enabled === false) {
    return {
      x: clamp(proposed.x, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
      y: clamp(proposed.y, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
      guides: [],
    };
  }

  const peers = others.filter((o) => o.id !== proposed.id);
  const guides: SnapGuide[] = [];

  const xOthers = otherEdgeCandidates(peers, 'x');
  const yOthers = otherEdgeCandidates(peers, 'y');

  // X: snap über Start-, Mittel- oder Endkante → resultierendes x
  const xFromStart = pickSnap('x', proposed.x, [
    ...slideEdgeCandidates(proposed.w, 'start'),
    ...xOthers.start,
    ...spacingStartCandidates(peers, 'x', proposed.w),
  ], threshold);
  const xFromCenter = pickSnap('x', cx(proposed), [
    ...slideEdgeCandidates(proposed.w, 'center'),
    ...xOthers.center,
  ], threshold);
  const xFromEnd = pickSnap('x', right(proposed), [
    ...slideEdgeCandidates(proposed.w, 'end'),
    ...xOthers.end,
  ], threshold);

  type ScoredX = { x: number; dist: number; guide: SnapGuide | null };
  const xOptions: ScoredX[] = [];
  if (xFromStart.hit) {
    xOptions.push({ x: xFromStart.value, dist: xFromStart.dist, guide: xFromStart.guide });
  }
  if (xFromCenter.hit) {
    xOptions.push({
      x: xFromCenter.value - proposed.w / 2,
      dist: xFromCenter.dist,
      guide: xFromCenter.guide,
    });
  }
  if (xFromEnd.hit) {
    xOptions.push({
      x: xFromEnd.value - proposed.w,
      dist: xFromEnd.dist,
      guide: xFromEnd.guide,
    });
  }
  xOptions.sort((a, b) => a.dist - b.dist);
  let nextX = proposed.x;
  if (xOptions[0]) {
    nextX = xOptions[0].x;
    if (xOptions[0].guide) guides.push(xOptions[0].guide);
  }

  const yFromStart = pickSnap('y', proposed.y, [
    ...slideEdgeCandidates(proposed.h, 'start'),
    ...yOthers.start,
    ...spacingStartCandidates(peers, 'y', proposed.h),
  ], threshold);
  const yFromCenter = pickSnap('y', cy(proposed), [
    ...slideEdgeCandidates(proposed.h, 'center'),
    ...yOthers.center,
  ], threshold);
  const yFromEnd = pickSnap('y', bottom(proposed), [
    ...slideEdgeCandidates(proposed.h, 'end'),
    ...yOthers.end,
  ], threshold);

  type ScoredY = { y: number; dist: number; guide: SnapGuide | null };
  const yOptions: ScoredY[] = [];
  if (yFromStart.hit) {
    yOptions.push({ y: yFromStart.value, dist: yFromStart.dist, guide: yFromStart.guide });
  }
  if (yFromCenter.hit) {
    yOptions.push({
      y: yFromCenter.value - proposed.h / 2,
      dist: yFromCenter.dist,
      guide: yFromCenter.guide,
    });
  }
  if (yFromEnd.hit) {
    yOptions.push({
      y: yFromEnd.value - proposed.h,
      dist: yFromEnd.dist,
      guide: yFromEnd.guide,
    });
  }
  yOptions.sort((a, b) => a.dist - b.dist);
  let nextY = proposed.y;
  if (yOptions[0]) {
    nextY = yOptions[0].y;
    if (yOptions[0].guide) guides.push(yOptions[0].guide);
  }

  return {
    x: clamp(nextX, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
    y: clamp(nextY, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
    guides,
  };
}

export function snapElementResize(
  proposed: ElementRect,
  corner: 'br' | 'tr',
  others: ElementRect[],
  opts?: { threshold?: number; enabled?: boolean },
): { x: number; y: number; w: number; h: number; guides: SnapGuide[] } {
  const threshold = opts?.threshold ?? SNAP_THRESHOLD_PCT;
  if (opts?.enabled === false) {
    return {
      x: proposed.x,
      y: proposed.y,
      w: clamp(proposed.w, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
      h: clamp(proposed.h, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
      guides: [],
    };
  }

  const peers = others.filter((o) => o.id !== proposed.id);
  const guides: SnapGuide[] = [];
  let { x, y, w, h } = proposed;

  // Breite an andere Breiten / rechte Kante
  const widthTargets: AxisCandidate[] = peers.map((o) => ({
    value: o.w,
    guidePos: o.x + o.w / 2,
    kind: 'size' as const,
  }));
  const snapW = pickSnap('x', w, widthTargets, threshold);
  if (snapW.hit) {
    w = clamp(snapW.value, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
    guides.push({ axis: 'x', pos: x + w, kind: 'size' });
  }

  const heightTargets: AxisCandidate[] = peers.map((o) => ({
    value: o.h,
    guidePos: o.y + o.h / 2,
    kind: 'size' as const,
  }));
  const snapH = pickSnap('y', h, heightTargets, threshold);
  if (snapH.hit) {
    const prevH = h;
    h = clamp(snapH.value, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
    if (corner === 'tr') {
      y = y + (prevH - h);
    }
    guides.push({ axis: 'y', pos: y + h, kind: 'size' });
  }

  // Rechte / untere / obere Kante an andere Kanten
  const rightTargets: AxisCandidate[] = [
    { value: 100, guidePos: 100, kind: 'edge' },
    { value: 50, guidePos: 50, kind: 'center' },
    ...peers.flatMap((o) => [
      { value: o.x, guidePos: o.x, kind: 'edge' as const },
      { value: cx(o), guidePos: cx(o), kind: 'center' as const },
      { value: right(o), guidePos: right(o), kind: 'edge' as const },
    ]),
  ];
  const snapRight = pickSnap('x', x + w, rightTargets, threshold);
  if (snapRight.hit && snapRight.guide) {
    w = clamp(snapRight.value - x, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
    guides.push(snapRight.guide);
  }

  if (corner === 'br') {
    const bottomTargets: AxisCandidate[] = [
      { value: 100, guidePos: 100, kind: 'edge' },
      { value: 50, guidePos: 50, kind: 'center' },
      ...peers.flatMap((o) => [
        { value: o.y, guidePos: o.y, kind: 'edge' as const },
        { value: cy(o), guidePos: cy(o), kind: 'center' as const },
        { value: bottom(o), guidePos: bottom(o), kind: 'edge' as const },
      ]),
    ];
    const snapBottom = pickSnap('y', y + h, bottomTargets, threshold);
    if (snapBottom.hit && snapBottom.guide) {
      h = clamp(snapBottom.value - y, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
      guides.push(snapBottom.guide);
    }
  } else {
    const topTargets: AxisCandidate[] = [
      { value: 0, guidePos: 0, kind: 'edge' },
      { value: 50, guidePos: 50, kind: 'center' },
      ...peers.flatMap((o) => [
        { value: o.y, guidePos: o.y, kind: 'edge' as const },
        { value: cy(o), guidePos: cy(o), kind: 'center' as const },
        { value: bottom(o), guidePos: bottom(o), kind: 'edge' as const },
      ]),
    ];
    const snapTop = pickSnap('y', y, topTargets, threshold);
    if (snapTop.hit && snapTop.guide) {
      const nextY = snapTop.value;
      const nextH = h + (y - nextY);
      if (nextH >= MIN_SIZE) {
        y = nextY;
        h = clamp(nextH, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
        guides.push(snapTop.guide);
      }
    }
  }

  return {
    x: clamp(x, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
    y: clamp(y, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX),
    w: clamp(w, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
    h: clamp(h, MIN_SIZE, IMAGE_FRAME_SIZE_MAX),
    guides,
  };
}

export function alignElementToSlide(
  el: ElementRect,
  align: AlignKind,
): Partial<SlideElement> {
  switch (align) {
    case 'left':
      return { x: 0 };
    case 'center-h':
      return { x: clamp(50 - el.w / 2, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'right':
      return { x: clamp(100 - el.w, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'top':
      return { y: 0 };
    case 'center-v':
      return { y: clamp(50 - el.h / 2, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'bottom':
      return { y: clamp(100 - el.h, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    default:
      return {};
  }
}

export function alignElementToTarget(
  el: ElementRect,
  target: ElementRect,
  align: AlignKind,
): Partial<SlideElement> {
  switch (align) {
    case 'left':
      return { x: clamp(target.x, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'center-h':
      return { x: clamp(cx(target) - el.w / 2, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'right':
      return { x: clamp(right(target) - el.w, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'top':
      return { y: clamp(target.y, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'center-v':
      return { y: clamp(cy(target) - el.h / 2, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    case 'bottom':
      return { y: clamp(bottom(target) - el.h, IMAGE_FRAME_MIN, IMAGE_FRAME_MAX) };
    default:
      return {};
  }
}

export function matchElementSize(
  el: ElementRect,
  target: ElementRect,
  dim: 'w' | 'h' | 'both',
): Partial<SlideElement> {
  const patch: Partial<SlideElement> = {};
  if (dim === 'w' || dim === 'both') {
    patch.w = clamp(target.w, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
  }
  if (dim === 'h' || dim === 'both') {
    patch.h = clamp(target.h, MIN_SIZE, IMAGE_FRAME_SIZE_MAX);
  }
  return patch;
}

/** Nächstes anderes Element (Mittelpunkt-Abstand). */
export function findNearestElement(
  el: ElementRect,
  others: ElementRect[],
): ElementRect | null {
  const peers = others.filter((o) => o.id !== el.id);
  if (peers.length === 0) return null;
  let best = peers[0];
  let bestD = Infinity;
  for (const o of peers) {
    const d = Math.hypot(cx(el) - cx(o), cy(el) - cy(o));
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

/** Kurzlabel für Element-Liste in der Toolbar. */
export function elementAlignLabel(el: SlideElement, index: number): string {
  const typeLabel =
    el.type === 'text'
      ? 'Text'
      : el.type === 'image'
        ? 'Bild'
        : el.type === 'shape'
          ? 'Form'
          : el.type === 'card'
            ? 'Karte'
            : el.type === 'table'
              ? 'Tabelle'
          : el.type === 'video'
            ? 'Video'
            : 'Element';
  if ((el.type === 'text' || el.type === 'card' || el.type === 'table') && (el.titleHtml || el.html)) {
    const src = el.type === 'card' ? el.titleHtml || el.html || '' : el.html || '';
    const plain = src.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 22);
    if (plain) return `${typeLabel}: ${plain}${plain.length >= 22 ? '…' : ''}`;
  }
  return `${typeLabel} ${index + 1}`;
}
