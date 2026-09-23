import fs from 'fs';
import path from 'path';
import { StorageManager } from './storageManager';

const examHtmlBasenameCache = new Map<string, string>();

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

export function buildFieldPointsFromTaskPoints(
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

function expandLegacyDateAnswers(
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

export function replaceExamFieldPointsInHtml(
  html: string,
  updates: Record<string, number>,
): string {
  const merged = { ...parseExamFieldPointsFromHtml(html) };
  Object.entries(updates).forEach(([k, v]) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return;
    merged[k] = Math.round(n * 100) / 100;
  });
  const comment = `<!-- EXAM_FIELD_POINTS ${JSON.stringify(merged)} -->`;
  let next = /<!--\s*EXAM_FIELD_POINTS\s+\{[\s\S]*?\}\s*-->/.test(html)
    ? html.replace(/<!--\s*EXAM_FIELD_POINTS\s+\{[\s\S]*?\}\s*-->/, comment)
    : html.replace(/<head>/i, `<head>\n    ${comment}`);

  const byTask: Record<string, number> = {};
  Object.entries(merged).forEach(([id, pts]) => {
    const tm = id.match(/^a(\d+)/i);
    if (!tm) return;
    byTask[tm[1]] = (byTask[tm[1]] || 0) + pts;
  });
  const taskPoints: Record<string, number> = {};
  Object.entries(byTask).forEach(([task, sum]) => {
    taskPoints[task] = Math.round(sum);
  });
  return replaceExamTaskPointsInHtml(next, taskPoints);
}

function sumTaskPointsMap(taskPoints: Record<string, number>): number {
  return Object.values(taskPoints).reduce((s, v) => s + (Number(v) || 0), 0);
}

export function updateExamTotalPointsInHtml(html: string, total: number): string {
  const safe = Math.max(0, Math.round(total));
  let next = html.replace(
    /return \{ achieved: achievedPoints, total: \d+ \};/,
    `return { achieved: achievedPoints, total: ${safe} };`,
  );
  next = next.replace(
    /<span id="totalPoints">[^<]*<\/span>/,
    `<span id="totalPoints">${safe}</span>`,
  );
  return next;
}

export function replaceExamTaskPointsInHtml(
  html: string,
  updates: Record<string, number>,
): string {
  if (!Object.keys(updates).length) return html;

  const replaced = html.replace(
    /(<!--\s*Aufgabe\s+(\d+)\s*[^>]*-->)([\s\S]*?)(?=\n\s*<!--\s*Aufgabe\s+\d+|\n\s*<div class="footer">|\n\s*<div class="submit-section">|$)/gi,
    (full, comment, taskNumStr, body) => {
      const pts = updates[taskNumStr];
      if (pts === undefined) return full;
      const n = Math.max(0, Math.round(Number(pts) || 0));
      let nextBody = body.replace(
        /(<div class="task-number">[\s\S]*?<span[^>]*>)\(\d+\s*Punkte\)(<\/span>)/i,
        `$1(${n} Punkte)$2`,
      );
      nextBody = nextBody.replace(
        /(<div class="task-number">\s*Aufgabe\s+\d+\s*)\(\d+\s*Punkte\)/i,
        `$1(${n} Punkte)`,
      );
      nextBody = nextBody.replace(
        /(<div class="points">)\d+(\s*Punkte<\/div>)/i,
        `$1${n}$2`,
      );
      return comment + nextBody;
    },
  );

  const taskPoints = parseExamTaskPointsFromHtml(replaced);
  const total = sumTaskPointsMap(taskPoints);
  return total > 0 ? updateExamTotalPointsInHtml(replaced, total) : replaced;
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
  const maxFromTasks = sumTaskPointsMap(taskPoints);
  const maxFromFields = keys.reduce((s, k) => s + (points[k] || 0), 0);
  const maxPoints = Object.keys(explicit).length
    ? maxFromFields
    : maxFromTasks || maxFromHtml || maxFromFields;

  return { answers, points, taskPoints, maxPoints, isGeometry };
}

function findExamHtmlByBasename(basename: string): string | null {
  const want = (basename || '').trim().toLowerCase();
  if (!want || !/^(ka_|ku_|hü_|hu_|qz_)/i.test(basename)) return null;
  const cached = examHtmlBasenameCache.get(want);
  if (cached && fs.existsSync(cached)) return cached;

  const resolved = StorageManager.resolveFilePath(basename);
  if (resolved && fs.existsSync(resolved)) {
    examHtmlBasenameCache.set(want, resolved);
    return resolved;
  }

  const root = StorageManager.resolveGitInternRelativePath('');
  const walk = (dir: string, depth: number): string | null => {
    if (depth > 14) return null;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile() && e.name.toLowerCase() === want) return full;
      if (
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        e.name !== 'node_modules' &&
        e.name !== 'Presentation-Sicherheitskopien'
      ) {
        const nested = walk(full, depth + 1);
        if (nested) return nested;
      }
    }
    return null;
  };
  const found = walk(root, 0);
  if (found) examHtmlBasenameCache.set(want, found);
  return found;
}

export function resolveExamHtmlPath(filePath: string): string {
  const fp = (filePath || '').replace(/\\/g, '/').trim();
  const tryPath = (full: string): string | null =>
    full && fs.existsSync(full) ? full : null;

  if (fp.startsWith('git-intern/')) {
    const relativePath = fp.replace(/^git-intern\//, '');
    const full = StorageManager.resolveGitInternRelativePath(relativePath);
    const hit = tryPath(full);
    if (hit) return hit;
  } else if (fp.startsWith('J-M-Reihen/')) {
    const relativePath = fp.replace(/^J-M-Reihen\//, '');
    const full = StorageManager.resolveGitInternRelativePath(relativePath);
    const hit = tryPath(full);
    if (hit) return hit;
  } else {
    const resolved = StorageManager.resolveFilePath(fp);
    const hit = resolved ? tryPath(resolved) : null;
    if (hit) return hit;
    const abs = path.resolve(fp);
    const hitAbs = tryPath(abs);
    if (hitAbs) return hitAbs;
  }

  const base = fp.split('/').pop() || fp;
  const byName = findExamHtmlByBasename(base);
  if (byName) return byName;

  if (fp.startsWith('git-intern/')) {
    const relativePath = fp.replace(/^git-intern\//, '');
    return StorageManager.resolveGitInternRelativePath(relativePath);
  }
  if (fp.startsWith('J-M-Reihen/')) {
    const relativePath = fp.replace(/^J-M-Reihen\//, '');
    return StorageManager.resolveGitInternRelativePath(relativePath);
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
  const rawAnswers = JSON.parse(answersJson || '{}') as Record<string, unknown>;
  const answers = expandLegacyDateAnswers(rawAnswers, Object.keys(key.answers));
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
        c.taskNumber !== '__review_complete__' &&
        c.taskNumber !== '__general_comment__',
    )
    .reduce((s, c) => s + (c.manualPoints ?? 0), 0);
  if (legacyManual > 0 && totalPoints === autoPoints) {
    totalPoints += legacyManual;
  }

  return { autoPoints, totalPoints };
}
