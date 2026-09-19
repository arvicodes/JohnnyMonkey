import fs from 'fs';
import path from 'path';

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

export function resolveExamHtmlPath(filePath: string): string {
  const fp = (filePath || '').replace(/\\/g, '/').trim();
  if (fp.startsWith('git-intern/')) {
    const relativePath = fp.replace(/^git-intern\//, '');
    if (process.env.NODE_ENV === 'production') {
      return path.join(process.cwd(), 'J-M-Reihen', relativePath);
    }
    const projectRoot = path.resolve(__dirname, '../../..');
    return path.join(projectRoot, 'J-M-Reihen', relativePath);
  }
  if (fp.startsWith('J-M-Reihen/')) {
    const relativePath = fp.replace(/^J-M-Reihen\//, '');
    if (process.env.NODE_ENV === 'production') {
      return path.join(process.cwd(), 'J-M-Reihen', relativePath);
    }
    const projectRoot = path.resolve(__dirname, '../../..');
    return path.join(projectRoot, 'J-M-Reihen', relativePath);
  }
  return path.resolve(fp);
}

export function readExamHtml(filePath: string): string {
  const full = resolveExamHtmlPath(filePath);
  return fs.readFileSync(full, 'utf-8');
}

function serializeAnswerValue(value: string | string[] | number): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => `'${String(v).replace(/'/g, "\\'")}'`).join(', ')}]`;
  }
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "\\'")}'`;
}

export function replaceCorrectAnswersInHtml(
  html: string,
  updates: Record<string, string | string[] | number>,
): string {
  const parsed = parseExamAnswerKey(html);
  const merged = { ...parsed.answers, ...updates };
  const lines = Object.entries(merged).map(([k, v]) => `            ${k}: ${serializeAnswerValue(v)}`);
  const block = `const correctAnswers = {\n${lines.join(',\n')}\n        };`;
  return html.replace(/const\s+correctAnswers\s*=\s*\{[\s\S]*?\};/, block);
}

export function writeExamHtml(filePath: string, html: string): void {
  const full = resolveExamHtmlPath(filePath);
  fs.writeFileSync(full, html, 'utf-8');
}

export function calculateAutoPoints(
  answers: Record<string, unknown>,
  key: ExamAnswerKey,
): number {
  let total = 0;
  for (const taskId of Object.keys(key.answers)) {
    if (examAnswerMatches(key.answers[taskId], answers[taskId])) {
      total += key.points[taskId] || 1;
    }
  }
  return total;
}

type CorrectionRow = { taskNumber: string; manualPoints: number | null };

/** Gesamtpunkte: pro Feld Override oder Auto; Geometrie behält Zusatz-Manualpunkte. */
export function computeSubmissionTotal(
  answersJson: string,
  key: ExamAnswerKey,
  corrections: CorrectionRow[],
): { autoPoints: number; totalPoints: number } {
  const answers = JSON.parse(answersJson || '{}') as Record<string, unknown>;
  const autoPoints = calculateAutoPoints(answers, key);
  const corrMap = new Map(corrections.map((c) => [c.taskNumber, c]));

  if (key.isGeometry) {
    const manualSum = corrections
      .filter(
        (c) =>
          !Object.keys(key.answers).includes(c.taskNumber) &&
          c.taskNumber !== '__review_complete__',
      )
      .reduce((s, c) => s + (c.manualPoints ?? 0), 0);
    return { autoPoints, totalPoints: autoPoints + manualSum };
  }

  let totalPoints = 0;
  for (const taskId of Object.keys(key.answers)) {
    const corr = corrMap.get(taskId);
    if (corr?.manualPoints != null && !Number.isNaN(corr.manualPoints)) {
      totalPoints += corr.manualPoints;
    } else if (examAnswerMatches(key.answers[taskId], answers[taskId])) {
      totalPoints += key.points[taskId] || 1;
    }
  }

  const legacyManual = corrections
    .filter(
      (c) =>
        !Object.keys(key.answers).includes(c.taskNumber) &&
        c.taskNumber !== '3_comment' &&
        c.taskNumber !== '__review_complete__',
    )
    .reduce((s, c) => s + (c.manualPoints ?? 0), 0);
  if (legacyManual > 0 && totalPoints === autoPoints) {
    totalPoints += legacyManual;
  }

  return { autoPoints, totalPoints };
}
