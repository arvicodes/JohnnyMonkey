import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { applyErasmusFoldersToSitePayload } from '../utils/erasmusSiteFolders';
import {
  resolveSafeSourceRoot,
  assertFileUnderRoot,
  scanPhotoFolder,
  importPhotosToErasmus,
  importPhotoBuffersToErasmus,
} from '../utils/erasmusPhotoImport';
import { parseStoryPageDate } from '../utils/storyPageDate';
import { isHeicPath, fileToJpegBuffer, uploadBufferToJpegBuffer } from '../utils/imageToJpeg';

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 250 },
});

const router = express.Router();

/** Immer server/story-sites-data (egal ob Start aus src/ oder dist/). */
const DATA_DIR = path.resolve(__dirname, '..', '..', 'story-sites-data');

const DATA_URL_RE = /data:image\/([\w+.-]+);base64,([A-Za-z0-9+/=]+)/g;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeSiteId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9-]/g, '');
  if (!safe || safe !== id) {
    throw new Error('Invalid site id');
  }
  return safe;
}

function sitePath(id: string): string {
  return path.join(DATA_DIR, `${safeSiteId(id)}.json`);
}

function siteMediaDir(id: string): string {
  return path.join(DATA_DIR, safeSiteId(id), 'media');
}

function safeMediaFilename(name: string): string | null {
  const base = path.basename(name);
  if (!/^[a-f0-9]{8,64}\.(jpg|jpeg|png|webp)$/i.test(base)) return null;
  return base;
}

/** Base64-Bilder als Dateien ablegen — kleines JSON, zuverlässigeres Speichern. */
function externalizeDataUrls(siteId: string, raw: Record<string, unknown>): Record<string, unknown> {
  const mediaDir = siteMediaDir(siteId);
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const replaceInString = (input: string): string => {
    if (!input || !input.includes('data:image')) return input;
    return input.replace(DATA_URL_RE, (_match, mime: string, b64: string) => {
      const hash = crypto.createHash('sha256').update(b64).digest('hex').slice(0, 16);
      const ext = String(mime).toLowerCase().includes('png') ? 'png' : 'jpg';
      const filename = `${hash}.${ext}`;
      const filePath = path.join(mediaDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
      }
      return `/api/story-sites/${siteId}/media/${filename}`;
    });
  };

  const pages = Array.isArray(raw.pages) ? raw.pages : [];
  const nextPages = pages.map((p) => {
    if (!p || typeof p !== 'object') return p;
    const page = { ...(p as Record<string, unknown>) };
    if (typeof page.heroImage === 'string') page.heroImage = replaceInString(page.heroImage);
    if (Array.isArray(page.galleryImages)) {
      page.galleryImages = page.galleryImages.map((item) =>
        typeof item === 'string' ? replaceInString(item) : item,
      );
    }
    if (typeof page.bodyHtml === 'string') page.bodyHtml = replaceInString(page.bodyHtml);
    return page;
  });

  return { ...raw, pages: nextPages };
}

router.get('/', (_req: Request, res: Response) => {
  try {
    ensureDataDir();
    const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    const sites = files.map((f) => {
      const raw = fs.readFileSync(path.join(DATA_DIR, f), 'utf8');
      const parsed = JSON.parse(raw) as { id?: string; name?: string; updatedAt?: string };
      return {
        id: parsed.id ?? f.replace(/\.json$/, ''),
        name: parsed.name ?? 'Ohne Titel',
        updatedAt: parsed.updatedAt ?? null,
      };
    });
    res.json(sites);
  } catch (e) {
    console.error('story-sites list error', e);
    res.status(500).json({ error: 'Liste konnte nicht geladen werden' });
  }
});

/** HEIC aus Browser-Upload → JPEG (Vorschau / Galerie). */
router.post('/convert-heic', photoUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'Datei fehlt' });
    }
    const name = file.originalname || 'photo.heic';
    if (!isHeicPath(name)) {
      return res.status(400).json({ error: 'Keine HEIC/HEIF-Datei' });
    }
    const jpeg = await uploadBufferToJpegBuffer(file.buffer, name);
    res.type('image/jpeg');
    res.send(jpeg);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'HEIC-Konvertierung fehlgeschlagen';
    res.status(500).json({ error: msg });
  }
});

/** Vorschau eines Bildes aus einem lokalen Quellordner (Pfad muss unter root liegen). */
router.get('/local-preview', async (req: Request, res: Response) => {
  try {
    const rootParam = String(req.query.root ?? '');
    const fileParam = String(req.query.file ?? '');
    if (!rootParam || !fileParam) {
      return res.status(400).json({ error: 'root und file erforderlich' });
    }
    const root = resolveSafeSourceRoot(rootParam);
    const full = assertFileUnderRoot(root, fileParam);
    if (isHeicPath(full)) {
      const buf = await fileToJpegBuffer(full);
      res.type('image/jpeg');
      return res.send(buf);
    }
    const ext = path.extname(full).toLowerCase();
    if (ext === '.png') res.type('image/png');
    else if (ext === '.webp') res.type('image/webp');
    else if (ext === '.gif') res.type('image/gif');
    else res.type('image/jpeg');
    res.sendFile(full);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Vorschau fehlgeschlagen';
    res.status(400).json({ error: msg });
  }
});

