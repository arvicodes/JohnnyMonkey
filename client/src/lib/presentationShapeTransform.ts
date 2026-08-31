import type { PresentationShapeKind, PresentationStroke } from './presentationDeck';

export type Pt = { x: number; y: number };

export type ShapeHandle =
  | 'move'
  | 'rotate'
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'start'
  | 'end';

export const HANDLE_HIT_RADIUS = 40;
export const ROTATE_HANDLE_OFFSET = 36;

export interface BoxFrame {
  cx: number;
  cy: number;
  w: number;
  h: number;
  rotation: number;
}

export function isSelectableShape(stroke: PresentationStroke): boolean {
  return !!stroke.shape && stroke.points.length >= 2;
}

export function getBoxFrame(stroke: PresentationStroke): BoxFrame {
  const [a, b] = stroke.points;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.max(Math.abs(b.x - a.x), 1);
  const h = Math.max(Math.abs(b.y - a.y), 1);
  return {
    cx: x + w / 2,
    cy: y + h / 2,
    w,
    h,
    rotation: stroke.rotation ?? 0,
  };
}

export function applyBoxFrame(stroke: PresentationStroke, frame: BoxFrame): PresentationStroke {
  const { cx, cy, w, h, rotation } = frame;
  return {
    ...stroke,
    rotation,
    points: [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy + h / 2 },
    ],
  };
}

export function localToWorld(frame: BoxFrame, lx: number, ly: number): Pt {
  const cos = Math.cos(frame.rotation);
  const sin = Math.sin(frame.rotation);
  return {
    x: frame.cx + lx * cos - ly * sin,
    y: frame.cy + lx * sin + ly * cos,
  };
}

export function worldToLocal(frame: BoxFrame, pt: Pt): Pt {
  const dx = pt.x - frame.cx;
  const dy = pt.y - frame.cy;
  const cos = Math.cos(-frame.rotation);
  const sin = Math.sin(-frame.rotation);
  return {
    x: dx * cos - dy * sin,
    y: dx * sin + dy * cos,
  };
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distPointToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function hitTestShapeBody(stroke: PresentationStroke, pt: Pt, pad = 10): boolean {
  if (!stroke.shape || stroke.points.length < 2) return false;
  const [p0, p1] = stroke.points;

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    return distPointToSegment(pt.x, pt.y, p0.x, p0.y, p1.x, p1.y) < pad + stroke.lineWidth;
  }

  const frame = getBoxFrame(stroke);
  const local = worldToLocal(frame, pt);
  return (
    local.x >= -frame.w / 2 - pad &&
    local.x <= frame.w / 2 + pad &&
    local.y >= -frame.h / 2 - pad &&
    local.y <= frame.h / 2 + pad
  );
}

function boxHandlePositions(frame: BoxFrame): { handle: ShapeHandle; pt: Pt }[] {
  const hw = frame.w / 2;
  const hh = frame.h / 2;
  const defs: { handle: ShapeHandle; lx: number; ly: number }[] = [
    { handle: 'nw', lx: -hw, ly: -hh },
    { handle: 'n', lx: 0, ly: -hh },
    { handle: 'ne', lx: hw, ly: -hh },
    { handle: 'e', lx: hw, ly: 0 },
    { handle: 'se', lx: hw, ly: hh },
    { handle: 's', lx: 0, ly: hh },
    { handle: 'sw', lx: -hw, ly: hh },
    { handle: 'w', lx: -hw, ly: 0 },
    { handle: 'rotate', lx: 0, ly: -hh - ROTATE_HANDLE_OFFSET },
  ];
  return defs.map(({ handle, lx, ly }) => ({ handle, pt: localToWorld(frame, lx, ly) }));
}

export function pickShapeHandle(
  stroke: PresentationStroke,
  pt: Pt,
  radius = HANDLE_HIT_RADIUS
): ShapeHandle | null {
  if (!stroke.shape || stroke.points.length < 2) return null;
  const [p0, p1] = stroke.points;

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    if (dist(pt, p0) <= radius) return 'start';
    if (dist(pt, p1) <= radius) return 'end';
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const rotPt = {
      x: mid.x,
      y: mid.y - ROTATE_HANDLE_OFFSET,
    };
    if (dist(pt, rotPt) <= radius) return 'rotate';
    if (hitTestShapeBody(stroke, pt)) return 'move';
    return null;
  }

  for (const { handle, pt: hp } of boxHandlePositions(getBoxFrame(stroke))) {
    if (dist(pt, hp) <= radius) return handle;
  }
  if (hitTestShapeBody(stroke, pt)) return 'move';
  return null;
}

export function findShapeAtPoint(strokes: PresentationStroke[], pt: Pt): PresentationStroke | null {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    if (isSelectableShape(s) && hitTestShapeBody(s, pt)) return s;
  }
  return null;
}

