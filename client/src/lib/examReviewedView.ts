import {
  examAnswerMatches,
  formatExamCorrect,
  parseExamAnswerKey,
  sortExamAnswerFieldIds,
} from './examAnswerKey';
import { examAnswerScoreFraction } from './examMcPartialScore';
import {
  huKiFieldAutoPoints,
  isHuKiMssExamPath,
  normSortStep,
  primarySortSolutionSteps,
  splitSortPipe,
} from './huKiMssExamScoring';
import {
  essaySolutionFromDoc,
  sortSolutionStepsFromDoc,
  suggestedEssayPointsFromSolution,
  highlightStudentAnswerHtml,
  isManualExamAnswerKey,
} from './examStudentAnswerDisplay';
import {
  EXAM_TEACHER_COMMENT_FONT,
  injectHandwritingFontsIntoDocument,
} from './handwritingFonts';
import {
  EXAM_TEACHER_GRADE_FONT,
  EXAM_TEACHER_GRADE_RED,
  EXAM_TEACHER_RED,
  teacherSignatureImgUrl,
} from './examTeacherSignature';

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
  studentName?: string;
  /** z. B. Lerngruppe „5a“ — wird im Kopf angezeigt */
  learningGroupName?: string;
  /** Lehrer-Korrekturmodus: Punkte-Badges klickbar (postMessage an Parent). */
  teacherCorrectionMode?: boolean;
  /** z. B. „MSS-Punkte“ statt „Note“ in der grünen Box */
  gradeMetricLabel?: string;
};

