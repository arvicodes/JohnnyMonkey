const STOP = new Set(
  'der die das ein eine einer eines einem einen und oder aber auch nur noch nicht ist sind war waren wird werden beim zur zum zur vom von im in am an auf als für mit bei es sie er wir ihr ihr ihre ihren'.split(
    ' ',
  ),
);

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Wichtige Begriffe aus der Musterlösung (für Hervorhebung in SuS-Text). */
export function extractKeywordTerms(solutionText: string): string[] {
  const raw = String(solutionText || '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .toLowerCase();
  const terms = new Set<string>();
  raw.split(/\s+/).forEach((w) => {
    const t = w.replace(/^-+|-+$/g, '').trim();
    if (t.length < 4 || STOP.has(t)) return;
    terms.add(t);
  });
  return [...terms].sort((a, b) => b.length - a.length);
}

export function highlightStudentAnswerHtml(studentText: string, solutionText: string): string {
  const text = String(studentText || '');
  if (!text.trim()) return '';
  let html = escapeHtml(text);
  const terms = extractKeywordTerms(solutionText);
  for (const term of terms) {
    if (term.length < 4) continue;
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    html = html.replace(re, '<span class="jm-student-keyword">$1</span>');
  }
  return html;
}

export function essaySolutionsFromExamHtml(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!html?.trim()) return out;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('[data-exam-spec]').forEach((host) => {
      const raw = host.getAttribute('data-exam-spec');
      if (!raw) return;
      const spec = JSON.parse(decodeURIComponent(raw)) as {
        answerId?: string;
        solution?: string;
      };
      const id = String(spec.answerId || '').trim();
      const sol = String(spec.solution || '').trim();
      if (id && sol) out[id] = sol;
    });
  } catch {
    /* ignore */
  }
  return out;
}

export function sortSolutionStepsFromDoc(doc: Document, answerId: string): string[] {
  const el = doc.getElementById(answerId);
  const host =
    el?.closest('[data-exam-spec]') ||
    doc
      .querySelector(`.exam-sort-drag[data-answer-id="${CSS.escape(answerId)}"]`)
      ?.closest('[data-exam-spec]');
  if (!host) return [];
  const raw = host.getAttribute('data-exam-spec');
  if (!raw) return [];
  try {
    const spec = JSON.parse(decodeURIComponent(raw)) as { solution?: string };
    const sol = String(spec.solution || '').split('/')[0].trim();
    if (!sol) return [];
    return sol
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function essaySolutionFromDoc(doc: Document, fieldId: string): string {
  const el = doc.getElementById(fieldId);
  const host = el?.closest('[data-exam-spec]');
  if (!host) return '';
  const raw = host.getAttribute('data-exam-spec');
  if (!raw) return '';
  try {
    const spec = JSON.parse(decodeURIComponent(raw)) as { solution?: string };
    return String(spec.solution || '').trim();
  } catch {
    return '';
  }
}

/** Grobe Vorschlagspunkte für manuelle Essays (Schlagwort-Abgleich mit Musterlösung). */
export function suggestedEssayPointsFromSolution(
  solution: string,
  studentText: string,
  maxPts: number,
): number {
  const terms = extractKeywordTerms(solution);
  const text = String(studentText || '').trim();
  if (!text || !terms.length || maxPts <= 0) return 0;
  const lower = text.toLowerCase();
  let hit = 0;
  for (const t of terms) {
    if (t.length >= 3 && lower.includes(t)) hit += 1;
  }
  const frac = hit / terms.length;
  if (frac >= 0.55) return maxPts;
  if (frac >= 0.28) return maxPts / 2;
  return 0;
}

export function isManualExamAnswerKey(expected: unknown): boolean {
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((a) => String(a) === '__manual__');
}
