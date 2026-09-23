/** Liest `correctAnswers` aus einer Prüfungs-HTML (nicht die Geometrie-Vorlage). */

export type ExamAnswerKey = {
  answers: Record<string, string | string[] | number>;
  points: Record<string, number>;
  taskPoints: Record<string, number>;
  maxPoints: number;
  isGeometry: boolean;
};

export function parseExamTaskPointsFromHtml(html: string): Record<string, number> {
  const out: Record<string, number> = {};
  if (!html) return out;

  const blockRe =
    /<!--\s*Aufgabe\s+(\d+)\s*[^>]*-->[\s\S]*?<div class="task-number">[\s\S]*?\((\d+)\s*Punkte\)/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    out[m[1]] = parseInt(m[2], 10) || 0;
  }

  if (Object.keys(out).length === 0) {
    const alt = /<div class="task-number">\s*Aufgabe\s+(\d+)\s*\((\d+)\s*Punkte\)/gi;
    while ((m = alt.exec(html)) !== null) {
      out[m[1]] = parseInt(m[2], 10) || 0;
    }
  }
  return out;
}

export function parseExamFieldPointsFromHtml(html: string): Record<string, number> {
  const m = html.match(/<!--\s*EXAM_FIELD_POINTS\s+(\{[\s\S]*?\})\s*-->/);
  if (!m) return {};
  try {
    const obj = JSON.parse(m[1]) as Record<string, unknown>;
    const out: Record<string, number> = {};
    Object.entries(obj).forEach(([k, v]) => {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) out[k] = n;
    });
    return out;
  } catch {
    return {};
  }
}

/** Alte eine Zeile „25.10.1881“ auf a2a_d / a2a_m / a2a_y verteilen. */
export function expandLegacyDateAnswers(
  answers: Record<string, unknown>,
  keyIds: string[],
): Record<string, unknown> {
  const next = { ...answers };
  keyIds.forEach((id) => {
    const m = id.match(/^(a\d+[a-z])_(d|m|y)$/i);
    if (!m) return;
    if (String(next[id] ?? '').trim()) return;
    const legacy = String(next[m[1]] ?? '').trim();
    const parts = legacy.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (!parts) return;
    const idx = m[2].toLowerCase() === 'd' ? 1 : m[2].toLowerCase() === 'm' ? 2 : 3;
    next[id] = parts[idx];
  });
  return next;
}

function buildFieldPointsFromTaskPoints(
  answers: Record<string, string | string[] | number>,
  taskPoints: Record<string, number>,
  isGeometry: boolean,
): Record<string, number> {
  const fieldsByTask: Record<string, string[]> = {};
  for (const id of Object.keys(answers)) {
    const tm = id.match(/^a(\d+)/i);
    if (!tm) continue;
    const taskNum = tm[1];
    if (!fieldsByTask[taskNum]) fieldsByTask[taskNum] = [];
    fieldsByTask[taskNum].push(id);
  }

  const points: Record<string, number> = {};
  for (const [taskNum, fields] of Object.entries(fieldsByTask)) {
    const sorted = [...fields].sort();
    const n = sorted.length;
    if (!n) continue;
    const taskMax = taskPoints[taskNum];
    if (taskMax != null && taskMax > 0) {
      const per = taskMax / n;
      sorted.forEach((id) => {
        points[id] = per;
      });
    } else {
      sorted.forEach((id) => {
        points[id] = isGeometry && /_[xy]$/.test(id) ? 0.25 : 1;
      });
    }
  }
  return points;
}

function normalizeLoose(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
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
  const empty: ExamAnswerKey = {
    answers: {},
    points: {},
    taskPoints: {},
    maxPoints: 0,
    isGeometry: false,
  };
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
  const taskPoints = parseExamTaskPointsFromHtml(html);
  const points = buildFieldPointsFromTaskPoints(answers, taskPoints, isGeometry);
  const explicit = parseExamFieldPointsFromHtml(html);
  Object.entries(explicit).forEach(([k, v]) => {
    if (answers[k] !== undefined) points[k] = v;
  });

  const totalMatch = html.match(/id="totalPoints"[^>]*>(\d+)/);
  const maxFromHtml = totalMatch ? parseInt(totalMatch[1], 10) : 0;
  const maxFromTasks = Object.values(taskPoints).reduce((s, v) => s + (Number(v) || 0), 0);
  const maxFromFields = keys.reduce((s, k) => s + (points[k] || 0), 0);
  const maxPoints = Object.keys(explicit).length
    ? maxFromFields
    : maxFromTasks || maxFromHtml || maxFromFields;

  return { answers, points, taskPoints, maxPoints, isGeometry };
}

/** Sortierung a1a, a1b, … a3a, a3b, a3c, a3d (nicht a3c vor a3a). */
export function compareExamFieldIds(a: string, b: string): number {
  const ma = a.match(/^a(\d+)([a-z])?(?:_([a-z0-9]+))?$/i);
  const mb = b.match(/^a(\d+)([a-z])?(?:_([a-z0-9]+))?$/i);
  if (ma && mb) {
    const na = Number(ma[1]);
    const nb = Number(mb[1]);
    if (na !== nb) return na - nb;
    const la = (ma[2] || '').toLowerCase();
    const lb = (mb[2] || '').toLowerCase();
    if (la !== lb) return la.localeCompare(lb, 'de');
    return (ma[3] || '').localeCompare(mb[3] || '');
  }
  return a.localeCompare(b, 'de');
}

export function sortExamAnswerFieldIds(ids: string[]): string[] {
  return [...ids].sort(compareExamFieldIds);
}
