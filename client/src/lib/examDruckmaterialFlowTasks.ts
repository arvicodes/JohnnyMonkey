/** Aufgaben 2–4: Wortlaut aus „Erste KA - Klasse 5.docx“ + interaktive Zahlenstrahle */

export type ExamFlowKey = 'druck-ka-2' | 'druck-ka-3' | 'druck-ka-4';

export type DruckFlowTaskBuildInput = {
  taskNumber: number;
  points: number;
  afbLevel: 1 | 2 | 3;
  flowKey: ExamFlowKey;
};

export const DRUCK_KA_GIT_IMG =
  'git-intern/Mathe/Klasse 5/Kap 1 - Natürliche Zahlen und Größen/KA1-Druckmaterial';

export function druckKaImageUrl(file: string): string {
  return `/api/file-system-paths/read-image?filePath=${encodeURIComponent(`${DRUCK_KA_GIT_IMG}/${file}`)}`;
}

const FLOW_META: Record<ExamFlowKey, { defaultPoints: number; afb: 1 | 2 | 3 }> = {
  'druck-ka-2': { defaultPoints: 10, afb: 1 },
  'druck-ka-3': { defaultPoints: 7, afb: 2 },
  'druck-ka-4': { defaultPoints: 12, afb: 2 },
};

export function detectExamFlowKey(taskHtml: string): ExamFlowKey | null {
  const m = taskHtml.match(/data-exam-flow=["']([^"']+)["']/);
  if (m?.[1] === 'druck-ka-2' || m?.[1] === 'druck-ka-3' || m?.[1] === 'druck-ka-4') {
    return m[1] as ExamFlowKey;
  }
  if (taskHtml.includes('exam-roman-table')) return 'druck-ka-2';
  if (taskHtml.includes('Geburtstagsrätsel') && taskHtml.includes('exam-hilfestellung')) return 'druck-ka-3';
  if (taskHtml.includes('exam-number-line-interactive')) return 'druck-ka-4';
  return null;
}

export function druckFlowMeta(flowKey: ExamFlowKey) {
  return FLOW_META[flowKey];
}

export const DRUCK_FLOW_ANSWERS_2: Record<string, string[]> = {
  a2a: ['25.10.1881', '25.10.81', '25.10.1881.'],
  a2b: ['15.4.1452', '15.04.1452'],
  a2f: ['50'],
  a2g: ['94'],
};

export const DRUCK_FLOW_ANSWERS_3: Record<string, string[]> = {
  a3a: ['66'],
  a3b: ['30.11.2010', '30.11.10', '30.11.2010.'],
  a3c: ['0,1,2,3,4,5,6,7', '0, 1, 2, 3, 4, 5, 6, 7', '01234567'],
  a3e1: ['0', ''],
  a3e2: ['0', ''],
  a3e3: ['1'],
  a3e4: ['4'],
  a3d: ['13'],
};

export const DRUCK_FLOW_ANSWERS_4: Record<string, string[]> = {
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
  a4d4: ['52400', '52 400'],
  a4d5: ['54640', '54 640'],
};

function answersForFlowKey(flowKey: ExamFlowKey): Record<string, string[]> {
  if (flowKey === 'druck-ka-2') return DRUCK_FLOW_ANSWERS_2;
  if (flowKey === 'druck-ka-3') return DRUCK_FLOW_ANSWERS_3;
  return DRUCK_FLOW_ANSWERS_4;
}

function applyFlowTaskMeta(html: string, spec: DruckFlowTaskBuildInput): string {
  const afbRoman = spec.afbLevel === 1 ? 'I' : spec.afbLevel === 2 ? 'II' : 'III';
  return html
    .replace(/Aufgabe \d+/, `Aufgabe ${spec.taskNumber}`)
    .replace(/\(\d+\s*Punkte\)/g, `(${spec.points} Punkte)`)
    .replace(/<div class="points">\d+ Punkte<\/div>/, `<div class="points">${spec.points} Punkte</div>`)
    .replace(/afb-badge afb-\d/, `afb-badge afb-${spec.afbLevel}`)
    .replace(/AFB [IVX]+/, `AFB ${afbRoman}`);
}

