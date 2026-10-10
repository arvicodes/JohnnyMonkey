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
  buildExamDollarAnswerKeyFromHtml,
  examDollarSubmitFieldsInOrder,
  examHtmlUsesDollarAuthoring,
  isPlaceholderLegacyExamKey,
  remapExamDollarSubmissionToSynthetic,
} from './examDollarCorrection';
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
  /** Nur diese Aufgabennummer anzeigen (z. B. „3“ für Aufgabe 3). */
  onlyTaskNumber?: string;
  /** Nur diese Teilaufgabe (z. B. „a2a“) innerhalb von onlyTaskNumber. */
  onlyTaskFieldId?: string;
  /** z. B. „MSS-Punkte“ statt „Note“ in der grünen Box */
  gradeMetricLabel?: string;
};

function formatPointsBadge(achieved: number, maxPts: number): string {
  return `${fmtExamPoints(achieved)}/${fmtExamPoints(maxPts)}`;
}

function fmtExamPoints(n: number): string {
  const r = Math.round(n * 100) / 100;
  if (Math.abs(r - Math.round(r)) < 1e-9) return String(Math.round(r));
  return r.toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
}

function pointsBadgeToneClass(
  achieved: number,
  maxPts: number,
  isPartial: boolean,
): string {
  if (achieved < 0) return 'points-incorrect';
  if (isPartial) return 'points-partial';
  if (achieved > 0) return 'points-correct';
  return 'points-incorrect';
}

const FIELD_POINTS_TONE_CLASSES = [
  'jm-field-points-earned--pos',
  'jm-field-points-earned--zero',
  'jm-field-points-earned--neg',
  'jm-field-points-earned--partial',
  'jm-field-points-earned--fail',
] as const;

/** HU Aufgabe 1: +1 grün, 0 orange, −1 rot; sonst 0 = rot. */
function fieldPointsEarnedToneClass(
  taskId: string,
  achieved: number,
  maxPts: number,
  isPartial: boolean,
  minPts: number,
): string {
  const a = Number.isFinite(achieved) ? achieved : 0;
  if (minPts < 0 || isWfTableFieldId(taskId)) {
    if (a > 0) return 'jm-field-points-earned--pos';
    if (a < 0) return 'jm-field-points-earned--neg';
    return 'jm-field-points-earned--zero';
  }
  if (a < 0) return 'jm-field-points-earned--neg';
  if (isPartial || (a > 0 && a < maxPts - 1e-9)) return 'jm-field-points-earned--partial';
  if (a > 0) return 'jm-field-points-earned--pos';
  return 'jm-field-points-earned--fail';
}

function subsectionTitleAnchor(doc: Document, el: Element | null): Element | null {
  const sub = el?.closest('.exam-subsection');
  return sub?.querySelector('.exam-subsection-title') || null;
}

function createFieldPointsBadge(
  doc: Document,
  taskId: string,
  achieved: number,
  maxPts: number,
  isPartial: boolean,
  teacherCorrectionMode: boolean,
  minPts = 0,
): HTMLSpanElement {
  const badge = doc.createElement('span');
  if (teacherCorrectionMode) {
    badge.className = `jm-field-points-earned ${fieldPointsEarnedToneClass(
      taskId,
      achieved,
      maxPts,
      isPartial,
      minPts,
    )}`;
    badge.setAttribute('data-jm-task-id', taskId);
    badge.setAttribute('data-min', String(minPts));
    const input = doc.createElement('input');
    input.type = 'number';
    input.className = 'jm-field-points-input jm-inline-points-input';
    input.setAttribute('data-task-id', taskId);
    input.setAttribute('data-max', String(maxPts));
    input.min = String(minPts);
    input.max = String(maxPts);
    input.step = minPts < 0 ? '1' : maxPts <= 2 ? '0.5' : '0.25';
    const ptsVal = Number.isFinite(achieved) ? achieved : 0;
    input.value = String(ptsVal);
    input.setAttribute('value', String(ptsVal));
    const suffix = doc.createElement('span');
    suffix.className = 'jm-field-points-suffix';
    suffix.textContent = ` / ${fmtExamPoints(maxPts)} P.`;
    badge.appendChild(input);
    badge.appendChild(suffix);
    return badge;
  }
  badge.className = `points-badge ${pointsBadgeToneClass(achieved, maxPts, isPartial)}`;
  badge.textContent = formatPointsBadge(achieved, maxPts);
  return badge;
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

function styleWfStudentChecks(container: Element) {
  container.querySelectorAll('input[type="checkbox"]:checked').forEach((node) => {
    const input = node as HTMLInputElement;
    input.classList.add('jm-student-wf-check');
    input.closest('label')?.classList.add('jm-student-wf-choice');
  });
}

function normWfChoice(v: unknown): string {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/WAHR.*/, 'W')
    .replace(/FALSCH.*/, 'F');
}

function markWfTableRowTeacher(
  row: Element,
  rawValue: string,
  expected: unknown,
) {
  syncWfTableRowCheckboxes(row, rawValue);
  styleWfStudentChecks(row);
  const exp = normWfChoice(Array.isArray(expected) ? expected[0] : expected);
  row
    .querySelectorAll('.exam-wf-table-wahr input[type="checkbox"], .exam-wf-table-falsch input[type="checkbox"]')
    .forEach((node) => {
      const input = node as HTMLInputElement;
      input.classList.remove('jm-wf-grade-correct', 'jm-wf-grade-wrong');
      if (!input.checked) return;
      const stud = normWfChoice(input.value);
      const ok = Boolean(exp) && stud === exp;
      input.classList.add(ok ? 'jm-wf-grade-correct' : 'jm-wf-grade-wrong');
    });
}

