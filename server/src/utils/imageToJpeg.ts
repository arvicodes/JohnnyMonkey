import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const HEIC_EXT = new Set(['.heic', '.heif']);

export function isHeicPath(filePath: string): boolean {
  return HEIC_EXT.has(path.extname(filePath).toLowerCase());
}

async function sipsHeicToJpeg(inputPath: string, outputPath: string): Promise<Buffer> {
  await execFileAsync('sips', ['-s', 'format', 'jpeg', inputPath, '--out', outputPath]);
  return fs.readFileSync(outputPath);
}

/** HEIC/HEIF → JPEG (macOS: sips direkt auf Dateipfad). */
export async function fileToJpegBuffer(filePath: string): Promise<Buffer> {
  const ext = path.extname(filePath).toLowerCase();
  if (!HEIC_EXT.has(ext)) {
    return fs.readFileSync(filePath);
  }
  if (process.platform !== 'darwin') {
    throw new Error('HEIC-Konvertierung nur auf macOS verfügbar');
  }
  const tmpOut = path.join(os.tmpdir(), `heic-out-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  try {
    return await sipsHeicToJpeg(filePath, tmpOut);
  } finally {
    try {
      if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    } catch {
      /* ignore */
    }
  }
}

export async function uploadBufferToJpegBuffer(buf: Buffer, originalName: string): Promise<Buffer> {
  const ext = path.extname(originalName).toLowerCase();
  if (!HEIC_EXT.has(ext)) return buf;
  if (process.platform !== 'darwin') {
    throw new Error('HEIC-Konvertierung nur auf macOS verfügbar');
  }
  const tmpIn = path.join(os.tmpdir(), `heic-up-${Date.now()}${ext}`);
  const tmpOut = path.join(os.tmpdir(), `heic-up-${Date.now()}.jpg`);
  try {
    fs.writeFileSync(tmpIn, buf);
    return await sipsHeicToJpeg(tmpIn, tmpOut);
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