export function buildDruckFlowTaskHtml(spec: DruckFlowTaskBuildInput): {
  taskHtml: string;
  correctAnswers: Record<string, string[]>;
  solutionLines: string[];
} {
  if (!spec.flowKey) {
    throw new Error('flowKey fehlt');
  }
  const { task2, task3, task4 } = buildTasks234(druckKaImageUrl);
  const raw =
    spec.flowKey === 'druck-ka-2' ? task2 : spec.flowKey === 'druck-ka-3' ? task3 : task4;
  const taskHtml = applyFlowTaskMeta(raw.trim(), spec);
  return {
    taskHtml,
    correctAnswers: answersForFlowKey(spec.flowKey),
    solutionLines: [],
  };
}

export function buildTasks234(img: (file: string) => string) {
  const task2 = `    <!-- Aufgabe 2 -->
    <div class="task" data-exam-flow="druck-ka-2">
        <div class="task-header">
            <div class="task-number">Aufgabe 2 <span style="font-size: 11px; color: #666; font-weight: normal;">(10 Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-1">AFB I</span>
                <div class="points">10 Punkte</div>
            </div>
        </div>
        <div class="task-content exam-task-flow">
            <p><strong>A)</strong> Übersetze die Lebensdaten.</p>
            <div class="exam-life-dates">
                <p><strong>Pablo Picasso</strong><br>* XXV.X.<br>MDCCCLXXXI</p>
                <div class="item input-group full-width" style="margin-top:6px;">
                    <input type="text" id="a2a" class="blank-wide" autocomplete="off" aria-label="Lebensdaten Pablo Picasso">
                </div>
                <p style="margin-top:10px;"><strong>Leonardo da Vinci</strong><br>*15.4.1452</p>
                <div class="item input-group full-width" style="margin-top:6px;">
                    <input type="text" id="a2b" class="blank-wide" autocomplete="off" aria-label="Lebensdaten Leonardo da Vinci">
                </div>
            </div>
            <p style="margin-top:14px;"><strong>B)</strong> Fülle die Lücken wie im unten stehenden Beispiel aus.</p>
            <table class="grade-table exam-roman-table" aria-label="Römische Zahlen">
                <thead>
                    <tr><th>Römische Zahl</th><th>Dezimalzahl</th></tr>
                </thead>
                <tbody>
                    <tr><td>XXIX</td><td>29</td></tr>
                    <tr><td>XXX</td><td>30</td></tr>
                    <tr><td>XXXI</td><td>31</td></tr>
                    <tr><td>L</td><td><input type="text" id="a2f" class="blank-tiny exam-table-input" autocomplete="off"></td></tr>
                    <tr><td>XCIV</td><td><input type="text" id="a2g" class="blank-tiny exam-table-input" autocomplete="off"></td></tr>
                </tbody>
            </table>
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>A) Picasso: <strong>25.10.1881</strong>, Leonardo: <strong>15.4.1452</strong></p>
                <p>B) L <strong>50</strong>, XCIV <strong>94</strong></p>
            </div>
        </div>
    </div>`;

  const task3 = `    <!-- Aufgabe 3 -->
    <div class="task" data-exam-flow="druck-ka-3">
        <div class="task-header">
            <div class="task-number">Aufgabe 3 <span style="font-size: 11px; color: #666; font-weight: normal;">(7 Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-2">AFB II</span>
                <div class="points">7 Punkte</div>
            </div>
        </div>
        <div class="task-content exam-task-flow">
            <p><strong>A)</strong> Geburtstagsrätsel</p>
            <div class="exam-subsection-media exam-subsection-media-left">
                <img class="exam-subsection-image" src="${img('image2.png')}" alt="Roboter" loading="lazy">
                <div class="exam-subsection-media-body">
                    <p class="exam-quote">„Ich habe schon bald Geburtstag. Nur noch wenige Tage! Im Moment bin ich gerade einmal <span class="exam-binary">100000002</span> Jahre alt. Aber am <span class="exam-binary">111102</span>. <span class="exam-binary">10012</span>. <span class="exam-binary">111111010102</span> ist es endlich so weit. Dann feiere ich einen robotertastischen Geburtstag und werde ein Jahr älter!“</p>
                    <p>Entschlüssle die Binärzahlen und schreibe als Dezimalzahl:</p>
                    <div class="item input-group full-width"><label>Wie alt unser Roboter wird:</label><input type="text" id="a3a" class="blank-wide" autocomplete="off"></div>
                    <div class="item input-group full-width"><label>Das Datum seines Geburtstags:</label><input type="text" id="a3b" class="blank-wide" autocomplete="off"></div>
                </div>
            </div>
            <p style="margin-top:14px;"><strong>B)</strong> Besucher aus der Oktalwelt</p>
            <div class="exam-subsection-media exam-subsection-media-right">
                <div class="exam-subsection-media-body">
                    <p class="exam-quote">„Wo bin ich denn hier gelandet? Was habt ihr denn für komische Zahlen? Bei mir zu Hause rechnen wir ganz anders. Wir benutzen das Oktalsystem. Das beruht auf der Zahl 8.“</p>
                    <p class="exam-quote">„In meiner Welt bin ich 15 Jahre alt. Wie alt bin ich denn bei euch Menschen?“</p>
                    <p>Hilf dem kleinen Alien, sein Alter im Dezimalsystem herauszufinden.</p>
                    <p><strong>1)</strong> Nenne alle Ziffern, die das Alien in seinem Zahlensystem überhaupt benutzen kann:</p>
                    <input type="text" id="a3c" class="blank-wide" autocomplete="off">
                    <p style="margin-top:10px;"><strong>2)</strong> Das Oktalsystem basiert auf der Zahl 8. Trage die Zahl 12 auch in diese Stellenwerttafel ein:</p>
                    <table class="grade-table exam-place-value-table" aria-label="Stellenwerttafel Oktal">
                        <tr><th>512</th><th>64</th><th>8</th><th>1</th></tr>
                        <tr>
                            <td><input type="text" id="a3e1" class="blank-tiny exam-table-input" autocomplete="off" maxlength="2"></td>
                            <td><input type="text" id="a3e2" class="blank-tiny exam-table-input" autocomplete="off" maxlength="2"></td>
                            <td><input type="text" id="a3e3" class="blank-tiny exam-table-input" autocomplete="off" maxlength="2"></td>
                            <td><input type="text" id="a3e4" class="blank-tiny exam-table-input" autocomplete="off" maxlength="2"></td>
                        </tr>
                    </table>
                    <p style="margin-top:10px;">Das Alien ist bei uns Menschen also <input type="text" id="a3d" class="blank-tiny" autocomplete="off" style="min-width:4em;"> Jahre alt.</p>
                    <div class="exam-hilfestellung">
                        <p><strong>Kleine Hilfestellung:</strong></p>
                        <p>Das Dezimalsystem basiert auf der Zahl 10. In der Stellenwerttafel tragen wir die 12 wie folgt ein:</p>
                        <table class="grade-table exam-place-value-table exam-place-value-example">
                            <tr><th>10000</th><th>1000</th><th>100</th><th>10</th><th>1</th></tr>
                            <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>2</td></tr>
                        </table>
                        <p style="margin-top:8px;">Das Binärsystem basiert auf der Zahl 2. In der Stellenwerttafel tragen wir die 12 wie folgt ein:</p>
                        <table class="grade-table exam-place-value-table exam-place-value-example">
                            <tr><th>8</th><th>4</th><th>2</th><th>1</th></tr>
                            <tr><td>1</td><td>1</td><td>0</td><td>0</td></tr>
                        </table>
                    </div>
                </div>
                <img class="exam-subsection-image" src="${img('image3.png')}" alt="Alien" loading="lazy">
            </div>
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>A) Alter <strong>66</strong>, Geburtstag z.&nbsp;B. <strong>30.11.2010</strong> (Binär am Roboter)</p>
                <p>B) Ziffern: <strong>0, 1, 2, 3, 4, 5, 6, 7</strong> — 12<sub>10</sub> = <strong>14</strong><sub>8</sub> (Stellenwerttafel: 0,0,1,4) — Alter: <strong>13</strong></p>
            </div>
        </div>
    </div>`;

  const nlSpeed = `
            <div class="exam-number-line-interactive"
                 data-min="0" data-max="72" data-step="3"
                 data-bg="${img('image5.jpeg')}"
                 data-fixed="12:a4c1,24:a4c2,63:a4c3"
                 data-chips="Pferd:70:a4c4,Biene:20:a4c5">
                <p class="exam-sort-hint">Klicke auf einen roten Pfeil und trage die abgelesene Geschwindigkeit ein. Wähle „Pferd“ oder „Biene“, klicke auf den Zahlenstrahl und beschrifte den Punkt.</p>
                <div class="exam-nl-chip-bar">
                    <button type="button" class="exam-sort-chip exam-nl-place-chip" data-label="Pferd">Pferd</button>
                    <button type="button" class="exam-sort-chip exam-nl-place-chip" data-label="Biene">Biene</button>
                </div>
                <div class="exam-nl-stage">
                    <div class="exam-nl-track" role="img" aria-label="Zahlenstrahl Geschwindigkeiten km/h"></div>
                </div>
                <input type="hidden" id="a4c1" value="">
                <input type="hidden" id="a4c2" value="">
                <input type="hidden" id="a4c3" value="">
                <input type="hidden" id="a4c4" value="">
                <input type="hidden" id="a4c5" value="">
            </div>`;

  const nlVisitors = `
            <div class="exam-number-line-interactive"
                 data-min="50000" data-max="56000" data-step="100"
                 data-bg="${img('image6.jpeg')}"
                 data-fixed="50800:a4d1,52600:a4d2,54300:a4d3"
                 data-chips="gestern:52400:a4d4,heute:54640:a4d5">
                <p class="exam-sort-hint">Klicke auf einen roten Pfeil und trage die Besucherzahl ein. Wähle „gestern“ oder „heute“, klicke auf den Zahlenstrahl und beschrifte den Punkt.</p>
                <div class="exam-nl-chip-bar">
                    <button type="button" class="exam-sort-chip exam-nl-place-chip" data-label="gestern">gestern (52&nbsp;400)</button>
                    <button type="button" class="exam-sort-chip exam-nl-place-chip" data-label="heute">heute (54&nbsp;640)</button>
                </div>
                <div class="exam-nl-stage">
                    <div class="exam-nl-track" role="img" aria-label="Zahlenstrahl Besucherzahlen"></div>
                </div>
                <input type="hidden" id="a4d1" value="">
                <input type="hidden" id="a4d2" value="">
                <input type="hidden" id="a4d3" value="">
                <input type="hidden" id="a4d4" value="">
                <input type="hidden" id="a4d5" value="">
            </div>`;

  const task4 = `    <!-- Aufgabe 4 -->
    <div class="task" data-exam-flow="druck-ka-4">
        <div class="task-header">
            <div class="task-number">Aufgabe 4 <span style="font-size: 11px; color: #666; font-weight: normal;">(12 Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-2">AFB II</span>
                <div class="points">12 Punkte</div>
            </div>
        </div>
        <div class="task-content exam-task-flow">
            <p>In der Tierwelt gibt es wahre Hochleistungssportler. Für viele Tier ist Geschwindigkeit überlebenswichtig. Einige Tiere können sogar längere Zeit sehr schnell laufen oder schwimmen. Pferde, Gazellen, Delfine und Wale sind sehr ausdauernd. Die meisten Tiere sind allerdings keine Marathonläufer, sondern eher Sprinter. Die Höchstgeschwindigkeiten einiger Lebewesen sind in dem Säulendiagramm dargestellt.</p>
            <img src="${img('image4.png')}" alt="Säulendiagramm Höchstgeschwindigkeiten" style="max-width:100%;height:auto;margin:8px 0;" loading="lazy">
            <div class="item input-group full-width" style="margin-top:8px;">
                <label><strong>A)</strong> Nenne die Geschwindigkeit des schnellsten Lebewesens:</label>
                <input type="text" id="a4a" class="blank-wide" autocomplete="off">
                <span>km/h</span>
            </div>
            <div class="item input-group full-width">
                <label><strong>B)</strong> Berechne die Differenz vom schnellsten zum Langsamsten Lebewesen:</label>
                <input type="text" id="a4b" class="blank-wide" autocomplete="off">
                <span>km/h</span>
            </div>
            <p style="margin-top:12px;"><strong>C)</strong> Auf dem Zahlenstrahl sind bereits einige Geschwindigkeiten durch Pfeile markiert. Lies die markierten Geschwindigkeiten ab. Trage anschließend auf demselben Zahlenstrahl die Geschwindigkeiten von Pferd und Biene ein und beschrifte die Punkte mit den passenden Namen.</p>
            ${nlSpeed}
            <p style="margin-top:14px;"><strong>D)</strong> Im Tierpark wird gezählt</p>
            <p>Im Tierpark wurden an mehreren Tagen die Besucherzahlen notiert. Auf dem Zahlenstrahl sind einige Besucherzahlen bereits durch rote Pfeile markiert. Lies die markierten Zahlen ab. Trage außerdem die Besucherzahlen von gestern (52&nbsp;400) und von heute (54&nbsp;640) auch in den Zahlenstrahl ein.</p>
            ${nlVisitors}
            <div class="solution">
                <h4>Musterlösung:</h4>
                <p>A) <strong>180</strong> km/h (Seemöve) — B) <strong>160</strong> km/h</p>
                <p>C) Pfeile <strong>12, 24, 63</strong> km/h; Pferd <strong>70</strong>, Biene <strong>20</strong></p>
                <p>D) Pfeile <strong>50&nbsp;800, 52&nbsp;600, 54&nbsp;300</strong>; gestern <strong>52&nbsp;400</strong>, heute <strong>54&nbsp;640</strong></p>
            </div>
        </div>
    </div>`;

  return { task2, task3, task4 };
}

