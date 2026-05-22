import { readCaptureDateISOFromFile, pickDominantCaptureDateISO } from './photoCaptureDate';
import { parseStoryPageDate } from './storyPageDate';
import { scanPickedFilesForDay, revokeLocalPhotoPreviews } from './scanLocalPhotoFiles';
import { importPhotoFilesUpload } from './storySitePhotoImport';

export type ImportErasmusFolderResult =
  | { ok: true; urls: string[]; captureDateISO: string | null; matchedCount: number; total: number }
  | { ok: false; message: string; showPicker?: boolean };

/** Ordner-Fotos scannen und passende direkt importieren (ohne Browser-„Hochladen?“-Dialog). */
export async function importErasmusPhotosFromFolderFiles(
  siteId: string,
  pageDateStr: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportErasmusFolderResult> {
  if (!files.length) {
    return { ok: false, message: 'Keine Bilddateien im Ordner.' };
  }

  const result = await scanPickedFilesForDay(files, pageDateStr, onProgress);
  const toImport = result.images.filter((i) => i.matchesDay);

  if (!toImport.length) {
    if (result.exifCount === 0) {
      return {
        ok: false,
        message: `Von ${result.total} Bildern hat keines EXIF-Aufnahmedaten.`,
        showPicker: true,
      };
    }
    return {
      ok: false,
      message: 'Keine Fotos passen zum Unterseiten-Datum.',
      showPicker: true,
    };
  }

  revokeLocalPhotoPreviews(toImport);
  const uploadFiles = toImport.map((p) => p.file).filter((f): f is File => !!f);
  if (!uploadFiles.length) {
    return { ok: false, message: 'Keine importierbaren Dateien.', showPicker: true };
  }
  const urls = await importPhotoFilesUpload(siteId, pageDateStr, uploadFiles);
  const dates = await Promise.all(uploadFiles.map((f) => readCaptureDateISOFromFile(f)));
  const captureDateISO =
    pickDominantCaptureDateISO(dates) ?? toImport.find((p) => p.dateISO)?.dateISO ?? null;

  return {
    ok: true,
    urls,
    captureDateISO,
    matchedCount: toImport.length,
    total: result.total,
  };
}

export function shouldApplyExifPageDate(pageDateStr: string, captureDateISO: string | null): boolean {
  return !!captureDateISO && !parseStoryPageDate(pageDateStr);
}
