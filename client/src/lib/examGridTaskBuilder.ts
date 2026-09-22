/** 2×2-Raster-Aufgaben für KA-HTML (wie Klassenarbeit-Layout). */

export type GridQuadrant = 'tl' | 'tr' | 'bl' | 'br';

export type GridSubsectionImage = {
  src: string;
  align: 'left' | 'right';
};

type SubImage = { image?: GridSubsectionImage };

export type GridSubsection =
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'round-lines';
      lines: { text: string; solution: string }[];
    } & SubImage
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'compare';
      rows: { left: string; right: string; solution: '<' | '>' | '=' }[];
    } & SubImage
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'sort';
      given: string;
      solution: string;
      /** text = freies Feld; drag = Zahlen in Slots ziehen */
      interaction?: 'text' | 'drag';
    } & SubImage
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'one-line';
      prompt: string;
      solution: string;
    } & SubImage
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'bullet-blanks';
      items: { text: string; solution: string }[];
    } & SubImage
  | {
      id: string;
      letter: string;
      title: string;
      quadrant: GridQuadrant;
      kind: 'cloze';
      /** Text mit ___ für Lücken */
      template: string;
      solutions: string[];
    } & SubImage;

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

/** Leere Raster-Aufgabe (eine Teil-Box) für eine neue Aufgaben-Nr. */
export function createBlankExamGridTask(taskNumber: number): ExamGridTaskSpec {
  return {
    taskNumber,
    points: 5,
    afbLevel: 1,
    subsections: [
      {
        id: `sub-blank-${Date.now()}`,
        letter: 'A',
        title: '',
        quadrant: 'tl',
        kind: 'round-lines',
        lines: [{ text: '', solution: '' }],
      },
    ],
  };
}

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
        interaction: 'drag',
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

