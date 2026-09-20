import {
  examAnswerMatches,
  formatExamCorrect,
  parseExamAnswerKey,
  sortExamAnswerFieldIds,
} from './examAnswerKey';
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

  const studentAnswers = answers || {};
  const fieldIds = sortExamAnswerFieldIds(Object.keys(key.answers || {}));

  fieldIds.forEach((taskId) => {
    const raw = studentAnswers[taskId];
    const value = normAnswer(raw);
    const expected = key.answers[taskId];
    const maxPts = key.points[taskId] ?? 1;
    let isCorrect = expected !== undefined ? examAnswerMatches(expected, raw) : false;
    let achieved = isCorrect ? maxPts : 0;
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

    const isPartial = achieved > 0 && achieved < maxPts - 1e-9;

    const byId = doc.getElementById(taskId) as HTMLInputElement | HTMLTextAreaElement | null;
    const radios = doc.querySelectorAll(`input[name="${CSS.escape(taskId)}"]`);

    const markEl = (el: HTMLElement) => {
      el.classList.add(
        isPartial ? 'answer-partial' : isCorrect ? 'answer-correct' : 'answer-incorrect',
      );
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
      badge.className = `points-badge ${
        isPartial ? 'points-partial' : achieved > 0 ? 'points-correct' : 'points-incorrect'
      }`;
      badge.textContent = formatPointsBadge(achieved, maxPts);
      const anchor = anchorAfterField(byId);
      insertAfter(anchor, badge);
      insertSolutionHint(badge);
      return;
    }

    if (radios.length) {
      radios.forEach((node) => {
        const input = node as HTMLInputElement;
        const match = value ? normAnswer(input.value) === value : false;
        if (match) {
          persistInputValue(input, value, true);
        }
        input.disabled = true;
        input.setAttribute('disabled', 'disabled');
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
          isPartial ? 'points-partial' : achieved > 0 ? 'points-correct' : 'points-incorrect'
        }`;
        badge.textContent = formatPointsBadge(achieved, maxPts);
        wrap.appendChild(badge);
        insertSolutionHint(badge);
      }
      return;
    }
  });
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
    .jm-grade-block {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 280px;
      min-height: 110px;
      margin-bottom: 6px;
    }
    .jm-grade-signature {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(380px, 110%);
      max-height: 120px;
      height: auto;
      object-fit: contain;
      opacity: 0.92;
      z-index: 0;
      pointer-events: none;
    }
    .jm-review-result .grade {
      position: relative;
      z-index: 1;
      font-family: ${EXAM_TEACHER_GRADE_FONT};
      font-size: 2.65rem;
      font-weight: 700;
      color: ${EXAM_TEACHER_GRADE_RED};
      text-align: center;
      padding: 4px 16px;
      line-height: 1.1;
      text-shadow: 0 0 12px rgba(255,255,255,0.85), 0 1px 2px rgba(255,255,255,0.6);
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
    .jm-review-result .teacher-comment {
      margin-top: 14px;
      padding-top: 0;
      border-top: none;
      font-size: 14px;
      color: ${EXAM_TEACHER_RED};
      font-weight: 500;
    }
    .jm-review-result .teacher-comment strong {
      display: none;
    }
    .jm-review-result .teacher-comment .jm-teacher-handwriting {
      font-family: ${EXAM_TEACHER_COMMENT_FONT};
      font-size: 2rem;
      font-weight: 700;
      color: ${EXAM_TEACHER_RED};
      line-height: 1.35;
      white-space: pre-wrap;
      margin-top: 0;
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

  fillAndMark(doc, answers, key, opts.corrections || []);
  injectPerTaskTeacherComments(doc, opts.corrections || []);

  doc.querySelectorAll('input, textarea, select, button').forEach((el) => {
    (el as HTMLInputElement).disabled = true;
    (el as HTMLInputElement).readOnly = true;
  });

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
  const box = doc.createElement('div');
  box.className = 'jm-review-result';
  box.innerHTML = `
    <div class="jm-grade-block">
      <img class="jm-grade-signature" src="${sigUrl}" alt="" />
      <div class="grade">Note ${opts.gradeLabel || '–'}</div>
    </div>
    <div class="meta">${pointsText}</div>
    ${
      opts.classAverageText
        ? `<div class="avg">⌀ Klassenschnitt Note ${opts.classAverageText}</div>`
        : ''
    }
    ${
      generalComment
        ? `<div class="teacher-comment"><div class="jm-teacher-handwriting">${escapeHtmlText(generalComment)}</div></div>`
        : ''
    }
  `;
  const paper = doc.querySelector('.exam-paper') || doc.body;
  paper.appendChild(box);

  if (!doc.documentElement.getAttribute('lang')) {
    doc.documentElement.setAttribute('lang', 'de');
  }

  return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
}

/** @deprecated Prefer buildExamReviewedHtml + in-app Dialog (no popup). */
export async function openExamReviewedView(opts: ExamReviewedViewOpts): Promise<string> {
  return buildExamReviewedHtml(opts);
}
