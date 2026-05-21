import { parseStoryPageDate } from './storyPageDate';
import { isLikelyImageFile } from './storyImageUtils';
import { readCaptureDateISOFromFile, pickDominantCaptureDateISO } from './photoCaptureDate';
import { createImagePreviewUrl } from './heicPreview';

export type LocalPhotoPick = {
  id: string;
  file: File;
  fileName: string;
  dateISO: string | null;
  /** Passt zum Aufnahmedatum (EXIF) der Unterseite */
  matchesDay: boolean;
  previewUrl: string;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function scanPickedFilesForDay(
  fileList: FileList | File[],
  pageDateStr: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  images: LocalPhotoPick[];
  total: number;
  targetDate: string | null;
  suggestedCaptureDateISO: string | null;
  matchedCount: number;
  exifCount: number;
}> {
  const all = Array.from(fileList).filter(isLikelyImageFile);
  const total = all.length;
  let done = 0;

  const dated = await mapWithConcurrency(all, 8, async (file, i) => {
    const dateISO = await readCaptureDateISOFromFile(file);
    const previewUrl = createImagePreviewUrl(file);
    done += 1;
    onProgress?.(done, total);
    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
      file,
      fileName: file.name,
      dateISO,
      matchesDay: false,
      previewUrl,
    };
  });

  const exifCount = dated.filter((x) => x.dateISO).length;
  const suggestedCaptureDateISO = pickDominantCaptureDateISO(dated.map((x) => x.dateISO));
  const pageIso = parseStoryPageDate(pageDateStr);
  const targetDate = pageIso ?? suggestedCaptureDateISO;

  const withMatch = dated.map((img) => ({
    ...img,
    matchesDay: targetDate ? img.dateISO === targetDate : false,
  }));

  withMatch.sort((a, b) => a.fileName.localeCompare(b.fileName, 'de'));

  const matchedCount = targetDate ? withMatch.filter((x) => x.matchesDay).length : withMatch.length;

  return {
    images: withMatch,
    total: all.length,
    targetDate,
    suggestedCaptureDateISO,
    matchedCount,
    exifCount,
  };
}

export function revokeLocalPhotoPreviews(images: LocalPhotoPick[]): void {
  for (const img of images) {
    try {
      if (img.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl);
      }
    } catch {
      /* ignore */
    }
  }
}
