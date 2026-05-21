import { normalizeFolderPathInput } from './normalizeFolderPath';

export type ScannedPhotoItem = {
  relativePath: string;
  fileName: string;
  dateISO: string | null;
  size: number;
  previewUrl: string;
};

export type ScanPhotosResult = {
  root: string;
  targetDate: string | null;
  images: ScannedPhotoItem[];
  totalScanned: number;
  matchedCount: number;
};

export async function scanPhotosForDay(
  siteId: string,
  sourcePath: string,
  pageDateStr: string,
): Promise<ScanPhotosResult> {
  const res = await fetch(`/api/story-sites/${encodeURIComponent(siteId)}/scan-photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath: normalizeFolderPathInput(sourcePath), pageDateStr }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Scan fehlgeschlagen');
  }
  return data as ScanPhotosResult;
}

export async function importSelectedPhotos(
  siteId: string,
  sourcePath: string,
  pageDateStr: string,
  relativePaths: string[],
): Promise<string[]> {
  const res = await fetch(`/api/story-sites/${encodeURIComponent(siteId)}/import-photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourcePath: normalizeFolderPathInput(sourcePath),
      pageDateStr,
      relativePaths,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Import fehlgeschlagen');
  }
  return (data as { galleryUrls?: string[] }).galleryUrls ?? [];
}

export async function importPhotoFilesUpload(
  siteId: string,
  pageDateStr: string,
  files: File[],
): Promise<string[]> {
  const fd = new FormData();
  fd.append('pageDateStr', pageDateStr);
  for (const f of files) {
    fd.append('photos', f, f.name);
  }
  const res = await fetch(`/api/story-sites/${encodeURIComponent(siteId)}/import-photo-files`, {
    method: 'POST',
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Import fehlgeschlagen');
  }
  return (data as { galleryUrls?: string[] }).galleryUrls ?? [];
}
