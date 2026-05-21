import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { parseStoryPageDate } from './storyPageDate';
import { resolveJmReihenRoot } from './erasmusSiteFolders';
import { fileToJpegBuffer, uploadBufferToJpegBuffer, isHeicPath } from './imageToJpeg';
import { readCaptureDateISOFromPath, readCaptureDateISOFromBuffer } from './exifCaptureDate';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.gif', '.tif', '.tiff']);

export type ScannedPhoto = {
  relativePath: string;
  fileName: string;
  dateISO: string | null;
  size: number;
};

/** Pfad aus Finder-Zwischenablage / manueller Eingabe bereinigen. */
export function normalizeUserFolderPath(inputPath: string): string {
  let s = inputPath.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith('„') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  try {
    s = decodeURIComponent(s);
  } catch {
    /* ignore */
  }
  const home = os.homedir() || process.env.HOME || '';
  if (s === '~' || s.startsWith('~/')) {
    s = path.join(home, s === '~' ? '' : s.slice(2));
  } else if (s.startsWith('~')) {
    s = path.join(home, s.slice(1));
  }
  if (!path.isAbsolute(s) && home) {
    s = path.resolve(home, s);
  }
  return path.resolve(s);
}

export function resolveSafeSourceRoot(inputPath: string): string {
  const resolved = normalizeUserFolderPath(inputPath);
  const candidates = [resolved, resolved.replace(/\/+$/, '')];
  let found: string | null = null;
  for (const c of candidates) {
    if (!c || !fs.existsSync(c)) continue;
    const stat = fs.statSync(c);
    if (stat.isDirectory()) {
      found = fs.realpathSync(c);
      break;
    }
  }
  if (!found) {
    throw new Error(
      `Ordner nicht gefunden: „${resolved}“. ` +
        'Pfad aus dem Finder kopieren (Rechtsklick Ordner → ⌥+„Pfadname kopieren“) ' +
        'oder unten „Ordner auswählen“ nutzen — ohne manuellen Pfad.',
    );
  }
  return found;
}

export function assertFileUnderRoot(root: string, filePath: string): string {
  const full = path.resolve(root, filePath);
  const rel = path.relative(root, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Ungültiger Dateipfad');
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) {
    throw new Error(`Datei nicht gefunden: ${filePath}`);
  }
  return full;
}

function pickDominantCaptureDateISO(dates: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const d of dates) {
    if (!d) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function walkImages(dir: string, root: string, depth: number, out: ScannedPhoto[]): void {
  if (depth > 6) return;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkImages(full, root, depth + 1, out);
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    const relativePath = path.relative(root, full).replace(/\\/g, '/');
    out.push({
      relativePath,
      fileName: ent.name,
      dateISO: null,
      size: fs.statSync(full).size,
    });
  }
}

export async function scanPhotoFolder(
  sourcePath: string,
  targetDateISO?: string | null,
): Promise<{
  root: string;
  images: ScannedPhoto[];
  total: number;
  matchedCount: number;
  suggestedCaptureDateISO: string | null;
  exifCount: number;
}> {
  const root = resolveSafeSourceRoot(sourcePath);
  const found: ScannedPhoto[] = [];
  walkImages(root, root, 0, found);

  const withDates: ScannedPhoto[] = [];
  for (const item of found) {
    const full = path.join(root, item.relativePath);
    const dateISO = await readCaptureDateISOFromPath(full);
    withDates.push({ ...item, dateISO });
  }

  const exifCount = withDates.filter((x) => x.dateISO).length;
  const suggestedCaptureDateISO = pickDominantCaptureDateISO(withDates.map((x) => x.dateISO));
  const filterDate = targetDateISO ?? suggestedCaptureDateISO ?? null;

  withDates.sort((a, b) => {
    const da = a.dateISO ?? '9999-99-99';
    const db = b.dateISO ?? '9999-99-99';
    if (da !== db) return da.localeCompare(db);
    return a.fileName.localeCompare(b.fileName, 'de');
  });

  const matchedCount = filterDate
    ? withDates.filter((img) => img.dateISO === filterDate).length
    : withDates.length;

  return {
    root,
    images: withDates,
    total: withDates.length,
    matchedCount,
    suggestedCaptureDateISO,
    exifCount,
  };
}

export function getErasmusBilderDir(erasmusFolder: string | undefined): string | null {
  if (!erasmusFolder?.trim()) return null;
  const jmRoot = resolveJmReihenRoot();
  const bilder = path.join(jmRoot, erasmusFolder.replace(/\\/g, '/'), 'Bilder');
  fs.mkdirSync(bilder, { recursive: true });
  return bilder;
}

function mediaExtForFile(srcPath: string): string {
  const ext = path.extname(srcPath).toLowerCase();
  if (ext === '.png') return 'png';
  if (ext === '.webp') return 'webp';
  return 'jpg';
}

function copyBufferToMediaDir(
  siteId: string,
  buf: Buffer,
  extHint: string,
  mediaDir: string,
): string {
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const ext = mediaExtForFile(`x${extHint}`);
  const filename = `${hash}.${ext}`;
  const dest = path.join(mediaDir, filename);
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, buf);
  }
  return `/api/story-sites/${siteId}/media/${filename}`;
}