function formatPointsBadge(achieved: number, maxPts: number): string {
  const fmt = (n: number) => {
    const r = Math.round(n * 100) / 100;
    if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
    return r.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  };
  return `${fmt(achieved)}/${fmt(maxPts)}`;
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

function findSortChip(pool: Element | null, stepText: string): HTMLElement | null {
  if (!pool) return null;
  const want = normSortStep(stepText);
  const found = Array.from(pool.querySelectorAll('.exam-sort-chip')).find((c) => {
    const v = c.getAttribute('data-value') || c.textContent || '';
    return normSortStep(v) === want;
  });
  return (found as HTMLElement) || null;
}

function applyExamSortAnswerToDoc(doc: Document, answerId: string, rawValue: string) {
  const root = doc.querySelector(
    `.exam-sort-drag[data-answer-id="${CSS.escape(answerId)}"]`,
  );
  if (!root) return;
  const steps = splitSortPipe(rawValue);
  const pool = root.querySelector('.exam-sort-pool');
  const slots = root.querySelectorAll('.exam-sort-slot');
  slots.forEach((slot) => {
    slot.querySelectorAll('.exam-sort-chip').forEach((c) => c.remove());
  });
  steps.forEach((text, i) => {
    const slot = slots[i];
    if (!slot) return;
    let chip = findSortChip(pool, text);
    if (!chip) {
      chip = doc.createElement('span');
      chip.className = 'exam-sort-chip jm-sort-chip-synthetic';
      chip.setAttribute('data-value', text);
      chip.textContent = text;
    }
    slot.appendChild(chip);
  });
  const hidden = doc.getElementById(answerId);
  if (hidden instanceof HTMLInputElement) {
    hidden.value = String(rawValue || '');
    hidden.setAttribute('value', String(rawValue || ''));
  }
}

function createInlinePointsControl(
  doc: Document,
  taskId: string,
  achieved: number,
  maxPts: number,
): HTMLElement {
  const wrap = doc.createElement('div');
  wrap.className = 'jm-inline-points-wrap';
  const label = doc.createElement('span');
  label.className = 'jm-essay-teacher-label';
  label.textContent = 'Punkte:';
  const input = doc.createElement('input');
  input.type = 'number';
  input.className = 'jm-inline-points-input';
  input.setAttribute('data-task-id', taskId);
  input.setAttribute('data-max', String(maxPts));
  input.min = '0';
  input.max = String(maxPts);
  input.step = maxPts <= 2 ? '0.5' : '0.25';
  const hasSaved = Number.isFinite(achieved);
  if (hasSaved) input.value = String(achieved);
  const maxHint = doc.createElement('span');
  maxHint.className = 'jm-inline-points-max';
  maxHint.textContent = `/ ${maxPts} P.`;
  wrap.appendChild(label);
  wrap.appendChild(input);
  wrap.appendChild(maxHint);
  return wrap;
}

function buildSortReviewPanel(
  doc: Document,
  answerId: string,
  rawValue: string,
  expected: unknown,
  teacherCorrectionMode: boolean,
  achieved: number,
  maxPts: number,
  savedComment: string,
): HTMLElement {
  const existing = doc.querySelector(`.jm-sort-review-panel[data-for="${CSS.escape(answerId)}"]`);
  existing?.remove();
  const studentSteps = splitSortPipe(rawValue);
  const fromDoc = sortSolutionStepsFromDoc(doc, answerId);
  const correctSteps = fromDoc.length ? fromDoc : primarySortSolutionSteps(expected);
  const panel = doc.createElement('div');
  panel.className = 'jm-sort-review-panel';
  panel.setAttribute('data-for', answerId);

  const studentOl = doc.createElement('ol');
  studentOl.className = 'jm-sort-review-list jm-sort-review-student';
  if (!studentSteps.length) {
    const li = doc.createElement('li');
    li.className = 'jm-student-empty';
    li.textContent = '— keine Angabe —';
    studentOl.appendChild(li);
  } else {
    studentSteps.forEach((step, i) => {
      const li = doc.createElement('li');
      li.className = 'jm-student-input';
      const ok = correctSteps[i] && normSortStep(correctSteps[i]) === normSortStep(step);
      if (correctSteps.length) {
        li.classList.add(ok ? 'answer-correct' : 'answer-incorrect');
      }
      li.textContent = step;
      studentOl.appendChild(li);
    });
  }

  const correctOl = doc.createElement('ol');
  correctOl.className = 'jm-sort-review-list jm-sort-review-correct';
  correctSteps.forEach((step, i) => {
    const li = doc.createElement('li');
    li.textContent = step;
    correctOl.appendChild(li);
  });

  const colStudent = doc.createElement('div');
  colStudent.className = 'jm-sort-review-col';
  colStudent.innerHTML = '<div class="jm-sort-review-heading">Reihenfolge Schüler/in</div>';
  colStudent.appendChild(studentOl);

  const colCorrect = doc.createElement('div');
  colCorrect.className = 'jm-sort-review-col';
  colCorrect.innerHTML = '<div class="jm-sort-review-heading">Richtige Reihenfolge</div>';
  colCorrect.appendChild(correctOl);

  const grid = doc.createElement('div');
  grid.className = 'jm-sort-review-grid';
  grid.appendChild(colStudent);
  grid.appendChild(colCorrect);

  if (teacherCorrectionMode) {
    const colSide = doc.createElement('div');
    colSide.className = 'jm-sort-review-col jm-sort-review-side jm-correction-side-panel';
    colSide.appendChild(createInlinePointsControl(doc, answerId, achieved, maxPts));
    const commentLabel = doc.createElement('span');
    commentLabel.className = 'jm-essay-teacher-label';
    commentLabel.textContent = 'Kommentar:';
    const commentTa = doc.createElement('textarea');
    commentTa.className = 'jm-essay-teacher-comment-input';
    commentTa.setAttribute('data-task-id', answerId);
    commentTa.rows = 2;
    commentTa.placeholder = 'Sichtbar in der Freigabe …';
    commentTa.value = savedComment;
    colSide.appendChild(commentLabel);
    colSide.appendChild(commentTa);
    grid.classList.add('jm-sort-review-grid--with-side');
    grid.appendChild(colSide);
  }

  panel.appendChild(grid);
  return panel;
}

function attachEssayTeacherCorrectionBar(
  doc: Document,
  taskId: string,
  achieved: number,
  maxPts: number,
  commentText: string,
  textarea: HTMLTextAreaElement,
) {
  const block =
    textarea.closest('.exam-essay-block') ||
    textarea.closest('.item.input-group') ||
    textarea.parentElement;
  if (!block) return;
  block.querySelector(`.jm-essay-teacher-layout[data-for="${CSS.escape(taskId)}"]`)?.remove();

  const solution = essaySolutionFromDoc(doc, taskId);
  const studentBox = block.querySelector(
    `.jm-student-answer-body[data-for="${CSS.escape(taskId)}"]`,
  );

  const layout = doc.createElement('div');
  layout.className = 'jm-essay-teacher-layout';
  layout.setAttribute('data-for', taskId);

  const left = doc.createElement('div');
  left.className = 'jm-essay-teacher-left';
  if (studentBox) left.appendChild(studentBox);
  if (solution) {
    const sol = doc.createElement('div');
    sol.className = 'jm-essay-teacher-solution';
    const solLabel = doc.createElement('div');
    solLabel.className = 'jm-essay-teacher-solution-label';
    solLabel.textContent = 'Musterlösung (Lehrkraft)';
    const solBody = doc.createElement('div');
    solBody.className = 'jm-essay-teacher-solution-body';
    solBody.textContent = solution;
    sol.appendChild(solLabel);
    sol.appendChild(solBody);
    left.appendChild(sol);
  }

  const right = doc.createElement('div');
  right.className = 'jm-essay-teacher-right jm-correction-side-panel';
  right.appendChild(createInlinePointsControl(doc, taskId, achieved, maxPts));
  const commentLabel = doc.createElement('span');
  commentLabel.className = 'jm-essay-teacher-label';
  commentLabel.textContent = 'Kommentar:';
  const commentTa = doc.createElement('textarea');
  commentTa.className = 'jm-essay-teacher-comment-input';
  commentTa.setAttribute('data-task-id', taskId);
  commentTa.rows = 2;
  commentTa.placeholder = 'Sichtbar in der Freigabe …';
  commentTa.value = commentText;
  right.appendChild(commentLabel);
  right.appendChild(commentTa);

  layout.appendChild(left);
  layout.appendChild(right);
  block.appendChild(layout);
}

function decorateEssayStudentAnswer(
  doc: Document,
  fieldId: string,
  rawValue: string,
  teacherCorrectionMode: boolean,
) {
  const el = doc.getElementById(fieldId);
  if (!(el instanceof HTMLTextAreaElement)) return;
  el.classList.add('jm-student-input');
  if (!teacherCorrectionMode) return;
  const solution = essaySolutionFromDoc(doc, fieldId);
  const text = normAnswer(rawValue);
  const existing = el.parentElement?.querySelector(
    `.jm-student-answer-body[data-for="${CSS.escape(fieldId)}"]`,
  );
  if (existing) existing.remove();
  const box = doc.createElement('div');
  box.className = 'jm-student-answer-body exam-essay-input';
  box.setAttribute('data-for', fieldId);
  if (text.trim()) {
    box.innerHTML = highlightStudentAnswerHtml(text, solution);
  } else {
    box.innerHTML = '<span class="jm-student-empty">—</span>';
  }
  el.style.display = 'none';
  el.parentElement?.insertBefore(box, el.nextSibling);
}

function syncWfTableRowCheckboxes(row: Element, rawValue: string) {
  const value = normAnswer(rawValue).toUpperCase();
  const w = row.querySelector('.exam-wf-table-wahr input[type="checkbox"]');
  const f = row.querySelector('.exam-wf-table-falsch input[type="checkbox"]');
  if (w instanceof HTMLInputElement) {
    persistInputValue(w, 'W', value === 'W');
  }
  if (f instanceof HTMLInputElement) {
    persistInputValue(f, 'F', value === 'F');
  }
}

function markWfTableRow(
  row: Element,
  rawValue: string,
  markEl: (el: HTMLElement) => void,
) {
  const value = normAnswer(rawValue).toUpperCase();
  row.querySelectorAll('.exam-wf-table-wahr input, .exam-wf-table-falsch input').forEach((node) => {
    const input = node as HTMLInputElement;
    if (input.checked) markEl(input);
    else if (value && normAnswer(input.value) === value) markEl(input);
  });
  if (!value) row.classList.add('answer-incorrect');
}

function restructureExamWfTableForTeacher(doc: Document) {
  doc.querySelectorAll('table.exam-wf-table').forEach((table) => {
    const headRow = table.querySelector('thead tr');
    if (headRow && !headRow.querySelector('.jm-wf-points-head')) {
      const th = doc.createElement('th');
      th.className = 'jm-wf-points-head';
      th.textContent = 'Pkt.';
      headRow.appendChild(th);
    }
    table.querySelectorAll('tbody tr.exam-wf-table-row').forEach((tr) => {
      if (tr.querySelector('.exam-wf-table-wahr')) {
        if (!tr.querySelector('.exam-wf-table-points')) {
          const hidden = tr.querySelector('input[type="hidden"][id^="a1"]');
          const tdP = doc.createElement('td');
          tdP.className = 'exam-wf-table-points';
          if (hidden) tdP.appendChild(hidden);
          tr.appendChild(tdP);
        }
        return;
      }
      const choicesCell = tr.querySelector('td.exam-wf-table-choices');
      if (!choicesCell) return;
      const inline = choicesCell.querySelector('.exam-mc-wf-inline');
      if (!inline) return;
      const opts = Array.from(inline.querySelectorAll('label.exam-mc-option'));
      const hidden = choicesCell.querySelector('input[type="hidden"]');

      const tdW = doc.createElement('td');
      tdW.className = 'exam-wf-table-wahr';
      const tdF = doc.createElement('td');
      tdF.className = 'exam-wf-table-falsch';
      if (opts[0]) tdW.appendChild(opts[0]);
      if (opts[1]) tdF.appendChild(opts[1]);

      const tdP = doc.createElement('td');
      tdP.className = 'exam-wf-table-points';
      if (hidden) tdP.appendChild(hidden);
      const badge = inline.querySelector('.jm-wf-inline-points');
      if (badge) tdP.appendChild(badge);

      choicesCell.replaceWith(tdW, tdF, tdP);
    });
  });
}

function syncMcSelectCheckboxes(doc: Document, taskId: string, rawValue: string) {
  const wrap = doc.querySelector(
    `.exam-multi-select[data-answer-id="${CSS.escape(taskId)}"], .exam-mc-single-select[data-answer-id="${CSS.escape(taskId)}"]`,
  );
  if (!wrap) return;
  const value = normAnswer(rawValue);
  const parts = value
    ? value
        .split('|')
        .map((p) => normAnswer(p))
        .filter(Boolean)
    : [];
  const partSet = new Set(parts);
  wrap.querySelectorAll('input[type="checkbox"]').forEach((node) => {
    const input = node as HTMLInputElement;
    const v = normAnswer(input.value);
    const on = partSet.has(v);
    persistInputValue(input, v, on);
  });
}

function isWfTableFieldId(taskId: string): boolean {
  return /^a1[a-z]$/i.test(taskId);
}

function injectTaskPointsSummaries(
  doc: Document,
  taskAchieved: Record<string, number>,
  taskMax: Record<string, number>,
) {
  doc.querySelectorAll('.task').forEach((taskEl) => {
    const numEl = taskEl.querySelector('.task-number');
    const match = numEl?.textContent?.match(/Aufgabe\s+(\d+)/i);
    const n = match?.[1];
    if (!n || taskMax[n] == null) return;
    const achieved = taskAchieved[n] ?? 0;
    const max = taskMax[n] ?? 0;
    const fmt = (x: number) =>
      (Math.round(x * 100) / 100).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
    const existing = numEl?.querySelector('.jm-task-points-earned');
    existing?.remove();
    const span = doc.createElement('span');
    span.className = 'jm-task-points-earned';
    span.textContent = ` — ${fmt(achieved)} / ${fmt(max)} P.`;
    span.setAttribute('title', `Erreichte Punkte Aufgabe ${n}`);
    numEl?.appendChild(span);
  });
}

function attachPointsBadge(
  badge: HTMLSpanElement,
  taskId: string,
  teacherCorrectionMode: boolean,
  anchor: Element,
  insertAfterFn: (anchor: Element, node: HTMLElement) => void,
) {
  badge.setAttribute('data-jm-task-id', taskId);
  if (teacherCorrectionMode) {
    badge.classList.add('jm-points-badge-editable');
    badge.setAttribute('title', 'Klicken: Punkte und Kommentar bearbeiten');
  }
  insertAfterFn(anchor, badge);
}

function fillAndMark(
  doc: Document,
  answers: Record<string, unknown>,
  key: ReturnType<typeof parseExamAnswerKey>,
  corrections: ExamReviewCorrection[],
  teacherCorrectionMode = false,
  examFilePath = '',
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

  const studentAnswers = answers || {};
  const fieldIds = sortExamAnswerFieldIds(Object.keys(key.answers || {}));
  const taskAchieved: Record<string, number> = {};
  const taskMax: Record<string, number> = {};
  let task1RowSum = 0;
  const huKi = isHuKiMssExamPath(examFilePath);
  const wfInlinePoints: Record<string, { achieved: number; maxPts: number }> = {};

  fieldIds.forEach((taskId) => {
    const raw = studentAnswers[taskId];
    const value = normAnswer(raw);
    const expected = key.answers[taskId];
    const maxPts = key.points[taskId] ?? 1;
    const manualField = isManualExamAnswerKey(expected);
    const savedTaskComment =
      corrections.find((c) => c.taskNumber === taskId)?.comment?.trim() || '';
    const huKiPts =
      expected !== undefined
        ? huKiFieldAutoPoints(examFilePath, taskId, expected, raw, maxPts)
        : null;
    const scoreFrac =
      expected !== undefined ? examAnswerScoreFraction(expected, raw) : 0;
    let isCorrect = scoreFrac >= 1 - 1e-9;
    let achieved = huKiPts != null ? huKiPts : maxPts * scoreFrac;
    if (manualField) {
      const solution = essaySolutionFromDoc(doc, taskId);
      const suggested = suggestedEssayPointsFromSolution(solution, String(raw ?? ''), maxPts);
      achieved = corrByTask[taskId] ?? suggested;
      isCorrect = achieved >= maxPts - 1e-9;
    }
    if (huKiPts != null) {
      isCorrect = achieved >= maxPts - 1e-9;
    }
    if (corrByTask[taskId] != null) {
      achieved = corrByTask[taskId];
      isCorrect = achieved >= maxPts;
    } else {
      const num = taskId.match(/^a(\d+)([a-z]?)$/i);
      if (num) {
        const alt = `${num[1]}${num[2] || ''}`;
        if (corrByTask[alt] != null) {
          achieved = corrByTask[alt];
          isCorrect = achieved >= maxPts;
        } else if (corrByTask[num[1]] != null && !num[2]) {
          achieved = corrByTask[num[1]];
          isCorrect = achieved >= maxPts;
        }
      }
    }

    const isPartial =
      huKiPts != null && achieved < 0
        ? false
        : achieved > 0 && achieved < maxPts - 1e-9;
    if (huKiPts != null && achieved < 0) {
      isCorrect = false;
    }
    if (huKiPts != null && achieved === 0 && normAnswer(raw)) {
      isCorrect = false;
    }

    const taskNumMatch = taskId.match(/^a(\d+)/i);
    if (taskNumMatch) {
      const tn = taskNumMatch[1];
      taskMax[tn] = (taskMax[tn] || 0) + maxPts;
      if (huKi && isWfTableFieldId(taskId)) {
        task1RowSum += achieved;
      } else {
        taskAchieved[tn] = (taskAchieved[tn] || 0) + achieved;
      }
    }

    const byId = doc.getElementById(taskId) as HTMLInputElement | HTMLTextAreaElement | null;
    const radios = doc.querySelectorAll(`input[name="${CSS.escape(taskId)}"]`);

    const markEl = (el: HTMLElement) => {
      el.classList.add(
        isPartial ? 'answer-partial' : isCorrect ? 'answer-correct' : 'answer-incorrect',
      );
      if (
        teacherCorrectionMode &&
        el instanceof HTMLInputElement &&
        (el.type === 'checkbox' || el.type === 'radio')
      ) {
        const lab = el.closest('label');
        lab?.classList.add(
          isPartial ? 'answer-partial' : isCorrect ? 'answer-correct' : 'answer-incorrect',
        );
        return;
      }
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
        const on =
          value === 'true' ||
          value === '1' ||
          (byId.type === 'checkbox' && Boolean(value)) ||
          (byId.type === 'radio' && normAnswer(byId.value) === value);
        persistInputValue(byId, value, on);
      } else if (byId instanceof HTMLTextAreaElement) {
        persistInputValue(byId, value);
        byId.classList.add('jm-student-input');
        decorateEssayStudentAnswer(doc, taskId, value, teacherCorrectionMode);
      } else {
        persistInputValue(byId, value);
        const wfRowEarly =
          byId instanceof HTMLInputElement && byId.type === 'hidden'
            ? byId.closest('tr.exam-wf-table-row')
            : null;
        if (wfRowEarly) {
          syncWfTableRowCheckboxes(wfRowEarly, value);
        } else if (
          byId instanceof HTMLInputElement &&
          (byId.type === 'hidden' || byId.type === 'text')
        ) {
          syncMcSelectCheckboxes(doc, taskId, value);
        }
        if (byId instanceof HTMLInputElement && (byId.type === 'text' || byId.type === 'number')) {
          byId.classList.add('jm-student-input');
        }
      }
      if (taskId === 'a2a') {
        applyExamSortAnswerToDoc(doc, taskId, value);
      }
      const wfSelect = doc.querySelector(
        `.exam-mc-single-select[data-answer-id="${CSS.escape(taskId)}"]`,
      );
      const wfRow =
        byId instanceof HTMLInputElement && byId.type === 'hidden'
          ? byId.closest('tr.exam-wf-table-row')
          : null;
      if (
        !(byId instanceof HTMLInputElement && byId.type === 'hidden') &&
        !wfSelect &&
        !wfRow &&
        !(teacherCorrectionMode && byId instanceof HTMLTextAreaElement)
      ) {
        markEl(byId);
      }
      const mcWrap = doc.querySelector(
        `.exam-multi-select[data-answer-id="${CSS.escape(taskId)}"], .exam-mc-single-select[data-answer-id="${CSS.escape(taskId)}"]`,
      );
      if (mcWrap || wfSelect) {
        const wrap = (wfSelect || mcWrap) as HTMLElement;
        wrap.querySelectorAll('input[type="checkbox"]').forEach((node) => {
          const input = node as HTMLInputElement;
          if (input.checked) markEl(input);
          else if (value && normAnswer(input.value) === value) markEl(input);
        });
        if (!value) {
          wrap.classList.add('answer-incorrect');
        }
      } else if (wfRow) {
        markWfTableRow(wfRow, value, markEl);
      }
      const badge = doc.createElement('span');
      badge.className = `points-badge ${
        achieved < 0
          ? 'points-incorrect'
          : isPartial
            ? 'points-partial'
            : achieved > 0
              ? 'points-correct'
              : 'points-incorrect'
      }`;
      badge.textContent = formatPointsBadge(achieved, maxPts);
      if (manualField && achieved <= 0 && corrByTask[taskId] == null) {
        badge.classList.remove('points-incorrect');
        badge.classList.add('points-partial');
      }
      const sortRoot =
        taskId === 'a2a'
          ? doc.querySelector(`.exam-sort-drag[data-answer-id="${CSS.escape(taskId)}"]`)
          : null;
      if (taskId === 'a2a' && sortRoot) {
        const panel = buildSortReviewPanel(
          doc,
          taskId,
          value,
          expected,
          teacherCorrectionMode,
          achieved,
          maxPts,
          savedTaskComment,
        );
        sortRoot.parentElement?.insertBefore(panel, sortRoot.nextSibling);
        if (!teacherCorrectionMode) {
          const slots = sortRoot.querySelectorAll('.exam-sort-slot');
          const fromDoc = sortSolutionStepsFromDoc(doc, taskId);
          const correctSteps = fromDoc.length ? fromDoc : primarySortSolutionSteps(expected);
          const studentSteps = splitSortPipe(value);
          slots.forEach((slot, i) => {
            const chip = slot.querySelector('.exam-sort-chip');
            if (!chip) return;
            const ok =
              correctSteps[i] &&
              studentSteps[i] &&
              normSortStep(correctSteps[i]) === normSortStep(studentSteps[i]);
            chip.classList.add(ok ? 'answer-correct' : 'answer-incorrect');
          });
          const pointsRow = doc.createElement('div');
          pointsRow.className = 'jm-sort-points-row';
          panel.appendChild(pointsRow);
          attachPointsBadge(badge, taskId, teacherCorrectionMode, pointsRow, (a, n) =>
            a.appendChild(n),
          );
        }
        return;
      } else if (wfSelect || wfRow) {
        const wfHintAnchor =
          (wfSelect as Element) ||
          wfRow?.querySelector('.exam-wf-table-text') ||
          wfRow;
        if (teacherCorrectionMode) {
          wfInlinePoints[taskId] = { achieved, maxPts };
        } else {
          badge.classList.add('jm-wf-inline-points');
          const ptsAnchor =
            wfRow?.querySelector('.exam-wf-table-points') || (wfSelect as Element);
          attachPointsBadge(badge, taskId, false, ptsAnchor as Element, (a, n) =>
            a.appendChild(n),
          );
        }
        if (wfHintAnchor) insertSolutionHint(wfHintAnchor);
      } else if (
        teacherCorrectionMode &&
        byId instanceof HTMLTextAreaElement &&
        (manualField || byId.classList.contains('exam-essay-input'))
      ) {
        attachEssayTeacherCorrectionBar(
          doc,
          taskId,
          achieved,
          maxPts,
          savedTaskComment,
          byId,
        );
        return;
      } else if (teacherCorrectionMode && manualField) {
        const anchor = sortRoot || anchorAfterField(byId);
        attachPointsBadge(badge, taskId, teacherCorrectionMode, anchor, insertAfter);
        insertSolutionHint(sortRoot || byId);
      } else {
        const anchor = sortRoot || anchorAfterField(byId);
        attachPointsBadge(badge, taskId, teacherCorrectionMode, anchor, insertAfter);
        insertSolutionHint(sortRoot || byId);
      }
      return;
    }

    if (radios.length) {
      radios.forEach((node) => {
        const input = node as HTMLInputElement;
        const match = value ? normAnswer(input.value) === value : false;
        if (match) {
          persistInputValue(input, value, true);
        }
        if (!teacherCorrectionMode) {
          input.disabled = true;
          input.setAttribute('disabled', 'disabled');
        }
        if (match) markEl(input);
        const lab = input.closest('label') || input.parentElement;
        if (lab && match) {
          lab.classList.add(
            isPartial ? 'answer-partial' : isCorrect ? 'answer-correct' : 'answer-incorrect',
          );
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
        radios[0]?.closest('.item.input-group') ||
        radios[0]?.closest('.compare-choice, .input-group, .item') ||
        radios[0]?.parentElement;
      if (wrap) {
        if (!value) {
          (wrap as HTMLElement).classList.add('answer-incorrect');
        }
        const badge = doc.createElement('span');
        badge.className = `points-badge ${
          achieved < 0
            ? 'points-incorrect'
            : isPartial
              ? 'points-partial'
              : achieved > 0
                ? 'points-correct'
                : 'points-incorrect'
        }`;
        badge.textContent = formatPointsBadge(achieved, maxPts);
        attachPointsBadge(badge, taskId, teacherCorrectionMode, wrap, (a, n) => a.appendChild(n));
        insertSolutionHint(badge);
      }
      return;
    }
  });

  if (huKi) {
    taskAchieved['1'] = Math.max(0, task1RowSum);
  }

  Object.entries(answers || {}).forEach(([fieldId, raw]) => {
    if (!fieldId.startsWith('examDollar_')) return;
    const el = doc.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    persistInputValue(el, normAnswer(raw));
    el.classList.add('answer-correct');
  });

  if (teacherCorrectionMode) {
    restructureExamWfTableForTeacher(doc);
    Object.entries(wfInlinePoints).forEach(([taskId, { achieved: ap, maxPts: mp }]) => {
      const hidden = doc.getElementById(taskId);
      const tr = hidden?.closest('tr.exam-wf-table-row');
      const tdP = tr?.querySelector('.exam-wf-table-points');
      if (!tdP || tdP.querySelector('.jm-inline-points-input')) return;
      const badge = tdP.querySelector('.jm-wf-inline-points');
      badge?.remove();
      tdP.insertBefore(createInlinePointsControl(doc, taskId, ap, mp), hidden || null);
    });
  }

  injectTaskPointsSummaries(doc, taskAchieved, taskMax);
}

function findTaskCommentAnchor(doc: Document, taskNumber: string): HTMLElement | null {
  const tn = String(taskNumber || '').trim();
  if (!tn || tn === '__general_comment__') return null;
  if (tn === '3_comment') {
    const fields = Array.from(doc.querySelectorAll<HTMLElement>('[id^="a3"]'));
    return fields.length ? fields[fields.length - 1] : null;
  }
  const sub3 = tn.match(/^3([a-d])$/i);
  if (sub3) {
    return (
      doc.getElementById(`a3${sub3[1].toLowerCase()}`) ||
      doc.getElementById(`a3${sub3[1].toUpperCase()}`)
    );
  }
  if (/^\d+$/.test(tn)) {
    const n = tn;
    const re = new RegExp(`^a${n}[a-z]?$`, 'i');
    const candidates = Array.from(doc.querySelectorAll<HTMLElement>(`[id^="a${n}"]`)).filter(
      (el) => re.test(el.id),
    );
    if (candidates.length) return candidates[candidates.length - 1];
    return doc.getElementById(`a${n}`);
  }
  if (/^a\d/i.test(tn)) return doc.getElementById(tn);
  return doc.getElementById(`a${tn}`);
}

function insertTaskTeacherComment(doc: Document, anchor: HTMLElement, text: string): void {
  const wrap = doc.createElement('div');
  wrap.className = 'jm-task-teacher-comment';
  wrap.innerHTML = `<div class="jm-teacher-handwriting">${escapeHtmlText(text)}</div>`;
  const container =
    anchor.closest('.item, .input-group, .aufgabe, .task, section') ?? anchor.parentElement;
  if (!container) return;
  container.appendChild(wrap);
}

function injectPerTaskTeacherComments(doc: Document, corrections: ExamReviewCorrection[]): void {
  const seen = new Set<string>();
  corrections.forEach((c) => {
    const text = (c.comment || '').trim();
    if (!text) return;
    const tn = String(c.taskNumber || '').trim();
    if (!tn || tn === '__general_comment__') return;
    if (seen.has(tn)) return;
    const anchor = findTaskCommentAnchor(doc, tn);
    if (!anchor) return;
    seen.add(tn);
    insertTaskTeacherComment(doc, anchor, text);
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
  injectHandwritingFontsIntoDocument(doc);

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
    .answer-partial {
      background-color: #fff9c4 !important;
      outline: 2px solid #fff176 !important;
      outline-offset: 0;
      border-color: #fff176 !important;
      color: #f57f17 !important;
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
    .points-partial { background-color: #fff176; color: #5d4037; }
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
    html.teacher-correction-mode #jm-general-comment-field,
    html.teacher-correction-mode .jm-general-comment-input,
    html.teacher-correction-mode .jm-essay-teacher-comment-input,
    html.teacher-correction-mode .jm-inline-points-input {
      pointer-events: auto !important;
      cursor: text !important;
    }
    .jm-essay-teacher-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px 12px;
      margin-top: 10px;
      align-items: start;
    }
    @media (max-width: 720px) {
      .jm-essay-teacher-layout { grid-template-columns: 1fr; }
    }
    .jm-essay-teacher-left {
      min-width: 0;
    }
    .jm-correction-side-panel {
      padding: 6px 8px;
      border: 1px solid #90caf9;
      border-radius: 8px;
      background: #fafafa;
      width: 9.25rem;
      max-width: 9.25rem;
      box-sizing: border-box;
    }
    .jm-essay-teacher-right {
    }
    .jm-essay-teacher-solution {
      margin-top: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #ce93d8;
      background: #f3e5f5;
    }
    .jm-essay-teacher-solution-label {
      font-size: 0.75rem;
      font-weight: 800;
      color: #6a1b9a;
      margin-bottom: 4px;
    }
    .jm-essay-teacher-solution-body {
      font-size: 0.88rem;
      line-height: 1.45;
      color: #6a1b9a !important;
      white-space: pre-wrap;
    }
    .jm-inline-points-wrap {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      margin-bottom: 6px;
    }
    .jm-inline-points-input {
      width: 3.1rem;
      padding: 3px 4px;
      font-size: 0.92rem;
      font-weight: 700;
      border: 1px solid #90caf9;
      border-radius: 6px;
      text-align: center;
    }
    .jm-inline-points-max {
      font-size: 0.78rem;
      color: #1565c0;
      font-weight: 700;
    }
    .jm-essay-teacher-label {
      display: block;
      font-size: 0.78rem;
      font-weight: 700;
      color: #1565c0;
      margin: 4px 0 2px;
    }
    .jm-essay-teacher-comment-input {
      display: block;
      width: 100%;
      margin-top: 2px;
      padding: 6px 8px;
      font-family: ${EXAM_TEACHER_COMMENT_FONT};
      font-size: 0.92rem;
      line-height: 1.3;
      color: #424242;
      border: 1px solid #bdbdbd;
      border-radius: 6px;
      background: #fff;
      box-sizing: border-box;
      resize: vertical;
      min-height: 2.6em;
      max-height: 6em;
    }
    html.teacher-correction-mode input[type="checkbox"],
    html.teacher-correction-mode input[type="radio"] {
      pointer-events: none !important;
      opacity: 1 !important;
    }
    html.teacher-correction-mode label.answer-correct input,
    html.teacher-correction-mode label.answer-partial input,
    html.teacher-correction-mode label.answer-incorrect input {
      accent-color: currentColor;
    }
    html.teacher-correction-mode .exam-wf-table {
      table-layout: auto !important;
      width: 100% !important;
      border-collapse: collapse;
    }
    html.teacher-correction-mode .exam-wf-table th,
    html.teacher-correction-mode .exam-wf-table td {
      vertical-align: top;
    }
    html.teacher-correction-mode .exam-wf-table th:nth-child(1),
    html.teacher-correction-mode .exam-wf-table-num {
      width: 1.6em !important;
      min-width: 1.6em !important;
      max-width: 1.6em !important;
      padding: 4px 3px !important;
      font-size: 0.82em !important;
      text-align: center !important;
      white-space: nowrap !important;
    }
    html.teacher-correction-mode .exam-wf-table th:nth-child(2),
    html.teacher-correction-mode .exam-wf-table-text {
      width: auto !important;
      max-width: none !important;
      padding: 4px 8px 4px 4px !important;
      line-height: 1.35 !important;
    }
    html.teacher-correction-mode .exam-wf-table th:nth-child(3),
    html.teacher-correction-mode .exam-wf-table th:nth-child(4),
    html.teacher-correction-mode .exam-wf-table-wahr,
    html.teacher-correction-mode .exam-wf-table-falsch {
      width: 3.1em !important;
      min-width: 3.1em !important;
      max-width: 3.1em !important;
      padding: 4px 2px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
    html.teacher-correction-mode .exam-wf-table th.jm-wf-points-head,
    html.teacher-correction-mode .exam-wf-table-points {
      width: 5.5em !important;
      min-width: 5.5em !important;
      max-width: 5.5em !important;
      padding: 4px 3px !important;
      text-align: center !important;
      vertical-align: middle !important;
    }
    html.teacher-correction-mode .exam-wf-table-wahr .exam-mc-option,
    html.teacher-correction-mode .exam-wf-table-falsch .exam-mc-option {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 0 !important;
    }
    html.teacher-correction-mode .exam-wf-table-wahr input,
    html.teacher-correction-mode .exam-wf-table-falsch input {
      margin: 0 auto !important;
      width: 1.05em !important;
      height: 1.05em !important;
    }
    html.teacher-correction-mode .exam-wf-table-points .jm-inline-points-wrap {
      flex-direction: column;
      align-items: center;
      margin-bottom: 0;
      gap: 2px;
    }
    html.teacher-correction-mode .exam-wf-table-points .jm-essay-teacher-label {
      margin: 0;
      font-size: 0.68rem;
    }
    html.teacher-correction-mode .exam-wf-table-points .jm-inline-points-input {
      width: 2.75rem;
      font-size: 0.85rem;
    }
    html.teacher-correction-mode .exam-wf-table-points .jm-inline-points-max {
      font-size: 0.68rem;
    }
    html.teacher-correction-mode .exam-wf-table .jm-correct-solution {
      display: block;
      margin-top: 2px;
      margin-left: 0;
      font-size: 0.75rem;
    }
    .jm-task-points-earned {
      display: inline-block;
      margin-left: 10px;
      padding: 3px 12px;
      font-size: 1.02rem;
      font-weight: 800;
      color: #1b5e20;
      background: #c8e6c9;
      border: 2px solid #2e7d32;
      border-radius: 8px;
      white-space: nowrap;
      vertical-align: middle;
      box-shadow: 0 1px 2px rgba(46, 125, 50, 0.25);
    }
    html.teacher-correction-mode .exam-subsection:has(.jm-sort-review-panel) .exam-sort-drag,
    html.teacher-correction-mode .exam-subsection:has(.jm-sort-review-panel) .exam-sort-hint {
      display: none !important;
    }
    html.teacher-correction-mode .exam-sort-drag--steps {
      max-width: 100% !important;
    }
    html.teacher-correction-mode .exam-sort-drag--steps .exam-sort-pool {
      opacity: 0.55;
      font-size: 11px;
    }
    html.teacher-correction-mode .exam-sort-slot .exam-sort-chip {
      font-size: 12px !important;
      color: #0d47a1 !important;
      border-color: #1565c0 !important;
      background: #e3f2fd !important;
    }
    html.teacher-correction-mode .exam-sort-slot .exam-sort-chip.answer-correct {
      outline: 2px solid #2e7d32;
      background: #e8f5e9 !important;
    }
    html.teacher-correction-mode .exam-sort-slot .exam-sort-chip.answer-incorrect {
      outline: 2px solid #c62828;
      background: #ffebee !important;
    }
    .jm-sort-review-panel {
      margin: 8px 0 12px;
      padding: 10px 12px;
      border: 1px solid #90caf9;
      border-radius: 8px;
      background: #f5f9ff;
    }
    .jm-sort-review-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 16px;
    }
    .jm-sort-review-grid.jm-sort-review-grid--with-side {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(10rem, 12rem);
    }
    @media (max-width: 640px) {
      .jm-sort-review-grid { grid-template-columns: 1fr; }
      .jm-sort-review-grid.jm-sort-review-grid--with-side { grid-template-columns: 1fr; }
    }
    .jm-sort-review-side {
    }
    .jm-sort-review-heading {
      font-size: 0.78rem;
      font-weight: 800;
      color: #37474f;
      margin-bottom: 4px;
    }
    .jm-sort-review-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.82rem;
      line-height: 1.45;
    }
    .jm-sort-review-student li {
      color: #1565c0 !important;
      font-weight: 600;
      border-radius: 4px;
      padding: 2px 4px;
      margin-bottom: 2px;
    }
    .jm-sort-review-student li.answer-correct { background: #e8f5e9; }
    .jm-sort-review-student li.answer-incorrect { background: #ffebee; }
    .jm-sort-review-correct li {
      color: #6a1b9a !important;
      font-weight: 600;
    }
    .jm-sort-points-row {
      margin-top: 8px;
      display: flex;
      justify-content: flex-end;
    }
    .jm-student-input,
    html.teacher-correction-mode textarea.jm-student-input,
    html.teacher-correction-mode input.jm-student-input,
    html.teacher-correction-mode .jm-student-answer-body {
      color: #1565c0 !important;
      -webkit-text-fill-color: #1565c0;
    }
    .jm-student-keyword {
      color: #0d47a1 !important;
      font-weight: 700;
      -webkit-text-fill-color: #0d47a1;
    }
    .jm-student-empty {
      color: #9e9e9e !important;
      font-style: italic;
    }
    html.teacher-correction-mode .jm-student-answer-body {
      white-space: pre-wrap;
      min-height: 4em;
      padding: 8px 10px;
      border: 1px solid #bdbdbd;
      border-radius: 6px;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
    }
    .jm-points-badge-editable {
      pointer-events: auto !important;
      cursor: pointer !important;
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.35);
    }
    .jm-points-badge-editable:hover {
      filter: brightness(1.05);
    }
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
    .jm-review-head {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      box-sizing: border-box;
    }
    .jm-grade-block {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      column-gap: 5%;
      row-gap: 8px;
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      box-sizing: border-box;
    }
    .jm-grade-note-wrap {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .jm-grade-signature {
      flex: 0 1 auto;
      width: min(260px, 38vw);
      max-height: 96px;
      height: auto;
      object-fit: contain;
      opacity: 0.94;
      pointer-events: none;
      margin-left: -5%;
      filter: sepia(0.35) saturate(1.45) hue-rotate(-18deg) brightness(1.03);
    }
    .jm-review-result .grade {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      text-align: left;
      padding: 0;
      line-height: 1.1;
    }
    .jm-grade-label {
      font-family: ${EXAM_TEACHER_GRADE_FONT};
      font-size: 1.45rem;
      font-weight: 600;
      color: #ef6c00;
    }
    .jm-grade-value {
      font-family: ${EXAM_TEACHER_GRADE_FONT};
      font-size: 2.35rem;
      font-weight: 700;
      color: ${EXAM_TEACHER_GRADE_RED};
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.35em;
      min-height: 2.35em;
      padding: 0.1em 0.28em;
      border: 2.5px solid #ef6c00;
      border-radius: 50%;
      line-height: 1;
      box-sizing: border-box;
    }
    .jm-review-rule {
      width: 100%;
      border: none;
      border-bottom: 2px solid rgba(46, 125, 50, 0.55);
      margin: 8px 0 0;
    }
    .jm-meta-col {
      flex: 0 0 auto;
      text-align: right;
      align-self: flex-start;
      padding-right: 0;
      margin-left: 4px;
      line-height: 1.35;
    }
    .jm-review-result .meta {
      margin: 0;
      font-size: 14px;
      color: #2e7d32;
      font-weight: 600;
    }
    .jm-review-result .avg {
      margin: 2px 0 0;
      font-size: 13px;
      color: #546e7a;
    }
    .jm-general-comment-wrap {
      margin-bottom: 12px;
      text-align: left;
    }
    .jm-general-comment-input {
      display: block;
      width: 100%;
      margin-top: 6px;
      padding: 8px 10px;
      font-family: ${EXAM_TEACHER_COMMENT_FONT};
      font-size: 1.1rem;
      line-height: 1.35;
      color: #424242;
      border: 1px solid #bdbdbd;
      border-radius: 6px;
      background: #fff;
      box-sizing: border-box;
      resize: vertical;
      min-height: 2.8em;
    }
    .jm-review-result .teacher-comment {
      margin-top: 0;
      margin-bottom: 12px;
      padding-top: 0;
      border-top: none;
      font-size: 14px;
      color: #757575;
      font-weight: 500;
      text-align: right;
    }
    .jm-review-result .teacher-comment strong {
      display: none;
    }
    .jm-comment-label {
      font-size: 13px;
      font-weight: 600;
      color: #9e9e9e;
      margin-right: 6px;
    }
    .jm-review-result .teacher-comment .jm-teacher-handwriting {
      font-family: ${EXAM_TEACHER_COMMENT_FONT};
      font-size: 1.35rem;
      font-weight: 500;
      color: #757575;
      line-height: 1.4;
      white-space: pre-wrap;
      margin-top: 0;
      display: inline;
    }
    .header-name {
      margin-top: 10px !important;
    }
    .header-name label {
      font-size: 0.85rem !important;
      font-weight: 600 !important;
      color: #555 !important;
    }
    #studentName {
      display: inline-block !important;
      font-size: 1.65rem !important;
      font-weight: 800 !important;
      line-height: 1.2 !important;
      color: #111 !important;
      margin-left: 6px !important;
    }
  `;
  doc.head.appendChild(style);

  doc.querySelectorAll('.aids-box, .header-divider').forEach((el) => el.remove());

  if (opts.studentName?.trim()) {
    const nameEl = doc.getElementById('studentName');
    if (nameEl) nameEl.textContent = opts.studentName.trim();
  }
  if (opts.learningGroupName?.trim()) {
    const classHdr = doc.querySelector('.header-class');
    if (classHdr) {
      const base = (classHdr.textContent || '').trim();
      const grp = opts.learningGroupName.trim();
      classHdr.textContent = base ? `${base} · ${grp}` : grp;
    }
  }

  doc.querySelectorAll('.footer-luck, .footer-clover').forEach((el) => el.remove());
  doc.querySelectorAll('.footer, .footer-note').forEach((el) => el.remove());

  const teacherCorrectionMode = Boolean(opts.teacherCorrectionMode);
  if (teacherCorrectionMode) {
    doc.documentElement.classList.add('teacher-correction-mode');
  }

  fillAndMark(
    doc,
    answers,
    key,
    opts.corrections || [],
    teacherCorrectionMode,
    opts.filePath || '',
  );
  injectPerTaskTeacherComments(doc, opts.corrections || []);

  const rawTotal = Number(opts.totalPoints) || 0;
  const cappedTotal =
    opts.maxPoints > 0 ? Math.min(rawTotal, opts.maxPoints) : rawTotal;
  const pointsText =
    opts.maxPoints > 0
      ? `${cappedTotal.toFixed(1).replace('.', ',')} / ${opts.maxPoints} Punkte`
      : `${cappedTotal.toFixed(1).replace('.', ',')} Punkte`;
  const generalCommentRaw = (opts.corrections || []).find(
    (c) => c.taskNumber === '__general_comment__',
  )?.comment;
  const generalComment = (generalCommentRaw || '').trim();
  const sigUrl = teacherSignatureImgUrl(origin);
  const generalCommentBlock = teacherCorrectionMode
    ? `<div class="jm-general-comment-wrap">
        <span class="jm-comment-label">Allgemeiner Kommentar:</span>
        <textarea id="jm-general-comment-field" class="jm-general-comment-input" rows="2" placeholder="Sichtbar in der Freigabe …">${escapeHtmlText(generalComment)}</textarea>
      </div>`
    : generalComment
      ? `<div class="teacher-comment"><span class="jm-comment-label">Kommentar:</span> <span class="jm-teacher-handwriting">${escapeHtmlText(generalComment)}</span></div>`
      : '';
  const box = doc.createElement('div');
  box.className = 'jm-review-result';
  box.innerHTML = `
    ${generalCommentBlock}
    <div class="jm-review-head">
      <div class="jm-grade-block">
        <div class="jm-grade-note-wrap">
          <div class="grade"><span class="jm-grade-label">${escapeHtmlText(opts.gradeMetricLabel || 'Note')}:</span> <span class="jm-grade-value">${escapeHtmlText(opts.gradeLabel || '–')}</span></div>
        </div>
        <img class="jm-grade-signature" src="${sigUrl}" alt="" />
      </div>
      <div class="jm-meta-col">
        <div class="meta">${pointsText}</div>
        ${
          opts.classAverageText
            ? `<div class="avg">⌀ ${escapeHtmlText(opts.classAverageText)}</div>`
            : ''
        }
      </div>
    </div>
    <hr class="jm-review-rule" />
  `;
  const paper = doc.querySelector('.exam-paper') || doc.body;
  paper.appendChild(box);

  doc.querySelectorAll('input, textarea, select, button').forEach((el) => {
    if (teacherCorrectionMode && el.id === 'jm-general-comment-field') return;
    if (teacherCorrectionMode && el.classList.contains('jm-essay-teacher-comment-input')) return;
    if (teacherCorrectionMode && el.classList.contains('jm-inline-points-input')) return;
    if (
      teacherCorrectionMode &&
      el instanceof HTMLInputElement &&
      (el.type === 'checkbox' || el.type === 'radio')
    ) {
      return;
    }
    (el as HTMLInputElement).disabled = true;
    (el as HTMLInputElement).readOnly = true;
  });

  if (teacherCorrectionMode) {
    const generalTa = doc.getElementById('jm-general-comment-field');
    if (generalTa instanceof HTMLTextAreaElement) {
      generalTa.disabled = false;
      generalTa.readOnly = false;
      generalTa.removeAttribute('disabled');
      generalTa.removeAttribute('readonly');
    }
    doc.querySelectorAll('.jm-essay-teacher-comment-input').forEach((node) => {
      if (node instanceof HTMLTextAreaElement) {
        node.disabled = false;
        node.readOnly = false;
        node.removeAttribute('disabled');
        node.removeAttribute('readonly');
      }
    });
    doc.querySelectorAll('.jm-inline-points-input').forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.disabled = false;
        node.readOnly = false;
        node.removeAttribute('disabled');
        node.removeAttribute('readonly');
      }
    });
    const boot = doc.createElement('script');
    boot.textContent = `(function(){
  function send(taskId){ try { parent.postMessage({ type: 'jm-exam-correction-field', taskId: taskId }, '*'); } catch(e) {} }
  document.querySelectorAll('.jm-points-badge-editable[data-jm-task-id]').forEach(function(b){
    b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); send(b.getAttribute('data-jm-task-id')); });
  });
  function notifyHeight(){
    try {
      var h = Math.max(document.documentElement.scrollHeight || 0, document.body ? document.body.scrollHeight : 0);
      parent.postMessage({ type: 'jm-exam-correction-resize', height: h }, '*');
    } catch(e) {}
  }
  var ta = document.getElementById('jm-general-comment-field');
  if (ta) {
    ta.addEventListener('blur', function(){
      try { parent.postMessage({ type: 'jm-exam-correction-general', value: ta.value }, '*'); } catch(e) {}
      notifyHeight();
    });
    ta.addEventListener('input', function(){ notifyHeight(); });
  }
  document.querySelectorAll('.jm-essay-teacher-comment-input[data-task-id]').forEach(function(eta){
    eta.addEventListener('blur', function(){
      try {
        parent.postMessage({
          type: 'jm-exam-correction-essay-comment',
          taskId: eta.getAttribute('data-task-id'),
          value: eta.value
        }, '*');
      } catch(e) {}
      notifyHeight();
    });
    eta.addEventListener('input', function(){ notifyHeight(); });
  });
  document.querySelectorAll('.jm-inline-points-input[data-task-id]').forEach(function(inp){
    function sendPts(){
      try {
        parent.postMessage({
          type: 'jm-exam-correction-inline-points',
          taskId: inp.getAttribute('data-task-id'),
          value: inp.value
        }, '*');
      } catch(e) {}
    }
    inp.addEventListener('change', sendPts);
    inp.addEventListener('blur', sendPts);
  });
  notifyHeight();
  window.addEventListener('load', notifyHeight);
})();`;
    doc.body.appendChild(boot);
  }

  if (!doc.documentElement.getAttribute('lang')) {
    doc.documentElement.setAttribute('lang', 'de');
  }

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

/** @deprecated Prefer buildExamReviewedHtml + in-app Dialog (no popup). */
export async function openExamReviewedView(opts: ExamReviewedViewOpts): Promise<string> {
  return buildExamReviewedHtml(opts);
}