router.post('/:id/scan-photos', async (req: Request, res: Response) => {
  try {
    safeSiteId(req.params.id);
    const sourcePath = String(req.body?.sourcePath ?? '');
    const targetDateRaw = req.body?.targetDate;
    const targetDate =
      typeof targetDateRaw === 'string' && targetDateRaw.trim()
        ? targetDateRaw.trim()
        : typeof req.body?.pageDateStr === 'string'
          ? parseStoryPageDate(req.body.pageDateStr)
          : null;

    if (!sourcePath.trim()) {
      return res.status(400).json({ error: 'sourcePath fehlt' });
    }

    const result = await scanPhotoFolder(sourcePath, targetDate);
    const effectiveDate = result.suggestedCaptureDateISO ?? targetDate;
    res.json({
      root: result.root,
      targetDate: effectiveDate,
      suggestedCaptureDateISO: result.suggestedCaptureDateISO,
      exifCount: result.exifCount,
      images: result.images.map((img) => ({
        ...img,
        previewUrl: `/api/story-sites/local-preview?root=${encodeURIComponent(result.root)}&file=${encodeURIComponent(img.relativePath)}`,
      })),
      totalScanned: result.total,
      matchedCount: result.matchedCount,
    });
  } catch (e) {
    console.error('story-sites scan-photos', e);
    const msg = e instanceof Error ? e.message : 'Scan fehlgeschlagen';
    res.status(400).json({ error: msg });
  }
});

router.post('/:id/import-photos', async (req: Request, res: Response) => {
  try {
    const id = safeSiteId(req.params.id);
    const sourcePath = String(req.body?.sourcePath ?? '');
    const pageDateStr = String(req.body?.pageDateStr ?? '');
    const relativePaths = Array.isArray(req.body?.relativePaths)
      ? (req.body.relativePaths as unknown[]).filter((x): x is string => typeof x === 'string')
      : [];

    if (!sourcePath.trim() || !relativePaths.length) {
      return res.status(400).json({ error: 'sourcePath und relativePaths erforderlich' });
    }

    const file = sitePath(id);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: 'Website nicht gefunden' });
    }
    const siteRaw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const erasmusFolder =
      typeof siteRaw.erasmusFolder === 'string' ? siteRaw.erasmusFolder : undefined;

    const root = resolveSafeSourceRoot(sourcePath);
    const imported = await importPhotosToErasmus({
      siteId: id,
      erasmusFolder,
      sourceRoot: root,
      relativePaths,
      pageDateStr,
      mediaDir: siteMediaDir(id),
    });

    res.json({ ok: true, imported, galleryUrls: imported.map((i) => i.galleryUrl) });
  } catch (e) {
    console.error('story-sites import-photos', e);
    const msg = e instanceof Error ? e.message : 'Import fehlgeschlagen';
    res.status(400).json({ error: msg });
  }
});

router.post(
  '/:id/import-photo-files',
  photoUpload.array('photos', 250),
  async (req: Request, res: Response) => {
    try {
      const id = safeSiteId(req.params.id);
      const pageDateStr = String(req.body?.pageDateStr ?? '');
      const uploads = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (!uploads.length) {
        return res.status(400).json({ error: 'Keine Dateien erhalten' });
      }

      const file = sitePath(id);
      if (!fs.existsSync(file)) {
        return res.status(404).json({ error: 'Website nicht gefunden' });
      }
      const siteRaw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
      const erasmusFolder =
        typeof siteRaw.erasmusFolder === 'string' ? siteRaw.erasmusFolder : undefined;

      const imported = await importPhotoBuffersToErasmus({
        siteId: id,
        erasmusFolder,
        files: uploads.map((f) => ({
          buffer: f.buffer,
          originalName: f.originalname || 'foto.jpg',
        })),
        pageDateStr,
        mediaDir: siteMediaDir(id),
      });

      res.json({ ok: true, imported, galleryUrls: imported.map((i) => i.galleryUrl) });
    } catch (e) {
      console.error('story-sites import-photo-files', e);
      const msg = e instanceof Error ? e.message : 'Import fehlgeschlagen';
      res.status(400).json({ error: msg });
    }
  },
);

router.get('/:id/media/:filename', (req: Request, res: Response) => {
  try {
    const id = safeSiteId(req.params.id);
    const filename = safeMediaFilename(req.params.filename);
    if (!filename) {
      return res.status(400).json({ error: 'Ungültiger Dateiname' });
    }
    const filePath = path.join(siteMediaDir(id), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Bild nicht gefunden' });
    }
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') res.type('image/png');
    else if (ext === '.webp') res.type('image/webp');
    else res.type('image/jpeg');
    res.sendFile(path.resolve(filePath));
  } catch (e) {
    console.error('story-sites media error', e);
    res.status(400).json({ error: 'Ungültige Anfrage' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const file = sitePath(req.params.id);
    if (!fs.existsSync(file)) {
      return res.status(404).json({ error: 'Website nicht gefunden' });
    }
    const raw = fs.readFileSync(file, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error('story-sites get error', e);
    res.status(400).json({ error: 'Ungültige Anfrage' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    safeSiteId(id);
    if (req.body?.id && req.body.id !== id) {
      return res.status(400).json({ error: 'ID stimmt nicht überein' });
    }
    ensureDataDir();
    const body = { ...(req.body as Record<string, unknown>), id };
    const { payload: withFolders, folderPath } = applyErasmusFoldersToSitePayload(body);
    const payload = externalizeDataUrls(id, withFolders);
    fs.writeFileSync(sitePath(id), JSON.stringify(payload), 'utf8');
    res.json({
      ok: true,
      id,
      erasmusFolder: payload.erasmusFolder ?? null,
      erasmusBilderPath: folderPath ?? null,
    });
  } catch (e) {
    console.error('story-sites put error', e);
    const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
    res.status(400).json({ error: msg });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = safeSiteId(req.params.id);
    const file = sitePath(id);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    const mediaDir = siteMediaDir(id);
    if (fs.existsSync(mediaDir)) {
      fs.rmSync(path.join(DATA_DIR, id), { recursive: true, force: true });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Löschen fehlgeschlagen' });
  }
});

export default router;
