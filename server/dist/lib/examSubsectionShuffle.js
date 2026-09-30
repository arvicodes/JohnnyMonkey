"use strict";
/**
 * Schüler: Teile innerhalb jeder Aufgabe (exam-subsection / Rasterzellen) pro SuS
 * deterministisch mischen — Aufgaben 1/2/3 bleiben in fester Reihenfolge.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXAM_SUBSECTION_SHUFFLE_FUNCTION = exports.EXAM_SUBSECTION_SHUFFLE_MARKER = void 0;
exports.isDeliverableExamHtml = isDeliverableExamHtml;
exports.transformExamHtmlForDelivery = transformExamHtmlForDelivery;
exports.EXAM_SUBSECTION_SHUFFLE_MARKER = 'data-jm-exam-subsection-shuffle';
function isDeliverableExamHtml(html, filePath) {
    const fp = (filePath || '').replace(/\\/g, '/');
    const base = fp.split('/').pop() || '';
    if (/^(KA_|KU_|HÜ_|HU_|QZ_)/i.test(base))
        return true;
    if (html.includes('const KA_KEY =') && html.includes('correctAnswers'))
        return true;
    if (/class=["']exam-shell["']/i.test(html))
        return true;
    return false;
}
/** IIFE-Body: definiert setupExamSubsectionShuffleForStudent() (ES5). */
exports.EXAM_SUBSECTION_SHUFFLE_FUNCTION = `
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

                var stack = taskEl.querySelector('.exam-task-stack');
                if (stack) {
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
const INIT_HOOK = 'setupExamSubsectionShuffleForStudent();\n        attachInputListeners();';
function transformExamHtmlForDelivery(html, filePath) {
    if (!isDeliverableExamHtml(html, filePath))
        return html;
    if (html.includes('setupExamSubsectionShuffleForStudent')) {
        if (!html.includes('setupExamSubsectionShuffleForStudent();')) {
            return html.replace(/\battachInputListeners\(\);/, INIT_HOOK);
        }
        return html;
    }
    let out = html;
    const initAnchor = out.match(/(\s*\/\/ Initialisierung\s*\r?\n\s*)attachInputListeners\(\);/);
    if (initAnchor) {
        out = out.replace(/(\s*\/\/ Initialisierung\s*\r?\n\s*)attachInputListeners\(\);/, `$1${INIT_HOOK}`);
        const scriptInsert = `\n        /* ${exports.EXAM_SUBSECTION_SHUFFLE_MARKER} */\n${exports.EXAM_SUBSECTION_SHUFFLE_FUNCTION}\n`;
        const initIdx = out.indexOf('// Initialisierung');
        if (initIdx >= 0) {
            out = `${out.slice(0, initIdx)}${scriptInsert}${out.slice(initIdx)}`;
        }
        return out;
    }
    const snippet = `<script ${exports.EXAM_SUBSECTION_SHUFFLE_MARKER}="1">\n(function(){\n${exports.EXAM_SUBSECTION_SHUFFLE_FUNCTION}\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', setupExamSubsectionShuffleForStudent);\n} else {\n  setupExamSubsectionShuffleForStudent();\n}\n})();\n</script>`;
    if (out.includes('</body>')) {
        return out.replace('</body>', `${snippet}\n</body>`);
    }
    return `${out}\n${snippet}`;
}
//# sourceMappingURL=examSubsectionShuffle.js.map