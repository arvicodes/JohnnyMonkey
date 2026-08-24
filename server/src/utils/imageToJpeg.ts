import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const HEIC_EXT = new Set(['.heic', '.heif']);
const RASTER_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff']);
/** Formate mit Alpha — nicht nach JPEG wandeln (Transparenz weg). */
const ALPHA_EXT = new Set(['.png', '.webp', '.gif']);

export function isHeicPath(filePath: string): boolean {
  return HEIC_EXT.has(path.extname(filePath).toLowerCase());
}

function mimeForExt(ext: string): string {
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    case '.webp':
      return 'image/webp';
    case '.avif':
      return 'image/avif';
    case '.svg':
      return 'image/svg+xml';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

async function sipsHeicToJpeg(
  inputPath: string,
  outputPath: string,
  maxEdge?: number,
): Promise<Buffer> {
  const args = maxEdge
    ? ['-Z', String(maxEdge), '-s', 'format', 'jpeg', inputPath, '--out', outputPath]
    : ['-s', 'format', 'jpeg', inputPath, '--out', outputPath];
  await execFileAsync('sips', args);
  return fs.readFileSync(outputPath);
}

/** HEIC/HEIF → JPEG (macOS: sips). Optional maxEdge für schnelle Vorschau. */
export async function fileToJpegBuffer(filePath: string, maxEdge?: number): Promise<Buffer> {
  const ext = path.extname(filePath).toLowerCase();
  if (!HEIC_EXT.has(ext)) {
    return fs.readFileSync(filePath);
  }
  if (process.platform !== 'darwin') {
    throw new Error('HEIC-Konvertierung nur auf macOS verfügbar');
  }
  const tmpOut = path.join(
    os.tmpdir(),
    `heic-out-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
  );
  try {
    return await sipsHeicToJpeg(filePath, tmpOut, maxEdge);
  } finally {
    try {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {
      /* ignore */
    }
  }
}

function readSipsPixelEdge(filePath: string): number | null {
  try {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath], {
      encoding: 'utf8',
    });
    const w = /pixelWidth:\s*(\d+)/.exec(out);
    const h = /pixelHeight:\s*(\d+)/.exec(out);
    if (!w || !h) return null;
    return Math.max(parseInt(w[1], 10), parseInt(h[1], 10));
  } catch {
    return null;
  }
}

/**
 * Liest ein Bild; bei maxEdge auf macOS per sips verkleinern,
 * damit Editor/Filmstrip nicht Multi-MB-Originale laden.
 * PNG/WebP/GIF bleiben PNG (kein JPEG — Transparenz bleibt).
 * Kleine Bilder werden nicht hochskaliert.
 */
export async function readImageFileForServe(
  filePath: string,
  maxEdge?: number,
): Promise<{ buffer: Buffer; mimeType: string }> {
  const ext = path.extname(filePath).toLowerCase();

  if (isHeicPath(filePath)) {
    const buffer = await fileToJpegBuffer(filePath, maxEdge ?? 1200);
    return { buffer, mimeType: 'image/jpeg' };
  }

  if (ext === '.svg' || !RASTER_EXT.has(ext) || !maxEdge || process.platform !== 'darwin') {
    return { buffer: fs.readFileSync(filePath), mimeType: mimeForExt(ext) };
  }

  const edge = readSipsPixelEdge(filePath);
  if (edge != null && edge <= maxEdge) {
    return { buffer: fs.readFileSync(filePath), mimeType: mimeForExt(ext) };
  }

  const keepAlpha = ALPHA_EXT.has(ext);
  const outExt = keepAlpha ? '.png' : '.jpg';
  const outFormat = keepAlpha ? 'png' : 'jpeg';
  const tmpOut = path.join(
    os.tmpdir(),
    `img-max-${Date.now()}-${Math.random().toString(36).slice(2)}${outExt}`,
  );
  try {
    await execFileAsync('sips', [
      '-Z',
      String(maxEdge),
      '-s',
      'format',
      outFormat,
      filePath,
      '--out',
      tmpOut,
    ]);
    return {
      buffer: fs.readFileSync(tmpOut),
      mimeType: keepAlpha ? 'image/png' : 'image/jpeg',
    };
  } catch (e) {
    console.warn('sips resize failed, serving original:', filePath, e);
    return { buffer: fs.readFileSync(filePath), mimeType: mimeForExt(ext) };
  } finally {
    try {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {
      /* ignore */
    }
  }
}

export async function uploadBufferToJpegBuffer(
  buf: Buffer,
  originalName: string,
  maxEdge?: number,
): Promise<Buffer> {
  const ext = path.extname(originalName).toLowerCase();
  if (!HEIC_EXT.has(ext)) return buf;
  if (process.platform !== 'darwin') {
    throw new Error('HEIC-Konvertierung nur auf macOS verfügbar');
  }
  const tmpIn = path.join(os.tmpdir(), `heic-up-${Date.now()}${ext}`);
  const tmpOut = path.join(os.tmpdir(), `heic-up-${Date.now()}.jpg`);
  try {
    fs.writeFileSync(tmpIn, buf);
    return await sipsHeicToJpeg(tmpIn, tmpOut, maxEdge);
  } finally {
    for (const p of [tmpIn, tmpOut]) {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* ignore */
      }
    }
  }
}
