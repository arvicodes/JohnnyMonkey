/**
 * Baut Aufgaben-HTML aus examGridTaskBuilder und schreibt Fragmente für KA-Datei.
 */
import { writeFileSync, readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientLib = path.join(__dirname, '../client/src/lib/examGridTaskBuilder.ts');
const flowLib = path.join(__dirname, '../client/src/lib/examDruckmaterialFlowTasks.ts');

const { buildExamGridTaskHtml, druckmaterialKlassenarbeit1 } = await import(
  pathToFileURL(clientLib).href
);

const {
  buildTasks234,
  druckKaImageUrl,
  DRUCK_FLOW_ANSWERS_2,
  DRUCK_FLOW_ANSWERS_3,
  DRUCK_FLOW_ANSWERS_4,
  EXAM_NUMBER_LINE_CSS,
  EXAM_NUMBER_LINE_JS,
} = await import(pathToFileURL(flowLib).href);

const task1 = buildExamGridTaskHtml(druckmaterialKlassenarbeit1());
const { task2, task3, task4 } = buildTasks234(druckKaImageUrl);

const extraAnswers = {
  ...DRUCK_FLOW_ANSWERS_2,
  ...DRUCK_FLOW_ANSWERS_3,
  ...DRUCK_FLOW_ANSWERS_4,
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

if (!html.includes('.exam-nl-track')) {
  html = html.replace(/    <\/style>/, `${EXAM_NUMBER_LINE_CSS}\n    </style>`);
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