export const EXAM_NUMBER_LINE_CSS = `
        .exam-life-dates { margin: 8px 0 12px; }
        .exam-life-dates--with-portrait { display: grid; grid-template-columns: minmax(88px, 26%) 1fr; gap: 12px; align-items: start; }
        .exam-life-dates-portrait { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; }
        .exam-life-dates-cards { display: flex; flex-direction: column; gap: 10px; }
        .exam-life-dates-cards-only { display: flex; flex-wrap: wrap; gap: 10px; }
        .exam-life-dates-cards-only .exam-life-date-card { flex: 1 1 220px; }
        .exam-life-date-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 12px; background: #fafafa; }
        .exam-life-date-name { font-weight: bold; margin: 0 0 4px; font-size: 14px; }
        .exam-life-date-roman { font-family: Georgia, 'Times New Roman', serif; margin: 0 0 8px; line-height: 1.35; color: #333; }
        .exam-life-date-label { display: block; font-size: 11px; color: #555; margin-bottom: 4px; }
        .exam-life-date-input { max-width: 100%; }
        .exam-chart-figure { margin: 6px 0 10px; }
        .exam-chart-figure img { width: 100%; height: auto; display: block; }
        .exam-chart-figure--compact { max-width: min(48%, 380px); }
        .exam-answer-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 6px 0; }
        .exam-answer-row-label { flex: 1 1 200px; font-size: 13px; margin: 0; }
        .exam-answer-row-input { flex: 1 1 160px; max-width: 100%; }
        .exam-subsection-media .exam-answer-row { margin-top: 4px; }
        .exam-roman-table { max-width: 320px; margin: 8px 0; }
        .exam-table-input { width: 4em; text-align: center; }
        .exam-quote { font-style: italic; margin: 8px 0; }
        .exam-binary { font-family: ui-monospace, monospace; font-style: normal; }
        .exam-hilfestellung { margin-top: 12px; padding: 10px 12px; background: #f8f8f8; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
        .exam-place-value-table { max-width: 420px; margin: 6px 0; text-align: center; }
        .exam-place-value-example td { background: #fafafa; }
        .exam-number-line-interactive { margin: 10px 0 16px; }
        .exam-nl-stage { position: relative; padding: 8px 4px 28px; }
        .exam-nl-track {
            position: relative;
            height: 88px;
            border-bottom: 3px solid #222;
            margin: 0 6px;
            background-repeat: no-repeat;
            background-position: center bottom;
            background-size: 100% auto;
            cursor: crosshair;
        }
        .exam-nl-tick { position: absolute; bottom: 0; width: 2px; height: 12px; background: #222; transform: translateX(-50%); pointer-events: none; }
        .exam-nl-tick-label { position: absolute; bottom: -20px; transform: translateX(-50%); font-size: 10px; white-space: nowrap; pointer-events: none; }
        .exam-nl-fixed {
            position: absolute; bottom: 2px; transform: translateX(-50%);
            color: #c00; font-size: 22px; line-height: 1; cursor: pointer; user-select: none;
        }
        .exam-nl-fixed.exam-nl-fixed-active { filter: drop-shadow(0 0 2px #c00); }
        .exam-nl-fixed-input {
            position: absolute; bottom: 36px; transform: translateX(-50%);
            width: 4.5em; font-size: 12px; text-align: center; z-index: 3;
        }
        .exam-nl-pin {
            position: absolute; bottom: 14px; transform: translateX(-50%);
            display: flex; flex-direction: column; align-items: center; gap: 2px; z-index: 2;
        }
        .exam-nl-pin-dot { width: 10px; height: 10px; border-radius: 50%; background: #1565c0; border: 2px solid #fff; box-shadow: 0 0 0 1px #1565c0; }
        .exam-nl-pin-label { font-size: 10px; font-weight: bold; background: #fff; padding: 0 4px; border: 1px solid #ccc; border-radius: 3px; white-space: nowrap; }
        .exam-nl-chip-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
        .exam-nl-place-chip.exam-sort-chip-selected { outline: 2px solid #1565c0; }
`;