function insertWfTeacherColumnSolution(doc: Document, row: Element, expected: unknown) {
  const exp = normWfChoice(Array.isArray(expected) ? expected[0] : expected);
  if (exp !== 'W' && exp !== 'F') return;
  const tdW = row.querySelector('.exam-wf-table-wahr');
  const tdF = row.querySelector('.exam-wf-table-falsch');
  tdW?.querySelector('.jm-wf-solution-letter')?.remove();
  tdF?.querySelector('.jm-wf-solution-letter')?.remove();
  const cell = exp === 'W' ? tdW : tdF;
  if (!cell) return;
  const span = doc.createElement('span');
  span.className = 'jm-wf-solution-letter';
  span.setAttribute('aria-hidden', 'true');
  span.textContent = exp;
  cell.insertBefore(span, cell.firstChild);
  row.querySelector('.exam-wf-table-text .jm-correct-solution')?.remove();
}

function createTeacherCommentPointsRow(
  doc: Document,
  taskId: string,
  achieved: number,
  maxPts: number,
  isPartial: boolean,
  savedComment: string,
  minPts = 0,
): HTMLElement {
  const row = doc.createElement('div');
  row.className = 'jm-teacher-comment-points-row';
  const commentText = (savedComment || '').trim();
  if (commentText) {
    const commentEl = doc.createElement('div');
    commentEl.className = 'jm-teacher-comment-inline';
    commentEl.innerHTML = `<div class="jm-teacher-handwriting">${escapeHtmlText(commentText)}</div>`;
    row.appendChild(commentEl);
  }
  row.appendChild(
    createFieldPointsBadge(doc, taskId, achieved, maxPts, isPartial, true, minPts),
  );
  return row;
}

/** Aufgabe 2 Teilaufgaben: Kommentar + Punkte oben unter der Überschrift (wie Sortieraufgabe A)). */
function attachSubsectionTeacherToolbar(
  doc: Document,
  taskId: string,
  anchorEl: Element | null,
  achieved: number,
  maxPts: number,
  isPartial: boolean,
  savedComment: string,
): boolean {
  if (!/^a2[a-z]/i.test(taskId) || !anchorEl) return false;
  const sub = anchorEl.closest('.exam-subsection');
  if (!sub) return false;
  if (sub.querySelector(`.jm-teacher-comment-points-row[data-for="${CSS.escape(taskId)}"]`)) {
    return true;
  }
  const row = createTeacherCommentPointsRow(
    doc,
    taskId,
    achieved,
    maxPts,
    isPartial,
    savedComment,
  );
  row.setAttribute('data-for', taskId);
  const title = sub.querySelector('.exam-subsection-title');
  if (title) {
    title.insertAdjacentElement('afterend', row);
  } else {
    sub.insertBefore(row, sub.firstChild);
  }
  return true;
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
  isPartial: boolean,
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

  const commentText = (savedComment || '').trim();
  if (!teacherCorrectionMode && commentText) {
    const commentEl = doc.createElement('div');
    commentEl.className = 'jm-teacher-comment-inline';
    commentEl.innerHTML = `<div class="jm-teacher-handwriting">${escapeHtmlText(commentText)}</div>`;
    panel.appendChild(commentEl);
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

  layout.classList.add('jm-essay-teacher-layout--stacked');
  layout.appendChild(left);
  const isPartial = achieved > 0 && achieved < maxPts - 1e-9;
  if (
    !attachSubsectionTeacherToolbar(
      doc,
      taskId,
      textarea,
      achieved,
      maxPts,
      isPartial,
      commentText,
    )
  ) {
    const toolbar = createTeacherCommentPointsRow(
      doc,
      taskId,
      achieved,
      maxPts,
      isPartial,
      commentText,
    );
    block.appendChild(toolbar);
  }
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

function ensureWfTablePointsCell(doc: Document, tr: Element): HTMLTableCellElement {
  let tdP = tr.querySelector('.exam-wf-table-points');
  if (!tdP) {
    tdP = doc.createElement('td');
    tdP.className = 'exam-wf-table-points';
    tr.appendChild(tdP);
  }
  const hidden = tr.querySelector('input[type="hidden"][id^="a1"]');
  if (hidden && !tdP.contains(hidden)) {
    tdP.appendChild(hidden);
  }
  tr.querySelector('.exam-wf-table-falsch .jm-field-points-earned')?.remove();
  return tdP as HTMLTableCellElement;
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
      if (!tr.querySelector('.exam-wf-table-wahr')) {
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
        inline.querySelector('.jm-wf-inline-points')?.remove();

        choicesCell.replaceWith(tdW, tdF);
        if (hidden) {
          const tdP = ensureWfTablePointsCell(doc, tr);
          tdP.appendChild(hidden);
        }
      }
      ensureWfTablePointsCell(doc, tr);
    });
  });
}