function splitListTokens(raw: string): string[] {
  return String(raw || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildSubsectionShell(sub: GridSubsection, titleHtml: string, bodyHtml: string): string {
  const core = `${titleHtml}${bodyHtml}`;
  const img = sub.image?.src?.trim();
  if (!img) {
    return `<div class="exam-subsection">${core}</div>`;
  }
  const align = sub.image?.align === 'right' ? 'right' : 'left';
  const imgTag = `<img class="exam-subsection-image" src="${escapeHtml(img)}" alt="" loading="lazy">`;
  const bodyWrap = `<div class="exam-subsection-media-body">${core}</div>`;
  const mediaInner =
    align === 'left' ? `${imgTag}${bodyWrap}` : `${bodyWrap}${imgTag}`;
  return `<div class="exam-subsection exam-subsection-has-image"><div class="exam-subsection-media exam-subsection-media-${align}">${mediaInner}</div></div>`;
}

function renderSubsection(sub: GridSubsection, taskNumber: number, fieldIndex: { n: number }): {
  html: string;
  fields: BuiltField[];
} {
  const fields: BuiltField[] = [];
  const title = `<div class="exam-subsection-title"><span class="item-label">${escapeHtml(sub.letter)})</span> ${escapeHtml(sub.title)}</div>`;
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
        return `<div class="exam-round-line item input-group"><span>${allowBasicHtml(line.text)}</span><input type="text" id="${id}" class="blank-wide" autocomplete="off"></div>`;
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
<label><input type="radio" name="${id}" value="<"> &lt;</label>
<label><input type="radio" name="${id}" value=">"> &gt;</label>
<label><input type="radio" name="${id}" value="="> =</label>
</span><span>${escapeHtml(row.right)}</span></div>`;
      })
      .join('');
  } else if (sub.kind === 'sort') {
    const id = allocId(taskNumber, fieldIndex.n++);
    const answers = parseSolutionAlternatives(sub.solution, 'sort');
    fields.push({ id, answers, solutionHtml: `<strong>${solutionDisplayHtml(answers)}</strong>` });
    const tokens = splitListTokens(sub.given);
    if (sub.interaction === 'drag' && tokens.length > 0) {
      const solTokens = splitListTokens(sub.solution.split('/')[0] || sub.solution);
      const slotCount = Math.max(solTokens.length, tokens.length);
      const chips = tokens
        .map(
          (t) =>
            `<span class="exam-sort-chip" draggable="true" role="button" tabindex="0" data-value="${escapeHtml(t)}">${escapeHtml(t)}</span>`,
        )
        .join('');
      const slots = Array.from(
        { length: slotCount },
        (_, i) =>
          `<div class="exam-sort-slot" data-slot="${i}" aria-label="Position ${i + 1}"></div>`,
      ).join('');
      body = `<div class="exam-sort-drag" data-answer-id="${id}">
<div class="exam-sort-pool" aria-label="Zahlen zum Ziehen">${chips}</div>
<div class="exam-sort-slots-row" aria-label="Reihenfolge von klein nach groß">${slots}</div>
<input type="hidden" id="${id}" value="">
</div><p class="exam-sort-hint">Zahl anklicken, dann leeren Slot anklicken (oder Drag &amp; Drop).</p>`;
    } else {
      body = `<div class="item input-group full-width"><p style="margin:0 0 6px;">${escapeHtml(sub.given)}</p><input type="text" id="${id}" class="blank-wide" autocomplete="off"></div>`;
    }
  } else if (sub.kind === 'one-line') {
    const id = allocId(taskNumber, fieldIndex.n++);
    const answers = parseSolutionAlternatives(sub.solution, 'text');
    fields.push({ id, answers, solutionHtml: `<strong>${solutionDisplayHtml(answers)}</strong>` });
    body = `<div class="item input-group full-width"><p style="margin:0 0 6px;">${allowBasicHtml(sub.prompt)}</p><input type="text" id="${id}" class="blank-wide" autocomplete="off"></div>`;
  } else if (sub.kind === 'bullet-blanks') {
    body = `<ul class="exam-grid-blank-list">${sub.items
      .map((item) => {
        const id = allocId(taskNumber, fieldIndex.n++);
        const answers = parseSolutionAlternatives(item.solution, 'number');
        fields.push({
          id,
          answers,
          solutionHtml: `${escapeHtml(item.text)} <strong>${solutionDisplayHtml(answers)}</strong>`,
        });
        return `<li>${escapeHtml(item.text)} <input type="text" id="${id}" class="blank-tiny" autocomplete="off"></li>`;
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
        clozeHtml += `<input type="text" id="${id}" class="blank-tiny" autocomplete="off">`;
      }
    });
    body = `<div class="exam-cloze-line">${clozeHtml}</div>`;
  }

  return { html: buildSubsectionShell(sub, title, body), fields };
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
      const subLabel =
        sub.kind === 'round-lines' || sub.kind === 'bullet-blanks'
          ? `${sub.letter} ${String.fromCharCode(97 + i)})`
          : `${sub.letter})`;
      solutionLines.push(`${subLabel} ${f.solutionHtml}`);
    });
  }

  const cell = (q: GridQuadrant) => byQ[q].join('') || '&nbsp;';
  const afbRoman = spec.afbLevel === 1 ? 'I' : spec.afbLevel === 2 ? 'II' : 'III';

  const grid = `
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

  const taskHtml = `    <!-- Aufgabe ${spec.taskNumber} -->
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

const TASK_BLOCK_END =
  '(?=<!-- Aufgabe \\d|<div class="submit-section">|<div class="footer">|$)';

export function extractExamTaskHtml(fullHtml: string, taskNumber: number): string | null {
  const re = new RegExp(
    `<!-- Aufgabe ${taskNumber}\\s*(?::[^>]*)?\\s*-->[\\s\\S]*?${TASK_BLOCK_END}`,
    'i',
  );
  const m = fullHtml.match(re);
  return m ? m[0] : null;
}

