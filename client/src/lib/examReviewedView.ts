import { examAnswerMatches, formatExamCorrect, parseExamAnswerKey } from './examAnswerKey';

export type ExamReviewCorrection = {
  taskNumber: string;
  manualPoints: number | null;
  comment: string | null;
};

export type ExamReviewedViewOpts = {
  filePath: string;
  title: string;
  answers: Record<string, unknown>;
  corrections: ExamReviewCorrection[];
  gradeLabel: string;
  totalPoints: number;
  maxPoints: number;
  classAverageText?: string;
};

function normAnswer(v: unknown): string {
  return String(v ?? '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .trim();
}

/** Property-Änderungen müssen als Attribute gesetzt werden, sonst gehen sie in outerHTML/srcDoc verloren. */
function persistInputValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  raw: string,
  checked?: boolean,
) {
  const value = normAnswer(raw);
  if (el instanceof HTMLTextAreaElement) {
    el.value = value;
    el.textContent = value;
    return;
  }
  if (el.type === 'checkbox' || el.type === 'radio') {
    const on = checked ?? (el.value === value || value === 'true' || value === '1');
    el.checked = on;
    if (on) el.setAttribute('checked', 'checked');
    else el.removeAttribute('checked');
    return;
  }
  el.value = value;
  el.setAttribute('value', value);
}

function fillAndMark(
  doc: Document,
  answers: Record<string, unknown>,
  key: ReturnType<typeof parseExamAnswerKey>,
  corrections: ExamReviewCorrection[],
) {
  const corrByTask: Record<string, number> = {};
  corrections.forEach((c) => {
    if (c.manualPoints == null) return;
    const tn = String(c.taskNumber || '');
    corrByTask[tn] = c.manualPoints;
    const m = tn.match(/^(\d+)([a-z])?$/i);
    if (m) {
      corrByTask[`a${m[1]}${m[2] || ''}`] = c.manualPoints;
      if (m[2]) corrByTask[`${m[1]}${m[2]}`] = c.manualPoints;
    }
  });

  Object.entries(answers || {}).forEach(([taskId, raw]) => {
    const value = normAnswer(raw);
    const expected = key.answers[taskId];
    const maxPts = key.points[taskId] ?? 1;
    let isCorrect = expected !== undefined ? examAnswerMatches(expected, raw) : false;
    let achieved = isCorrect ? maxPts : 0;
    if (corrByTask[taskId] != null) {
      achieved = corrByTask[taskId];
      isCorrect = achieved > 0;
    } else {
      const num = taskId.match(/^a(\d+)([a-z]?)$/i);
      if (num) {
        const alt = `${num[1]}${num[2] || ''}`;
        if (corrByTask[alt] != null) {
          achieved = corrByTask[alt];
          isCorrect = achieved > 0;
        } else if (corrByTask[num[1]] != null && !num[2]) {
          achieved = corrByTask[num[1]];
          isCorrect = achieved > 0;
        }
      }
    }

    const byId = doc.getElementById(taskId) as HTMLInputElement | HTMLTextAreaElement | null;
    const radios = doc.querySelectorAll(`input[name="${CSS.escape(taskId)}"]`);

    const markEl = (el: HTMLElement) => {
      el.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
      el.setAttribute('readonly', 'readonly');
      el.setAttribute('disabled', 'disabled');
      (el as HTMLInputElement).readOnly = true;
      (el as HTMLInputElement).disabled = true;
    };

    /** Nach Feld + ggf. Index-Span (sub/sup), damit ₂/₁₀ nicht verrutschen. */
    const anchorAfterField = (el: Element): Element => {
      let last: Element = el;
      let n = el.nextElementSibling;
      while (
        n &&
        n.tagName === 'SPAN' &&
        !n.classList.contains('points-badge') &&
        !n.classList.contains('jm-correct-solution') &&
        (n.querySelector('sub, sup') || /^sub|sup$/i.test(n.tagName))
      ) {
        last = n;
        n = n.nextElementSibling;
      }
      return last;
    };

    const insertAfter = (anchor: Element, node: HTMLElement) => {
      anchor.parentElement?.insertBefore(node, anchor.nextSibling);
    };

    const insertSolutionHint = (anchor: Element | null) => {
      if (isCorrect || expected === undefined || !anchor) return;
      const solutionText = formatExamCorrect(expected);
      if (!solutionText) return;
      const hint = doc.createElement('span');
      hint.className = 'jm-correct-solution';
      hint.textContent = `Lösung: ${solutionText}`;
      hint.setAttribute('title', `Richtige Lösung: ${solutionText}`);
      insertAfter(anchor, hint);
    };

    if (byId) {
      if (byId instanceof HTMLInputElement && (byId.type === 'checkbox' || byId.type === 'radio')) {
        persistInputValue(byId, value);
      } else {
        persistInputValue(byId, value);
      }
      markEl(byId);
      const badge = doc.createElement('span');
      badge.className = `points-badge ${achieved > 0 ? 'points-correct' : 'points-incorrect'}`;
      badge.textContent = `${achieved}/${maxPts}`;
      const anchor = anchorAfterField(byId);
      insertAfter(anchor, badge);
      insertSolutionHint(badge);
      return;
    }

    if (radios.length) {
      radios.forEach((node) => {
        const input = node as HTMLInputElement;
        const match = normAnswer(input.value) === value;
        persistInputValue(input, value, match);
        input.disabled = true;
        input.setAttribute('disabled', 'disabled');
        if (match) markEl(input);
        const lab = input.closest('label') || input.parentElement;
        if (lab && match) {
          lab.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
        }
        if (!isCorrect && expected !== undefined) {
          const ok = examAnswerMatches(expected, input.value);
          if (ok) {
            const okLab = input.closest('label') || input.parentElement;
            okLab?.classList.add('jm-solution-option');
          }
        }
      });
      const wrap =
        radios[0]?.closest('.compare-choice, .input-group, .item') || radios[0]?.parentElement;
      if (wrap) {
        const badge = doc.createElement('span');
        badge.className = `points-badge ${achieved > 0 ? 'points-correct' : 'points-incorrect'}`;
        badge.textContent = `${achieved}/${maxPts}`;
        wrap.appendChild(badge);
        insertSolutionHint(badge);
      }
    }
  });
}