function attachDeferredFieldPointsBadge(
  doc: Document,
  taskId: string,
  achieved: number,
  maxPts: number,
  isPartial: boolean,
  minPts: number,
  savedComment = '',
) {
  if (doc.querySelector(`.jm-field-points-earned[data-jm-task-id="${CSS.escape(taskId)}"]`)) {
    return;
  }
  const hidden = doc.getElementById(taskId);
  const tr = hidden?.closest('tr.exam-wf-table-row');
  const tdP = tr ? ensureWfTablePointsCell(doc, tr) : null;
  const wfSelect = doc.querySelector(
    `.exam-mc-single-select[data-answer-id="${CSS.escape(taskId)}"]`,
  );
  const host = (hidden as Element | null) || wfSelect;
  if (
    attachSubsectionTeacherToolbar(
      doc,
      taskId,
      host,
      achieved,
      maxPts,
      isPartial,
      savedComment,
    )
  ) {
    return;
  }
  const badge = createFieldPointsBadge(
    doc,
    taskId,
    achieved,
    maxPts,
    isPartial,
    true,
    minPts,
  );
  if (tdP) {
    tdP.appendChild(badge);
    return;
  }
  if (wfSelect) {
    wfSelect.appendChild(badge);
  }
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

function subsectionContainsFieldId(sub: Element, fieldId: string): boolean {
  const id = fieldId.toLowerCase();
  if (sub.querySelector(`#${CSS.escape(id)}`)) return true;
  if (sub.querySelector(`[data-answer-id="${CSS.escape(id)}"]`)) return true;
  if (sub.querySelector(`[data-for="${CSS.escape(id)}"]`)) return true;
  return false;
}

/** Aufgabenweise: nur eine Aufgabe / optional eine Teilaufgabe im DOM behalten. */
function applyExamCorrectionScope(
  doc: Document,
  onlyTask?: string,
  onlyFieldId?: string,
) {
  const taskNum = String(onlyTask || '').trim();
  if (!taskNum) return;
  doc.documentElement.classList.add('jm-exam-by-task-only');
  doc.querySelectorAll('.task').forEach((taskEl) => {
    const m = taskEl.querySelector('.task-number')?.textContent?.match(/Aufgabe\s+(\d+)/i);
    if (m?.[1] !== taskNum) {
      taskEl.remove();
      return;
    }
    const fieldId = String(onlyFieldId || '').trim().toLowerCase();
    if (!fieldId) return;
    taskEl.querySelectorAll('.exam-subsection').forEach((sub) => {
      if (!subsectionContainsFieldId(sub, fieldId)) sub.remove();
    });
    if (/^a1[a-z]$/i.test(fieldId)) {
      taskEl.querySelectorAll('tr.exam-wf-table-row').forEach((tr) => {
        const hid = tr.querySelector('input[type="hidden"][id^="a1"]') as HTMLInputElement | null;
        if (hid?.id?.toLowerCase() !== fieldId) tr.remove();
      });
    }
  });
  doc.querySelectorAll('.instructions, .submit-section').forEach((el) => el.remove());
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
    span.textContent = `${fmt(achieved)} / ${fmt(max)} P.`;
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
  if (!teacherCorrectionMode) {
    badge.setAttribute('data-jm-task-id', taskId);
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
  const deferredFieldBadges: Record<
    string,
    {
      achieved: number;
      maxPts: number;
      isPartial: boolean;
      minPts: number;
      savedComment: string;
    }
  > = {};

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
        if (teacherCorrectionMode && wfSelect) {
          styleWfStudentChecks(wrap);
        } else {
          wrap.querySelectorAll('input[type="checkbox"]').forEach((node) => {
            const input = node as HTMLInputElement;
            if (input.checked) markEl(input);
            else if (value && normAnswer(input.value) === value) markEl(input);
          });
          if (!value) {
            wrap.classList.add('answer-incorrect');
          }
        }
      } else if (wfRow) {
        if (teacherCorrectionMode) {
          markWfTableRowTeacher(wfRow, value, expected);
        } else {
          markWfTableRow(wfRow, value, markEl);
        }
      }
      const badge = createFieldPointsBadge(
        doc,
        taskId,
        achieved,
        maxPts,
        isPartial,
        teacherCorrectionMode,
        isWfTableFieldId(taskId) ? -1 : 0,
      );
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
          isPartial,
        );
        sortRoot.parentElement?.insertBefore(panel, sortRoot.nextSibling);
        if (teacherCorrectionMode) {
          attachSubsectionTeacherToolbar(
            doc,
            taskId,
            sortRoot,
            achieved,
            maxPts,
            isPartial,
            savedTaskComment,
          );
        } else {
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
          deferredFieldBadges[taskId] = {
            achieved,
            maxPts,
            isPartial,
            minPts: -1,
            savedComment: savedTaskComment,
          };
        } else {
          badge.classList.add('jm-wf-inline-points');
          const ptsAnchor =
            wfRow?.querySelector('.exam-wf-table-points') || (wfSelect as Element);
          attachPointsBadge(badge, taskId, false, ptsAnchor as Element, (a, n) =>
            a.appendChild(n),
          );
        }
        if (teacherCorrectionMode && wfRow) {
          insertWfTeacherColumnSolution(doc, wfRow, expected);
        } else if (wfHintAnchor) {
          insertSolutionHint(wfHintAnchor);
        }
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
      } else if (
        teacherCorrectionMode &&
        attachSubsectionTeacherToolbar(
          doc,
          taskId,
          byId,
          achieved,
          maxPts,
          isPartial,
          savedTaskComment,
        )
      ) {
        insertSolutionHint(sortRoot || byId);
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
        if (
          teacherCorrectionMode &&
          attachSubsectionTeacherToolbar(
            doc,
            taskId,
            wrap,
            achieved,
            maxPts,
            isPartial,
            savedTaskComment,
          )
        ) {
          insertSolutionHint(wrap);
        } else {
          const badge = createFieldPointsBadge(
            doc,
            taskId,
            achieved,
            maxPts,
            isPartial,
            teacherCorrectionMode,
          );
          attachPointsBadge(badge, taskId, teacherCorrectionMode, wrap, (a, n) => a.appendChild(n));
          insertSolutionHint(badge);
        }
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
    Object.entries(deferredFieldBadges).forEach(
      ([taskId, { achieved: ap, maxPts: mp, isPartial: part, minPts, savedComment }]) => {
        attachDeferredFieldPointsBadge(doc, taskId, ap, mp, part, minPts, savedComment);
      },
    );
    doc.querySelectorAll('tr.exam-wf-table-row').forEach((tr) => {
      const hidden = tr.querySelector('input[type="hidden"][id^="a1"]') as HTMLInputElement | null;
      if (!hidden?.id) return;
      const taskId = hidden.id;
      const expected = key.answers[taskId];
      const raw = studentAnswers[taskId];
      markWfTableRowTeacher(tr, normAnswer(raw), expected);
      insertWfTeacherColumnSolution(doc, tr, expected);
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

function correctionToolbarShowsComment(doc: Document, taskNumber: string): boolean {
  const tn = String(taskNumber || '').trim();
  const ids = new Set<string>();
  if (/^a\d/i.test(tn)) ids.add(tn.toLowerCase());
  const num = tn.match(/^(\d+)([a-z])?$/i);
  if (num) ids.add(`a${num[1]}${(num[2] || '').toLowerCase()}`.toLowerCase());
  for (const id of ids) {
    const row = doc.querySelector(
      `.jm-teacher-comment-points-row[data-for="${CSS.escape(id)}"]`,
    );
    if (row?.querySelector('.jm-teacher-comment-inline')) return true;
  }
  return false;
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
    if (correctionToolbarShowsComment(doc, tn)) return;
    const anchor = findTaskCommentAnchor(doc, tn);
    if (!anchor) return;
    seen.add(tn);
    insertTaskTeacherComment(doc, anchor, text);
  });
}

function waitForDollarExamBootstrap(win: Window, maxMs = 18_000): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if ((win as Window & { __jmExamTasksBootstrapped?: boolean }).__jmExamTasksBootstrapped) {
        resolve();
        return;
      }
      if (performance.now() - start >= maxMs) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function waitForDocumentImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.querySelectorAll('img'));
  const pending = imgs.filter((img) => !img.complete);
  if (!pending.length) return Promise.resolve();
  return Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  ).then(() => undefined);
}

