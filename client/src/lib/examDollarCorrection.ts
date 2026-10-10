import type { ExamAnswerKey } from './examAnswerKey';

export type ExamDollarTaskSlice = {
  taskNum: string;
  points: number;
  muxPrefix: string;
  fieldIds: string[];
};

function decodeSourceText(raw: string): string {
  return raw
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

export function extractExamDollarSources(html: string): string[] {
  const out: string[] = [];
  const re = /<textarea\b[^>]*\bexam-dollar-source\b[^>]*>([\s\S]*?)<\/textarea>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(decodeSourceText(m[1] || '').trim());
  }
  return out;
}

function parseGapAccepted(segment: string): string[] {
  const body = String(segment || '').trim();
  if (!body) return [];
  return body
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Zählt bewertbare Eingabefelder in einer Dollar-Aufgabe (Näherung für Korrekturmodus). */
export function countScorableFieldsInDollarSource(source: string): number {
  let n = 0;
  const gapRe = /\$_([^$_][\s\S]*?)\_$/g;
  let gm: RegExpExecArray | null;
  while ((gm = gapRe.exec(source)) !== null) {
    n += 1;
  }
  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/\$C{1,2}\$/i.test(t) || /^\$+\s*\$?C{1,2}\$/i.test(t)) n += 1;
    if (/\$WF\$/i.test(t) || /\$W\/F\$/i.test(t)) n += 1;
  }
  if (/\$Paare\b/i.test(source)) {
    const pairLines = lines.filter((l) => /^\s*\d+\.\s/.test(l.trim()));
    if (pairLines.length > 0) n += pairLines.length;
  }
  return Math.max(n, 1);
}

function groupSubmissionKeysByMux(keys: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const k of keys) {
    const m = k.match(/^examDollar_([^_]+)_(\d+)$/);
    if (!m) continue;
    const prefix = m[1];
    const list = map.get(prefix) || [];
    list.push(k);
    map.set(prefix, list);
  }
  for (const [prefix, list] of map) {
    list.sort((a, b) => {
      const na = parseInt(a.split('_').pop() || '0', 10);
      const nb = parseInt(b.split('_').pop() || '0', 10);
      return na - nb;
    });
    map.set(prefix, list);
  }
  return map;
}

function sortMuxPrefixes(map: Map<string, string[]>): string[] {
  // Jedes Aufgaben-Mux bekommt beim Rendern einen eigenen Zeitstempel — Reihenfolge ≈ Aufgaben 1…n
  return [...map.keys()].sort((a, b) => a.localeCompare(b, 'en'));
}

export function buildExamDollarAnswerKeyFromHtml(html: string): ExamAnswerKey {
  const sources = extractExamDollarSources(html);
  const answers: Record<string, string | string[] | number> = {};
  const points: Record<string, number> = {};
  const taskPoints: Record<string, number> = {};
  let maxPoints = 0;

  sources.forEach((source, taskIdx) => {
    const taskNumMatch = source.match(/\$Aufgabe\s+(\d+)\s*\$/i);
    const taskNum = taskNumMatch?.[1] || String(taskIdx + 1);
    const ptsMatch = source.match(/\$(\d+)\s*Punkte?\s*\$/i);
    const taskMax = ptsMatch ? parseInt(ptsMatch[1], 10) || 0 : 0;
    taskPoints[taskNum] = taskMax;
    maxPoints += taskMax;

    const fieldCount = countScorableFieldsInDollarSource(source);
    const perField = fieldCount > 0 && taskMax > 0 ? taskMax / fieldCount : 1;

    const gapRe = /\$_([^$_][\s\S]*?)\_$/g;
    let gi = 0;
    let gm: RegExpExecArray | null;
    while ((gm = gapRe.exec(source)) !== null) {
      const letter = String.fromCharCode(97 + (gi % 26));
      const taskId = `a${taskNum}${letter}`;
      const accepted = parseGapAccepted(gm[1]);
      answers[taskId] = accepted.length ? accepted : [''];
      points[taskId] = perField;
      gi += 1;
    }

    const lines = source.split(/\r?\n/);
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (!/\$C{1,2}\$/i.test(t) && !/^\$+\s*\$?C{1,2}\$/i.test(t)) continue;
      const letter = String.fromCharCode(97 + (gi % 26));
      const taskId = `a${taskNum}${letter}`;
      if (answers[taskId] !== undefined) continue;
      answers[taskId] = [''];
      points[taskId] = perField;
      gi += 1;
    }
  });

  return {
    answers,
    points,
    taskPoints,
    maxPoints,
    isGeometry: false,
  };
}

