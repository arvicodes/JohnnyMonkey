/** Liest `correctAnswers` aus einer Prüfungs-HTML (nicht die Geometrie-Vorlage). */

export type ExamAnswerKey = {
  answers: Record<string, string | string[] | number>;
  points: Record<string, number>;
  maxPoints: number;
  isGeometry: boolean;
};

function normalizeLoose(raw: unknown): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[₂₁₀]/g, '')
    .replace(/[_\-–—]/g, '')
    .replace(/[()]/g, '');
}

export function formatExamCorrect(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map(String).join(' / ');
  return String(value);
}

export function examAnswerMatches(expected: unknown, student: unknown): boolean {
  if (expected === undefined || expected === null) return false;
  const studentN = normalizeLoose(student);
  if (!studentN) return false;
  const accepted = Array.isArray(expected) ? expected : [expected];
  return accepted.some((a) => {
    const n = normalizeLoose(a);
    if (!n) return false;
    if (n === studentN) return true;
    if (typeof expected === 'number' || (typeof a === 'number' && String(a).includes('.'))) {
      const sn = parseFloat(String(student));
      const cn = parseFloat(String(a));
      return !Number.isNaN(sn) && !Number.isNaN(cn) && sn === cn;
    }
    return false;
  });
}

export function parseExamAnswerKey(html: string): ExamAnswerKey {
  const empty: ExamAnswerKey = { answers: {}, points: {}, maxPoints: 0, isGeometry: false };
  if (!html) return empty;

  const blockMatch = html.match(/const\s+correctAnswers\s*=\s*(\{[\s\S]*?\});/);
  if (!blockMatch) return empty;

  const answers: Record<string, string | string[] | number> = {};
  const body = blockMatch[1];

  const arrayRe = /([a-zA-Z_]\w*)\s*:\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = arrayRe.exec(body)) !== null) {
    const vals = m[2]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
    if (vals.length) answers[m[1]] = vals;
  }

  const scalarRe = /([a-zA-Z_]\w*)\s*:\s*(?:'([^']*)'|"([^"]*)"|(-?\d+(?:\.\d+)?))/g;
  while ((m = scalarRe.exec(body)) !== null) {
    if (answers[m[1]] !== undefined) continue;
    if (m[4] !== undefined) answers[m[1]] = Number(m[4]);
    else answers[m[1]] = m[2] ?? m[3] ?? '';
  }

  const keys = Object.keys(answers);
  const isGeometry = keys.some((k) => /_[xy]$/.test(k));
  const points: Record<string, number> = {};
  keys.forEach((k) => {
    points[k] = isGeometry && /_[xy]$/.test(k) ? 0.25 : 1;
  });

  const totalMatch = html.match(/id="totalPoints"[^>]*>(\d+)/);
  const maxFromHtml = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const maxPoints = maxFromHtml || keys.reduce((s, k) => s + (points[k] || 0), 0);

  return { answers, points, maxPoints, isGeometry };
}