/** Gleiche Reihenfolge wie collectExamAnswers() in der Prüfungs-HTML. */
function collectExamAnswerInputsInDocOrder(
  doc: Document,
): Array<HTMLInputElement | HTMLTextAreaElement> {
  const out: Array<HTMLInputElement | HTMLTextAreaElement> = [];
  doc
    .querySelectorAll('input[type="text"], textarea, input[type="number"]')
    .forEach((node) => {
      if (!(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) return;
      if (!node.id) return;
      if (node.classList.contains('exam-dollar-source')) return;
      if (node instanceof HTMLTextAreaElement && node.hasAttribute('hidden')) return;
      out.push(node);
    });
  doc.querySelectorAll('input[type="hidden"]').forEach((node) => {
    if (!(node instanceof HTMLInputElement) || !node.id) return;
    if (!/^a\d/i.test(node.id) && !node.id.startsWith('examDollar_')) return;
    out.push(node);
  });
  return out;
}

function applySyntheticAnswersToRenderedDoc(
  doc: Document,
  answers: Record<string, unknown>,
): void {
  const ids = sortExamAnswerFieldIds(
    Object.keys(answers || {}).filter((k) => /^a\d[a-z]?$/i.test(k)),
  );
  ids.forEach((id) => {
    const el = doc.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;
    persistInputValue(el, normAnswer(answers[id]));
    el.classList.add('jm-student-input');
  });
}

function applyExamDollarAnswersToRenderedDoc(
  doc: Document,
  rawAnswers: Record<string, unknown>,
  examHtml: string,
): void {
  const rows = examDollarSubmitFieldsInOrder(rawAnswers, examHtml);
  if (!rows.length) return;
  const inputs = collectExamAnswerInputsInDocOrder(doc);
  rows.forEach((row, idx) => {
    const el = inputs[idx];
    if (!el) return;
    el.id = row.syntheticId;
    persistInputValue(el, row.value);
    el.classList.add('jm-student-input');
  });
  const radioNames = new Set<string>();
  doc.querySelectorAll('input[type="radio"]').forEach((node) => {
    if (node instanceof HTMLInputElement && node.name) radioNames.add(node.name);
  });
  radioNames.forEach((name) => {
    const raw = rawAnswers[name];
    if (raw == null) return;
    const want = String(raw);
    doc.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(name)}"]`).forEach(
      (radio) => {
        radio.checked = radio.value === want;
      },
    );
  });
}

type DollarBootstrapHandle = { doc: Document; detach: () => void };

