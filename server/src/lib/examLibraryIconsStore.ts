import fs from 'fs';
import os from 'os';
import path from 'path';
import { readImageFileForServe } from '../utils/imageToJpeg';
import { StorageManager } from '../utils/storageManager';

export const EXAM_LIBRARY_ICON_IMAGE_PREFIX = 'img:';
export const EXAM_LIBRARY_WHITE_BG_VERSION = 1;

/** Gleicher Schlüssel wie im Client (git-intern ↔ J-M-Reihen). */
export function canonicalExamLibraryIconKey(filePath: string): string {
  let p = (filePath || '').replace(/\\/g, '/').replace(/\/+$/, '').trim();
  if (p.startsWith('git-intern/')) {
    p = p.slice('git-intern/'.length);
  } else if (p.startsWith('/git-intern/')) {
    p = p.slice('/git-intern/'.length);
  } else if (p.startsWith('J-M-Reihen/')) {
    p = p.slice('J-M-Reihen/'.length);
  }
  return p.toLowerCase();
}

function iconsFileAbsolute(teacherFolderKey: string): string {
  const rel = path.join('_Meta', 'Pruefungs-Icons', `${teacherFolderKey}.json`);
  return StorageManager.resolveGitInternRelativePath(rel);
}

export function readTeacherExamLibraryIcons(teacherFolderKey: string): Record<string, string> {
  return readTeacherExamLibraryIconsDocument(teacherFolderKey).icons;
}

export function readTeacherExamLibraryWhiteBgVersion(teacherFolderKey: string): number {
  return readTeacherExamLibraryIconsDocument(teacherFolderKey).whiteBgVersion;
}

function readTeacherExamLibraryIconsDocument(teacherFolderKey: string): {
  icons: Record<string, string>;
  whiteBgVersion: number;
} {
  const fp = iconsFileAbsolute(teacherFolderKey);
  if (!fs.existsSync(fp)) return { icons: {}, whiteBgVersion: 0 };
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as {
      icons?: unknown;
      whiteBgVersion?: unknown;
    };
    const whiteBgVersion =
      typeof parsed.whiteBgVersion === 'number' && Number.isFinite(parsed.whiteBgVersion)
        ? parsed.whiteBgVersion
        : 0;
    if (!parsed.icons || typeof parsed.icons !== 'object') return { icons: {}, whiteBgVersion };
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.icons as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return { icons: out, whiteBgVersion };
  } catch {
    return { icons: {}, whiteBgVersion: 0 };
  }
}

function writeTeacherExamLibraryIcons(
  teacherFolderKey: string,
  icons: Record<string, string>,
  whiteBgVersion?: number,
): void {
  const fp = iconsFileAbsolute(teacherFolderKey);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const prev = readTeacherExamLibraryIconsDocument(teacherFolderKey);
  const payload: Record<string, unknown> = {
    icons,
    updatedAt: new Date().toISOString(),
    whiteBgVersion: whiteBgVersion ?? prev.whiteBgVersion,
  };
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
}

export function setTeacherExamLibraryWhiteBgVersion(
  teacherFolderKey: string,
  version: number,
): Record<string, string> {
  const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
  writeTeacherExamLibraryIcons(teacherFolderKey, doc.icons, version);
  return doc.icons;
}

function assertTeacherExamLibraryAssetPath(
  teacherFolderKey: string,
  assetGitPath: string,
): { rel: string; abs: string } {
  let p = (assetGitPath || '').replace(/\\/g, '/').trim();
  if (p.startsWith('git-intern/')) p = p.slice('git-intern/'.length);
  const expectedSeg = `_Meta/Pruefungs-Icons/_assets/${teacherFolderKey}/`;
  if (!p.toLowerCase().includes(expectedSeg.toLowerCase())) {
    throw new Error('Ungültiger Icon-Dateipfad');
  }
  const abs = StorageManager.resolveGitInternRelativePath(p);
  if (!abs || !fs.existsSync(abs)) {
    throw new Error('Icon-Datei nicht gefunden');
  }
  return { rel: p.replace(/\\/g, '/'), abs };
}

