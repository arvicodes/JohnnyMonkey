import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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
    const payload = externalizeDataUrls(id, { ...req.body, id });
    fs.writeFileSync(sitePath(id), JSON.stringify(payload), 'utf8');
    res.json({ ok: true, id });
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
