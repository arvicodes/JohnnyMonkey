import exifr from 'exifr';

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

/** EXIF-Zeitstempel → YYYY-MM-DD (Kalenderdatum aus EXIF-String, ohne Zeitzonen-Verschiebung). */
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

export function firstExifDateISO(tags: Record<string, unknown> | undefined): string | null {
  if (!tags) return null;
  for (const key of EXIF_DATE_PICK) {
    const iso = exifValueToDateISO(tags[key]);
    if (iso) return iso;
  }
  return null;
}

export function extractDateFromFileName(fileName: string): string | null {
  const base = fileName.replace(/\.[^.]+$/, '');
  const patterns = [
    /(?:^|[^\d])(\d{4})[-_]?(\d{2})[-_]?(\d{2})(?:[^\d]|$)/,
    /(?:^|[^\d])(\d{2})[-_]?(\d{2})[-_]?(\d{4})(?:[^\d]|$)/,
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

export async function readCaptureDateISOFromPath(fullPath: string): Promise<string | null> {
  try {
    const tags = await exifr.parse(fullPath, EXIF_PARSE_OPTS);
    const fromExif = firstExifDateISO(tags as Record<string, unknown>);
    if (fromExif) return fromExif;
  } catch {
    /* EXIF optional */
  }
  return extractDateFromFileName(fullPath);
}

export async function readCaptureDateISOFromBuffer(
  buffer: Buffer,
  fileName: string,
): Promise<string | null> {
  try {
    const tags = await exifr.parse(buffer, EXIF_PARSE_OPTS);
    const fromExif = firstExifDateISO(tags as Record<string, unknown>);
    if (fromExif) return fromExif;
  } catch {
    /* EXIF optional */
  }
  return extractDateFromFileName(fileName);
}