export function extractCorrectAnswersMap(fullHtml: string): Record<string, string[]> {
  const block = fullHtml.match(/const correctAnswers = \{([\s\S]*?)\};/);
  if (!block) return {};
  const out: Record<string, string[]> = {};
  const entryRe = /([a-zA-Z]\w*)\s*:\s*\[([^\]]*)\]/g;
  let em: RegExpExecArray | null;
  while ((em = entryRe.exec(block[1])) !== null) {
    const key = em[1];
    const inner = em[2];
    const vals = inner
      .split(',')
      .map((s) =>
        s
          .trim()
          .replace(/^'/, '')
          .replace(/'$/, '')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, '\\'),
      )
      .filter((v) => v.length > 0);
    out[key] = vals;
  }
  return out;
}

function answersToSolutionField(answers: Record<string, string[]>, id: string): string {
  const vals = answers[id] || [];
  if (!vals.length) return '';
  const seen = new Set<string>();
  const manual: string[] = [];
  for (const v of vals) {
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    manual.push(t);
  }
  return manual.join(' / ');
}

function parseSubImage(subEl: Element): GridSubsectionImage | undefined {
  const img = subEl.querySelector('.exam-subsection-image');
  if (!img) return undefined;
  const src = img.getAttribute('src')?.trim();
  if (!src) return undefined;
  const media = subEl.querySelector('.exam-subsection-media');
  const align = media?.classList.contains('exam-subsection-media-right') ? 'right' : 'left';
  return { src, align };
}

function attachImage<T extends GridSubsection>(subEl: Element, sub: T): T {
  const image = parseSubImage(subEl);
  return image ? { ...sub, image } : sub;
}

function parseSubTitle(subEl: Element): { letter: string; title: string } {
  const titleEl = subEl.querySelector('.exam-subsection-title');
  if (!titleEl) return { letter: 'A', title: '' };
  const labelEl = titleEl.querySelector('.item-label');
  const labelText = (labelEl?.textContent || 'A)').trim();
  const letter = labelText.replace(/\)\s*$/, '').trim() || 'A';
  let title = (titleEl.textContent || '').trim();
  if (labelText) title = title.replace(labelText, '').trim();
  return { letter, title };
}

function parseSubsection(
  subEl: Element,
  quadrant: GridQuadrant,
  answers: Record<string, string[]>,
): GridSubsection {
  const { letter, title } = parseSubTitle(subEl);
  const id = `sub-${letter}-${quadrant}-${Math.random().toString(36).slice(2, 7)}`;

  const dragSort = subEl.querySelector('.exam-sort-drag');
  if (dragSort) {
    const answerId = dragSort.getAttribute('data-answer-id') || '';
    const chips = dragSort.querySelectorAll('.exam-sort-chip');
    const given = Array.from(chips)
      .map((c) => c.getAttribute('data-value') || c.textContent?.trim() || '')
      .filter(Boolean)
      .join(', ');
    const solution = answersToSolutionField(answers, answerId);
    return attachImage(subEl, {
      id,
      letter,
      title,
      quadrant,
      kind: 'sort',
      given,
      solution,
      interaction: 'drag',
    });
  }

  const roundLines = subEl.querySelectorAll('.exam-round-line');
  if (roundLines.length > 0) {
    const lines = Array.from(roundLines).map((line) => {
      const input = line.querySelector('input');
      const idAttr = input?.id || '';
      const spans = line.querySelectorAll('span');
      const text = spans[0]?.textContent?.trim() || '';
      return { text, solution: answersToSolutionField(answers, idAttr) };
    });
    return attachImage(subEl, { id, letter, title, quadrant, kind: 'round-lines', lines });
  }

  const compareRows = subEl.querySelectorAll('.item.input-group');
  const hasCompare = Array.from(compareRows).some((r) => r.querySelector('.compare-choice'));
  if (hasCompare) {
    const rows = Array.from(compareRows)
      .filter((r) => r.querySelector('.compare-choice'))
      .map((row) => {
        const spans = row.querySelectorAll(':scope > span:not(.compare-choice)');
        const left = spans[0]?.textContent?.trim() || '';
        const right = spans[1]?.textContent?.trim() || '';
        const radio = row.querySelector('.compare-choice input[type="radio"]') as HTMLInputElement | null;
        const name = radio?.name || '';
        const raw = answers[name]?.[0] || radio?.value || '<';
        const solution = (raw === '>' || raw === '=' ? raw : '<') as '<' | '>' | '=';
        return { left, right, solution };
      });
    return attachImage(subEl, { id, letter, title, quadrant, kind: 'compare', rows });
  }

  const bulletList = subEl.querySelector('.exam-grid-blank-list');
  if (bulletList) {
    const items = Array.from(bulletList.querySelectorAll('li')).map((li) => {
      const input = li.querySelector('input');
      const idAttr = input?.id || '';
      const clone = li.cloneNode(true) as Element;
      clone.querySelectorAll('input').forEach((inp) => inp.remove());
      const text = (clone.textContent || '').trim();
      return { text, solution: answersToSolutionField(answers, idAttr) };
    });
    return attachImage(subEl, { id, letter, title, quadrant, kind: 'bullet-blanks', items });
  }

  const cloze = subEl.querySelector('.exam-cloze-line');
  if (cloze) {
    const solutions: string[] = [];
    const parts: string[] = [];
    cloze.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'INPUT') {
        const inp = node as HTMLInputElement;
        solutions.push(answersToSolutionField(answers, inp.id));
        parts.push('___');
      } else {
        parts.push(node.textContent || '');
      }
    });
    return attachImage(subEl, {
      id,
      letter,
      title,
      quadrant,
      kind: 'cloze',
      template: parts.join('').trim(),
      solutions,
    });
  }

  const fullWidth = subEl.querySelector('.item.input-group.full-width');
  if (fullWidth) {
    const input = fullWidth.querySelector('input');
    const idAttr = input?.id || '';
    const p = fullWidth.querySelector('p');
    const prompt = (p?.textContent || '').trim();
    const solution = answersToSolutionField(answers, idAttr);
    if (prompt && /[\d,;]/.test(prompt) && prompt.split(/[,;]/).length >= 2) {
      return attachImage(subEl, {
        id,
        letter,
        title,
        quadrant,
        kind: 'sort',
        given: prompt,
        solution,
        interaction: 'text',
      });
    }
    return attachImage(subEl, { id, letter, title, quadrant, kind: 'one-line', prompt, solution });
  }

  return attachImage(subEl, { id, letter, title, quadrant, kind: 'one-line', prompt: '', solution: '' });
}