async function galleryBufferFromPath(src: string): Promise<{ buf: Buffer; extHint: string }> {
  const ext = path.extname(src).toLowerCase();
  if (isHeicPath(src)) {
    return { buf: await fileToJpegBuffer(src), extHint: '.jpg' };
  }
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return { buf: fs.readFileSync(src), extHint: ext };
  }
  return { buf: await fileToJpegBuffer(src), extHint: '.jpg' };
}

function sanitizeCopyName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

export type ImportedPhoto = {
  relativePath: string;
  galleryUrl: string;
  erasmusPath: string;
  dateISO: string | null;
};

export async function importPhotosToErasmus(params: {
  siteId: string;
  erasmusFolder?: string;
  sourceRoot: string;
  relativePaths: string[];
  pageDateStr: string;
  mediaDir: string;
}): Promise<ImportedPhoto[]> {
  const { siteId, erasmusFolder, sourceRoot, relativePaths, pageDateStr, mediaDir } = params;
  const bilderDir = getErasmusBilderDir(erasmusFolder);
  if (!bilderDir) {
    throw new Error('Erasmus-Ordner fehlt — bitte Website zuerst speichern.');
  }
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const pageDateISO = parseStoryPageDate(pageDateStr);
  const imported: ImportedPhoto[] = [];

  for (const rel of relativePaths) {
    const src = assertFileUnderRoot(sourceRoot, rel);
    const fileDateISO = await readCaptureDateISOFromPath(src);
    if (pageDateISO && fileDateISO && fileDateISO !== pageDateISO) {
      throw new Error(
        `${path.basename(src)} gehört zu ${fileDateISO}, nicht zum Unterseiten-Datum ${pageDateISO}.`,
      );
    }
    const base = sanitizeCopyName(path.basename(src));
    const prefix = pageDateISO ?? 'ohne-datum';
    let destName = `${prefix}_${base}`;
    let destPath = path.join(bilderDir, destName);
    let n = 1;
    while (fs.existsSync(destPath)) {
      const ext = path.extname(base);
      const stem = path.basename(base, ext);
      destName = `${prefix}_${stem}_${n}${ext}`;
      destPath = path.join(bilderDir, destName);
      n += 1;
    }
    fs.copyFileSync(src, destPath);

    const { buf: galleryBuf, extHint } = await galleryBufferFromPath(src);
    const galleryUrl = copyBufferToMediaDir(siteId, galleryBuf, extHint, mediaDir);

    imported.push({
      relativePath: rel,
      galleryUrl,
      erasmusPath: destPath,
      dateISO: fileDateISO ?? pageDateISO,
    });
  }

  return imported;
}

/** Fotos aus Browser-Upload (ohne Server-Pfad zum Quellordner). */
export async function importPhotoBuffersToErasmus(params: {
  siteId: string;
  erasmusFolder?: string;
  files: { buffer: Buffer; originalName: string }[];
  pageDateStr: string;
  mediaDir: string;
}): Promise<ImportedPhoto[]> {
  const { siteId, erasmusFolder, files, pageDateStr, mediaDir } = params;
  const bilderDir = getErasmusBilderDir(erasmusFolder);
  if (!bilderDir) {
    throw new Error('Erasmus-Ordner fehlt — bitte Website zuerst speichern.');
  }
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const pageDateISO = parseStoryPageDate(pageDateStr);
  const imported: ImportedPhoto[] = [];
  const tmpDir = path.join(mediaDir, '_import_tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    for (const { buffer, originalName } of files) {
      const tmpPath = path.join(tmpDir, sanitizeCopyName(originalName));
      fs.writeFileSync(tmpPath, buffer);
      const fileDateISO =
        (await readCaptureDateISOFromBuffer(buffer, originalName)) ??
        (await readCaptureDateISOFromPath(tmpPath));
      const base = sanitizeCopyName(originalName);
      const prefix = pageDateISO ?? 'ohne-datum';
      let destName = `${prefix}_${base}`;
      let destPath = path.join(bilderDir, destName);
      let n = 1;
      while (fs.existsSync(destPath)) {
        const ext = path.extname(base);
        const stem = path.basename(base, ext);
        destName = `${prefix}_${stem}_${n}${ext}`;
        destPath = path.join(bilderDir, destName);
        n += 1;
      }
      fs.copyFileSync(tmpPath, destPath);
      const ext = path.extname(originalName).toLowerCase();
      const galleryBuf =
        isHeicPath(originalName) || !['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
          ? await uploadBufferToJpegBuffer(buffer, originalName)
          : buffer;
      const galleryUrl = copyBufferToMediaDir(
        siteId,
        galleryBuf,
        isHeicPath(originalName) ? '.jpg' : ext,
        mediaDir,
      );
      imported.push({
        relativePath: originalName,
        galleryUrl,
        erasmusPath: destPath,
        dateISO: fileDateISO ?? pageDateISO,
      });
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  return imported;
}
