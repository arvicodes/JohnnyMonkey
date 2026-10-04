/** Dollar-Autoreninhalt in Prüfungs-HTML persistieren (textarea.exam-dollar-source pro Aufgabe). */

const TASK_BLOCK_RE =
  /<!-- Aufgabe \d+\s*(?::[^>]*)?\s*-->[\s\S]*?(?=(?:<!-- Aufgabe \d)|(?:<div id="examPaperComposeMount")|(?:<div class="footer">)|$)/gi;

function escapeTextareaContent(source: string): string {
  return String(source || '').replace(/<\/textarea>/gi, '');
}

function setTaskSourceInBlock(block: string, source: string): string {
  const safe = escapeTextareaContent(source);
  if (/class=["'][^"']*exam-dollar-source/i.test(block)) {
    return block.replace(
      /(<textarea\b[^>]*\bclass=["'][^"']*exam-dollar-source[^"']*["'][^>]*>)([\s\S]*?)(<\/textarea>)/i,
      `$1${safe}$3`,
    );
  }
  const inject =
    `            <div class="exam-dollar-rendered" aria-live="polite"></div>\n` +
    `            <div class="exam-dollar-live-edit teacher-only" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true"></div>\n` +
    `            <textarea class="exam-dollar-source" hidden aria-hidden="true">${safe}</textarea>\n`;
  if (/<div class="task-content"/i.test(block)) {
    return block.replace(/(<div class="task-content"[^>]*>)/i, `$1\n${inject}`);
  }
  return block;
}

export function buildDollarTaskBlock(taskNumber: number, source: string): string {
  const safe = escapeTextareaContent(source);
  return `    <!-- Aufgabe ${taskNumber} -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${taskNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(… Punkte)</span></div>
            <div class="task-meta teacher-only">
                <div class="points">… Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <div class="exam-dollar-rendered" aria-live="polite"></div>
            <div class="exam-dollar-live-edit teacher-only" contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true"></div>
            <textarea class="exam-dollar-source" hidden aria-hidden="true">${safe}</textarea>
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>a) …</p>
            </div>
        </div>
    </div>

`;
}

function findTaskSectionBounds(html: string): { start: number; end: number } | null {
  const first = html.search(/<!-- Aufgabe \d+/i);
  if (first < 0) {
    const t = html.search(/<div class="task"/i);
    if (t < 0) return null;
    const endIdx = html.search(/<div id="examPaperComposeMount"/i);
    const footerIdx = html.search(/<div class="footer"/i);
    const end = endIdx >= 0 ? endIdx : footerIdx >= 0 ? footerIdx : html.length;
    return { start: t, end };
  }
  const endIdx = html.search(/<div id="examPaperComposeMount"/i);
  const footerIdx = html.search(/<div class="footer"/i);
  const end = endIdx >= 0 ? endIdx : footerIdx >= 0 ? footerIdx : html.length;
  return { start: first, end };
}

function escapeSpanText(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function parseMinutesFromAidsLabel(text: string): number | null {
  const m = String(text || '').match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0 || n > 599) return null;
  return n;
}

/** Zeit / Hilfsmittel in der Prüfungs-HTML (inkl. Timer-Startwert). */
export function syncExamHeaderMetaInHtml(
  html: string,
  meta: { aidsTime?: string; aidsTools?: string },
): string {
  let out = html;
  if (meta.aidsTime != null) {
    const t = escapeSpanText(meta.aidsTime.trim());
    out = out.replace(
      /(<span class="aids-val" id="aidsTime"[^>]*>)[^<]*(<\/span>)/i,
      `$1${t}$2`,
    );
    const mins = parseMinutesFromAidsLabel(meta.aidsTime);
    if (mins != null) {
      const timerLabel = `${mins}:00`;
      out = out.replace(
        /(<div class="timer-container" id="timer">)\s*[\s\S]*?(\s*<\/div>)/i,
        `$1\n            ${timerLabel}\n        $2`,
      );
      out = out.replace(
        /let timeLeft = \d+ \* 60;[^\n]*/i,
        `let timeLeft = ${mins} * 60; // ${mins} Minuten in Sekunden`,
      );
    }
  }
  if (meta.aidsTools != null) {
    const tools = escapeSpanText(meta.aidsTools.trim());
    out = out.replace(
      /(<span class="aids-val" id="aidsTools"[^>]*>)[^<]*(<\/span>)/i,
      `$1${tools}$2`,
    );
  }
  return out;
}

export function syncExamDollarTasksInHtml(html: string, sources: string[]): string {
  if (!sources.length) return html;

  const bounds = findTaskSectionBounds(html);
  if (!bounds) return html;

  const section = html.slice(bounds.start, bounds.end);
  const blocks = section.match(TASK_BLOCK_RE) || [];

  const updated: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (i < blocks.length) {
      updated.push(setTaskSourceInBlock(blocks[i], sources[i]));
    } else {
      updated.push(buildDollarTaskBlock(i + 1, sources[i]));
    }
  }

  const newSection = `${updated.join('\n')}\n`;
  return `${html.slice(0, bounds.start)}${newSection}${html.slice(bounds.end)}`;
}

export const EXAM_FILE_PATH_MARKER = 'data-jm-exam-file-path';

export function injectExamFilePathForClient(html: string, filePath: string): string {
  if (!filePath || html.includes(EXAM_FILE_PATH_MARKER)) return html;
  const token = '</body>';
  const idx = html.lastIndexOf(token);
  const snippet = `<script ${EXAM_FILE_PATH_MARKER}="1">window.__jmExamFilePath=${JSON.stringify(
    String(filePath),
  )};</script>`;
  if (idx === -1) return `${html}\n${snippet}`;
  return `${html.slice(0, idx)}${snippet}\n${html.slice(idx)}`;
}
