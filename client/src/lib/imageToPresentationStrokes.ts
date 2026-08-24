/**
 * GoodNotes liefert nur ein PNG. Daraus werden gefüllte Silhouetten
 * (nicht Mittellinien), damit die Schrift lesbar bleibt und lassobar ist.
 */
import {
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from './presentationDeck';

const MAX_TRACE = 1800;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht gelesen werden'));
    };
    img.src = url;
  });
}

function lumOf(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sampleCorner(data: Uint8ClampedArray, w: number, h: number) {
  const pts: Array<[number, number]> = [
    [1, 1],
    [w - 2, 1],
    [1, h - 2],
    [w - 2, h - 2],
    [Math.floor(w / 2), 1],
    [1, Math.floor(h / 2)],
  ];
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  let n = 0;
  for (const [x, y] of pts) {
    const i = (y * w + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    a += data[i + 3];
    n += 1;
  }
  return { r: r / n, g: g / n, b: b / n, a: a / n, lum: lumOf(r / n, g / n, b / n) };
}

function isInk(
  r: number,
  g: number,
  b: number,
  a: number,
  bg: { r: number; g: number; b: number; a: number; lum: number },
): boolean {
  if (a < 14) return false;
  const lum = lumOf(r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (bg.a < 40) {
    if (a < 26) return false;
    if (lum > 246 && a < 90 && chroma < 14) return false;
    return true;
  }
  const dist =
    Math.abs(lum - bg.lum) + Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
  if (lum > 246 && chroma < 14 && dist < 36) return false;
  if (dist > 28) return true;
  if (lum < bg.lum - 12) return true;
  if (chroma > 22 && lum < 232) return true;
  return false;
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function distToSeg(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function simplifyOpen(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (points.length < 3) return points;
  let maxD = 0;
  let idx = 0;
  const a = points[0];
  const b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSeg(points[i][0], points[i][1], a[0], a[1], b[0], b[1]);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = simplifyOpen(points.slice(0, idx + 1), epsilon);
    const right = simplifyOpen(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

function dropDuplicateClose(points: Array<[number, number]>): Array<[number, number]> {
  let pts = points;
  if (pts.length >= 2) {
    const a = pts[0];
    const b = pts[pts.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) pts = pts.slice(0, -1);
  }
  return pts;
}

function simplifyClosed(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  const pts = dropDuplicateClose(points);
  if (pts.length < 4) return pts;
  let maxI = 1;
  let maxD = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > maxD) {
      maxD = d;
      maxI = i;
    }
  }
  const left = simplifyOpen(pts.slice(0, maxI + 1), epsilon);
  const right = simplifyOpen([...pts.slice(maxI), pts[0]], epsilon);
  const out = left.slice(0, -1).concat(right);
  const closed = dropDuplicateClose(out);
  if (closed.length) closed.push(closed[0]);
  return closed;
}

/** Rundet Treppen der Pixelkontur, ohne die Buchstabenform zu zerstören. */
function chaikinClosed(points: Array<[number, number]>, iterations = 2): Array<[number, number]> {
  let pts = dropDuplicateClose(points);
  if (pts.length < 4) return points;
  for (let n = 0; n < iterations; n++) {
    const next: Array<[number, number]> = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    pts = next;
  }
  if (pts.length) pts.push(pts[0]);
  return pts;
}

function at(mask: Uint8Array, w: number, h: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
}

function shoelace(points: Array<[number, number]>): number {
  let a = 0;
  const n = points.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const q = points[(i + 1) % n];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

function centroid(points: Array<[number, number]>): [number, number] {
  let x = 0;
  let y = 0;
  const n = Math.max(1, points.length);
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / n, y / n];
}

function pointInPolyPts(pt: [number, number], poly: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersect =
      a[1] > pt[1] !== b[1] > pt[1] &&
      pt[0] < ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1] + 1e-9) + a[0];
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Kanten der Pixelquadrate verketten — liefert Außenkontur und Löcher
 * als geschlossene Schleifen, ohne Moore-Abbruch-Artefakte.
 */
function tracePixelLoops(mask: Uint8Array, w: number, h: number): Array<Array<[number, number]>> {
  const from = new Map<string, Array<[number, number]>>();
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const k = `${x1},${y1}`;
    const list = from.get(k);
    if (list) list.push([x2, y2]);
    else from.set(k, [[x2, y2]]);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (!at(mask, w, h, x, y - 1)) add(x, y, x + 1, y);
      if (!at(mask, w, h, x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!at(mask, w, h, x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!at(mask, w, h, x - 1, y)) add(x, y + 1, x, y);
    }
  }
  const used = new Set<string>();
  const loops: Array<Array<[number, number]>> = [];
  const edgeId = (a: [number, number], b: [number, number]) => `${a[0]},${a[1]}>${b[0]},${b[1]}`;
  for (const [startKey, starts] of from) {
    for (const firstTo of starts) {
      const [sx, sy] = startKey.split(',').map(Number) as [number, number];
      if (used.has(edgeId([sx, sy], firstTo))) continue;
      const loop: Array<[number, number]> = [[sx, sy]];
      let cx = sx;
      let cy = sy;
      let nx = firstTo[0];
      let ny = firstTo[1];
      for (let step = 0; step < w * h * 4; step++) {
        used.add(edgeId([cx, cy], [nx, ny]));
        loop.push([nx, ny]);
        if (nx === sx && ny === sy && loop.length > 2) break;
        const nexts = from.get(`${nx},${ny}`) || [];
        let found: [number, number] | null = null;
        for (const cand of nexts) {
          if (!used.has(edgeId([nx, ny], cand))) {
            found = cand;
            break;
          }
        }
        if (!found) break;
        cx = nx;
        cy = ny;
        nx = found[0];
        ny = found[1];
      }
      if (loop.length >= 4) loops.push(dropDuplicateClose(loop));
    }
  }
  return loops;
}

const N4: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** 4er-Dilatation: schließt Anti-Alias-Lücken in dünner Schrift, ohne Striche zu fressen. */
function dilate4(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = mask[y * w + x] === 1;
      if (!on) {
        for (const [dx, dy] of N4) {
          if (at(mask, w, h, x + dx, y + dy)) {
            on = true;
            break;
          }
        }
      }
      if (on) out[y * w + x] = 1;
    }
  }
  return out;
}

function splitOuterAndHoles(loops: Array<Array<[number, number]>>): {
  outer: Array<[number, number]>;
  holes: Array<Array<[number, number]>>;
} | null {
  if (!loops.length) return null;
  const ranked = loops
    .map((loop) => ({ loop, area: Math.abs(shoelace(loop)) }))
    .filter((x) => x.area >= 4)
    .sort((a, b) => b.area - a.area);
  if (!ranked.length) return null;
  const outer = ranked[0].loop;
  const holes = ranked.slice(1)
    .filter((x) => {
      if (x.area < 8) return false;
      const c = centroid(x.loop);
      return pointInPolyPts(c, outer);
    })
    .map((x) => x.loop);
  return { outer, holes };
}

type Component = {
  id: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  area: number;
  startX: number;
  startY: number;
};

function labelComponents(mask: Uint8Array, w: number, h: number): { labels: Int32Array; comps: Component[] } {
  const labels = new Int32Array(w * h);
  const comps: Component[] = [];
  let next = 1;
  const stack: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i] || labels[i]) continue;
      const id = next++;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let area = 0;
      let startX = x;
      let startY = y;
      stack.push(i);
      labels[i] = id;
      while (stack.length) {
        const cur = stack.pop()!;
        const cy = (cur / w) | 0;
        const cx = cur - cy * w;
        area += 1;
        if (cy < startY || (cy === startY && cx < startX)) {
          startX = cx;
          startY = cy;
        }
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;
        for (const [dx, dy] of N4) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!mask[ni] || labels[ni]) continue;
          labels[ni] = id;
          stack.push(ni);
        }
      }
      comps.push({ id, minX, minY, maxX, maxY, area, startX, startY });
    }
  }
  return { labels, comps };
}

