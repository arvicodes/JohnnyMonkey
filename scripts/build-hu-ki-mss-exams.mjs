/**
 * Erzeugt HU_KI MSS 11/13 aus huKiMssExamSpecs und QZ-Shell.
 */
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientLib = path.join(__dirname, '../client/src/lib/examGridTaskBuilder.ts');
const specsLib = path.join(__dirname, '../client/src/lib/huKiMssExamSpecs.ts');
const outDir = path.join(__dirname, '../J-M-Reihen/Informatik/MSS Grundthemen/11-04 KI');
const shellPath = path.join(
  outDir,
  'QZ_KI 1 - Turing, Klassische KI, Verstärkendes Lernen & SnapAI.html',
);

const { buildExamGridTaskHtml } = await import(pathToFileURL(clientLib).href);
const { HU_KI_MSS_EXAMS, buildHuFieldPoints } = await import(pathToFileURL(specsLib).href);

const shell = readFileSync(shellPath, 'utf-8');

const mcScoreJs = `
        function parseMcLetterSet(raw) {
            const parts = Array.isArray(raw) ? raw.map(String) : [String(raw || '')];
            const letters = new Set();
            parts.forEach(function (p) {
                const s = String(p).trim();
                if (!s) return;
                if (/[|,;]/.test(s)) {
                    s.split(/[|,;/]/).forEach(function (x) {
                        const t = x.trim().toUpperCase();
                        if (/^[A-Z]$/.test(t)) letters.add(t);
                    });
                } else if (/^[A-Za-z]$/.test(s)) {
                    letters.add(s.toUpperCase());
                }
            });
            return Array.from(letters).sort();
        }

        function examUsesMcPartialScoring(expected) {
            const letters = parseMcLetterSet(expected);
            if (!letters.length) return false;
            if (letters.some(function (l) { return l === 'W' || l === 'F'; })) return false;
            return letters.every(function (l) { return /^[A-Z]$/.test(l); });
        }

        function mcScoreFraction(expected, student) {
            const manualList = Array.isArray(expected) ? expected : [expected];
            if (manualList.some(function (a) { return String(a) === '__manual__'; })) return 0;
            if (!examUsesMcPartialScoring(expected)) {
                return isCorrectMatch(expected, student) ? 1 : 0;
            }
            const correct = parseMcLetterSet(expected);
            if (!correct.length) return 0;
            const studentStr = String(student || '').trim();
            if (!studentStr) return 0;
            const studentSet = new Set();
            if (/[|,;]/.test(studentStr)) {
                studentStr.split(/[|,;/]/).forEach(function (x) {
                    const t = x.trim().toUpperCase();
                    if (/^[A-Z]$/.test(t)) studentSet.add(t);
                });
            } else if (/^[A-Za-z]$/.test(studentStr)) {
                studentSet.add(studentStr.toUpperCase());
            } else {
                return isCorrectMatch(expected, student) ? 1 : 0;
            }
            var right = 0;
            var wrong = 0;
            studentSet.forEach(function (l) {
                if (correct.indexOf(l) >= 0) right += 1;
                else wrong += 1;
            });
            return Math.max(0, (right - wrong) / correct.length);
        }

        function isCorrectMatch(accepted, value) {
            const n = normalizeAnswer(value);
            if (!n) return false;
            const list = Array.isArray(accepted) ? accepted : [accepted];
            return list.some(function (a) { return normalizeAnswer(a) === n; });
        }
`;

function replaceTask(html, n, built) {
  const re = new RegExp(
    `<!-- Aufgabe ${n}\\s*(?::[^>]*)?\\s*-->[\\s\\S]*?(?=<!-- Aufgabe \\d|<div class="submit-section">|<div class="footer">)`,
    'i',
  );
  if (!re.test(html)) throw new Error(`Aufgabe ${n} block not found`);
  return html.replace(re, `${built.taskHtml.trim()}\n\n`);
}

function removeTask3(html) {
  const re =
    /<!-- Aufgabe 3\s*(?::[^>]*)?\s*-->[\s\S]*?(?=<!-- Aufgabe \d|<div class="submit-section">|<div class="footer">)/i;
  return html.replace(re, '');
}

function formatAnswerKey(key) {
  return /^[a-zA-Z_$][\w$]*$/.test(key) ? key : `'${key.replace(/'/g, "\\'")}'`;
}

const HU_EXTRA_CSS = `
        .exam-wf-row {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            gap: 8px 12px;
        }
        .exam-wf-table {
            width: 100%;
            margin: 10px 0 14px;
            border-collapse: collapse;
            font-size: 13px;
        }
        .exam-wf-table th,
        .exam-wf-table td {
            border: 1px solid #333;
            padding: 6px 8px;
            vertical-align: middle;
            text-align: left;
        }
        .exam-wf-table th:nth-child(1),
        .exam-wf-table-num {
            text-align: center;
            white-space: nowrap;
            width: 2.5em;
        }
        .exam-wf-table th:nth-child(3),
        .exam-wf-table th:nth-child(4) {
            text-align: center;
            width: 3.5em;
        }
        .exam-wf-table-choices {
            white-space: nowrap;
        }
        .exam-wf-table-choices .exam-mc-wf-inline {
            margin: 0;
            justify-content: center;
            width: 100%;
        }
        .exam-wf-table-text {
            line-height: 1.45;
        }
        .exam-chart-figure { margin: 6px 0 10px; }
        .exam-chart-figure img { max-width: 100%; height: auto; display: block; }
        .exam-chart-figure--compact { max-width: min(92%, 520px); }
        .exam-essay-input {
            display: block;
            width: 100%;
            min-height: 10em;
            padding: 8px 10px;
            border: 1px solid #333;
            border-radius: 4px;
            font-size: 13px;
            font-family: Arial, sans-serif;
            line-height: 1.45;
            resize: vertical;
        }
        .exam-essay-input:focus {
            outline: none;
            border-color: #E10600;
            box-shadow: 0 0 0 1px #E10600;
        }
        .exam-essay-block { margin-top: 10px; }
        .exam-q-value-table {
            width: auto;
            min-width: min(100%, 420px);
            margin: 8px 0 12px;
            border-collapse: collapse;
        }
        .exam-q-value-table th,
        .exam-q-value-table td {
            border: 1px solid #333;
            padding: 6px 10px;
            text-align: center;
        }
        .exam-q-value-table th:first-child,
        .exam-q-value-table td:first-child {
            text-align: left;
        }
`;

