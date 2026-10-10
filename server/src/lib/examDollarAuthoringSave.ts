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
      (_match, open, _old, close) => `${open}${safe}${close}`,
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
  meta: { aidsTime?: string; aidsTools?: string; aidsGeneralRules?: string },
): string {
  let out = html;
  if (meta.aidsTime != null) {
    const t = escapeSpanText(meta.aidsTime.trim());
    out = out.replace(
      /(<span class="aids-val" id="aidsTime"[^>]*>)[^<]*(<\/span>)/i,
      (_m, open, close) => `${open}${t}${close}`,
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
      (_m, open, close) => `${open}${tools}${close}`,
    );
  }
  if (meta.aidsGeneralRules != null) {
    const plainRules = meta.aidsGeneralRules.trim();
    const rulesHtml =
      formatAidsGeneralRulesDisplayHtml(plainRules) || escapeSpanText(plainRules);
    out = out.replace(
      /(<span class="aids-val[^"]*" id="aidsGeneralRules"[^>]*>)[\s\S]*?(<\/span>)/i,
      (_m, open, close) => `${open}${rulesHtml}${close}`,
    );
  }
  return out;
}

const AIDS_GENERAL_RULES_ROW = `            <div class="aids-row aids-row--rules">
                <span class="aids-key">Allgemeine Regeln:</span>
                <span class="aids-val aids-val-rules" id="aidsGeneralRules" contenteditable="false" title="Lehrer: Klicken zum Bearbeiten"></span>
            </div>
`;

/** „Allgemeine Regeln“ unter Hilfsmittel (ältere Prüfungs-HTML). */
export function patchExamAidsGeneralRulesMarkup(html: string): string {
  if (!/class=["'][^"']*aids-box/i.test(html)) return html;
  if (html.includes('id="aidsGeneralRules"')) return html;
  return html.replace(
    /(<span class="aids-val" id="aidsTools"[^>]*>[\s\S]*?<\/span>\s*\r?\n\s*<\/div>)/i,
    `$1\n${AIDS_GENERAL_RULES_ROW}`,
  );
}

function escapeRulesHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Sternchen-/Strich-Zeilen in „Allgemeine Regeln“ als Liste (Auslieferung). */
function expandAidsRulesPlainLines(plain: string): string[] {
  const lines: string[] = [];
  String(plain || '')
    .replace(/\r/g, '')
    .replace(/\uFEFF/g, '')
    .split(/\n+/)
    .forEach((line) => {
      line.split(/(?=\*\s)/).forEach((part) => {
        const t = part.trim();
        if (t) lines.push(t);
      });
    });
  return lines;
}

function escapeRulesAttr(text: string): string {
  return escapeRulesHtml(text).replace(/"/g, '&quot;');
}

export function formatAidsGeneralRulesDisplayHtml(plain: string): string {
  const items: { marker: string; text: string }[] = [];
  expandAidsRulesPlainLines(plain).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const star = trimmed.match(/^\*(?:\s+)?([\s\S]*)$/);
    if (star) {
      const text = star[1]?.trim();
      if (text) items.push({ marker: '*', text });
      return;
    }
    const dash = trimmed.match(/^-(?:\s+)?([\s\S]*)$/);
    if (dash) {
      const text = dash[1]?.trim();
      if (text) items.push({ marker: '-', text });
      return;
    }
    items.push({ marker: '', text: trimmed });
  });
  if (!items.length) return '';
  return (
    '<ul class="aids-general-rules-list">' +
    items
      .map((item) => {
        const src = ` data-jm-source="${escapeRulesAttr(item.text)}"`;
        if (!item.marker) {
          return `<li class="aids-general-rules-list__no-marker"${src}>${escapeRulesHtml(item.text)}</li>`;
        }
        return `<li${src}>${escapeRulesHtml(item.text)}</li>`;
      })
      .join('') +
    '</ul>'
  );
}

export function patchAidsGeneralRulesListDisplay(html: string): string {
  if (!html.includes('id="aidsGeneralRules"')) return html;
  return html.replace(
    /(<span class="aids-val aids-val-rules" id="aidsGeneralRules"[^>]*>)([\s\S]*?)(<\/span>)/i,
    (_m, open, content, close) => {
      const plain = extractAidsGeneralRulesPlain(content);
      if (!plain) return _m;
      const list = formatAidsGeneralRulesDisplayHtml(plain);
      if (!list) return _m;
      return `${open}${list}${close}`;
    },
  );
}

function extractAidsGeneralRulesPlain(content: string): string {
  const raw = String(content || '');
  if (/<ul\b[^>]*aids-general-rules-list/i.test(raw)) {
    const items: string[] = [];
    raw.replace(/<li\b([^>]*)>([\s\S]*?)<\/li>/gi, (_m, attrs, body) => {
      const srcM = String(attrs || '').match(/data-jm-source=["']([^"']*)["']/i);
      let text = srcM ? srcM[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&') : '';
      if (!text) {
        text = String(body)
          .replace(/<[^>]+>/g, '')
          .trim();
      }
      const noMarker = /aids-general-rules-list__no-marker/i.test(String(attrs || ''));
      if (text) items.push(noMarker ? text : `* ${text}`);
      return '';
    });
    if (items.length) return items.join('\n\n');
  }
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\uFEFF/g, '')
    .trim();
}

/** Regeln-Zeile: Überschrift oben, Liste volle Breite darunter. */
export function patchExamAidsRulesRowLayout(html: string): string {
  if (!html.includes('aids-row--rules')) return html;
  if (html.includes('aids-key--rules')) return html;
  return html.replace(
    /(<div class="aids-row aids-row--rules">\s*)<span class="aids-key">Allgemeine Regeln:<\/span>/i,
    '$1<span class="aids-key aids-key--rules">Allgemeine Regeln:</span>',
  );
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

const FORMULATION_ALT_MARKER = 'data-jm-exam-formulation-alt-init';

/** Setzt globale Dollar-Variante (0 = Standard, 1 = A1, 2 = A2) beim Laden. */
export function injectFormulationAltForClient(html: string, altIndex: string): string {
  const idx = String(altIndex ?? '').trim();
  if (!idx || idx === '0' || html.includes(FORMULATION_ALT_MARKER)) return html;
  if (!/^[12]$/.test(idx)) return html;
  const token = '</body>';
  const at = html.lastIndexOf(token);
  const snippet = `<script ${FORMULATION_ALT_MARKER}="1">(function(){var a=${JSON.stringify(
    idx,
  )};function apply(){if(typeof window.setExamGlobalAltIndex==='function')window.setExamGlobalAltIndex(a);else document.body.setAttribute('data-jm-exam-alt-variant',a);}if(document.body)apply();else document.addEventListener('DOMContentLoaded',apply);})();</script>`;
  if (at === -1) return `${html}\n${snippet}`;
  return `${html.slice(0, at)}${snippet}\n${html.slice(at)}`;
}
