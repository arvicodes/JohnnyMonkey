/** 2×2-Raster-Aufgaben für KA-HTML (wie Klassenarbeit-Layout). */

export type GridQuadrant = 'tl' | 'tr' | 'bl' | 'br';

export type GridSubsection =
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'round-lines';
      lines: { text: string; solution: string }[];
    }
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'compare';
      rows: { left: string; right: string; solution: '<' | '>' | '=' }[];
    }
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'sort';
      given: string;
      solution: string;
    }
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'one-line';
      prompt: string;
      solution: string;
    }
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'bullet-blanks';
      items: { text: string; solution: string }[];
    }
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'cloze';
      /** Text mit ___ für Lücken */
      template: string;
      solutions: string[];
    };

export type ExamGridTaskSpec = {
  taskNumber: number;
  points: number;
  afbLevel: 1 | 2 | 3;
  subsections: GridSubsection[];
};

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Erlaubt einfaches HTML in Prompts (sub, strong). */
function allowBasicHtml(s: string): string {
  return escapeHtml(s)
    .replace(/&lt;(\/?)(sub|strong|sup)&gt;/gi, '<$1$2>')
    .replace(/&lt;sub&gt;([\s\S]*?)&lt;\/sub&gt;/gi, '<sub>$1</sub>')
    .replace(/&lt;strong&gt;([\s\S]*?)&lt;\/strong&gt;/gi, "<strong>$1</strong>");
}

export type SolutionExpandKind = 'text' | 'sort' | 'number';

/** Mehrere Lösungen mit „/“ — plus sinnvolle Varianten (Leerzeichen, Komma, Umlaute). */
export function parseSolutionAlternatives(raw: string, expand: SolutionExpandKind = 'text'): string[] {
  const manual = String(raw || '')
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = new Set<string>();

  const add = (v: string) => {
    const t = v.trim();
    if (t) out.add(t);
  };

  for (const base of manual) {
    add(base);
    const collapsed = base.replace(/\s+/g, ' ').trim();
    if (collapsed !== base) add(collapsed);

    const noSpaces = base.replace(/\s+/g, '');
    if (noSpaces && noSpaces !== base) add(noSpaces);

    const withSpacesThousands = noSpaces.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ');
    if (withSpacesThousands !== base && withSpacesThousands !== noSpaces) {
      add(withSpacesThousands);
    }

    if (expand === 'sort' || (expand === 'text' && /[,;]/.test(base))) {
      const tokens = base.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      if (tokens.length > 1) {
        add(tokens.join(', '));
        add(tokens.join('; '));
        add(tokens.join(' '));
        add(tokens.join(','));
      }
    }

    const lower = base.toLowerCase();
    if (/ae|oe|ue/.test(lower) && !/[äöü]/.test(base)) {
      add(base.replace(/ae/gi, 'ä').replace(/oe/gi, 'ö').replace(/ue/gi, 'ü'));
    }
    if (/[äöüß]/i.test(base)) {
      add(
        base
          .replace(/ä/gi, 'ae')
          .replace(/ö/gi, 'oe')
          .replace(/ü/gi, 'ue')
          .replace(/ß/g, 'ss'),
      );
    }

    if (/^prim/i.test(base)) {
      add('Primzahl');
      add('primzahl');
      add('Prim');
    }
    if (lower === 'ziffern' || lower === 'ziffer') {
      add('Ziffern');
      add('Ziffer');
    }
  }

  return [...out];
}

function solutionDisplayHtml(answers: string[]): string {
  return answers.map((a) => escapeHtml(a)).join(' / ');
}

const GRID_STYLE = `
.exam-task-grid{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto;border:1.5px solid #111;margin:12px 0 14px;}
.exam-task-grid-cell{padding:10px 12px;border:1px solid #111;min-height:72px;font-size:13px;line-height:1.55;vertical-align:top;}
.exam-subsection{margin-bottom:12px;}
.exam-subsection:last-child{margin-bottom:0;}
.exam-subsection-title{font-weight:700;margin-bottom:6px;}
.exam-round-line{margin:4px 0;display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
.exam-round-line input{min-width:120px;}
.exam-cloze-line{margin:6px 0;line-height:1.8;}
.exam-cloze-line input{min-width:72px;margin:0 4px;}
`;

