/**
 * Arbeitsblatt-/Tafel-Fotos: weißer Hintergrund, mehr Kontrast, etwas Schärfe.
 */

export type EnhanceImageOptions = {
  maxEdge?: number;
};

function percentileFromHist(hist: Uint32Array, p: number): number {
  let total = 0;
  for (let i = 0; i < hist.length; i++) total += hist[i];
  if (total <= 0) return 255;
  const target = total * Math.min(1, Math.max(0, p));
  let acc = 0;
  for (let i = 0; i < hist.length; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return hist.length - 1;
}

function luma(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/** In-place: Weißabgleich, Kontrast, Papier auf 255, Unscharf-Maske. */
export function enhanceWorksheetRgba(data: Uint8ClampedArray, width: number, height: number): void {
  const n = width * height;
  const histR = new Uint32Array(256);
  const histG = new Uint32Array(256);
  const histB = new Uint32Array(256);
  const histY = new Uint32Array(256);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (data[o + 3] < 8) continue;
    histR[data[o]] += 1;
    histG[data[o + 1]] += 1;
    histB[data[o + 2]] += 1;
    histY[Math.max(0, Math.min(255, luma(data[o], data[o + 1], data[o + 2]) | 0))] += 1;
  }

  const paperR = Math.max(168, percentileFromHist(histR, 0.96));
  const paperG = Math.max(168, percentileFromHist(histG, 0.96));
  const paperB = Math.max(168, percentileFromHist(histB, 0.96));
  const blackY = Math.min(percentileFromHist(histY, 0.06), 90);

  const scaleR = 255 / paperR;
  const scaleG = 255 / paperG;
  const scaleB = 255 / paperB;
  const span = Math.max(40, 255 - blackY);

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (data[o + 3] < 8) continue;
    let r = Math.min(255, data[o] * scaleR);
    let g = Math.min(255, data[o + 1] * scaleG);
    let b = Math.min(255, data[o + 2] * scaleB);
    const y = luma(r, g, b);
    const stretched = ((y - blackY) / span) * 255;
    const contrast = y > 1 ? stretched / y : 1;
    r = Math.min(255, Math.max(0, r * contrast));
    g = Math.min(255, Math.max(0, g * contrast));
    b = Math.min(255, Math.max(0, b * contrast));
    const y2 = luma(r, g, b);
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (y2 > 248 || (y2 > 236 && sat < 30)) {
      r = 255;
      g = 255;
      b = 255;
    }
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
  }

  const copy = new Uint8ClampedArray(data);
  const amount = 0.55;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const o = i * 4;
      if (copy[o + 3] < 8) continue;
      for (let c = 0; c < 3; c++) {
        const center = copy[o + c];
        const blur =
          (copy[((y - 1) * width + x) * 4 + c] +
            copy[((y + 1) * width + x) * 4 + c] +
            copy[(y * width + (x - 1)) * 4 + c] +
            copy[(y * width + (x + 1)) * 4 + c] +
            center) /
          5;
        data[o + c] = Math.min(255, Math.max(0, center + amount * (center - blur)));
      }
      const y3 = luma(data[o], data[o + 1], data[o + 2]);
      const sat = Math.max(data[o], data[o + 1], data[o + 2]) - Math.min(data[o], data[o + 1], data[o + 2]);
      if (y3 > 248 || (y3 > 238 && sat < 26)) {
        data[o] = 255;
        data[o + 1] = 255;
        data[o + 2] = 255;
      }
    }
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    const sep = url.includes('?') ? '&' : '?';
    img.src = `${url}${sep}_enh=${Date.now()}`;
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Foto konnte nicht erzeugt werden'));
          return;
        }
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  });
}

export async function enhanceImageFromUrl(
  imageUrl: string,
  fileBaseName = 'foto',
  options: EnhanceImageOptions = {},
): Promise<File> {
  const maxEdge = options.maxEdge ?? 2200;
  const img = await loadImage(imageUrl);
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
  ctx.drawImage(img, 0, 0, w, h);

  const imageData = ctx.getImageData(0, 0, w, h);
  enhanceWorksheetRgba(imageData.data, w, h);
  ctx.putImageData(imageData, 0, 0);

  const safe = fileBaseName.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').replace(/\.[^.]+$/, '') || 'foto';
  return canvasToJpegFile(canvas, `${safe}-verbessert-${Date.now()}.jpg`);
}

export const enhanceWorksheetPercentile = percentileFromHist;