export function listGridTaskNumbersInExamHtml(fullHtml: string): number[] {
  const nums: number[] = [];
  const re =
    /<!-- Aufgabe (\d+)\s*(?::[^>]*)?\s*-->([\s\S]*?)(?=<!-- Aufgabe \d|<div class="submit-section">|<div class="footer">|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullHtml)) !== null) {
    const n = parseInt(m[1], 10);
    if (!Number.isNaN(n) && m[2].includes('exam-task-grid')) nums.push(n);
  }
  return [...new Set(nums)].sort((a, b) => a - b);
}

/** Liest eine gespeicherte Raster-Aufgabe aus der vollständigen Prüfungs-HTML. */
export function parseExamGridTaskFromExamHtml(fullHtml: string, taskNumber: number): ExamGridTaskSpec | null {
  const taskHtml = extractExamTaskHtml(fullHtml, taskNumber);
  if (!taskHtml || !taskHtml.includes('exam-task-grid')) return null;

  const answers = extractCorrectAnswersMap(fullHtml);
  const doc = new DOMParser().parseFromString(taskHtml, 'text/html');

  const pointsMatch = taskHtml.match(/\((\d+)\s*Punkte\)/i);
  const points = pointsMatch ? parseInt(pointsMatch[1], 10) || 5 : 5;

  let afbLevel: 1 | 2 | 3 = 1;
  const afbEl = doc.querySelector('.afb-badge.afb-3, .afb-badge.afb-2, .afb-badge.afb-1');
  if (afbEl?.classList.contains('afb-3')) afbLevel = 3;
  else if (afbEl?.classList.contains('afb-2')) afbLevel = 2;

  const grid = doc.querySelector('.exam-task-grid');
  if (!grid) return null;

  const cells = grid.querySelectorAll('.exam-task-grid-cell');
  const quadrants: GridQuadrant[] = ['tl', 'tr', 'bl', 'br'];
  const subsections: GridSubsection[] = [];

  cells.forEach((cell, idx) => {
    const q = quadrants[idx] || 'tl';
    cell.querySelectorAll('.exam-subsection').forEach((subEl) => {
      subsections.push(parseSubsection(subEl, q, answers));
    });
  });

  if (!subsections.length) return null;

  return { taskNumber, points, afbLevel, subsections };
}