/** Dollar-Aufgaben per exam-dollar-commands rendern, dann Korrektur-Markup anwenden. */
async function bootstrapDollarExamReviewHtml(preHtml: string): Promise<DollarBootstrapHandle> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;left:-9999px;top:0;width:900px;height:1200px;opacity:0;pointer-events:none;border:0';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    const timeout = window.setTimeout(() => {
      const doc = iframe.contentDocument;
      if (doc?.querySelector('.exam-paper, .task')) {
        finish(doc);
        return;
      }
      iframe.remove();
      reject(new Error('Prüfungsvorschau: Aufgaben konnten nicht gerendert werden (Timeout).'));
    }, 45_000);
    const finish = (doc: Document) => {
      window.clearTimeout(timeout);
      resolve({
        doc,
        detach: () => {
          iframe.remove();
        },
      });
    };
    const fail = (err: Error) => {
      window.clearTimeout(timeout);
      iframe.remove();
      reject(err);
    };
    iframe.onload = () => {
      const win = iframe.contentWindow;
      if (!win) {
        fail(new Error('Prüfungsvorschau: iframe nicht verfügbar'));
        return;
      }
      void waitForDollarExamBootstrap(win).then(async () => {
        const doc = iframe.contentDocument;
        if (!doc) {
          fail(new Error('Prüfungsvorschau: Dokument nicht verfügbar'));
          return;
        }
        await waitForDocumentImages(doc);
        const applySizing = (
          win as Window & { jmApplyExamImageNaturalSizing?: (root: Element) => void }
        ).jmApplyExamImageNaturalSizing;
        if (typeof applySizing === 'function') {
          applySizing(doc.body);
        }
        finish(doc);
      });
    };
    document.body.appendChild(iframe);
    iframe.srcdoc = preHtml;
  });
}