export function demoNatuerlicheZahlenTask1(): ExamGridTaskSpec {
  return {
    taskNumber: 1,
    points: 15,
    afbLevel: 1,
    subsections: [
      {
        id: 's-a',
        letter: 'A',
        title: 'Runde die Zahlen:',
        quadrant: 'tl',
        kind: 'round-lines',
        lines: [
          { text: '66666 auf Hunderter =', solution: '66700' },
          { text: '66666 auf Tausender =', solution: '67000' },
          { text: '66666 auf Zehntausender =', solution: '70000' },
        ],
      },
      {
        id: 's-b',
        letter: 'B',
        title: 'Setze das richtige Vergleichszeichen ein:',
        quadrant: 'tr',
        kind: 'compare',
        rows: [
          { left: '3 469', right: '34 911', solution: '<' },
          { left: '12 345', right: '12 345', solution: '=' },
        ],
      },
      {
        id: 's-c',
        letter: 'C',
        title: 'Schreibe die Zahlen von der kleinsten zur größten auf:',
        quadrant: 'tr',
        kind: 'sort',
        given: '391, 589, 389, 399',
        solution: '389, 391, 399, 589',
      },
      {
        id: 's-d',
        letter: 'D',
        title: 'Schreibe die Zahl in Worten:',
        quadrant: 'bl',
        kind: 'one-line',
        prompt: '13 007',
        solution: 'dreizehntausendsieben',
      },
      {
        id: 's-e',
        letter: 'E',
        title: 'Schreibe als Zahl:',
        quadrant: 'bl',
        kind: 'one-line',
        prompt: 'vierhundertfünfundzwanzigtausenddrei',
        solution: '425003',
      },
      {
        id: 's-f',
        letter: 'F',
        title: 'Nenne:',
        quadrant: 'br',
        kind: 'bullet-blanks',
        items: [
          { text: 'Die kleinste natürliche Zahl:', solution: '1' },
          { text: 'Die größte dreistellige Zahl:', solution: '999' },
        ],
      },
      {
        id: 's-g',
        letter: 'G',
        title: 'Vervollständige die Lücken:',
        quadrant: 'br',
        kind: 'cloze',
        template:
          'Die Zahl 13 ist zusammengesetzt aus den beiden ___ 1 und 3. Die Zahl 17 ist eine ___ Zahl.',
        solutions: ['Ziffern / Ziffer', 'Primzahl / Prim'],
      },
    ],
  };
}

type BuiltField = { id: string; answers: string[]; solutionHtml: string };

function allocId(taskNumber: number, index: number): string {
  const suffix = index < 26 ? String.fromCharCode(97 + index) : `z${index}`;
  return `a${taskNumber}${suffix}`;
}

function renderSubsection(sub: GridSubsection, taskNumber: number, fieldIndex: { n: number }): {
  html: string;
  fields: BuiltField[];
} {
  const fields: BuiltField[] = [];
  const title = `<div class="exam-subsection-title">${escapeHtml(sub.letter)}) ${escapeHtml(sub.title)}</div>`;
  let body = '';

  if (sub.kind === 'round-lines') {
    body = sub.lines
      .map((line) => {
        const id = allocId(taskNumber, fieldIndex.n++);
        const answers = parseSolutionAlternatives(line.solution, 'number');
        fields.push({
          id,
          answers,
          solutionHtml: `${allowBasicHtml(line.text)} <strong>${solutionDisplayHtml(answers)}</strong>`,
        });
        return `<div class="exam-round-line"><span>${allowBasicHtml(line.text)}</span><input type="text" id="${id}" class="blank-wide" autocomplete="off"></div>`;
      })
      .join('');
  } else if (sub.kind === 'compare') {
    body = sub.rows
      .map((row) => {
        const id = allocId(taskNumber, fieldIndex.n++);
        fields.push({
          id,
          answers: [row.solution],
          solutionHtml: `${escapeHtml(row.left)} <strong>${row.solution}</strong> ${escapeHtml(row.right)}`,
        });
        return `<div class="item input-group"><span>${escapeHtml(row.left)}</span><span class="compare-choice">
<label><input type="radio" name="${id}" value="&lt;"> &lt;</label>
<label><input type="radio" name="${id}" value="&gt;"> &gt;</label>
<label><input type="radio" name="${id}" value="="> =</label>
</span><span>${escapeHtml(row.right)}</span></div>`;
      })
      .join('');
  } else if (sub.kind === 'sort') {
    const id = allocId(taskNumber, fieldIndex.n++);
    const answers = parseSolutionAlternatives(sub.solution, 'sort');
    fields.push({ id, answers, solutionHtml: `<strong>${solutionDisplayHtml(answers)}</strong>` });
    body = `<p style="margin:0 0 6px;">${escapeHtml(sub.given)}</p><input type="text" id="${id}" class="blank-wide" style="width:100%;max-width:100%;" autocomplete="off">`;
  } else if (sub.kind === 'one-line') {
    const id = allocId(taskNumber, fieldIndex.n++);
    const answers = parseSolutionAlternatives(sub.solution, 'text');
    fields.push({ id, answers, solutionHtml: `<strong>${solutionDisplayHtml(answers)}</strong>` });
    body = `<p style="margin:0 0 6px;">${allowBasicHtml(sub.prompt)}</p><input type="text" id="${id}" class="blank-wide" style="width:100%;max-width:100%;" autocomplete="off">`;
  } else if (sub.kind === 'bullet-blanks') {
    body = `<ul style="margin:4px 0 0 18px;padding:0;">${sub.items
      .map((item) => {
        const id = allocId(taskNumber, fieldIndex.n++);
        const answers = parseSolutionAlternatives(item.solution, 'number');
        fields.push({
          id,
          answers,
          solutionHtml: `${escapeHtml(item.text)} <strong>${solutionDisplayHtml(answers)}</strong>`,
        });
        return `<li style="margin:4px 0;">${escapeHtml(item.text)} <input type="text" id="${id}" autocomplete="off"></li>`;
      })
      .join('')}</ul>`;
  } else if (sub.kind === 'cloze') {
    const parts = sub.template.split('___');
    let clozeHtml = '';
    parts.forEach((part, i) => {
      clozeHtml += escapeHtml(part);
      if (i < parts.length - 1) {
        const id = allocId(taskNumber, fieldIndex.n++);
        const sol = sub.solutions[i] || '';
        const answers = parseSolutionAlternatives(sol, 'text');
        fields.push({
          id,
          answers,
          solutionHtml: answers.length ? `<strong>${solutionDisplayHtml(answers)}</strong>` : '…',
        });
        clozeHtml += `<input type="text" id="${id}" autocomplete="off">`;
      }
    });
    body = `<div class="exam-cloze-line">${clozeHtml}</div>`;
  }

  return { html: `<div class="exam-subsection">${title}${body}</div>`, fields };
}

