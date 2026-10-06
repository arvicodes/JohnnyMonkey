import { getApiBaseUrlForNavigation } from './api';

/** URL zum Anzeigen einer Prüfungs-HTML (mit Server-Transform + Dollar-Skripte). */
export function examReadHtmlUrl(
  filePath: string,
  extraQuery?: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams({ filePath: String(filePath || '') });
  if (extraQuery) {
    Object.entries(extraQuery).forEach(([key, val]) => {
      if (val != null && val !== '') params.set(key, String(val));
    });
  }
  const rel = `/api/file-system-paths/read-html?${params.toString()}`;
  const base = getApiBaseUrlForNavigation();
  return base ? `${base}${rel}` : rel;
}

/** Neuer Tab — kein Blob (sonst laden /exam-dollar-commands.js und /api/… nicht). */
export function openExamHtmlInNewTab(
  filePath: string,
  extraQuery?: Record<string, string | number | undefined>,
): boolean {
  const url = examReadHtmlUrl(filePath, extraQuery);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  return !!(w && !w.closed);
}
