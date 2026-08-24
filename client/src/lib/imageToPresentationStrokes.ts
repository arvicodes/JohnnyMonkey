/**
 * GoodNotes liefert nur ein PNG. Daraus werden Folien-Stiftstriche
 * (Mittellinie), damit der Ausschnitt wie mit dem Stift gezeichnet wirkt.
 */
import {
  PresentationStroke,
  SLIDE_REF_HEIGHT,
  SLIDE_REF_WIDTH,
} from './presentationDeck';

const MAX_TRACE = 720;
const N8: Array<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

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
  if (a < 16) return false;
  const lum = lumOf(r, g, b);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (bg.a < 40) {
    return a >= 28;
  }
  const dist = Math.abs(lum - bg.lum) + Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
  if (dist > 48) return true;
  if (lum > 242 && max - min < 18) return false;
  return lum < bg.lum - 18;
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function zhangSuen(grid: Uint8Array, w: number, h: number): Uint8Array {
  const out = grid.slice();
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < w && y < h ? out[y * w + x] : 0);
  const p = (x: number, y: number) => [
    at(x, y - 1),
    at(x + 1, y - 1),
    at(x + 1, y),
    at(x + 1, y + 1),
    at(x, y + 1),
    at(x - 1, y + 1),
    at(x - 1, y),
    at(x - 1, y - 1),
  ];

  const step = (first: boolean): boolean => {
    const mark: number[] = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!out[i]) continue;
        const n = p(x, y);
        const sum = n.reduce((a, b) => a + b, 0);
        if (sum < 2 || sum > 6) continue;
        let trans = 0;
        for (let k = 0; k < 8; k++) {
          if (n[k] === 0 && n[(k + 1) % 8] === 1) trans += 1;
        }
        if (trans !== 1) continue;
        if (first) {
          if (n[0] * n[2] * n[4] !== 0) continue;
          if (n[2] * n[4] * n[6] !== 0) continue;
        } else {
          if (n[0] * n[2] * n[6] !== 0) continue;
          if (n[0] * n[4] * n[6] !== 0) continue;
        }
        mark.push(i);
      }
    }
    for (const i of mark) out[i] = 0;
    return mark.length > 0;
  };

  let guard = 0;
  while (guard < 80) {
    const a = step(true);
    const b = step(false);
    if (!a && !b) break;
    guard += 1;
  }
  return out;
}

function neighbors(x: number, y: number, grid: Uint8Array, w: number, h: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [dx, dy] of N8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny * w + nx]) out.push([nx, ny]);
  }
  return out;
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

function simplify(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
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
    const left = simplify(points.slice(0, idx + 1), epsilon);
    const right = simplify(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

function traceSkeleton(grid: Uint8Array, w: number, h: number): Array<Array<[number, number]>> {
  const used = new Uint8Array(w * h);
  const paths: Array<Array<[number, number]>> = [];

  const walk = (sx: number, sy: number) => {
    const path: Array<[number, number]> = [];
    let x = sx;
    let y = sy;
    while (true) {
      const i = y * w + x;
      if (used[i]) break;
      used[i] = 1;
      path.push([x, y]);
      const nbrs = neighbors(x, y, grid, w, h).filter(([nx, ny]) => !used[ny * w + nx]);
      if (nbrs.length === 0) break;
      let pick = nbrs[0];
      if (path.length >= 2) {
        const [px, py] = path[path.length - 2];
        const vx = x - px;
        const vy = y - py;
        let best = -Infinity;
        for (const n of nbrs) {
          const dot = vx * (n[0] - x) + vy * (n[1] - y);
          if (dot > best) {
            best = dot;
            pick = n;
          }
        }
      }
      x = pick[0];
      y = pick[1];
    }
    return path;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!grid[i] || used[i]) continue;
      if (neighbors(x, y, grid, w, h).length <= 1) {
        const path = walk(x, y);
        if (path.length >= 2) paths.push(path);
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!grid[i] || used[i]) continue;
      const path = walk(x, y);
      if (path.length >= 2) paths.push(path);
      else if (path.length === 1) {
        paths.push([path[0], [path[0][0] + 0.4, path[0][1] + 0.4]]);
      }
    }
  }
  return paths;
}

function meanInkWidth(mask: Uint8Array, skel: Uint8Array, w: number, h: number): number {
  let sum = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!skel[y * w + x]) continue;
      let d = 0;
      while (d < 18) {
        let hitBg = false;
        for (const [dx, dy] of N8) {
          const nx = x + dx * (d + 1);
          const ny = y + dy * (d + 1);
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !mask[ny * w + nx]) {
            hitBg = true;
            break;
          }
        }
        if (hitBg) break;
        d += 1;
      }
      sum += d * 2 + 1;
      n += 1;
      if (n > 800) break;
    }
    if (n > 800) break;
  }
  if (n === 0) return 3;
  return sum / n;
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
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const bg = sampleCorner(data, w, h);

  const mask = new Uint8Array(w * h);
  let inkCount = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (!isInk(data[i], data[i + 1], data[i + 2], data[i + 3], bg)) continue;
    mask[p] = 1;
    inkCount += 1;
  }
  if (inkCount < 8) return [];

  const skel = zhangSuen(mask, w, h);
  let skelCount = 0;
  for (let i = 0; i < skel.length; i++) if (skel[i]) skelCount += 1;
  // Sehr dünne Schrift: Thinning löscht sonst die Linie komplett.
  const traceGrid = skelCount < Math.max(8, inkCount * 0.015) ? mask : skel;
  const paths = traceSkeleton(traceGrid, w, h);
  if (paths.length === 0) return [];

  const marginX = SLIDE_REF_WIDTH * 0.05;
  const marginY = SLIDE_REF_HEIGHT * 0.05;
  const fit = Math.min(1, (SLIDE_REF_WIDTH - 2 * marginX) / srcW, (SLIDE_REF_HEIGHT - 2 * marginY) / srcH);
  const ox = (SLIDE_REF_WIDTH - srcW * fit) / 2;
  const oy = (SLIDE_REF_HEIGHT - srcH * fit) / 2;
  const pxToSlide = (srcW * fit) / w;
  const pyToSlide = (srcH * fit) / h;

  const widthPx = meanInkWidth(mask, skel, w, h);
  const lineWidth = Math.max(1.6, Math.min(10, widthPx * pxToSlide * 0.92));
  const stamp = Date.now();

  const colorAlong = (path: Array<[number, number]>): string => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    const step = Math.max(1, Math.floor(path.length / 8));
    for (let k = 0; k < path.length; k += step) {
      const [x, y] = path[k];
      const i = (Math.max(0, Math.min(h - 1, Math.round(y))) * w + Math.max(0, Math.min(w - 1, Math.round(x)))) * 4;
      if (data[i + 3] < 20) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
    if (n === 0) return '#000000';
    return rgbToHex(r / n, g / n, b / n);
  };

  const strokes: PresentationStroke[] = [];
  for (let i = 0; i < paths.length; i++) {
    const simplified = simplify(paths[i], 1.35);
    if (simplified.length < 2) continue;
    strokes.push({
      id: `ink-${stamp}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      color: colorAlong(paths[i]),
      lineWidth,
      mode: 'pen',
      points: simplified.map(([x, y]) => ({
        x: ox + x * pxToSlide,
        y: oy + y * pyToSlide,
      })),
    });
    if (strokes.length >= 500) break;
  }
  return strokes;
}
