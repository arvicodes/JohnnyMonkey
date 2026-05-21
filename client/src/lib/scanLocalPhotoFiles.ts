import exifr from 'exifr';
import { parseStoryPageDate } from './storyPageDate';
import { isLikelyImageFile } from './storyImageUtils';

export type LocalPhotoPick = {
  id: string;
  file: File;
  fileName: string;
  dateISO: string | null;
  /** Passt zum Datum der Unterseite */
  matchesDay: boolean;
  previewUrl: string;
};

async function photoDateFromFile(file: File): Promise<string | null> {
  try {
    const tags = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate'] });
    const raw = tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.ModifyDate;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
      const y = raw.getFullYear();
      const m = raw.getMonth() + 1;
      const d = raw.getDate();
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  } catch {
    /* optional */
  }
  const d = new Date(file.lastModified);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function scanPickedFilesForDay(
  fileList: FileList | File[],
  pageDateStr: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  images: LocalPhotoPick[];
  total: number;
  targetDate: string | null;
  matchedCount: number;
}> {
  const targetDate = parseStoryPageDate(pageDateStr);
  const all = Array.from(fileList).filter(isLikelyImageFile);
  const withDates: LocalPhotoPick[] = [];

  for (let i = 0; i < all.length; i++) {
    const file = all[i];
    onProgress?.(i + 1, all.length);
    const dateISO = await photoDateFromFile(file);
    const matchesDay = !targetDate || dateISO === targetDate;
    withDates.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
      file,
      fileName: file.name,
      dateISO,
      matchesDay,
      previewUrl: URL.createObjectURL(file),
    });
  }

  withDates.sort((a, b) => {
    if (a.matchesDay !== b.matchesDay) return a.matchesDay ? -1 : 1;
    return a.fileName.localeCompare(b.fileName, 'de');
  });

  const matchedCount = withDates.filter((x) => x.matchesDay).length;
  return { images: withDates, total: all.length, targetDate, matchedCount };
}

export function revokeLocalPhotoPreviews(images: LocalPhotoPick[]): void {
  for (const img of images) {
    try {
      URL.revokeObjectURL(img.previewUrl);
    } catch {
      /* ignore */
    }
  }
}
