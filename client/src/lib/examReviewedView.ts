import { examAnswerMatches, parseExamAnswerKey } from './examAnswerKey';

export type ExamReviewCorrection = {
  taskNumber: string;
  manualPoints: number | null;
  comment: string | null;
};

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
    // a1 / 1 / 1a variants
    const m = tn.match(/^(\d+)([a-z])?$/i);
    if (m) {
      corrByTask[`a${m[1]}${m[2] || ''}`] = c.manualPoints;
      if (m[2]) corrByTask[`${m[1]}${m[2]}`] = c.manualPoints;
    }
  });

  Object.entries(answers || {}).forEach(([taskId, raw]) => {
    const value = raw == null ? '' : String(raw);
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

    if (byId) {
      if (byId instanceof HTMLInputElement && (byId.type === 'checkbox' || byId.type === 'radio')) {
        byId.checked = byId.value === value || value === 'true' || value === '1';
      } else {
        byId.value = value;
      }
      markEl(byId);
      const badge = doc.createElement('span');
      badge.className = `points-badge ${achieved > 0 ? 'points-correct' : 'points-incorrect'}`;
      badge.textContent = `${achieved}/${maxPts}`;
      byId.parentElement?.insertBefore(badge, byId.nextSibling);
      return;
    }

    if (radios.length) {
      radios.forEach((node) => {
        const input = node as HTMLInputElement;
        input.checked = input.value === value;
        input.disabled = true;
        if (input.checked) markEl(input);
        const lab = input.closest('label') || input.parentElement;
        if (lab && input.checked) {
          lab.classList.add(isCorrect ? 'answer-correct' : 'answer-incorrect');
        }
      });
      const wrap = radios[0]?.closest('.compare-choice, .input-group, .item') || radios[0]?.parentElement;
      if (wrap) {
        const badge = doc.createElement('span');
        badge.className = `points-badge ${achieved > 0 ? 'points-correct' : 'points-incorrect'}`;
        badge.textContent = `${achieved}/${maxPts}`;
        wrap.appendChild(badge);
      }
    }
  });
}

/** Öffnet die ausgefüllte, nicht editierbare Korrekturansicht in einem neuen Tab. */
export async function openExamReviewedView(opts: {
  filePath: string;
  title: string;
  answers: Record<string, unknown>;
  corrections: ExamReviewCorrection[];
  gradeLabel: string;
  totalPoints: number;
  maxPoints: number;
  classAverageText?: string;
}): Promise<void> {
  const res = await fetch(
    `/api/file-system-paths/read-html?filePath=${encodeURIComponent(opts.filePath)}`,
  );
  if (!res.ok) throw new Error('Prüfung konnte nicht geladen werden');
  const html = await res.text();
  const key = parseExamAnswerKey(html);

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Lehrer-Chrome / Interaktion entfernen
  doc
    .querySelectorAll(
      '.exam-chrome, .exam-toolbar, .submit-section, .schema-modal, .header-buttons, script',
    )
    .forEach((el) => el.remove());

  const style = doc.createElement('style');
  style.textContent = `
    .answer-correct {
      background-color: #c8e6c9 !important;
      border: 2px solid #4caf50 !important;
      color: #1b5e20 !important;
    }
    .answer-incorrect {
      background-color: #ffcdd2 !important;
      border: 2px solid #f44336 !important;
      color: #b71c1c !important;
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
      display: inline-block;
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.85em;
      font-weight: bold;
      vertical-align: middle;
    }
    .points-correct { background-color: #4caf50; color: #fff; }
    .points-incorrect { background-color: #f44336; color: #fff; }
    input, textarea, select, button { pointer-events: none !important; }
    .exam-paper { margin: 0 auto; }
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

  fillAndMark(doc, opts.answers, key, opts.corrections || []);

  // Alle übrigen Inputs sperren
  doc.querySelectorAll('input, textarea, select, button').forEach((el) => {
    (el as HTMLInputElement).disabled = true;
    (el as HTMLInputElement).readOnly = true;
  });

  // Note unten
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
        ? `<div class="avg">⌀ Klassenschnitt ${opts.classAverageText}</div>`
        : ''
    }
  `;
  const paper = doc.querySelector('.exam-paper') || doc.body;
  paper.appendChild(box);

  // Footer-Note-Felder füllen falls vorhanden
  const noteText = doc.getElementById('noteText');
  const noteNumber = doc.getElementById('noteNumber');
  const achieved = doc.getElementById('achievedPoints');
  const total = doc.getElementById('totalPoints');
  if (noteText) noteText.textContent = opts.gradeLabel || '–';
  if (noteNumber) noteNumber.textContent = opts.gradeLabel || '–';
  if (achieved) achieved.textContent = String(Number(opts.totalPoints || 0).toFixed(1)).replace('.', ',');
  if (total && opts.maxPoints > 0) total.textContent = String(opts.maxPoints);

  const blob = new Blob([`<!DOCTYPE html>${doc.documentElement.outerHTML}`], {
    type: 'text/html;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error('Popup blockiert — bitte Pop-ups erlauben');
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
