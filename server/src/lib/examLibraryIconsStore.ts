import fs from 'fs';
import os from 'os';
import path from 'path';
import { readImageFileForServe } from '../utils/imageToJpeg';
import { StorageManager } from '../utils/storageManager';

export const EXAM_LIBRARY_ICON_IMAGE_PREFIX = 'img:';

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
  const fp = iconsFileAbsolute(teacherFolderKey);
  if (!fs.existsSync(fp)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as { icons?: unknown };
    if (!parsed.icons || typeof parsed.icons !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.icons as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

function writeTeacherExamLibraryIcons(
  teacherFolderKey: string,
  icons: Record<string, string>,
): void {
  const fp = iconsFileAbsolute(teacherFolderKey);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, JSON.stringify({ icons, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
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