export function isPlaceholderLegacyExamKey(key: ExamAnswerKey): boolean {
  const ids = Object.keys(key.answers);
  if (!ids.length) return true;
  return ids.every((id) => {
    const v = key.answers[id];
    return Array.isArray(v) && v.length === 1 && String(v[0] ?? '') === '';
  });
}

/** Ordnet examDollar_*-Antworten stabilen a{aufgabe}{buchstabe}-IDs zu (gleiche Reihenfolge wie bei der Abgabe). */
export function remapExamDollarSubmissionToSynthetic(
  raw: Record<string, unknown>,
  html: string,
): Record<string, unknown> {
  const dollarKeys = Object.keys(raw).filter((k) => k.startsWith('examDollar_'));
  if (!dollarKeys.length) return raw;

  const sources = extractExamDollarSources(html);
  const muxMap = groupSubmissionKeysByMux(dollarKeys);
  const muxOrder = sortMuxPrefixes(muxMap);
  const out: Record<string, unknown> = { ...raw };

  muxOrder.forEach((mux, idx) => {
    const taskNumMatch = sources[idx]?.match(/\$Aufgabe\s+(\d+)\s*\$/i);
    const taskNum = taskNumMatch?.[1] || String(idx + 1);
    const fields = muxMap.get(mux) || [];
    fields.forEach((storageKey, fi) => {
      const letter = String.fromCharCode(97 + (fi % 26));
      const synthetic = `a${taskNum}${letter}`;
      out[synthetic] = raw[storageKey];
    });
  });

  return out;
}

export function examHtmlUsesDollarAuthoring(html: string): boolean {
  return /<textarea\b[^>]*\bclass=["'][^"']*exam-dollar-source\b/i.test(html);
}

export type ExamDollarSubmitFieldRow = {
  storageKey: string;
  syntheticId: string;
  value: string;
};

function normDollarStoredAnswer(v: unknown): string {
  return String(v ?? '')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .trim();
}

/** Reihenfolge wie bei collectExamAnswers() beim Abgeben (Mux → Feldnummer). */
export function examDollarSubmitFieldsInOrder(
  raw: Record<string, unknown>,
  html: string,
): ExamDollarSubmitFieldRow[] {
  const dollarKeys = Object.keys(raw).filter((k) => k.startsWith('examDollar_'));
  if (!dollarKeys.length) return [];

  const sources = extractExamDollarSources(html);
  const muxMap = groupSubmissionKeysByMux(dollarKeys);
  const muxOrder = sortMuxPrefixes(muxMap);
  const rows: ExamDollarSubmitFieldRow[] = [];

  muxOrder.forEach((mux, idx) => {
    const taskNumMatch = sources[idx]?.match(/\$Aufgabe\s+(\d+)\s*\$/i);
    const taskNum = taskNumMatch?.[1] || String(idx + 1);
    const fields = muxMap.get(mux) || [];
    fields.forEach((storageKey, fi) => {
      const letter = String.fromCharCode(97 + (fi % 26));
      rows.push({
        storageKey,
        syntheticId: `a${taskNum}${letter}`,
        value: normDollarStoredAnswer(raw[storageKey]),
      });
    });
  });

  return rows;
}