export function buildExamGridTaskHtml(spec: ExamGridTaskSpec): {
  taskHtml: string;
  correctAnswers: Record<string, string[]>;
  solutionLines: string[];
} {
  const fieldIndex = { n: 0 };
  const byQ: Record<GridQuadrant, string[]> = { tl: [], tr: [], bl: [], br: [] };
  const allFields: BuiltField[] = [];
  const solutionLines: string[] = [];

  for (const sub of spec.subsections) {
    const built = renderSubsection(sub, spec.taskNumber, fieldIndex);
    byQ[sub.quadrant].push(built.html);
    allFields.push(...built.fields);
    built.fields.forEach((f, i) => {
      const label = `${sub.letter}${sub.kind === 'round-lines' || sub.kind === 'bullet-blanks' ? String.fromCharCode(97 + i) : ''})`;
      solutionLines.push(`${label} ${f.solutionHtml}`);
    });
  }

  const cell = (q: GridQuadrant) => byQ[q].join('') || '&nbsp;';
  const afbRoman = spec.afbLevel === 1 ? 'I' : spec.afbLevel === 2 ? 'II' : 'III';

  const grid = `
<style>${GRID_STYLE}</style>
<div class="exam-task-grid">
  <div class="exam-task-grid-cell">${cell('tl')}</div>
  <div class="exam-task-grid-cell">${cell('tr')}</div>
  <div class="exam-task-grid-cell">${cell('bl')}</div>
  <div class="exam-task-grid-cell">${cell('br')}</div>
</div>`;

  const solution = `
            <div class="solution">
                <h4>Musterlösung:</h4>
                ${solutionLines.map((l) => `<p>${l}</p>`).join('\n                ')}
            </div>`;

  const taskHtml = `    <!-- Aufgabe ${spec.taskNumber}: Raster 2×2 -->
    <div class="task">
        <div class="task-header">
            <div class="task-number">Aufgabe ${spec.taskNumber} <span style="font-size: 11px; color: #666; font-weight: normal;">(${spec.points} Punkte)</span></div>
            <div class="task-meta teacher-only">
                <span class="afb-badge afb-${spec.afbLevel}">AFB ${afbRoman}</span>
                <div class="points">${spec.points} Punkte</div>
            </div>
        </div>
        <div class="task-content">
${grid}
${solution}
        </div>
    </div>`;

  const correctAnswers: Record<string, string[]> = {};
  allFields.forEach((f) => {
    correctAnswers[f.id] = f.answers.filter(Boolean);
  });

  return { taskHtml, correctAnswers, solutionLines };
}
