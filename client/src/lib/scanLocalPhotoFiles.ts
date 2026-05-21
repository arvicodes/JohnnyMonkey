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

export async function scanPickedFilesForDay(
  fileList: FileList | File[],
  pageDateStr: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  images: LocalPhotoPick[];
  total: number;
  targetDate: string | null;
  /** Aus EXIF: wird als Unterseiten-Datum übernommen */
  suggestedCaptureDateISO: string | null;
  matchedCount: number;
  exifCount: number;
}> {
  const all = Array.from(fileList).filter(isLikelyImageFile);
  const dated: LocalPhotoPick[] = [];

  for (let i = 0; i < all.length; i++) {
    const file = all[i];
    onProgress?.(i + 1, all.length);
    const dateISO = await readCaptureDateISOFromFile(file);
    const previewUrl = await createImagePreviewUrl(file);
    dated.push({
      id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
      file,
      fileName: file.name,
      dateISO,
      matchesDay: false,
      previewUrl,
    });
  }

  const exifCount = dated.filter((x) => x.dateISO).length;
  const suggestedCaptureDateISO = pickDominantCaptureDateISO(dated.map((x) => x.dateISO));
  const pageIso = parseStoryPageDate(pageDateStr);
  /** Gesetztes Unterseiten-Datum hat Vorrang; sonst häufigstes EXIF-Datum */
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
      URL.revokeObjectURL(img.previewUrl);
    } catch {
      /* ignore */
    }
  }
}
