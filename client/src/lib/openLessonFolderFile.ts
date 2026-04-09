/**
 * Einheitliches Öffnen von Dateien aus Stundenordnern (Lehrer: Stundenansicht, Ordner-Zuordnung, …).
 * Entspricht dem Verhalten bei z. B. „Battleground“ in 6.01 Ritterduell: kein HTML-Konvertierungs-Modal für Office,
 * PDF/PPTX/Bild/DOCX → Folien-Editor, sonstige Office/Text → Download, HTML → echter Tab (bei Popup-Block: gleicher Tab).
 */

export type LessonFolderFileLike = { type: string; name: string; path: string };

export interface OpenLessonFolderFileOptions {
  /** KA_/HÜ_/HU_/QZ_ + .html/.htm → Lehrer-Korrekturmodus (nur TeacherDashboard). */
  onOpenCorrectionHtml?: (filePath: string) => void;
}

export function isLessonCorrectionFileName(fileName: string): boolean {
  return (
    fileName.startsWith('KA_') ||
    fileName.startsWith('HÜ_') ||
    fileName.startsWith('HU_') ||
    fileName.startsWith('QZ_')
  );
}

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

/**
 * Öffnet eine Datei aus dem Stundenordner — überall dieselbe Strategie wie in der Stunden-Materialzeile.
 */
export async function openLessonFolderFile(
  item: LessonFolderFileLike,
  options: OpenLessonFolderFileOptions = {}
): Promise<void> {
  if (item.type !== 'file') return;

  const fileExtension = item.name.split('.').pop()?.toLowerCase();

  if (
    (fileExtension === 'html' || fileExtension === 'htm') &&
    isLessonCorrectionFileName(item.name) &&
    options.onOpenCorrectionHtml
  ) {
    options.onOpenCorrectionHtml(item.path);
    return;
  }

  if (fileExtension === 'html' || fileExtension === 'htm') {
    try {
      const response = await fetch(`/api/file-system-paths/read-html?filePath=${encodeURIComponent(item.path)}`);
      if (!response.ok) return;
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      if (!tryOpenInNewTab(url)) {
        window.location.assign(url);
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) {
      console.error('Fehler beim Laden der HTML-Datei:', e);
      alert('HTML-Datei konnte nicht geöffnet werden.');
    }
    return;
  }

  if (fileExtension === 'pdf') {
    const url = `/folien-editor?filePath=${encodeURIComponent(item.path)}&fileName=${encodeURIComponent(item.name || 'document.pdf')}`;
    if (!tryOpenInNewTab(url)) window.location.assign(url);
    return;
  }

  if (fileExtension === 'docx') {
    const url = `/folien-editor?filePath=${encodeURIComponent(item.path)}&fileName=${encodeURIComponent(item.name || 'dokument.docx')}&source=docx`;
    if (!tryOpenInNewTab(url)) window.location.assign(url);
    return;
  }

  if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    try {
      const dl = `/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`;
      if (!tryOpenInNewTab(dl)) window.location.assign(dl);
    } catch (e) {
      console.error('Fehler beim Öffnen der Excel-Datei:', e);
      alert('Excel-Datei konnte nicht geöffnet werden.');
    }
    return;
  }

  if (fileExtension === 'pptx' || fileExtension === 'ppt') {
    const url = `/folien-editor?filePath=${encodeURIComponent(item.path)}&fileName=${encodeURIComponent(item.name || 'folien.pptx')}&source=pptx`;
    if (!tryOpenInNewTab(url)) window.location.assign(url);
    return;
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(fileExtension || '')) {
    const url = `/folien-editor?filePath=${encodeURIComponent(item.path)}&fileName=${encodeURIComponent(item.name || 'bild.png')}&source=image`;
    if (!tryOpenInNewTab(url)) window.location.assign(url);
    return;
  }

  if (fileExtension === 'goodnotes' || fileExtension === 'gn') {
    try {
      const dl = `/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`;
      if (!tryOpenInNewTab(dl)) window.location.assign(dl);
    } catch (e) {
      console.error('Fehler beim Öffnen der GoodNotes-Datei:', e);
      alert('GoodNotes-Datei konnte nicht geöffnet werden.');
    }
    return;
  }

  if (fileExtension === 'wb') {
    const fileName = item.name.replace(/\.wb$/i, '');
    const whiteboardUrl = `/whiteboard?loadFile=${encodeURIComponent(item.path)}&filename=${encodeURIComponent(fileName)}`;
    if (!tryOpenInNewTab(whiteboardUrl)) window.location.assign(whiteboardUrl);
    return;
  }

  if (['txt', 'md', 'rtf'].includes(fileExtension || '')) {
    try {
      const dl = `/api/file-system-paths/download?filePath=${encodeURIComponent(item.path)}`;
      if (!tryOpenInNewTab(dl)) window.location.assign(dl);
    } catch (e) {
      console.error('Fehler beim Öffnen der Textdatei:', e);
      alert('Textdatei konnte nicht geöffnet werden.');
    }
    return;
  }

  try {
    await downloadViaBrowser(item.path, item.name);
  } catch (e) {
    console.error('Fehler beim Download:', e);
    alert('Datei konnte nicht heruntergeladen werden.');
  }
}
