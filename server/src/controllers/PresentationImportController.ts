import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { parsePptxBuffer } from '../lib/pptxParse';

function getLoginCode(req: Request): string {
  const raw = req.headers['x-login-code'];
  return typeof raw === 'string' ? raw.trim() : '';
}

export class PresentationImportController {
  /** PPTX hochladen oder lokalen Pfad lesen → positionierte Boxen (Text/Bild/Form) */
  static async parsePptx(req: Request, res: Response) {
    try {
      if (!getLoginCode(req)) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      let buffer: Buffer | null = null;
      let fileName = 'import.pptx';

      const uploaded = (req as Request & { file?: Express.Multer.File }).file;
      if (uploaded?.buffer?.length) {
        buffer = uploaded.buffer;
        fileName = uploaded.originalname || fileName;
      } else {
        const filePath =
          typeof req.body?.filePath === 'string' ? req.body.filePath.trim() : '';
        if (!filePath) {
          return res.status(400).json({ error: 'PPTX-Datei oder filePath erforderlich' });
        }
        const resolved = path.resolve(filePath);
        if (!fs.existsSync(resolved)) {
          return res.status(404).json({ error: 'Datei nicht gefunden' });
        }
        const ext = path.extname(resolved).toLowerCase();
        if (ext !== '.pptx') {
          return res.status(400).json({ error: 'Nur .pptx wird unterstützt (kein .ppt)' });
        }
        buffer = fs.readFileSync(resolved);
        fileName = path.basename(resolved);
      }

      if (!buffer?.length) {
        return res.status(400).json({ error: 'Leere Datei' });
      }
      if (buffer.length > 80 * 1024 * 1024) {
        return res.status(400).json({ error: 'Datei zu groß (max. 80 MB)' });
      }

      const parsed = parsePptxBuffer(buffer, fileName);
      if (parsed.slides.length === 0) {
        return res.status(400).json({ error: 'Keine Folien in der PPTX gefunden' });
      }

      return res.json(parsed);
    } catch (error) {
      console.error('parsePptx error:', error);
      return res.status(500).json({
        error: 'PPTX konnte nicht gelesen werden',
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
