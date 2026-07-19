import type { LessonFolderFileLike } from './openLessonFolderFile';
import {
  isJohnnyPresentationExportPdf,
  LESSON_PRESENTATION_PDF_ORIGINAL,
} from './presentationLessonAssets';
import { presentationReviewUrl, type PresentationViewerVariant } from './presentationDeck';

function tryOpenInNewTab(url: string): boolean {
  const w = window.open(url, '_blank');
  return !!(w && !w.closed);
}

async function downloadViaBrowser(filePath: string, downloadName: string): Promise<void> {
  const response = await fetch(`/api/file-system-paths/download?filePath=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error('download failed');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName || filePath.split('/').pop() || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function lessonPathFromMaterialFile(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
}

/** Schüler: PDF ansehen oder herunterladen — Johnny-Folien als Folienplayer (Pfeiltasten). */
export async function openStudentLessonMaterialFile(
  item: LessonFolderFileLike,
  mode: 'open' | 'download',
  options?: { downloadName?: string }
): Promise<void> {
  if (item.type !== 'file') return;
  const ext = item.name.split('.').pop()?.toLowerCase();

  if (mode === 'download') {
    await downloadViaBrowser(item.path, options?.downloadName || item.name);
    return;
  }

  // Johnny-Folien: Original ohne Striche; bearbeitet und benannte Versionen (z. B. 2026) live mit Strichen
  if (ext === 'pdf' && isJohnnyPresentationExportPdf(item.name)) {
    const lessonPath = lessonPathFromMaterialFile(item.path);
    const variant: PresentationViewerVariant =
      item.name === LESSON_PRESENTATION_PDF_ORIGINAL ? 'original' : 'edited';
    const url = `${presentationReviewUrl(lessonPath, undefined, variant)}&viewer=student`;
    if (!tryOpenInNewTab(url)) window.location.assign(url);
    return;
  }

  if (ext === 'pdf') {
    const url = `/api/file-system-paths/read-pdf?filePath=${encodeURIComponent(item.path)}`;
    if (!tryOpenInNewTab(url)) window.location.assign(url);
    return;
  }

  await downloadViaBrowser(item.path, item.name);
}