function patchGeneratedHtml(html) {
  let out = html;
  if (!out.includes('.exam-wf-table')) {
    out = out.replace('</style>', `${HU_EXTRA_CSS}\n    </style>`);
  }
  out = out.replace(
    /(\s+function parseMcLetterSet\([\s\S]*?function isCorrect\(id, value\)[\s\S]*?\n        \}\s*)+/g,
    `${mcScoreJs}
        function isCorrect(id, value) {
            const accepted = correctAnswers[id] || [];
            return mcScoreFraction(accepted, value) >= 1 - 1e-9;
        }
`,
  );
  out = out.replace(/<\/body>\s*\n<\/html>`;/g, '<\\/body>\\n<\\/html>`;');
  return out;
}

function applyExamMeta(html, exam) {
  const task1 = exam.task1();
  const task2 = exam.task2();
  let out = replaceTask(html, 1, buildExamGridTaskHtml(task1));
  out = replaceTask(out, 2, buildExamGridTaskHtml(task2));
  out = removeTask3(out);

  const allAnswers = {
    ...buildExamGridTaskHtml(task1).correctAnswers,
    ...buildExamGridTaskHtml(task2).correctAnswers,
  };

  const answerLines = Object.entries(allAnswers)
    .map(([k, vals]) => {
      const inner = vals
        .map((x) => `'${String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
        .join(', ');
      return `            ${formatAnswerKey(k)}: [${inner}],`;
    })
    .join('\n');

  out = out.replace(
    /const correctAnswers = \{[\s\S]*?\};/,
    `const correctAnswers = {\n${answerLines}\n        };`,
  );

  const fieldPoints = buildHuFieldPoints(Object.keys(allAnswers), exam.scoringVariant);
  const fieldPointsJson = JSON.stringify(fieldPoints);
  const weightedTotal = Object.values(fieldPoints).reduce((s, n) => s + n, 0);

  out = out.replace(
    /function calculatePoints\(\) \{[\s\S]*?return \{ achieved: Math\.round\(achievedPoints \* 100\) \/ 100, total: \d+ \};\n        \}/,
    `const EXAM_FIELD_POINTS = ${fieldPointsJson};
        const EXAM_TOTAL_POINTS = ${weightedTotal};
        function calculatePoints() {
            let achievedPoints = 0;
            Object.keys(EXAM_FIELD_POINTS).forEach(function (id) {
                const max = EXAM_FIELD_POINTS[id] || 0;
                if (!max) return;
                const frac = mcScoreFraction(correctAnswers[id], getAnswerValue(id));
                achievedPoints += max * frac;
            });
            return { achieved: Math.round(achievedPoints * 100) / 100, total: EXAM_TOTAL_POINTS };
        }`,
  );

  out = out.replace(/id="totalPoints"[^>]*>\d+</, `id="totalPoints">${weightedTotal}<`);

  out = out.replace(
    /function getAnswerValue\(id\) \{[\s\S]*?\n        \}/,
    `function getAnswerValue(id) {
            const input = document.getElementById(id);
            if (input) {
                if (input.tagName === 'TEXTAREA' || input.type === 'text' || input.type === 'number') {
                    return input.value || '';
                }
            }
            const radio = document.querySelector(\`input[name="\${id}"]:checked\`);
            if (radio) return radio.value || '';
            return '';
        }`,
  );

  out = out.replace(/let timeLeft = \d+ \* 60;/, 'let timeLeft = 20 * 60;');

  const key = exam.key;
  out = out.replace(/const KA_KEY = '[^']*'/g, `const KA_KEY = '${key}'`);
  out = out.replace(
    /<title>[^<]*<\/title>/,
    `<title>${exam.title}</title>`,
  );
  out = out.replace(
    /<div class="header-title">[^<]*<\/div>/,
    `<div class="header-title">${exam.shortTitle}</div>`,
  );
  out = out.replace(
    /<div class="header-class">[^<]*<\/div>/,
    `<div class="header-class">${exam.mssClass}</div>`,
  );
  out = out.replace(/id="aidsTime"[^>]*>[^<]*</, 'id="aidsTime" contenteditable="false">20 Min<');

  out = patchGeneratedHtml(out);

  return { html: out, fieldCount: Object.keys(allAnswers).length, totalPoints: weightedTotal };
}

for (const exam of HU_KI_MSS_EXAMS) {
  const { html, fieldCount, totalPoints } = applyExamMeta(shell, exam);
  const outPath = path.join(outDir, exam.fileName);
  writeFileSync(outPath, html, 'utf-8');
  console.log('OK', outPath, fieldCount, 'fields', totalPoints, 'Punkte');
}
