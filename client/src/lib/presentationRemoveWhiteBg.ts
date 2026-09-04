/**
 * Nahezu weißen / hellen Bildhintergrund entfernen (Kanten-Flood-Fill → Alpha).
 * Speichert als PNG. Gibt zurück, wie viel Fläche entfernt wurde.
 */

import { slideImageUrlWithoutMax } from './presentationDeck';

export type RemoveWhiteBgOptions = {
  /** Abstand zur Referenzfarbe (0–255). Default 48. */
  tolerance?: number;
  /** Max. Kantenlänge beim Laden. Default 3200. */
  maxEdge?: number;
};

function processSourceUrl(url: string): string {
  return slideImageUrlWithoutMax(url);
}

export type RemoveWhiteBgResult = {
  file: File;
  removedRatio: number;
};

function chebyshev(r: number, g: number, b: number, r2: number, g2: number, b2: number): number {
  return Math.max(Math.abs(r - r2), Math.abs(g - g2), Math.abs(b - b2));
}

function isLight(r: number, g: number, b: number): boolean {
  return (r + g + b) / 3 >= 200;
}

function isNearWhite(r: number, g: number, b: number, tolerance: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (255 - max > tolerance + 12) return false;
  if (max - min > Math.max(tolerance, 28)) return false;
  return true;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    // Cache-Bust, falls dieselbe URL kurz zuvor ohne Alpha kam
    const sep = url.includes('?') ? '&' : '?';
    img.src = `${url}${sep}_bg=${Date.now()}`;
  });
}

function canvasToPngFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('PNG konnte nicht erzeugt werden'));
          return;
        }
        resolve(new File([blob], name, { type: 'image/png' }));
      },
      'image/png',
    );
  });
}

type Rgb = { r: number; g: number; b: number };

function sampleBgSeeds(data: Uint8ClampedArray, w: number, h: number): Rgb[] {
  const pts: Array<[number, number]> = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [(w / 2) | 0, 0],
    [(w / 2) | 0, h - 1],
    [0, (h / 2) | 0],
    [w - 1, (h / 2) | 0],
  ];
  const seeds: Rgb[] = [];
  for (const [x, y] of pts) {
    const o = (y * w + x) * 4;
    const rgb = { r: data[o], g: data[o + 1], b: data[o + 2] };
    if (isLight(rgb.r, rgb.g, rgb.b) || isNearWhite(rgb.r, rgb.g, rgb.b, 40)) {
      seeds.push(rgb);
    }
  }
  if (seeds.length === 0) {
    seeds.push({ r: 255, g: 255, b: 255 });
  }
  return seeds;
}

function matchesBg(r: number, g: number, b: number, seeds: Rgb[], tolerance: number): boolean {
  if (isNearWhite(r, g, b, tolerance)) return true;
  for (const s of seeds) {
    if (chebyshev(r, g, b, s.r, s.g, s.b) <= tolerance) return true;
  }
  return false;
}

/**
 * Entfernt vom Bildrand aus zusammenhängende Hintergrundpixel (hell/weiß).
 * Falls kaum etwas am Rand hängt: globaler Pass für Fast-Weiß.
 */
export async function removeNearWhiteBackgroundFromUrl(
  imageUrl: string,
  fileBaseName = 'bild',
  options: RemoveWhiteBgOptions = {},
): Promise<RemoveWhiteBgResult> {
  const tolerance = options.tolerance ?? 48;
  const maxEdge = options.maxEdge ?? 3200;

  const img = await loadImage(processSourceUrl(imageUrl));
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error('Ungültige Bildgröße');

  const scale = Math.min(1, maxEdge / Math.max(w, h));
  w = Math.max(1, Math.round(w * scale));
  h = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas nicht verfügbar');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const n = w * h;
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const seeds = sampleBgSeeds(data, w, h);

  const enqueue = (x: number, y: number) => {
    const i = y * w + x;
    if (visited[i]) return;
    const o = i * 4;
    if (data[o + 3] < 8) {
      visited[i] = 1;
      return;
    }
    if (!matchesBg(data[o], data[o + 1], data[o + 2], seeds, tolerance)) return;
    visited[i] = 1;
    queue[qt++] = i;
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0);
    enqueue(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y);
    enqueue(w - 1, y);
  }

  let removed = 0;
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w;
    const y = (i / w) | 0;
    const o = i * 4;
    data[o + 3] = 0;
    removed += 1;
    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < w) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < h) enqueue(x, y + 1);
  }

  // Fallback: kaum etwas am Rand → alle Fast-Weiß-Pixel transparent
  if (removed / n < 0.01) {
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      if (data[o + 3] === 0) continue;
      if (isNearWhite(data[o], data[o + 1], data[o + 2], tolerance + 8)) {
        data[o + 3] = 0;
        removed += 1;
      }
    }
  }

  // Kantenglättung
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const o = i * 4;
      if (data[o + 3] === 0) continue;
      if (!matchesBg(data[o], data[o + 1], data[o + 2], seeds, tolerance + 16)) continue;
      let neighClear = false;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        if (data[((y + dy) * w + (x + dx)) * 4 + 3] === 0) {
          neighClear = true;
          break;
        }
      }
      if (neighClear) data[o + 3] = Math.min(data[o + 3], 70);
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const safe = fileBaseName.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').replace(/\.[^.]+$/, '') || 'bild';
  const file = await canvasToPngFile(canvas, `${safe}-ohne-hg-${Date.now()}.png`);
  return { file, removedRatio: removed / n };
}
