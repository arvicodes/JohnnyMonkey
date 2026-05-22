import exifr from 'exifr';
import { isHeicFile } from './heicPreview';
import { isLikelyVideoFile } from './storyMediaUtils';

const EXIF_DATE_PICK = [
  'DateTimeOriginal',
  'CreateDate',
  'ModifyDate',
  'CreationDate',
  'MediaCreateDate',
  'ContentCreateDate',
] as const;

const EXIF_PARSE_OPTS = {
  pick: [...EXIF_DATE_PICK],
  reviveValues: false,
};

/** EXIF-Zeitstempel → YYYY-MM-DD (Kalenderdatum aus EXIF-String). */
export function exifValueToDateISO(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const m = raw.match(/(\d{4})[:\-.](\d{2})[:\-.](\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = raw.getMonth() + 1;
    const d = raw.getDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

function firstExifDateISO(tags: Record<string, unknown> | undefined): string | null {
  if (!tags) return null;
  for (const key of EXIF_DATE_PICK) {
    const iso = exifValueToDateISO(tags[key]);
    if (iso) return iso;
  }
  return null;
}

function extractDateFromFileName(fileName: string): string | null {
  const base = fileName.replace(/\.[^.]+$/, '');
  const patterns = [
    /(?:^|[^\d])(\d{4})[-_]?(\d{2})[-_]?(\d{2})(?:[^\d]|$)/,
    /(?:^|[^\d])(\d{2})[-_]?(\d{2})[-_]?(\d{4})(?:[^\d]|$)/,
    /(?:^|[^\d])(\d{1,2})[.\-_](\d{1,2})[.\-_](\d{4})(?:[^\d]|$)/,
  ];
  for (const re of patterns) {
    const m = base.match(re);
    if (!m) continue;
    if (m[1].length === 4) {
      const iso = `${m[1]}-${m[2]}-${m[3]}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    } else {
      const iso = `${m[3]}-${m[2]}-${m[1]}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    }
  }
  return null;
}

/** Datum aus Ordnerpfad (z. B. …/2026-05-06/clip.mov). */
export function extractDateFromRelativePath(relativePath: string): string | null {
  const parts = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  for (const part of parts) {
    const folderIso = part.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (folderIso) return `${folderIso[1]}-${folderIso[2]}-${folderIso[3]}`;
    const fromPart = extractDateFromFileName(part);
    if (fromPart) return fromPart;
  }
  return extractDateFromFileName(relativePath);
}

function fileLastModifiedDateISO(file: File): string | null {
  if (!file.lastModified || file.lastModified <= 0) return null;
  const d = new Date(file.lastModified);
  if (Number.isNaN(d.getTime())) return null;
  return exifValueToDateISO(d);
}

/** Aufnahmedatum: EXIF (auch HEIC/MOV), Pfad, Dateiname, bei Video ggf. Änderungsdatum. */
export async function readCaptureDateISOFromFile(file: File): Promise<string | null> {
  const tryParse = async (
    input: Blob | File,
    opts: { pick?: string[]; reviveValues?: boolean } = EXIF_PARSE_OPTS,
  ) => {
    try {
      const tags = await exifr.parse(input, opts);
      return firstExifDateISO(tags as Record<string, unknown>);
    } catch {
      return null;
    }
  };

  let fromExif = await tryParse(file);
  if (!fromExif && isLikelyVideoFile(file)) {
    fromExif = await tryParse(file, {
      pick: [...EXIF_DATE_PICK, 'TrackCreateDate', 'CreationTime'] as string[],
      reviveValues: false,
    });
  }
  if (!fromExif && isHeicFile(file)) {
    const buf = await file.arrayBuffer();
    fromExif = await tryParse(new Blob([buf], { type: 'image/heic' }));
  }
  if (fromExif) return fromExif;

  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim() ?? '';
  if (rel) {
    const fromPath = extractDateFromRelativePath(rel);
    if (fromPath) return fromPath;
  }

  const fromName = extractDateFromFileName(file.name);
  if (fromName) return fromName;

  if (isLikelyVideoFile(file)) {
    return fileLastModifiedDateISO(file);
  }
  return null;
}

/** Häufigstes Aufnahmedatum in der Auswahl (für Unterseiten-Datum). */
export function pickDominantCaptureDateISO(dates: (string | null | undefined)[]): string | null {
  const counts = new Map<string, number>();
  for (const d of dates) {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}