function componentMask(labels: Int32Array, w: number, h: number, id: number, pad = 1): {
  mask: Uint8Array;
  bw: number;
  bh: number;
  ox: number;
  oy: number;
} {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (labels[y * w + x] !== id) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const ox = Math.max(0, minX - pad);
  const oy = Math.max(0, minY - pad);
  const bw = Math.min(w, maxX + pad + 1) - ox;
  const bh = Math.min(h, maxY + pad + 1) - oy;
  const mask = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (labels[(oy + y) * w + (ox + x)] === id) mask[y * bw + x] = 1;
    }
  }
  return { mask, bw, bh, ox, oy };
}

function sampleComponentColor(
  data: Uint8ClampedArray,
  labels: Int32Array,
  w: number,
  h: number,
  id: number,
): string {
  const samples: Array<{ r: number; g: number; b: number; lum: number }> = [];
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== id) continue;
    const p = i * 4;
    if (data[p + 3] < 50) continue;
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    samples.push({ r, g, b, lum: lumOf(r, g, b) });
    if (samples.length > 8000) break;
  }
  if (!samples.length) return '#111111';
  samples.sort((a, b) => a.lum - b.lum);
  const take = samples.slice(0, Math.max(1, Math.floor(samples.length * 0.28)));
  let r = 0;
  let g = 0;
  let b = 0;
  for (const s of take) {
    r += s.r;
    g += s.g;
    b += s.b;
  }
  return rgbToHex(r / take.length, g / take.length, b / take.length);
}

