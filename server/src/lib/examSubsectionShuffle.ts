import { injectExamTimerTeacherBridge } from './examTimerTeacherBridge';

/**
 * Schüler: Teile innerhalb jeder Aufgabe (exam-subsection / Rasterzellen) pro SuS
 * deterministisch mischen — Aufgaben 1/2/3 bleiben in fester Reihenfolge.
 */

export const EXAM_SUBSECTION_SHUFFLE_MARKER = 'data-jm-exam-subsection-shuffle';

export function isDeliverableExamHtml(html: string, filePath?: string): boolean {
  const fp = (filePath || '').replace(/\\/g, '/');
  const base = fp.split('/').pop() || '';
  if (/^(KA_|KU_|HÜ_|HU_|QZ_)/i.test(base)) return true;
  if (html.includes('const KA_KEY =') && html.includes('correctAnswers')) return true;
  if (/class=["']exam-shell["']/i.test(html)) return true;
  return false;
}

/** IIFE-Body: definiert setupExamSubsectionShuffleForStudent() (ES5). */
export const EXAM_SUBSECTION_SHUFFLE_FUNCTION = `
        function setupExamSubsectionShuffleForStudent() {
            if (localStorage.getItem('teacherId') !== null) return;
            var studentId = localStorage.getItem('studentId') || localStorage.getItem('loginCode') || 'anonymous';
            var examKey = typeof KA_KEY !== 'undefined' ? String(KA_KEY) : (document.title || 'exam');
            var seedStr = studentId + '|' + examKey + '|subsection-order-v1';

            function hashSeed(s) {
                var h = 2166136261;
                for (var i = 0; i < s.length; i++) {
                    h ^= s.charCodeAt(i);
                    h = Math.imul(h, 16777619);
                }
                return h >>> 0;
            }
            function mulberry32(a) {
                return function () {
                    a |= 0;
                    a = (a + 0x6d2b79f5) | 0;
                    var t = Math.imul(a ^ (a >>> 15), 1 | a);
                    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            }
            function shuffleInPlace(arr, rng) {
                for (var i = arr.length - 1; i > 0; i--) {
                    var j = Math.floor(rng() * (i + 1));
                    var tmp = arr[i];
                    arr[i] = arr[j];
                    arr[j] = tmp;
                }
            }

            var taskIndex = 0;
            document.querySelectorAll('.task').forEach(function (taskEl) {
                taskIndex += 1;
                var rng = mulberry32(hashSeed(seedStr + '|task-' + taskIndex));

                var wfTableBody = taskEl.querySelector('.exam-wf-table tbody');
                if (wfTableBody) {
                    var tableRows = Array.prototype.slice.call(
                        wfTableBody.querySelectorAll(':scope > tr'),
                    );
                    if (tableRows.length > 1) {
                        shuffleInPlace(tableRows, rng);
                        tableRows.forEach(function (el) {
                            wfTableBody.appendChild(el);
                        });
                    }
                }

                var stack = taskEl.querySelector('.exam-task-stack');
                if (stack && !wfTableBody && !stack.getAttribute('data-exam-fixed-subsection-order')) {
                    var subs = Array.prototype.slice.call(
                        stack.querySelectorAll(':scope > .exam-subsection'),
                    );
                    if (subs.length > 1) {
                        shuffleInPlace(subs, rng);
                        subs.forEach(function (el) {
                            stack.appendChild(el);
                        });
                    }
                }

                var flow = taskEl.querySelector('.exam-task-flow');
                if (flow) {
                    var flowParts = Array.prototype.slice.call(
                        flow.querySelectorAll(':scope > .exam-subsection'),
                    );
                    if (flowParts.length > 1) {
                        shuffleInPlace(flowParts, rng);
                        flowParts.forEach(function (el) {
                            flow.appendChild(el);
                        });
                    }
                }

                var grid = taskEl.querySelector('.exam-task-grid');
                if (grid) {
                    var cells = Array.prototype.slice.call(
                        grid.querySelectorAll(':scope > .exam-task-grid-cell'),
                    );
                    if (cells.length > 1) {
                        shuffleInPlace(cells, rng);
                        cells.forEach(function (el) {
                            grid.appendChild(el);
                        });
                    }
                }

                taskEl.querySelectorAll('.exam-wf-group').forEach(function (group) {
                    var rows = Array.prototype.slice.call(group.querySelectorAll(':scope > .exam-wf-row'));
                    if (rows.length > 1) {
                        shuffleInPlace(rows, rng);
                        rows.forEach(function (el) {
                            group.appendChild(el);
                        });
                    }
                });
            });
        }
`.trim();

const INIT_HOOK =
  'setupExamSubsectionShuffleForStudent();\n        attachInputListeners();';

/** SuS dürfen während der Bearbeitung keine Live-Punkte/Note im Footer sehen. */
export const EXAM_HIDE_LIVE_SCORE_MARKER = 'data-jm-hide-live-exam-scores';

const EXAM_HIDE_LIVE_SCORE_SCRIPT = `<script ${EXAM_HIDE_LIVE_SCORE_MARKER}="1">
(function(){
  function isTeacherExamView(){try{return localStorage.getItem('teacherId')!==null;}catch(e){return false;}}
  function hideScoreFooter(){
    var pd=document.getElementById('pointsDisplay');
    var nl=document.querySelector('.footer-note-line');
    if(pd)pd.style.display='none';
    if(nl)nl.style.display='none';
  }
  function patch(){
    if(isTeacherExamView())return;
    hideScoreFooter();
    if(typeof updatePointsDisplay!=='function')return;
    if(updatePointsDisplay.__jmHideLiveScores)return;
    updatePointsDisplay=function(){hideScoreFooter();};
    updatePointsDisplay.__jmHideLiveScores=true;
  }
  patch();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',patch);
  setTimeout(patch,0);
  setTimeout(patch,50);
})();
</script>`;

/** Nur das dokument-eigene </body> — nicht Vorkommen in JS-Strings (z. B. generatePrintVersion). */
function injectBeforeLastBodyClose(html: string, snippet: string): string {
  const token = '</body>';
  const idx = html.lastIndexOf(token);
  if (idx === -1) return `${html}\n${snippet}`;
  return `${html.slice(0, idx)}${snippet}\n${html.slice(idx)}`;
}

function injectHideLiveScoreForStudents(html: string): string {
  if (html.includes(EXAM_HIDE_LIVE_SCORE_MARKER)) return html;
  return injectBeforeLastBodyClose(html, EXAM_HIDE_LIVE_SCORE_SCRIPT);
}

export const EXAM_DOLLAR_SCRIPT_MARKER = 'data-jm-exam-dollar-script';

const EXAM_DOLLAR_BOOT_SNIPPET = `<script src="/exam-dollar-commands.js" ${EXAM_DOLLAR_SCRIPT_MARKER}="1"></script>
<script ${EXAM_DOLLAR_SCRIPT_MARKER}-init="1">
(function(){
  function boot(){
    if (typeof setupExamDollarAuthoring === 'function') setupExamDollarAuthoring();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;

function injectExamDollarAuthoring(html: string): string {
  if (html.includes(EXAM_DOLLAR_SCRIPT_MARKER)) return html;
  return injectBeforeLastBodyClose(html, EXAM_DOLLAR_BOOT_SNIPPET);
}

export const EXAM_CHROME_SCRIPT_MARKER = 'data-jm-exam-chrome-script';

const EXAM_CHROME_CLOCK_BTN =
  '<button type="button" class="exam-chrome-clock-btn teacher-only" id="examTimerToggle" aria-expanded="false" title="Bearbeitungszeit ein- oder ausblenden">🕐</button>';

const EXAM_PAPER_COMPOSE_MOUNT =
  '<div id="examPaperComposeMount" class="teacher-only" aria-label="Neue Aufgabe"></div>';

/** Uhr-Button in der linken Leiste (ältere Dateien). */
export function patchExamChromeMarkup(html: string): string {
  if (!/class=["'][^"']*exam-chrome/i.test(html)) return html;

  let out = html;
  if (!out.includes('id="examTimerToggle"')) {
    out = out.replace(
      /(<aside\b[^>]*\bclass=["'][^"']*exam-chrome[^"']*["'][^>]*>)/i,
      `$1\n        ${EXAM_CHROME_CLOCK_BTN}`,
    );
  }
  return out;
}

/** „+ Aufgabe“-Eingabe unter den Aufgaben im Blatt, nicht in der Sidebar. */
export function patchExamPaperComposeMarkup(html: string): string {
  if (!/class=["'][^"']*exam-paper/i.test(html)) return html;
  if (html.includes('id="examPaperComposeMount"')) return html;

  let out = html;
  if (out.includes('id="examChromeComposeMount"')) {
    out = out.replace(
      /\s*<div id="examChromeComposeMount"[^>]*><\/div>\s*/i,
      '\n',
    );
  }
  if (/<div class="footer"/i.test(out)) {
    out = out.replace(
      /(\s*)(<div class="footer")/i,
      `$1${EXAM_PAPER_COMPOSE_MOUNT}\n$1$2`,
    );
  }
  return out;
}

const EXAM_CHROME_BOOT_SNIPPET = `<script src="/exam-chrome.js" ${EXAM_CHROME_SCRIPT_MARKER}="1"></script>
<script ${EXAM_CHROME_SCRIPT_MARKER}-init="1">
(function(){
  function boot(){
    if (typeof setupExamChrome === 'function') setupExamChrome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
</script>`;

function injectExamChromeRuntime(html: string): string {
  if (html.includes(EXAM_CHROME_SCRIPT_MARKER)) return html;
  return injectBeforeLastBodyClose(html, EXAM_CHROME_BOOT_SNIPPET);
}

export function transformExamHtmlForDelivery(html: string, filePath?: string): string {
  if (!isDeliverableExamHtml(html, filePath)) return html;

  let out = html;
  if (out.includes('setupExamSubsectionShuffleForStudent')) {
    if (!out.includes('setupExamSubsectionShuffleForStudent();')) {
      out = out.replace(/\battachInputListeners\(\);/, INIT_HOOK);
    }
  } else {
    const initAnchor = out.match(/(\s*\/\/ Initialisierung\s*\r?\n\s*)attachInputListeners\(\);/);
    if (initAnchor) {
      out = out.replace(
        /(\s*\/\/ Initialisierung\s*\r?\n\s*)attachInputListeners\(\);/,
        `$1${INIT_HOOK}`,
      );
      const scriptInsert = `\n        /* ${EXAM_SUBSECTION_SHUFFLE_MARKER} */\n${EXAM_SUBSECTION_SHUFFLE_FUNCTION}\n`;
      const initIdx = out.indexOf('// Initialisierung');
      if (initIdx >= 0) {
        out = `${out.slice(0, initIdx)}${scriptInsert}${out.slice(initIdx)}`;
      }
    } else {
      const snippet = `<script ${EXAM_SUBSECTION_SHUFFLE_MARKER}="1">\n(function(){\n${EXAM_SUBSECTION_SHUFFLE_FUNCTION}\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', setupExamSubsectionShuffleForStudent);\n} else {\n  setupExamSubsectionShuffleForStudent();\n}\n})();\n</script>`;
      out = injectBeforeLastBodyClose(out, snippet);
    }
  }

  out = patchExamChromeMarkup(out);
  out = patchExamPaperComposeMarkup(out);
  out = injectExamChromeRuntime(out);
  out = injectExamDollarAuthoring(out);
  out = injectExamTimerTeacherBridge(out);
  return injectHideLiveScoreForStudents(out);
}
