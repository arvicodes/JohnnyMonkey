import { parseStoryPageDate } from './storyPageDate';
import { isLikelyStoryMediaFile, isLikelyVideoFile } from './storyMediaUtils';
import { readCaptureDateISOFromFile, pickDominantCaptureDateISO } from './photoCaptureDate';
import { createStoryMediaPreviewUrl } from './storyMediaUtils';

export type LocalPhotoPick = {
  id: string;
  /** Browser-Datei; fehlt bei Server-Ordner-Scan. */
  file?: File;
  fileName: string;
  dateISO: string | null;
  /** Passt zum Aufnahmedatum (EXIF) der Unterseite */
  matchesDay: boolean;
  previewUrl: string;
  /** Relativer Pfad im Quellordner (Server-Scan). */
  relativePath?: string;
  /** Absoluter Quellordner für import-photos. */
  sourcePath?: string;
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

async function scanFileList(
  files: File[],
  pageDateStr: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  picks: LocalPhotoPick[];
  targetDate: string | null;
  suggestedCaptureDateISO: string | null;
  matchedCount: number;
  exifCount: number;
}> {
  const total = files.length;
  let done = 0;

  const dated = await mapWithConcurrency(files, 8, async (file, i) => {
    const dateISO = await readCaptureDateISOFromFile(file);
    const previewUrl = createStoryMediaPreviewUrl(file);
    done += 1;
    onProgress?.(done, total);
    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
      file,
      fileName: file.name,
      dateISO,
      matchesDay: false,
      previewUrl,
      relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath,
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
    picks: withMatch,
    targetDate,
    suggestedCaptureDateISO,
    matchedCount,
    exifCount,
  };
}

export async function scanPickedFilesForDay(
  fileList: FileList | File[],
  pageDateStr: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{
  /** Nur Fotos (keine MOV/MP4). */
  images: LocalPhotoPick[];
  /** MOV/MP4 — separat zur Galerie hinzufügen. */
  videos: LocalPhotoPick[];
  total: number;
  photoCount: number;
  videoCount: number;
  targetDate: string | null;
  suggestedCaptureDateISO: string | null;
  matchedCount: number;
  videoMatchedCount: number;
  exifCount: number;
}> {
  const all = Array.from(fileList).filter(isLikelyStoryMediaFile);
  const photoFiles = all.filter((f) => !isLikelyVideoFile(f));
  const videoFiles = all.filter((f) => isLikelyVideoFile(f));

  let progressDone = 0;
  const progressTotal = all.length;
  const tick = () => {
    progressDone += 1;
    onProgress?.(progressDone, progressTotal);
  };

  const wrapProgress = (files: File[]) =>
    scanFileList(files, pageDateStr, files.length ? () => tick() : undefined);

  const [photoScan, videoScan] = await Promise.all([
    wrapProgress(photoFiles),
    wrapProgress(videoFiles),
  ]);

  const suggestedCaptureDateISO = pickDominantCaptureDateISO([
    ...photoScan.picks.map((x) => x.dateISO),
    ...videoScan.picks.map((x) => x.dateISO),
  ]);

  return {
    images: photoScan.picks,
    videos: videoScan.picks,
    total: all.length,
    photoCount: photoFiles.length,
    videoCount: videoFiles.length,
    targetDate: photoScan.targetDate,
    suggestedCaptureDateISO: suggestedCaptureDateISO ?? photoScan.suggestedCaptureDateISO,
    matchedCount: photoScan.matchedCount,
    videoMatchedCount: videoScan.matchedCount,
    exifCount: photoScan.exifCount + videoScan.exifCount,
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
