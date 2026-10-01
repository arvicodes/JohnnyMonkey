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
const { HU_KI_MSS_EXAMS } = await import(pathToFileURL(specsLib).href);

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

function applyExamMeta(html, exam) {
  const task1 = exam.task1();
  const task2 = exam.task2();
  const totalPoints = task1.points + task2.points;

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
      return `            ${k}: [${inner}],`;
    })
    .join('\n');

  out = out.replace(
    /const correctAnswers = \{[\s\S]*?\};/,
    `const correctAnswers = {\n${answerLines}\n        };`,
  );

  out = out.replace(/id="totalPoints"[^>]*>\d+</, `id="totalPoints">${totalPoints}<`);
  out = out.replace(
    /return \{ achieved: achievedPoints, total: \d+ \};/,
    `return { achieved: achievedPoints, total: ${totalPoints} };`,
  );

  out = out.replace(
    /function isCorrect\(id, value\) \{[\s\S]*?\n        \}/,
    `${mcScoreJs}
        function isCorrect(id, value) {
            const accepted = correctAnswers[id] || [];
            return mcScoreFraction(accepted, value) >= 1 - 1e-9;
        }`,
  );

  out = out.replace(
    /function calculatePoints\(\) \{[\s\S]*?return \{ achieved: Math\.round\(achievedPoints \* 100\) \/ 100, total: \d+ \};\n        \}/,
    `function calculatePoints() {
            let achievedPoints = 0;
            const fieldMax = ${totalPoints} / Object.keys(correctAnswers).length;
            Object.keys(correctAnswers).forEach(function (id) {
                const frac = mcScoreFraction(correctAnswers[id], getAnswerValue(id));
                achievedPoints += fieldMax * frac;
            });
            return { achieved: Math.round(achievedPoints * 100) / 100, total: ${totalPoints} };
        }`,
  );

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

  return { html: out, fieldCount: Object.keys(allAnswers).length, totalPoints };
}

for (const exam of HU_KI_MSS_EXAMS) {
  const { html, fieldCount, totalPoints } = applyExamMeta(shell, exam);
  const outPath = path.join(outDir, exam.fileName);
  writeFileSync(outPath, html, 'utf-8');
  console.log('OK', outPath, fieldCount, 'fields', totalPoints, 'Punkte');
}
