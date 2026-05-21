import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import exifr from 'exifr';
import { parseStoryPageDate } from './storyPageDate';
import { resolveJmReihenRoot } from './erasmusSiteFolders';

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

function extractDateFromFileName(fileName: string): string | null {
  const base = path.basename(fileName, path.extname(fileName));
  const patterns = [
    /(?:^|[^\d])(\d{4})[-_]?(\d{2})[-_]?(\d{2})(?:[^\d]|$)/,
    /(?:^|[^\d])(\d{2})[-_]?(\d{2})[-_]?(\d{4})(?:[^\d]|$)/,
  ];
  for (const re of patterns) {
    const m = base.match(re);
    if (!m) continue;
    if (m[1].length === 4) {
      const iso = `${m[1]}-${m[2]}-${m[3]}`;
      if (parseStoryPageDate(iso)) return iso;
    } else {
      const iso = `${m[3]}-${m[2]}-${m[1]}`;
      if (parseStoryPageDate(iso)) return iso;
    }
  }
  return null;
}

async function getPhotoDateISO(fullPath: string): Promise<string | null> {
  try {
    const tags = await exifr.parse(fullPath, { pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'] });
    const raw = tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.ModifyDate;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      const y = raw.getFullYear();
      const m = raw.getMonth() + 1;
      const d = raw.getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    if (typeof raw === 'string') {
      const parsed = parseStoryPageDate(raw.slice(0, 10).replace(/:/g, '-'));
      if (parsed) return parsed;
    }
  } catch {
    /* EXIF optional */
  }

  const fromName = extractDateFromFileName(path.basename(fullPath));
  if (fromName) return fromName;

  try {
    const mtime = fs.statSync(fullPath).mtime;
    const y = mtime.getFullYear();
    const m = mtime.getMonth() + 1;
    const d = mtime.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } catch {
    return null;
  }
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
): Promise<{ root: string; images: ScannedPhoto[]; total: number }> {
  const root = resolveSafeSourceRoot(sourcePath);
  const found: ScannedPhoto[] = [];
  walkImages(root, root, 0, found);

  const withDates: ScannedPhoto[] = [];
  for (const item of found) {
    const full = path.join(root, item.relativePath);
    const dateISO = await getPhotoDateISO(full);
    withDates.push({ ...item, dateISO });
  }

  withDates.sort((a, b) => {
    const da = a.dateISO ?? '9999-99-99';
    const db = b.dateISO ?? '9999-99-99';
    if (da !== db) return da.localeCompare(db);
    return a.fileName.localeCompare(b.fileName, 'de');
  });

  const filtered = targetDateISO
    ? withDates.filter((img) => img.dateISO === targetDateISO)
    : withDates;

  return { root, images: filtered, total: withDates.length };
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

function copyToMediaDir(siteId: string, srcPath: string, mediaDir: string): string {
  const buf = fs.readFileSync(srcPath);
  return copyBufferToMediaDir(siteId, buf, path.extname(srcPath), mediaDir);
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
    const fileDateISO = await getPhotoDateISO(src);
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

    const ext = path.extname(src).toLowerCase();
    let galleryUrl: string;
    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      galleryUrl = copyToMediaDir(siteId, src, mediaDir);
    } else {
      galleryUrl = copyToMediaDir(siteId, destPath, mediaDir);
    }

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
      const fileDateISO = await getPhotoDateISO(tmpPath);
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
      const galleryUrl = copyBufferToMediaDir(siteId, buffer, path.extname(originalName), mediaDir);
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
