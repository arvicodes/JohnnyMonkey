/** Aufgabenkörper wurde im Raster-/Stack-Editor gespeichert. */
export function taskBodyUsesGridEditor(body: string): boolean {
  return (
    body.includes('exam-task-grid') ||
    body.includes('exam-task-stack') ||
    body.includes('exam-task-flow') ||
    body.includes('data-exam-flow=') ||
    body.includes('data-exam-spec=')
  );
}

/** Johnny-Standardvorlage: Shell + Dollar-Compose (noch ohne data-exam-spec). */
export function isStandardTemplateExamHtml(html: string): boolean {
  return (
    /class=["']exam-shell["']/i.test(html) &&
    (html.includes('exam-dollar-live-edit') || html.includes('id="examChromeComposeMount"'))
  );
}

export function listExamTaskNumbersFromHtml(html: string): number[] {
  const nums = new Set<number>();
  const re = /<!-- Aufgabe (\d+)\s*(?::[^>]*)?\s*-->/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > 0) nums.add(n);
  }
  return [...nums].sort((a, b) => a - b);
}

export function resolveGridTaskNumbers(html: string): number[] {
  const gridTaskNumbers: number[] = [];
  const gridTaskRe =
    /<!-- Aufgabe (\d+)\s*(?::[^>]*)?\s*-->([\s\S]*?)(?=<!-- Aufgabe \d|<div class="submit-section">|<div class="footer">|$)/gi;
  let gridMatch: RegExpExecArray | null;
  while ((gridMatch = gridTaskRe.exec(html)) !== null) {
    const n = parseInt(gridMatch[1], 10);
    const body = gridMatch[2];
    if (taskBodyUsesGridEditor(body) && !Number.isNaN(n)) {
      gridTaskNumbers.push(n);
    }
  }
  gridTaskNumbers.sort((a, b) => a - b);
  if (gridTaskNumbers.length === 0 && isStandardTemplateExamHtml(html)) {
    return listExamTaskNumbersFromHtml(html);
  }
  return gridTaskNumbers;
}

export function isCorrectionExamFileName(name: string): boolean {
  return /^(KA|KU|HU|QZ)_/i.test(String(name || '').trim());
}

export function isCorrectionExamPath(filePath: string): boolean {
  const base = String(filePath || '').replace(/\\/g, '/').split('/').pop() || '';
  return isCorrectionExamFileName(base);
}
