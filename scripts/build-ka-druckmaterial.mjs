/**
 * Baut Aufgaben-HTML aus examGridTaskBuilder und schreibt Fragmente für KA-Datei.
 */
import { writeFileSync, readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildTasks234,
  EXAM_NUMBER_LINE_CSS,
  EXAM_NUMBER_LINE_JS,
} from './ka-druckmaterial-fragments.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientLib = path.join(__dirname, '../client/src/lib/examGridTaskBuilder.ts');

const { buildExamGridTaskHtml, druckmaterialKlassenarbeit1 } = await import(
  pathToFileURL(clientLib).href
);

const GIT_IMG =
  'git-intern/Mathe/Klasse 5/Kap 1 - Natürliche Zahlen und Größen/KA1-Druckmaterial';
const img = (file) =>
  `/api/file-system-paths/read-image?filePath=${encodeURIComponent(`${GIT_IMG}/${file}`)}`;

const task1 = buildExamGridTaskHtml(druckmaterialKlassenarbeit1());
const { task2, task3, task4 } = buildTasks234(img);

const extraAnswers = {
  a2a: ['25.10.1881', '25.10.81', '25.10.1881.'],
  a2b: ['15.4.1452', '15.04.1452'],
  a2f: ['50'],
  a2g: ['94'],
  a3a: ['66'],
  a3b: ['30.11.2010', '30.11.10', '30.11.2010.'],
  a3c: ['0,1,2,3,4,5,6,7', '0, 1, 2, 3, 4, 5, 6, 7', '01234567'],
  a3e1: ['0', ''],
  a3e2: ['0', ''],
  a3e3: ['1'],
  a3e4: ['4'],
  a3d: ['13'],
  a4a: ['180'],
  a4b: ['160'],
  a4c1: ['12'],
  a4c2: ['24'],
  a4c3: ['63'],
  a4c4: ['70'],
  a4c5: ['20'],
  a4d1: ['50800', '50 800', '50800'],
  a4d2: ['52600', '52 600', '52600'],
  a4d3: ['54300', '54 300', '54300'],
  a4d4: ['52400', '52 400'],
  a4d5: ['54640', '54 640'],
};

const allAnswers = { ...task1.correctAnswers, ...extraAnswers };

const kaPath = path.join(
  __dirname,
  '../J-M-Reihen/Mathe/Klasse 5/Kap 1 - Natürliche Zahlen und Größen/KA_Klassenarbeit 1: Natürliche Zahlen.html',
);

let html = readFileSync(kaPath, 'utf8');

const task1Block = task1.taskHtml.trim();
html = html.replace(
  /    <!-- Aufgabe 1 -->[\s\S]*?(?=<!-- Aufgabe 2 -->|<div class="footer">)/,
  `${task1Block}\n\n`,
);

html = html.replace(
  /<!-- Aufgabe 2 -->[\s\S]*?(?=<div class="footer">)/,
  `${task2}\n\n${task3}\n\n${task4}\n\n`,
);

const answerLines = Object.entries(allAnswers)
  .map(([k, vals]) => {
    const inner = vals.map((x) => `'${String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`).join(', ');
    return `            ${k}: [${inner}],`;
  })
  .join('\n');

html = html.replace(
  /const correctAnswers = \{[\s\S]*?\};/,
  `const correctAnswers = {\n${answerLines}\n        };`,
);

html = html.replace(
  /return \{ achieved: achievedPoints, total: \d+ \};/,
  'return { achieved: achievedPoints, total: 44 };',
);
html = html.replace(
  /<span id="totalPoints">[^<]*<\/span>/,
  '<span id="totalPoints">44</span>',
);

if (!html.includes('.exam-number-line-interactive')) {
  html = html.replace(/    <\/style>/, `${EXAM_NUMBER_LINE_CSS}\n    </style>`);
} else {
  html = html.replace(
    /\/\* exam-number-line \*\/[\s\S]*?(?=    <\/style>)/,
    `/* exam-number-line */${EXAM_NUMBER_LINE_CSS}\n`,
  );
}

if (!html.includes('function setupExamNumberLines')) {
  html = html.replace(
    /(\s+function setupExamSortDrag\(\) \{)/,
    `${EXAM_NUMBER_LINE_JS}\n$1`,
  );
  html = html.replace(
    /setupExamSortDrag\(\);/,
    'setupExamSortDrag();\n        setupExamNumberLines();',
  );
}

html = html.replace(
  /function isCorrect\(id, value\) \{[\s\S]*?return false;\s*\}/,
  `function isCorrect(id, value) {
            const accepted = correctAnswers[id] || [];
            const n = normalizeAnswer(value);
            if (!n) return false;
            if (accepted.some(a => normalizeAnswer(a) === n)) return true;
            const nlTol = { a4c4: 4, a4c5: 4, a4d4: 150, a4d5: 150 };
            if (nlTol[id] && accepted.length) {
                const num = parseFloat(n.replace(/\\s/g, ''));
                const target = parseFloat(String(accepted[0]).replace(/\\s/g, ''));
                if (!Number.isNaN(num) && !Number.isNaN(target) && Math.abs(num - target) <= nlTol[id]) return true;
            }
            return false;
        }`,
);

writeFileSync(kaPath, html, 'utf8');
console.log('KA updated:', kaPath);
console.log('Task1 fields:', Object.keys(task1.correctAnswers).length);
console.log('Total answer keys:', Object.keys(allAnswers).length);
