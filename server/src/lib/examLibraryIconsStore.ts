import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { readImageFileForServe } from '../utils/imageToJpeg';
import { StorageManager } from '../utils/storageManager';

export const EXAM_LIBRARY_ICON_IMAGE_PREFIX = 'img:';
export const EXAM_LIBRARY_WHITE_BG_VERSION = 2;

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

export type TeacherExamLibraryIconTemplate = {
  savedAt: string;
  icons: Record<string, string>;
  byExamType: Record<string, string>;
};

function examTypeFromBasename(fileName: string): string {
  const n = String(fileName || '').trim();
  if (/^KA_/i.test(n)) return 'KA';
  if (/^KU_/i.test(n)) return 'KU';
  if (/^HU_/i.test(n) || /^HÜ_/i.test(n)) return 'HU';
  if (/^QZ_/i.test(n)) return 'QZ';
  return '';
}

function readTeacherExamLibraryIconsDocument(teacherFolderKey: string): {
  icons: Record<string, string>;
  whiteBgVersion: number;
  iconTemplate: TeacherExamLibraryIconTemplate | null;
} {
  const fp = iconsFileAbsolute(teacherFolderKey);
  if (!fs.existsSync(fp)) return { icons: {}, whiteBgVersion: 0, iconTemplate: null };
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8')) as {
      icons?: unknown;
      whiteBgVersion?: unknown;
      iconTemplate?: unknown;
    };
    const whiteBgVersion =
      typeof parsed.whiteBgVersion === 'number' && Number.isFinite(parsed.whiteBgVersion)
        ? parsed.whiteBgVersion
        : 0;
    let iconTemplate: TeacherExamLibraryIconTemplate | null = null;
    if (parsed.iconTemplate && typeof parsed.iconTemplate === 'object') {
      const t = parsed.iconTemplate as TeacherExamLibraryIconTemplate;
      if (t.icons && typeof t.icons === 'object' && typeof t.savedAt === 'string') {
        iconTemplate = {
          savedAt: t.savedAt,
          icons: Object.fromEntries(
            Object.entries(t.icons).filter(([, v]) => typeof v === 'string' && v.trim()),
          ) as Record<string, string>,
          byExamType:
            t.byExamType && typeof t.byExamType === 'object'
              ? (Object.fromEntries(
                  Object.entries(t.byExamType).filter(([, v]) => typeof v === 'string' && v.trim()),
                ) as Record<string, string>)
              : {},
        };
      }
    }
    if (!parsed.icons || typeof parsed.icons !== 'object') {
      return { icons: {}, whiteBgVersion, iconTemplate };
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.icons as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    }
    return { icons: out, whiteBgVersion, iconTemplate };
  } catch {
    return { icons: {}, whiteBgVersion: 0, iconTemplate: null };
  }
}

export function readTeacherExamLibraryIconTemplate(
  teacherFolderKey: string,
): TeacherExamLibraryIconTemplate | null {
  return readTeacherExamLibraryIconsDocument(teacherFolderKey).iconTemplate;
}

function writeTeacherExamLibraryIcons(
  teacherFolderKey: string,
  icons: Record<string, string>,
  opts?: { whiteBgVersion?: number; iconTemplate?: TeacherExamLibraryIconTemplate | null },
): void {
  const fp = iconsFileAbsolute(teacherFolderKey);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const prev = readTeacherExamLibraryIconsDocument(teacherFolderKey);
  const payload: Record<string, unknown> = {
    icons,
    updatedAt: new Date().toISOString(),
    whiteBgVersion: opts?.whiteBgVersion ?? prev.whiteBgVersion,
  };
  const template =
    opts && 'iconTemplate' in opts ? opts.iconTemplate : prev.iconTemplate;
  if (template) payload.iconTemplate = template;
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
}

function cloneIconValueToVorlage(
  teacherFolderKey: string,
  examKey: string,
  iconValue: string,
): string {
  const trimmed = iconValue.trim();
  if (!trimmed.startsWith(EXAM_LIBRARY_ICON_IMAGE_PREFIX)) return trimmed;
  const assetGitPath = trimmed.slice(EXAM_LIBRARY_ICON_IMAGE_PREFIX.length);
  const { abs: srcAbs } = assertTeacherExamLibraryAssetPath(teacherFolderKey, assetGitPath);
  const ext = path.extname(srcAbs).toLowerCase() || '.png';
  const safeStem =
    examKey
      .replace(/[^a-z0-9äöüß]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 96) || 'icon';
  const rel = path
    .join('_Meta', 'Pruefungs-Icons', '_vorlage', teacherFolderKey, `${safeStem}${ext}`)
    .replace(/\\/g, '/');
  const destAbs = StorageManager.resolveGitInternRelativePath(rel);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
  return `${EXAM_LIBRARY_ICON_IMAGE_PREFIX}git-intern/${rel}`;
}