/** Baut die fertige Korrektur-HTML (nur lesen) — für Dialog/iframe, ohne Popup. */
export async function buildExamReviewedHtml(opts: ExamReviewedViewOpts): Promise<string> {
  const res = await fetch(
    `/api/file-system-paths/read-html?filePath=${encodeURIComponent(opts.filePath)}`,
  );
  if (!res.ok) throw new Error('Prüfung konnte nicht geladen werden');
  const html = await res.text();
  let key = parseExamAnswerKey(html);

  let answers: Record<string, unknown> = opts.answers || {};
  if (typeof (opts.answers as unknown) === 'string') {
    try {
      answers = JSON.parse(opts.answers as unknown as string) || {};
    } catch {
      answers = {};
    }
  }

  const usesDollarAuthoring =
    !isHuKiMssExamPath(opts.filePath || '') && examHtmlUsesDollarAuthoring(html);
  const rawDollarAnswers = usesDollarAuthoring ? { ...answers } : null;
  if (usesDollarAuthoring) {
    const dollarKey = buildExamDollarAnswerKeyFromHtml(html);
    if (
      Object.keys(key.answers).length === 0 ||
      isPlaceholderLegacyExamKey(key)
    ) {
      key = dollarKey;
    }
    answers = remapExamDollarSubmissionToSynthetic(answers, html);
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  injectHandwritingFontsIntoDocument(doc);

  if (opts.teacherCorrectionMode) {
    doc.documentElement.classList.add('teacher-correction-mode');
  }
  doc
    .querySelectorAll(
      '.exam-chrome, .exam-toolbar, .submit-section, .schema-modal, .header-buttons',
    )
    .forEach((el) => el.remove());
  if (!usesDollarAuthoring) {
    doc.querySelectorAll('script').forEach((el) => el.remove());
  } else {
    doc.body?.classList.add('teacher-mode');
    doc.querySelectorAll('.exam-dollar-live-edit').forEach((el) => el.remove());
  }

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
    html.teacher-correction-mode .jm-general-comment-add-btn,
    html.teacher-correction-mode .jm-inline-points-input,
    html.teacher-correction-mode .jm-field-points-input {
      pointer-events: auto !important;
      cursor: text !important;
    }
    html.teacher-correction-mode .jm-general-comment-add-btn {
      cursor: pointer !important;
    }
    .jm-essay-teacher-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px 12px;
      margin-top: 10px;
      align-items: start;
    }
    .jm-essay-teacher-layout.jm-essay-teacher-layout--stacked {
      grid-template-columns: 1fr;
      margin-top: 6px;
    }
    .jm-teacher-comment-points-row {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      gap: 8px;
      margin: 8px 0 6px;
      width: 100%;
      box-sizing: border-box;
    }
    .jm-teacher-comment-points-row .jm-teacher-comment-inline {
      flex: 1 1 auto;
      min-width: 0;
      text-align: left;
    }
    .jm-teacher-comment-points-row .jm-teacher-comment-inline .jm-teacher-handwriting {
      font-family: ${EXAM_TEACHER_COMMENT_FONT};
      font-size: 1.15rem;
      font-weight: 500;
      color: #616161;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .jm-teacher-comment-points-row .jm-field-points-earned {
      margin-left: auto;
      flex-shrink: 0;
    }
    .jm-teacher-comment-points-row:not(:has(.jm-teacher-comment-inline)) {
      justify-content: flex-end;
    }
    .jm-sort-review-panel > .jm-teacher-comment-points-row {
      margin-top: 0;
      margin-bottom: 10px;
    }
    html.teacher-correction-mode .exam-subsection > .jm-teacher-comment-points-row {
      margin-top: 4px;
      margin-bottom: 10px;
    }
    html.teacher-correction-mode .exam-subsection > .exam-subsection-title {
      display: block;
      padding-right: 0;
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
      table-layout: fixed !important;
      width: calc(100% - 12px) !important;
      margin-left: 6px !important;
      margin-right: 6px !important;
      border-collapse: collapse;
    }
    html.teacher-correction-mode .exam-wf-table th,
    html.teacher-correction-mode .exam-wf-table td {
      vertical-align: middle;
      padding-left: 8px !important;
      padding-right: 8px !important;
    }
    html.teacher-correction-mode .exam-wf-table tbody tr.exam-wf-table-row {
      height: auto;
    }
    html.teacher-correction-mode .exam-wf-table th:nth-child(1),
    html.teacher-correction-mode .exam-wf-table-num {
      width: 1.5em !important;
      min-width: 1.5em !important;
      max-width: 1.5em !important;
      padding: 2px 2px !important;
      font-size: 0.78em !important;
      text-align: center !important;
      white-space: nowrap !important;
    }
    html.teacher-correction-mode .exam-wf-table th:nth-child(2),
    html.teacher-correction-mode .exam-wf-table-text {
      width: 36% !important;
      max-width: 36% !important;
      padding-top: 3px !important;
      padding-bottom: 3px !important;
      line-height: 1.28 !important;
      font-size: 0.92em !important;
    }
    html.teacher-correction-mode .exam-wf-table th:nth-child(3),
    html.teacher-correction-mode .exam-wf-table-wahr,
    html.teacher-correction-mode .exam-wf-table th:nth-child(4),
    html.teacher-correction-mode .exam-wf-table-falsch {
      width: 2.35em !important;
      min-width: 2.35em !important;
      max-width: 2.35em !important;
      padding-top: 2px !important;
      padding-bottom: 2px !important;
      padding-left: 4px !important;
      padding-right: 4px !important;
      text-align: center !important;
      white-space: nowrap !important;
      position: relative;
    }
    html.teacher-correction-mode .exam-wf-table th.jm-wf-points-head,
    html.teacher-correction-mode .exam-wf-table-points {
      width: 4.85em !important;
      min-width: 4.85em !important;
      max-width: 4.85em !important;
      padding: 2px 2px !important;
      text-align: center !important;
      white-space: nowrap !important;
    }
    html.teacher-correction-mode .exam-wf-table-points input[type="hidden"] {
      display: none !important;
    }
    html.teacher-correction-mode .exam-wf-table-points .jm-field-points-earned {
      margin-left: 0;
      padding: 1px 5px;
      font-size: 0.75rem;
      border-width: 1.5px;
      gap: 1px;
    }
    html.teacher-correction-mode .exam-wf-table-points .jm-field-points-input {
      width: 1.65rem;
      font-size: 0.75rem;
    }
    html.teacher-correction-mode .exam-mc-single-select .jm-field-points-earned {
      margin-left: 6px;
    }
    html.teacher-correction-mode .exam-wf-table-wahr .exam-mc-option,
    html.teacher-correction-mode .exam-wf-table-falsch .exam-mc-option,
    html.teacher-correction-mode .exam-wf-table-wahr label,
    html.teacher-correction-mode .exam-wf-table-falsch label {
      display: inline-flex !important;
      justify-content: center !important;
      align-items: center !important;
      margin: 0 !important;
      padding: 0 !important;
      font-size: 0 !important;
      background: transparent !important;
      outline: none !important;
      border-radius: 0 !important;
      line-height: 1 !important;
    }
    html.teacher-correction-mode .exam-wf-table-wahr input[type="checkbox"],
    html.teacher-correction-mode .exam-wf-table-falsch input[type="checkbox"] {
      margin: 0 !important;
      width: 0.95em !important;
      height: 0.95em !important;
      flex-shrink: 0;
      background: transparent !important;
      outline: none !important;
      box-shadow: none !important;
    }
    html.teacher-correction-mode .exam-wf-table input.jm-student-wf-check {
      accent-color: #1565c0 !important;
    }
    html.teacher-correction-mode .exam-wf-table input.jm-wf-grade-correct {
      accent-color: #2e7d32 !important;
      outline: 1.5px solid #2e7d32 !important;
      outline-offset: 0;
    }
    html.teacher-correction-mode .exam-wf-table input.jm-wf-grade-wrong {
      accent-color: #c62828 !important;
      outline: 1.5px solid #c62828 !important;
      outline-offset: 0;
    }
    html.teacher-correction-mode .exam-wf-table .jm-wf-solution-letter {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      z-index: 0;
      font-size: 0.62rem;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
      color: #6a1b9a;
      background: #f3e5f5;
      border: 1px solid #ce93d8;
      border-radius: 3px;
      padding: 0 2px;
      pointer-events: none;
      user-select: none;
    }
    html.teacher-correction-mode .exam-wf-table-wahr label,
    html.teacher-correction-mode .exam-wf-table-falsch label {
      position: relative;
      z-index: 1;
    }
    .jm-task-points-earned,
    .jm-field-points-earned {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      margin-left: 10px;
      padding: 3px 10px;
      font-size: 0.92rem;
      font-weight: 800;
      border-radius: 8px;
      white-space: nowrap;
      vertical-align: middle;
      border: 2px solid transparent;
    }
    .jm-field-points-earned--pos,
    .jm-task-points-earned {
      color: #1b5e20;
      background: #c8e6c9;
      border-color: #2e7d32;
      box-shadow: 0 1px 2px rgba(46, 125, 50, 0.25);
    }
    .jm-field-points-earned--zero {
      color: #e65100;
      background: #ffe0b2;
      border-color: #ef6c00;
      box-shadow: 0 1px 2px rgba(230, 81, 0, 0.2);
    }
    .jm-field-points-earned--partial {
      color: #5d4037;
      background: #fff176;
      border-color: #f9a825;
      box-shadow: 0 1px 2px rgba(249, 168, 37, 0.2);
    }
    .jm-field-points-earned--neg,
    .jm-field-points-earned--fail {
      color: #b71c1c;
      background: #ffcdd2;
      border-color: #c62828;
      box-shadow: 0 1px 2px rgba(198, 40, 40, 0.2);
    }
    .jm-field-points-input {
      width: 2.1rem;
      padding: 0 2px;
      margin: 0;
      font: inherit;
      font-weight: 800;
      color: inherit;
      text-align: center;
      border: none;
      background: transparent;
      outline: none;
      -moz-appearance: textfield;
    }
    .jm-field-points-input::-webkit-outer-spin-button,
    .jm-field-points-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .jm-field-points-suffix {
      font: inherit;
      font-weight: 800;
      color: inherit;
    }
    .exam-subsection-title .jm-field-points-earned {
      margin-left: 8px;
      font-size: 0.88rem;
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
    html.teacher-correction-mode input.exam-dollar-gap,
    html.teacher-correction-mode textarea.exam-dollar-area,
    html.teacher-correction-mode .jm-student-answer-body {
      color: #1565c0 !important;
      -webkit-text-fill-color: #1565c0;
      font-weight: 600;
    }
    html.teacher-correction-mode img.exam-dollar-img,
    html.teacher-correction-mode .exam-paper img:not(.header-logo):not(.jm-grade-signature) {
      max-width: 100%;
      height: auto;
    }
    html.teacher-correction-mode img.header-logo {
      height: 48px !important;
      width: auto !important;
      max-width: 96px !important;
      object-fit: contain;
      display: block;
    }
    html.teacher-correction-mode .header-brand-row {
      display: grid !important;
      grid-template-columns: auto 1fr !important;
      align-items: center;
      column-gap: 10px;
      margin-bottom: 6px;
    }
    html.teacher-correction-mode .header-title {
      font-size: 1.05rem !important;
      line-height: 1.2 !important;
    }
    html.teacher-correction-mode .exam-paper > .header {
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e0e0e0;
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
      grid-template-columns: unset !important;
    }
    html.jm-exam-by-task-only .exam-shell {
      padding: 6px 8px 16px !important;
    }
    html.jm-exam-by-task-only .exam-paper > .header {
      display: none !important;
    }
    html.jm-exam-by-task-only .exam-sort-drag {
      width: 100% !important;
      max-width: 100% !important;
    }
    html.jm-exam-by-task-only .exam-sort-drag + .exam-sort-hint {
      max-width: 100% !important;
    }
    html.jm-exam-by-task-only .task-content,
    html.jm-exam-by-task-only .exam-subsection,
    html.jm-exam-by-task-only .jm-sort-review-panel {
      display: block !important;
      visibility: visible !important;
    }
    html.jm-exam-by-task-only .exam-chart-figure img {
      max-width: 100% !important;
      max-height: 220px !important;
      height: auto !important;
      width: auto !important;
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
    .jm-general-comment-display {
      margin-bottom: 12px;
      text-align: left;
    }
    .jm-general-comment-display .jm-teacher-handwriting {
      font-family: ${EXAM_TEACHER_COMMENT_FONT};
      font-size: 1.35rem;
      font-weight: 500;
      color: #757575;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .jm-general-comment-add-btn {
      display: block;
      margin: 0 0 12px;
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      color: #1565c0;
      cursor: pointer;
      text-align: left;
    }
    .jm-general-comment-add-btn:hover {
      text-decoration: underline;
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
    .jm-general-comment-input--plain {
      margin-top: 0;
      margin-bottom: 12px;
      padding: 0;
      border: none;
      border-radius: 0;
      background: transparent;
      min-height: 0;
      resize: none;
      font-size: 1.35rem;
      color: #757575;
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

  let reviewDoc = doc;
  let detachDollarBootstrap: (() => void) | null = null;
  if (usesDollarAuthoring) {
    const preHtml = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
    const boot = await bootstrapDollarExamReviewHtml(preHtml);
    reviewDoc = boot.doc;
    detachDollarBootstrap = boot.detach;
    if (rawDollarAnswers) {
      applyExamDollarAnswersToRenderedDoc(reviewDoc, rawDollarAnswers, html);
      const dollarRows = examDollarSubmitFieldsInOrder(rawDollarAnswers, html);
      if (!dollarRows.length) {
        applySyntheticAnswersToRenderedDoc(reviewDoc, answers);
      }
    }
    if (opts.studentName?.trim()) {
      const nameEl = reviewDoc.getElementById('studentName');
      if (nameEl) nameEl.textContent = opts.studentName.trim();
    }
    if (opts.learningGroupName?.trim()) {
      const classHdr = reviewDoc.querySelector('.header-class');
      if (classHdr) {
        const base = (classHdr.textContent || '').trim();
        const grp = opts.learningGroupName.trim();
        classHdr.textContent = base ? `${base} · ${grp}` : grp;
      }
    }
  }

  const onlyTask = String(opts.onlyTaskNumber || '').trim();
  const onlyFieldId = String(opts.onlyTaskFieldId || '').trim();
  if (onlyTask) {
    applyExamCorrectionScope(reviewDoc, onlyTask, onlyFieldId || undefined);
  }

  fillAndMark(
    reviewDoc,
    answers,
    key,
    opts.corrections || [],
    teacherCorrectionMode,
    opts.filePath || '',
  );
  injectPerTaskTeacherComments(reviewDoc, opts.corrections || []);

  if (teacherCorrectionMode) {
    reviewDoc.querySelectorAll('.task .solution').forEach((el) => el.remove());
  }

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
    ? generalComment
      ? `<textarea id="jm-general-comment-field" class="jm-general-comment-input jm-general-comment-input--plain" rows="2">${escapeHtmlText(generalComment)}</textarea>`
      : `<button type="button" class="jm-general-comment-add-btn" id="jm-general-comment-add">Allgemeinen Kommentar hinzufügen</button>
         <div class="jm-general-comment-wrap" hidden>
           <textarea id="jm-general-comment-field" class="jm-general-comment-input" rows="2" placeholder="Sichtbar in der Freigabe …"></textarea>
         </div>`
    : generalComment
      ? `<div class="jm-general-comment-display"><div class="jm-teacher-handwriting">${escapeHtmlText(generalComment)}</div></div>`
      : '';
  const box = reviewDoc.createElement('div');
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
            ? `<div class="avg">Notenschnitt ⌀ ${escapeHtmlText(opts.classAverageText)}</div>`
            : ''
        }
      </div>
    </div>
    <hr class="jm-review-rule" />
  `;
  const paper = reviewDoc.querySelector('.exam-paper') || reviewDoc.body;
  if (!onlyTask) {
    paper.appendChild(box);
  }

  reviewDoc.querySelectorAll('input, textarea, select, button').forEach((el) => {
    if (teacherCorrectionMode && el.id === 'jm-general-comment-field') return;
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
    const generalTa = reviewDoc.getElementById('jm-general-comment-field');
    if (generalTa instanceof HTMLTextAreaElement) {
      generalTa.disabled = false;
      generalTa.readOnly = false;
      generalTa.removeAttribute('disabled');
      generalTa.removeAttribute('readonly');
    }
    reviewDoc.querySelectorAll('.jm-inline-points-input').forEach((node) => {
      if (node instanceof HTMLInputElement) {
        node.disabled = false;
        node.readOnly = false;
        node.removeAttribute('disabled');
        node.removeAttribute('readonly');
      }
    });
    const boot = reviewDoc.createElement('script');
    boot.textContent = `(function(){
  function send(taskId){ try { parent.postMessage({ type: 'jm-exam-correction-field', taskId: taskId }, '*'); } catch(e) {} }
  document.querySelectorAll('.jm-points-badge-editable[data-jm-task-id]').forEach(function(b){
    if (b.querySelector('.jm-field-points-input')) return;
    b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); send(b.getAttribute('data-jm-task-id')); });
  });
  function notifyHeight(){
    try {
      var h = Math.max(document.documentElement.scrollHeight || 0, document.body ? document.body.scrollHeight : 0);
      parent.postMessage({ type: 'jm-exam-correction-resize', height: h }, '*');
    } catch(e) {}
  }
  var addGeneral = document.getElementById('jm-general-comment-add');
  if (addGeneral) {
    addGeneral.addEventListener('click', function(){
      var wrap = document.querySelector('.jm-general-comment-wrap');
      var ta = document.getElementById('jm-general-comment-field');
      if (addGeneral.parentNode) addGeneral.parentNode.removeChild(addGeneral);
      if (wrap) wrap.removeAttribute('hidden');
      if (ta instanceof HTMLTextAreaElement) {
        ta.focus();
        notifyHeight();
      }
    });
  }
  var ta = document.getElementById('jm-general-comment-field');
  if (ta) {
    ta.addEventListener('blur', function(){
      try { parent.postMessage({ type: 'jm-exam-correction-general', value: ta.value }, '*'); } catch(e) {}
      notifyHeight();
    });
    ta.addEventListener('input', function(){ notifyHeight(); });
  }
  var toneClasses = ['jm-field-points-earned--pos','jm-field-points-earned--zero','jm-field-points-earned--neg','jm-field-points-earned--partial','jm-field-points-earned--fail'];
  function applyFieldPointsTone(inp){
    var badge = inp.closest('.jm-field-points-earned');
    if (!badge) return;
    var min = parseFloat(inp.min);
    if (isNaN(min)) min = parseFloat(badge.getAttribute('data-min') || '0');
    var max = parseFloat(inp.getAttribute('data-max') || inp.max || '1');
    var v = parseFloat(String(inp.value).replace(',', '.'));
    if (isNaN(v)) v = 0;
    toneClasses.forEach(function(c){ badge.classList.remove(c); });
    if (min < 0) {
      if (v > 0) badge.classList.add('jm-field-points-earned--pos');
      else if (v < 0) badge.classList.add('jm-field-points-earned--neg');
      else badge.classList.add('jm-field-points-earned--zero');
    } else {
      if (v < 0) badge.classList.add('jm-field-points-earned--neg');
      else if (v > 0 && v < max - 0.001) badge.classList.add('jm-field-points-earned--partial');
      else if (v > 0) badge.classList.add('jm-field-points-earned--pos');
      else badge.classList.add('jm-field-points-earned--fail');
    }
  }
  document.querySelectorAll('.jm-inline-points-input[data-task-id]').forEach(function(inp){
    applyFieldPointsTone(inp);
    function sendPts(){
      applyFieldPointsTone(inp);
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
    inp.addEventListener('input', function(){ applyFieldPointsTone(inp); });
  });
  notifyHeight();
  window.addEventListener('load', notifyHeight);
})();`;
    reviewDoc.body.appendChild(boot);
  }

  if (usesDollarAuthoring) {
    reviewDoc.querySelectorAll('script').forEach((el) => el.remove());
  }

  if (!reviewDoc.documentElement.getAttribute('lang')) {
    reviewDoc.documentElement.setAttribute('lang', 'de');
  }

  const out = `<!DOCTYPE html>${reviewDoc.documentElement.outerHTML}`;
  detachDollarBootstrap?.();
  return out;
}

/** @deprecated Prefer buildExamReviewedHtml + in-app Dialog (no popup). */
export async function openExamReviewedView(opts: ExamReviewedViewOpts): Promise<string> {
  return buildExamReviewedHtml(opts);
}