export const EXAM_NUMBER_LINE_JS = `
        function setupExamNumberLines() {
            document.querySelectorAll('.exam-number-line-interactive').forEach(function (root) {
                if (root.getAttribute('data-nl-init') === '1') return;
                root.setAttribute('data-nl-init', '1');
                var min = parseFloat(root.getAttribute('data-min') || '0');
                var max = parseFloat(root.getAttribute('data-max') || '100');
                var step = parseFloat(root.getAttribute('data-step') || '1');
                var track = root.querySelector('.exam-nl-track');
                if (!track) return;
                var bg = root.getAttribute('data-bg');
                if (bg) track.style.backgroundImage = 'url(' + bg + ')';
                function snap(v) {
                    if (!step) return v;
                    return Math.round((v - min) / step) * step + min;
                }
                function valueToPct(v) {
                    if (max === min) return 0;
                    return ((v - min) / (max - min)) * 100;
                }
                function pctToValue(pct) {
                    var raw = min + (pct / 100) * (max - min);
                    return snap(Math.max(min, Math.min(max, raw)));
                }
                var majorLabels = [];
                if (max <= 100) {
                    majorLabels = [0, 24, 48, 72].filter(function (x) { return x >= min && x <= max; });
                } else {
                    majorLabels = [50000, 52000, 54000, 56000].filter(function (x) { return x >= min && x <= max; });
                }
                majorLabels.forEach(function (v) {
                    var tick = document.createElement('div');
                    tick.className = 'exam-nl-tick';
                    tick.style.left = valueToPct(v) + '%';
                    track.appendChild(tick);
                    var lab = document.createElement('div');
                    lab.className = 'exam-nl-tick-label';
                    lab.style.left = valueToPct(v) + '%';
                    lab.textContent = v >= 1000 ? v.toLocaleString('de-DE') : String(v);
                    track.appendChild(lab);
                });
                var chipMap = {};
                (root.getAttribute('data-chips') || '').split(',').forEach(function (part) {
                    var bits = part.split(':');
                    if (bits.length >= 3) chipMap[bits[0]] = { value: parseFloat(bits[1]), id: bits[2] };
                });
                (root.getAttribute('data-fixed') || '').split(',').forEach(function (part) {
                    var bits = part.split(':');
                    if (bits.length < 2) return;
                    var val = parseFloat(bits[0]);
                    var id = bits[1];
                    var marker = document.createElement('div');
                    marker.className = 'exam-nl-fixed';
                    marker.style.left = valueToPct(val) + '%';
                    marker.textContent = '▼';
                    marker.title = 'Pfeil ablesen';
                    marker.addEventListener('click', function (e) {
                        e.stopPropagation();
                        root.querySelectorAll('.exam-nl-fixed-input').forEach(function (el) { el.remove(); });
                        root.querySelectorAll('.exam-nl-fixed-active').forEach(function (el) { el.classList.remove('exam-nl-fixed-active'); });
                        marker.classList.add('exam-nl-fixed-active');
                        var inp = document.createElement('input');
                        inp.type = 'text';
                        inp.className = 'exam-nl-fixed-input';
                        inp.style.left = valueToPct(val) + '%';
                        inp.autocomplete = 'off';
                        var hidden = document.getElementById(id);
                        if (hidden && hidden.value) inp.value = hidden.value;
                        inp.addEventListener('input', function () {
                            if (hidden) {
                                hidden.value = inp.value.trim();
                                hidden.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        });
                        inp.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
                        track.appendChild(inp);
                        inp.focus();
                    });
                    track.appendChild(marker);
                });
                var selectedLabel = null;
                root.querySelectorAll('.exam-nl-place-chip').forEach(function (btn) {
                    btn.addEventListener('click', function (e) {
                        e.preventDefault();
                        selectedLabel = btn.getAttribute('data-label');
                        root.querySelectorAll('.exam-nl-place-chip').forEach(function (b) { b.classList.remove('exam-sort-chip-selected'); });
                        btn.classList.add('exam-sort-chip-selected');
                    });
                });
                function placePin(value, label) {
                    var cfg = chipMap[label];
                    if (!cfg) return;
                    var expected = cfg.value;
                    if (Math.abs(value - expected) <= step * 2) value = expected;
                    var hidden = document.getElementById(cfg.id);
                    if (hidden) {
                        hidden.value = String(value);
                        hidden.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    var existing = track.querySelector('.exam-nl-pin[data-label="' + label + '"]');
                    if (existing) existing.remove();
                    var pin = document.createElement('div');
                    pin.className = 'exam-nl-pin';
                    pin.setAttribute('data-label', label);
                    pin.style.left = valueToPct(value) + '%';
                    pin.innerHTML = '<span class="exam-nl-pin-label">' + label + '</span><span class="exam-nl-pin-dot"></span>';
                    track.appendChild(pin);
                }
                track.addEventListener('click', function (e) {
                    if (e.target.closest('.exam-nl-fixed') || e.target.closest('.exam-nl-fixed-input')) return;
                    if (!selectedLabel) return;
                    var rect = track.getBoundingClientRect();
                    var pct = ((e.clientX - rect.left) / rect.width) * 100;
                    var value = pctToValue(pct);
                    placePin(value, selectedLabel);
                    selectedLabel = null;
                    root.querySelectorAll('.exam-nl-place-chip').forEach(function (b) { b.classList.remove('exam-sort-chip-selected'); });
                });
            });
        }
`;
