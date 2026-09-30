/**
 * Baut QZ_KI 1 aus ki1ExamTask1–3 und examGridTaskBuilder.
 */
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientLib = path.join(__dirname, '../client/src/lib/examGridTaskBuilder.ts');

const { buildExamGridTaskHtml, ki1QuizTask1, ki1QuizTask2, ki1QuizTask3 } = await import(
  pathToFileURL(clientLib).href
);

const qzPath = path.join(
  __dirname,
  '../J-M-Reihen/Informatik/MSS Grundthemen/11-04 KI/QZ_KI 1 - Turing, Klassische KI, Verstärkendes Lernen & SnapAI.html',
);

const task1 = buildExamGridTaskHtml(ki1QuizTask1());
const task2 = buildExamGridTaskHtml(ki1QuizTask2());
const task3 = buildExamGridTaskHtml(ki1QuizTask3());

const allAnswers = {
  ...task1.correctAnswers,
  ...task2.correctAnswers,
  ...task3.correctAnswers,
};

let html = readFileSync(qzPath, 'utf-8');

const replaceTask = (n, built) => {
  const re = new RegExp(
    `<!-- Aufgabe ${n}\\s*(?::[^>]*)?\\s*-->[\\s\\S]*?(?=<!-- Aufgabe \\d|<div class="submit-section">|<div class="footer">)`,
    'i',
  );
  if (!re.test(html)) throw new Error(`Aufgabe ${n} block not found`);
  html = html.replace(re, `${built.taskHtml.trim()}\n\n`);
};

replaceTask(1, task1);
replaceTask(2, task2);
replaceTask(3, task3);

const answerLines = Object.entries(allAnswers)
  .map(([k, vals]) => {
    const inner = vals
      .map((x) => `'${String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
      .join(', ');
    return `            ${k}: [${inner}],`;
  })
  .join('\n');

html = html.replace(
  /const correctAnswers = \{[\s\S]*?\};/,
  `const correctAnswers = {\n${answerLines}\n        };`,
);

const totalPoints = 5 + 14 + 14;
html = html.replace(/id="totalPoints"[^>]*>\d+</, `id="totalPoints">${totalPoints}<`);
html = html.replace(
  /return \{ achieved: achievedPoints, total: \d+ \};/,
  `return { achieved: achievedPoints, total: ${totalPoints} };`,
);

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

if (!html.includes('function mcScoreFraction')) {
  html = html.replace(
    /function isCorrect\(id, value\) \{[\s\S]*?\n        \}/,
    `${mcScoreJs}
        function isCorrect(id, value) {
            const accepted = correctAnswers[id] || [];
            return mcScoreFraction(accepted, value) >= 1 - 1e-9;
        }`,
  );
} else {
  html = html.replace(
    /function isCorrect\(id, value\) \{[\s\S]*?\n        \}/,
    `${mcScoreJs}
        function isCorrect(id, value) {
            const accepted = correctAnswers[id] || [];
            return mcScoreFraction(accepted, value) >= 1 - 1e-9;
        }`,
  );
}

html = html.replace(
  /function calculatePoints\(\) \{[\s\S]*?return \{ achieved: achievedPoints, total: \d+ \};\n        \}/,
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

writeFileSync(qzPath, html, 'utf-8');
console.log('OK', qzPath, Object.keys(allAnswers).length, 'fields');