/** Aktuelle Icon-Zuordnungen als Vorlage (eigene Kopien unter _vorlage/). */
export function saveTeacherExamLibraryIconTemplate(teacherFolderKey: string): {
  icons: Record<string, string>;
  iconTemplate: TeacherExamLibraryIconTemplate;
} {
  const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
  const templateIcons: Record<string, string> = {};
  const byExamType: Record<string, string> = {};
  for (const [examKey, iconVal] of Object.entries(doc.icons)) {
    const templVal = cloneIconValueToVorlage(teacherFolderKey, examKey, iconVal);
    templateIcons[examKey] = templVal;
    const base = examKey.split('/').pop() || examKey;
    const t = examTypeFromBasename(base);
    if (t) byExamType[t] = templVal;
  }
  const iconTemplate: TeacherExamLibraryIconTemplate = {
    savedAt: new Date().toISOString(),
    icons: templateIcons,
    byExamType,
  };
  writeTeacherExamLibraryIcons(teacherFolderKey, doc.icons, { iconTemplate });
  return { icons: doc.icons, iconTemplate };
}

export function setTeacherExamLibraryWhiteBgVersion(
  teacherFolderKey: string,
  version: number,
): Record<string, string> {
  const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
  writeTeacherExamLibraryIcons(teacherFolderKey, doc.icons, { whiteBgVersion: version });
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
    const { buffer } = await readImageFileForServe(tmpIn, 256);
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

export type TeacherExamLibraryCustomIconChoice = {
  value: string;
  label: string;
};

function labelFromExamLibraryPath(examPath: string): string {
  const file = examPath.split('/').pop() || 'Icon';
  return file.replace(/\.html?$/i, '').replace(/^((ka|ku|hu|hü|qz)_)/i, '').trim() || file;
}

function resolveTeacherExamLibraryIconImageAbs(
  teacherFolderKey: string,
  iconValue: string,
): string | null {
  if (!iconValue.startsWith(EXAM_LIBRARY_ICON_IMAGE_PREFIX)) return null;
  let p = iconValue.slice(EXAM_LIBRARY_ICON_IMAGE_PREFIX.length).replace(/\\/g, '/').trim();
  if (p.startsWith('git-intern/')) p = p.slice('git-intern/'.length);
  const allowedPrefixes = [
    `_Meta/Pruefungs-Icons/_assets/${teacherFolderKey}/`,
    `_Meta/Pruefungs-Icons/_vorlage/${teacherFolderKey}/`,
  ];
  const pl = p.toLowerCase();
  if (!allowedPrefixes.some((seg) => pl.includes(seg.toLowerCase()))) return null;
  const abs = StorageManager.resolveGitInternRelativePath(p);
  return abs && fs.existsSync(abs) ? abs : null;
}

/** Eigene Icons für die Auswahlliste — identische Bilddateien nur einmal (MD5). */
export function listTeacherExamLibraryCustomIconChoices(
  teacherFolderKey: string,
): TeacherExamLibraryCustomIconChoice[] {
  const doc = readTeacherExamLibraryIconsDocument(teacherFolderKey);
  const examPathKeys = new Set<string>([
    ...Object.keys(doc.icons),
    ...Object.keys(doc.iconTemplate?.icons ?? {}),
  ]);

  const byHash = new Map<string, TeacherExamLibraryCustomIconChoice>();

  for (const examPath of examPathKeys) {
    const key = examPath.toLowerCase();
    const value = (doc.icons[key] || doc.iconTemplate?.icons?.[key])?.trim();
    if (!value?.startsWith(EXAM_LIBRARY_ICON_IMAGE_PREFIX)) continue;

    const abs = resolveTeacherExamLibraryIconImageAbs(teacherFolderKey, value);
    if (!abs) continue;

    let hash: string;
    try {
      hash = crypto.createHash('md5').update(fs.readFileSync(abs)).digest('hex');
    } catch {
      continue;
    }

    const choice: TeacherExamLibraryCustomIconChoice = {
      value,
      label: labelFromExamLibraryPath(examPath),
    };
    const prev = byHash.get(hash);
    if (!prev) {
      byHash.set(hash, choice);
      continue;
    }
    const preferAssets =
      value.includes('/_assets/') && !prev.value.includes('/_assets/');
    if (preferAssets) byHash.set(hash, choice);
  }

  return [...byHash.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
}