function polishContour(raw: Array<[number, number]>): Array<[number, number]> {
  if (raw.length < 4) return raw;
  const smoothed = chaikinClosed(raw, 3);
  return simplifyClosed(smoothed, 0.8);
}

export async function imageFileToPresentationStrokes(file: File): Promise<PresentationStroke[]> {
  const img = await loadImage(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (srcW < 2 || srcH < 2) return [];

  const down = Math.min(1, MAX_TRACE / Math.max(srcW, srcH));
  const w = Math.max(2, Math.round(srcW * down));
  const h = Math.max(2, Math.round(srcH * down));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const bg = sampleCorner(data, w, h);

  let mask = new Uint8Array(w * h);
  let inkCount = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (!isInk(data[i], data[i + 1], data[i + 2], data[i + 3], bg)) continue;
    mask[p] = 1;
    inkCount += 1;
  }
  if (inkCount < 8) return [];

  if (bg.a >= 40 && inkCount > w * h * 0.72) {
    for (let i = 0; i < mask.length; i++) mask[i] = mask[i] ? 0 : 1;
  }

  mask = dilate4(mask, w, h);

  const { labels, comps } = labelComponents(mask, w, h);
  const marginX = SLIDE_REF_WIDTH * 0.05;
  const marginY = SLIDE_REF_HEIGHT * 0.05;
  const fit = Math.min(1, (SLIDE_REF_WIDTH - 2 * marginX) / srcW, (SLIDE_REF_HEIGHT - 2 * marginY) / srcH);
  const ox = (SLIDE_REF_WIDTH - srcW * fit) / 2;
  const oy = (SLIDE_REF_HEIGHT - srcH * fit) / 2;
  const sx = (srcW * fit) / w;
  const sy = (srcH * fit) / h;
  const toSlide = (pt: [number, number]) => ({ x: ox + pt[0] * sx, y: oy + pt[1] * sy });

  const stamp = Date.now();
  const strokes: PresentationStroke[] = [];
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i];
    if (c.area < 5) continue;
    const local = componentMask(labels, w, h, c.id, 2);
    const parts = splitOuterAndHoles(tracePixelLoops(local.mask, local.bw, local.bh));
    if (!parts) continue;
    const outer = polishContour(parts.outer);
    if (outer.length < 4) continue;
    const holes = parts.holes
      .map((hole) => polishContour(hole))
      .filter((hole) => hole.length >= 4)
      .map((hole) => hole.map(([x, y]) => toSlide([x + local.ox, y + local.oy])));
    strokes.push({
      id: `ink-${stamp}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      color: sampleComponentColor(data, labels, w, h, c.id),
      lineWidth: 2,
      mode: 'pen',
      filled: true,
      points: outer.map(([x, y]) => toSlide([x + local.ox, y + local.oy])),
      ...(holes.length ? { holes } : {}),
    });
    if (strokes.length >= 400) break;
  }
  return strokes;
}