/** Baut die fertige Korrektur-HTML (nur lesen) — für Dialog/iframe, ohne Popup. */
export async function buildExamReviewedHtml(opts: ExamReviewedViewOpts): Promise<string> {
  const res = await fetch(
    `/api/file-system-paths/read-html?filePath=${encodeURIComponent(opts.filePath)}`,
  );
  if (!res.ok) throw new Error('Prüfung konnte nicht geladen werden');
  const html = await res.text();
  const key = parseExamAnswerKey(html);

  let answers: Record<string, unknown> = opts.answers || {};
  if (typeof (opts.answers as unknown) === 'string') {
    try {
      answers = JSON.parse(opts.answers as unknown as string) || {};
    } catch {
      answers = {};
    }
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc
    .querySelectorAll(
      '.exam-chrome, .exam-toolbar, .submit-section, .schema-modal, .header-buttons, script',
    )
    .forEach((el) => el.remove());

  // Relative Assets auf Download-API umbiegen (iframe srcDoc hat keine Ordner-URL)
  const folder = opts.filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const rewriteAsset = (raw: string | null): string | null => {
    if (!raw || /^(data:|https?:|blob:|#|\/\/)/i.test(raw)) return raw;
    // App-Root-Assets (z. B. /johnny-logo.png) — in srcDoc absolut zur App
    if (raw.startsWith('/')) {
      return origin ? `${origin}${raw}` : raw;
    }
    const clean = raw.replace(/^\.\//, '');
    const assetPath = `${folder}/${clean}`.replace(/\/+/g, '/');
    return `/api/file-system-paths/download?filePath=${encodeURIComponent(assetPath)}`;
  };
  doc.querySelectorAll('[src]').forEach((el) => {
    const next = rewriteAsset(el.getAttribute('src'));
    if (next) el.setAttribute('src', next);
  });
  doc.querySelectorAll('link[href]').forEach((el) => {
    const next = rewriteAsset(el.getAttribute('href'));
    if (next) el.setAttribute('href', next);
  });
  // Logo sicher setzen (Script-Fallback wurde entfernt)
  const logo = doc.getElementById('jmExamLogo') as HTMLImageElement | null;
  if (logo) {
    logo.setAttribute('src', `${origin}/johnny-logo.png`);
    logo.setAttribute(
      'onerror',
      "this.onerror=null;this.src='https://johnnymonkey.onrender.com/johnny-logo.png';",
    );
  } else {
    doc.querySelectorAll('img.header-logo').forEach((img) => {
      img.setAttribute('src', `${origin}/johnny-logo.png`);
    });
  }

  const style = doc.createElement('style');
  style.textContent = `
    .answer-correct {
      background-color: #c8e6c9 !important;
      outline: 2px solid #4caf50 !important;
      outline-offset: 0;
      border-color: #4caf50 !important;
      color: #1b5e20 !important;
      vertical-align: baseline !important;
    }
    .answer-incorrect {
      background-color: #ffcdd2 !important;
      outline: 2px solid #f44336 !important;
      outline-offset: 0;
      border-color: #f44336 !important;
      color: #b71c1c !important;
      vertical-align: baseline !important;
    }
    label.answer-correct, .compare-choice label.answer-correct {
      background-color: #c8e6c9 !important;
      border-radius: 4px;
      padding: 2px 4px;
    }
    label.answer-incorrect, .compare-choice label.answer-incorrect {
      background-color: #ffcdd2 !important;
      border-radius: 4px;
      padding: 2px 4px;
    }
    .points-badge {
      display: inline;
      margin-left: 6px;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 0.8em;
      font-weight: 600;
      vertical-align: baseline;
      line-height: 1.2;
    }
    .points-correct { background-color: #4caf50; color: #fff; }
    .points-incorrect { background-color: #f44336; color: #fff; }
    .jm-correct-solution {
      display: inline;
      margin-left: 6px;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: 400;
      vertical-align: baseline;
      line-height: 1.2;
      color: #6a1b9a;
      background: #f3e5f5;
      border: 1px solid #ce93d8;
      white-space: nowrap;
    }
    .jm-solution-option,
    label.jm-solution-option {
      background-color: #f3e5f5 !important;
      outline: 1.5px solid #9c27b0 !important;
      border-radius: 4px;
      color: #6a1b9a !important;
      font-weight: 400;
    }
    /* Indizes (₂, ₁₀) wieder auf der Grundlinie halten */
    .item sub, .input-group sub, .exam-paper sub {
      vertical-align: sub !important;
      font-size: smaller !important;
      position: static !important;
      top: auto !important;
    }
    input, textarea, select, button { pointer-events: none !important; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      max-width: none !important;
      background: #f3f3f3;
    }
    .exam-shell {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 10px 12px 28px !important;
      box-sizing: border-box;
    }
    .exam-paper {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      box-sizing: border-box;
    }
    .jm-review-result {
      margin-top: 24px;
      padding: 16px 18px;
      border: 2px solid #2e7d32;
      border-radius: 8px;
      background: #e8f5e9;
      font-family: Arial, sans-serif;
    }
    .jm-review-result .grade {
      font-size: 28px;
      font-weight: 800;
      color: #1b5e20;
    }
    .jm-review-result .meta {
      margin-top: 6px;
      font-size: 14px;
      color: #2e7d32;
      font-weight: 600;
    }
    .jm-review-result .avg {
      margin-top: 4px;
      font-size: 13px;
      color: #546e7a;
    }
  `;
  doc.head.appendChild(style);

  fillAndMark(doc, answers, key, opts.corrections || []);

  doc.querySelectorAll('input, textarea, select, button').forEach((el) => {
    (el as HTMLInputElement).disabled = true;
    (el as HTMLInputElement).readOnly = true;
  });

  const pointsText =
    opts.maxPoints > 0
      ? `${Number(opts.totalPoints || 0).toFixed(1).replace('.', ',')} / ${opts.maxPoints} Punkte`
      : `${Number(opts.totalPoints || 0).toFixed(1).replace('.', ',')} Punkte`;
  const box = doc.createElement('div');
  box.className = 'jm-review-result';
  box.innerHTML = `
    <div class="grade">Note ${opts.gradeLabel || '–'}</div>
    <div class="meta">${pointsText}</div>
    ${
      opts.classAverageText
        ? `<div class="avg">⌀ Klassenschnitt = ${opts.classAverageText}</div>`
        : ''
    }
  `;
  const paper = doc.querySelector('.exam-paper') || doc.body;
  paper.appendChild(box);

  const noteText = doc.getElementById('noteText');
  const noteNumber = doc.getElementById('noteNumber');
  const achieved = doc.getElementById('achievedPoints');
  const total = doc.getElementById('totalPoints');
  if (noteText) noteText.textContent = opts.gradeLabel || '–';
  if (noteNumber) noteNumber.textContent = opts.gradeLabel || '–';
  if (achieved) {
    achieved.textContent = String(Number(opts.totalPoints || 0).toFixed(1)).replace('.', ',');
  }
  if (total && opts.maxPoints > 0) total.textContent = String(opts.maxPoints);

  if (!doc.documentElement.getAttribute('lang')) {
    doc.documentElement.setAttribute('lang', 'de');
  }

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

/** @deprecated Prefer buildExamReviewedHtml + in-app Dialog (no popup). */
export async function openExamReviewedView(opts: ExamReviewedViewOpts): Promise<string> {
  return buildExamReviewedHtml(opts);
}