export function moveShape(stroke: PresentationStroke, dx: number, dy: number): PresentationStroke {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
  };
}

export function rotateShapeByDelta(stroke: PresentationStroke, deltaRadians: number): PresentationStroke {
  if (!stroke.shape || stroke.points.length < 2 || Math.abs(deltaRadians) < 1e-6) return stroke;
  const [p0, p1] = stroke.points;

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    const cx = (p0.x + p1.x) / 2;
    const cy = (p0.y + p1.y) / 2;
    const cos = Math.cos(deltaRadians);
    const sin = Math.sin(deltaRadians);
    const rot = (p: Pt): Pt => ({
      x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
      y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
    });
    return { ...stroke, points: [rot(p0), rot(p1)] };
  }

  const frame = getBoxFrame(stroke);
  return applyBoxFrame(stroke, { ...frame, rotation: frame.rotation + deltaRadians });
}

export function resizeShapeWithHandle(
  stroke: PresentationStroke,
  handle: ShapeHandle,
  pointer: Pt
): PresentationStroke {
  if (!stroke.shape || stroke.points.length < 2) return stroke;
  const [p0, p1] = stroke.points;

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    if (handle === 'start') return { ...stroke, points: [pointer, p1] };
    if (handle === 'end') return { ...stroke, points: [p0, pointer] };
    return stroke;
  }

  const frame = getBoxFrame(stroke);
  const local = worldToLocal(frame, pointer);
  let { w, h } = frame;
  const minSize = 12;

  const setW = (halfW: number) => {
    w = Math.max(minSize, halfW * 2);
  };
  const setH = (halfH: number) => {
    h = Math.max(minSize, halfH * 2);
  };

  switch (handle) {
    case 'e':
      setW(local.x);
      break;
    case 'w':
      setW(-local.x);
      break;
    case 's':
      setH(local.y);
      break;
    case 'n':
      setH(-local.y);
      break;
    case 'se':
      setW(local.x);
      setH(local.y);
      break;
    case 'sw':
      setW(-local.x);
      setH(local.y);
      break;
    case 'ne':
      setW(local.x);
      setH(-local.y);
      break;
    case 'nw':
      setW(-local.x);
      setH(-local.y);
      break;
    default:
      return stroke;
  }

  return applyBoxFrame(stroke, { ...frame, w, h });
}

export function getSelectionOutlinePoints(stroke: PresentationStroke): Pt[] {
  if (!stroke.shape || stroke.points.length < 2) return [];
  const [p0, p1] = stroke.points;

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    return [p0, p1];
  }

  const frame = getBoxFrame(stroke);
  const hw = frame.w / 2;
  const hh = frame.h / 2;
  return [
    localToWorld(frame, -hw, -hh),
    localToWorld(frame, hw, -hh),
    localToWorld(frame, hw, hh),
    localToWorld(frame, -hw, hh),
  ];
}

export function getSelectionHandles(stroke: PresentationStroke): { handle: ShapeHandle; pt: Pt }[] {
  if (!stroke.shape || stroke.points.length < 2) return [];
  const [p0, p1] = stroke.points;

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    return [
      { handle: 'start', pt: p0 },
      { handle: 'end', pt: p1 },
      {
        handle: 'rotate',
        pt: { x: mid.x, y: mid.y - ROTATE_HANDLE_OFFSET },
      },
    ];
  }

  return boxHandlePositions(getBoxFrame(stroke));
}

export function drawShapeSelection(
  ctx: CanvasRenderingContext2D,
  stroke: PresentationStroke,
  accent = '#FF9800'
) {
  if (!stroke.shape) return;

  const handles = getSelectionHandles(stroke);
  const outline = getSelectionOutlinePoints(stroke);

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(outline[0].x, outline[0].y);
    ctx.lineTo(outline[1].x, outline[1].y);
    ctx.stroke();
    const mid = {
      x: (outline[0].x + outline[1].x) / 2,
      y: (outline[0].y + outline[1].y) / 2,
    };
    const rot = handles.find((h) => h.handle === 'rotate');
    if (rot) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(mid.x, mid.y);
      ctx.lineTo(rot.pt.x, rot.pt.y);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(outline[0].x, outline[0].y);
    for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i].x, outline[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.setLineDash([]);
  for (const { handle, pt } of handles) {
    const r = handle === 'rotate' ? 7 : 6;
    ctx.beginPath();
    if (handle === 'rotate') {
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    } else {
      ctx.rect(pt.x - r, pt.y - r, r * 2, r * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function shapeKindLabel(kind: PresentationShapeKind): string {
  switch (kind) {
    case 'line':
      return 'Linie';
    case 'rect':
      return 'Rechteck';
    case 'ellipse':
      return 'Kreis';
    case 'arrow':
      return 'Pfeil';
    case 'curved-arrow':
      return 'Gebogener Pfeil';
    default:
      return 'Form';
  }
}
