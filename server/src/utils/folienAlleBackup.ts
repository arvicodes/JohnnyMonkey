import fs from 'fs';
import path from 'path';

/** Zentraler Sammelordner unter J-M-Reihen für Präsentations- und Karteikarten-Sicherheitskopien */
export const FOLIEN_ALLE_BACKUP_DIR_NAME = 'Folien - ALLE - BACKUP';

function projectRoot(): string {
  const fromEnv = process.env.LOCAL_MATERIALS_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  return path.resolve(__dirname, '../../..');
}

function jmReihenRoot(): string {
  if (process.env.JM_REIHEN_PATH && fs.existsSync(process.env.JM_REIHEN_PATH)) {
    return process.env.JM_REIHEN_PATH;
  }
  const base = process.env.LOCAL_MATERIALS_PATH;
  if (base) {
    const candidate = path.join(base, 'J-M-Reihen');
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(projectRoot(), 'J-M-Reihen');
}

/** Absoluter Pfad zu `J-M-Reihen/Folien - ALLE - BACKUP` (Ordner wird angelegt). */
export function ensureFolienAlleBackupDir(): string {
  const dir = path.join(jmReihenRoot(), FOLIEN_ALLE_BACKUP_DIR_NAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Dateinamen-sichere Variante eines Pfads/Titels (ohne Extension). */
export function sanitizeBackupFilePart(raw: string, maxLen = 120): string {
  const cleaned = String(raw || '')
    .normalize('NFC')
    .trim()
    .replace(/[\\/]+/g, '__')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  if (!cleaned) return 'unbekannt';
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

export function writeFolienAlleBackupFile(fileName: string, content: string | Buffer): string | null {
  try {
    const dir = ensureFolienAlleBackupDir();
    const safeName = fileName.replace(/[<>:"|?*\u0000-\u001f]/g, '-');
    const full = path.join(dir, safeName);
    fs.writeFileSync(full, content);
    return full;
  } catch (e) {
    console.warn('Folien-ALLE-BACKUP write failed:', fileName, e);
    return null;
  }
}