/** Ersetzt eine vorhandene Icon-Datei (PNG mit Alpha), aktualisiert ggf. .jpg → .png in der Map. */
export async function overwriteTeacherExamLibraryIconAsset(
  teacherFolderKey: string,
  examIconKey: string,
  assetGitPath: string,
  uploadBuffer: Buffer,
): Promise<{ icons: Record<string, string>; iconValue: string }> {
  const { abs: oldAbs, rel: oldRel } = assertTeacherExamLibraryAssetPath(
    teacherFolderKey,
    assetGitPath,
  );
  const extIn = path.extname(oldAbs).toLowerCase() || '.png';
  const tmpIn = path.join(
    os.tmpdir(),
    `exam-lib-ow-${Date.now()}-${Math.random().toString(36).slice(2)}${extIn}`,
  );
  fs.writeFileSync(tmpIn, uploadBuffer);
  try {
    const { buffer, mimeType } = await readImageFileForServe(tmpIn, 256);
    const dir = path.dirname(oldAbs);
    const base = path.basename(oldAbs, path.extname(oldAbs));
    const newAbs = path.join(dir, `${base}.png`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(newAbs, buffer);
    if (newAbs !== oldAbs && fs.existsSync(oldAbs)) {
      try {
        fs.unlinkSync(oldAbs);
      } catch {
        /* ignore */
      }
    }
    const newRel = path.join(path.dirname(oldRel), `${base}.png`).replace(/\\/g, '/');
    const iconValue = `${EXAM_LIBRARY_ICON_IMAGE_PREFIX}git-intern/${newRel}`;
    const map = readTeacherExamLibraryIcons(teacherFolderKey);
    const key = examIconKey.trim().toLowerCase();
    if (map[key]) {
      map[key] = iconValue;
      writeTeacherExamLibraryIcons(teacherFolderKey, map);
    }
    return { icons: map, iconValue };
  } finally {
    try {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    } catch {
      /* ignore */
    }
  }
}

export function setTeacherExamLibraryIcon(
  teacherFolderKey: string,
  examFilePath: string,
  emoji: string | null | undefined,
): Record<string, string> {
  const map = readTeacherExamLibraryIcons(teacherFolderKey);
  const key = canonicalExamLibraryIconKey(examFilePath);
  const trimmed = typeof emoji === 'string' ? emoji.trim() : '';
  if (!trimmed) {
    delete map[key];
  } else {
    map[key] = trimmed;
  }
  writeTeacherExamLibraryIcons(teacherFolderKey, map);
  return map;
}

/** Bild hochladen, skaliert (max. 256 px), unter _Meta/…/_assets/<Lehrer>/ speichern. */
export async function saveTeacherExamLibraryIconFromUpload(
  teacherFolderKey: string,
  examFilePath: string,
  uploadBuffer: Buffer,
  originalName: string,
): Promise<{ icons: Record<string, string>; iconValue: string }> {
  const extIn = path.extname(originalName || '').toLowerCase() || '.png';
  const tmpIn = path.join(
    os.tmpdir(),
    `exam-lib-icon-${Date.now()}-${Math.random().toString(36).slice(2)}${extIn}`,
  );
  fs.writeFileSync(tmpIn, uploadBuffer);
  try {
    const { buffer, mimeType } = await readImageFileForServe(tmpIn, 256);
    const extOut = mimeType === 'image/png' ? '.png' : '.jpg';
    const fileName = `exam-icon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extOut}`;
    const rel = path
      .join('_Meta', 'Pruefungs-Icons', '_assets', teacherFolderKey, fileName)
      .replace(/\\/g, '/');
    const abs = StorageManager.resolveGitInternRelativePath(rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, buffer);
    const iconValue = `${EXAM_LIBRARY_ICON_IMAGE_PREFIX}git-intern/${rel}`;
    const icons = setTeacherExamLibraryIcon(teacherFolderKey, examFilePath, iconValue);
    return { icons, iconValue };
  } finally {
    try {
      if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
    } catch {
      /* ignore */
    }
  }
}

export function migrateTeacherExamLibraryIconKey(
  teacherFolderKey: string,
  oldExamPath: string,
  newExamPath: string,
): void {
  const map = readTeacherExamLibraryIcons(teacherFolderKey);
  const oldKey = canonicalExamLibraryIconKey(oldExamPath);
  const newKey = canonicalExamLibraryIconKey(newExamPath);
  if (oldKey === newKey || !map[oldKey]) return;
  map[newKey] = map[oldKey];
  delete map[oldKey];
  writeTeacherExamLibraryIcons(teacherFolderKey, map);
}
