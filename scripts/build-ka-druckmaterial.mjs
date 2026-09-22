/**
 * Baut Aufgaben-HTML aus examGridTaskBuilder und schreibt Fragmente für KA-Datei (A + B).
 */
import { writeFileSync, readFileSync, copyFileSync, existsSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientLib = path.join(__dirname, '../client/src/lib/examGridTaskBuilder.ts');
const flowLib = path.join(__dirname, '../client/src/lib/examDruckmaterialFlowTasks.ts');
const tasks234Lib = path.join(__dirname, '../client/src/lib/druckmaterialKaTasks234.ts');
const normalizeLib = path.join(__dirname, '../client/src/lib/examAnswerNormalize.ts');

const { buildExamGridTaskHtml, druckmaterialKlassenarbeit1 } = await import(
  pathToFileURL(clientLib).href
);

const {
  druckmaterialKlassenarbeit2,
  druckmaterialKlassenarbeit3,
  druckmaterialKlassenarbeit4,
} = await import(pathToFileURL(tasks234Lib).href);

const { EXAM_NUMBER_LINE_CSS, EXAM_NUMBER_LINE_JS } = await import(pathToFileURL(flowLib).href);
const { normalizeAnswerJsSource } = await import(pathToFileURL(normalizeLib).href);

const kaDir = path.join(
  __dirname,
  '../J-M-Reihen/Mathe/Klasse 5/Kap 1 - Natürliche Zahlen und Größen',
);
const kaPathA = path.join(kaDir, 'KA_Klassenarbeit 1: Natürliche Zahlen.html');
const kaPathB = path.join(kaDir, 'KA_Klassenarbeit 1: Natürliche Zahlen__B.html');

function buildTasksForVersion(version) {
  const task1 = buildExamGridTaskHtml(druckmaterialKlassenarbeit1(version));
  const task2 = buildExamGridTaskHtml(druckmaterialKlassenarbeit2(version));
  const task3 = buildExamGridTaskHtml(druckmaterialKlassenarbeit3(version));
  const task4 = buildExamGridTaskHtml(druckmaterialKlassenarbeit4(version));
  const allAnswers = {
    ...task1.correctAnswers,
    ...task2.correctAnswers,
    ...task3.correctAnswers,
    ...task4.correctAnswers,
  };
  return { task1, task2, task3, task4, allAnswers };
}

function applyKaPatches(html, { task1, task2, task3, task4, allAnswers }, versionLetter) {
  const task1Block = task1.taskHtml.trim();
  html = html.replace(
    /<!-- Aufgabe 1 -->[\s\S]*?(?=<!-- Aufgabe 2 -->|<div class="footer">)/,
    `${task1Block}\n\n`,
  );

  html = html.replace(
    /<!-- Aufgabe 2 -->[\s\S]*?(?=<div class="footer">)/,
    `${task2.taskHtml}\n\n${task3.taskHtml}\n\n${task4.taskHtml}\n\n`,
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

  const needsStackCss =
    !html.includes('.exam-life-dates-portrait') ||
    !html.includes('.exam-nl-track') ||
    !html.includes('.exam-cloze-line .exam-cloze-gap') ||
    !html.includes('.exam-roman-triple-grid');
  if (needsStackCss) {
    html = html.replace(
      /\n        \.exam-roman-table[\s\S]*?\.exam-nl-place-chip\.exam-sort-chip-selected[\s\S]*?\n/,
      '\n',
    );
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
  } else {
    html = html.replace(
      /\n        function setupExamNumberLines\(\) \{[\s\S]*?\n        \}\n/,
      `\n${EXAM_NUMBER_LINE_JS}\n`,
    );
  }

  const needsNlCss =
    !html.includes('.exam-nl-visual') ||
    !html.includes('exam-nl-hit') ||
    !html.includes('.exam-roman-cell-pair') ||
    !html.includes('.exam-nl-fixed-value');
  if (needsNlCss && html.includes('function setupExamNumberLines')) {
    html = html.replace(
      /\n        \.exam-roman-table[\s\S]*?\.exam-nl-place-chip\.exam-sort-chip-selected[\s\S]*?\n/,
      '\n',
    );
    html = html.replace(/    <\/style>/, `${EXAM_NUMBER_LINE_CSS}\n    </style>`);
  }

  if (html.includes('.exam-nl-visual')) {
    html = html.replace(
      /\n        \.exam-life-dates \{[\s\S]*?\.exam-nl-place-chip\.exam-sort-chip-selected \{ outline: 2px solid #1565c0; \}\n/,
      EXAM_NUMBER_LINE_CSS,
    );
  }

  html = html.replace(
    /function normalizeAnswer\(raw\) \{[\s\S]*?\n        \}/,
    normalizeAnswerJsSource(),
  );

  html = html.replace(
    /function isCorrect\(id, value\) \{[\s\S]*?return false;\s*\}/,
    `function isCorrect(id, value) {
            const accepted = correctAnswers[id] || [];
            const n = normalizeAnswer(value);
            if (!n) return false;
            if (accepted.some(a => normalizeAnswer(a) === n)) return true;
            const nlTol = { a4c4: 4, a4c5: 4, a4d4: 150, a4d5: 150 };
            if (nlTol[id] && accepted.length) {
                const num = parseFloat(n);
                const target = parseFloat(normalizeAnswer(String(accepted[0])));
                if (!Number.isNaN(num) && !Number.isNaN(target) && Math.abs(num - target) <= nlTol[id]) return true;
            }
            return false;
        }`,
  );

  html = html.replace(
    /(<div class="exam-version-letter" id="examVersionLetter"[^>]*>)[^<]*(<\/div>)/,
    `$1${versionLetter}$2`,
  );

  return html;
}

if (!existsSync(kaPathB)) {
  copyFileSync(kaPathA, kaPathB);
}

for (const { version, path: kaPath, letter } of [
  { version: 'A', path: kaPathA, letter: 'A' },
  { version: 'B', path: kaPathB, letter: 'B' },
]) {
  const built = buildTasksForVersion(version);
  let html = readFileSync(kaPath, 'utf8');
  html = applyKaPatches(html, built, letter);
  writeFileSync(kaPath, html, 'utf8');
  console.log(`KA updated (${version}):`, kaPath);
  console.log(`  Task1 fields:`, Object.keys(built.task1.correctAnswers).length);
  console.log(`  Total answer keys:`, Object.keys(built.allAnswers).length);
}
