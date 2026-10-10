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

export function isManualExamAnswerKey(expected: unknown): boolean {
  const list = Array.isArray(expected) ? expected : [expected];
  return list.some((a) => String(a) === '__manual__');
}
