/**
 * Baut Aufgaben-HTML aus examGridTaskBuilder und schreibt Fragmente für KA-Datei.
 */
import { writeFileSync, readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientLib = path.join(__dirname, '../client/src/lib/examGridTaskBuilder.ts');

// dynamic import via tsx
const { buildExamGridTaskHtml, druckmaterialKlassenarbeit1 } = await import(
  pathToFileURL(clientLib).href
);

const GIT_IMG =
  'git-intern/Mathe/Klasse 5/Kap 1 - Natürliche Zahlen und Größen/KA1-Druckmaterial';
const img = (file) =>
  `/api/file-system-paths/read-image?filePath=${encodeURIComponent(`${GIT_IMG}/${file}`)}`;

const task1 = buildExamGridTaskHtml(druckmaterialKlassenarbeit1());

const task2 = `    <!-- Aufgabe 2 -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe 2 <span style="font-size: 11px; color: #666; font-weight: normal;">(10 Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-1">AFB I</span>
                <div class="points">10 Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <p><strong>A)</strong> Übersetze die Lebensdaten.</p>
            <div class="item input-group full-width">
                <label>Pablo Picasso — * XXV.X.MDCCCLXXXI</label>
                <input type="text" id="a2a" class="blank-wide" autocomplete="off" placeholder="TT.MM.JJJJ">
            </div>
            <div class="item input-group full-width">
                <label>Leonardo da Vinci — *15.4.1452</label>
                <input type="text" id="a2b" class="blank-wide" autocomplete="off" placeholder="TT.MM.JJJJ">
            </div>
            <p style="margin-top:12px;"><strong>B)</strong> Fülle die Lücken wie im Beispiel aus.</p>
            <div class="item input-group"><span>XXIX =</span><input type="text" id="a2c" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><span>XXX =</span><input type="text" id="a2d" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><span>XXXI =</span><input type="text" id="a2e" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><span>L =</span><input type="text" id="a2f" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><span>XCIV =</span><input type="text" id="a2g" class="blank-tiny" autocomplete="off"></div>
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>A) Picasso: <strong>25.10.1881</strong>, Leonardo: <strong>15.4.1452</strong></p>
                <p>B) XXIX <strong>29</strong>, XXX <strong>30</strong>, XXXI <strong>31</strong>, L <strong>50</strong>, XCIV <strong>94</strong></p>
            </div>
        </div>
    </div>`;

const task3 = `    <!-- Aufgabe 3 -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe 3 <span style="font-size: 11px; color: #666; font-weight: normal;">(7 Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-2">AFB II</span>
                <div class="points">7 Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <p><strong>A)</strong> Geburtstagsrätsel</p>
            <div class="exam-subsection-media exam-subsection-media-left">
                <img class="exam-subsection-image" src="${img('image2.png')}" alt="Roboter" loading="lazy">
                <div class="exam-subsection-media-body">
                    <p>Entschlüssle die Binärzahlen am Roboter und schreibe als Dezimalzahl bzw. Datum:</p>
                    <div class="item input-group full-width"><label>Wie alt unser Roboter wird:</label><input type="text" id="a3a" class="blank-wide" autocomplete="off"></div>
                    <div class="item input-group full-width"><label>Das Datum seines Geburtstags:</label><input type="text" id="a3b" class="blank-wide" autocomplete="off" placeholder="TT.MM."></div>
                </div>
            </div>
            <p style="margin-top:14px;"><strong>B)</strong> Besucher aus der Oktalwelt</p>
            <div class="exam-subsection-media exam-subsection-media-right">
                <div class="exam-subsection-media-body">
                    <p>1) Nenne alle Ziffern des Oktalsystems:</p>
                    <input type="text" id="a3c" class="blank-wide" autocomplete="off">
                    <p style="margin-top:8px;">2) Das Alien ist in seiner Welt <strong>15</strong> Jahre alt (Oktal). Wie alt ist es bei uns?</p>
                    <input type="text" id="a3d" class="blank-wide" autocomplete="off">
                </div>
                <img class="exam-subsection-image" src="${img('image3.png')}" alt="Alien" loading="lazy">
            </div>
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>A) Alter und Datum aus Binär am Roboter (am Bild ablesen)</p>
                <p>B) Ziffern: <strong>0, 1, 2, 3, 4, 5, 6, 7</strong> — Alter dezimal: <strong>13</strong> (15<sub>8</sub>)</p>
            </div>
        </div>
    </div>`;

const task4 = `    <!-- Aufgabe 4 -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe 4 <span style="font-size: 11px; color: #666; font-weight: normal;">(12 Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-2">AFB II</span>
                <div class="points">12 Punkte</div>
            </div>
        </div>
        <div class="task-content">
            <p>In der Tierwelt gibt es wahre Hochleistungssportler … (siehe Diagramm)</p>
            <img src="${img('image4.png')}" alt="Säulendiagramm Höchstgeschwindigkeiten" style="max-width:100%;height:auto;margin:8px 0;" loading="lazy">
            <div class="item input-group full-width"><label><strong>A)</strong> Geschwindigkeit des schnellsten Lebewesens:</label><input type="text" id="a4a" class="blank-wide" autocomplete="off"> <span>km/h</span></div>
            <div class="item input-group full-width"><label><strong>B)</strong> Differenz schnellstes − langsamstes Lebewesen:</label><input type="text" id="a4b" class="blank-wide" autocomplete="off"> <span>km/h</span></div>
            <p><strong>C)</strong> Zahlenstrahl Geschwindigkeiten — Werte an den Pfeilen ablesen; Pferd und Biene eintragen:</p>
            <img src="${img('image5.jpeg')}" alt="Zahlenstrahl km/h" style="max-width:100%;height:auto;margin:8px 0;" loading="lazy">
            <div class="item input-group"><label>Pfeil 1:</label><input type="text" id="a4c1" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><label>Pfeil 2:</label><input type="text" id="a4c2" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><label>Pfeil 3:</label><input type="text" id="a4c3" class="blank-tiny" autocomplete="off"></div>
            <div class="item input-group"><label>Pferd:</label><input type="text" id="a4c4" class="blank-tiny" autocomplete="off"> <span>km/h</span></div>
            <div class="item input-group"><label>Biene:</label><input type="text" id="a4c5" class="blank-tiny" autocomplete="off"> <span>km/h</span></div>
            <p><strong>D)</strong> Besucherzahlen im Tierpark — Pfeile ablesen; gestern 52&nbsp;400, heute 54&nbsp;640 eintragen:</p>
            <img src="${img('image6.jpeg')}" alt="Zahlenstrahl Besucher" style="max-width:100%;height:auto;margin:8px 0;" loading="lazy">
            <div class="item input-group"><label>Pfeil 1:</label><input type="text" id="a4d1" class="blank-wide" autocomplete="off"></div>
            <div class="item input-group"><label>Pfeil 2:</label><input type="text" id="a4d2" class="blank-wide" autocomplete="off"></div>
            <div class="item input-group"><label>Pfeil 3:</label><input type="text" id="a4d3" class="blank-wide" autocomplete="off"></div>
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>A) <strong>180</strong> (Seemöve) — B) <strong>160</strong></p>
                <p>C) Pfeile <strong>12, 24, 63</strong> km/h; Pferd <strong>70</strong>, Biene <strong>20</strong></p>
                <p>D) Pfeile <strong>50 800, 52 600, 54 300</strong></p>
            </div>
        </div>
    </div>`;

const extraAnswers = {
  a2a: ['25.10.1881', '25.10.81', '25.10.1881.'],
  a2b: ['15.4.1452', '15.04.1452'],
  a2c: ['29'],
  a2d: ['30'],
  a2e: ['31'],
  a2f: ['50'],
  a2g: ['94'],
  a3c: ['0,1,2,3,4,5,6,7', '0, 1, 2, 3, 4, 5, 6, 7', '01234567'],
  a3d: ['13'],
  a4a: ['180'],
  a4b: ['160'],
  a4c1: ['12'],
  a4c2: ['24'],
  a4c3: ['63'],
  a4c4: ['70'],
  a4c5: ['20'],
  a4d1: ['50800', '50 800'],
  a4d2: ['52600', '52 600'],
  a4d3: ['54300', '54 300'],
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

writeFileSync(kaPath, html, 'utf8');
console.log('KA updated:', kaPath);
console.log('Task1 fields:', Object.keys(task1.correctAnswers).length);
console.log('Total answer keys:', Object.keys(allAnswers).length);
