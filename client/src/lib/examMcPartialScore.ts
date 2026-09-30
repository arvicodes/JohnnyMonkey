import { examAnswerMatches } from './examAnswerKey';

function parseMcLetterSet(raw: unknown): string[] {
  const parts = Array.isArray(raw) ? raw.map(String) : [String(raw ?? '')];
  const letters = new Set<string>();
  for (const p of parts) {
    const s = String(p).trim();
    if (!s) continue;
    if (/[|,;]/.test(s)) {
      s.split(/[|,;/]/)
        .map((x) => x.trim().toUpperCase())
        .filter((x) => /^[A-Z]$/.test(x))
        .forEach((x) => letters.add(x));
    } else if (/^[A-Za-z]$/.test(s)) {
      letters.add(s.toUpperCase());
    }
  }
  return [...letters].sort();
}

/** Teilpunkte für Mehrfachauswahl: max(0, (richtig − falsch) / Anzahl richtiger). */
export function examUsesMcPartialScoring(expected: unknown): boolean {
  const letters = parseMcLetterSet(expected);
  if (!letters.length) return false;
  if (letters.some((l) => l === 'W' || l === 'F')) return false;
  return letters.every((l) => /^[A-Z]$/.test(l));
}

export function examAnswerScoreFraction(expected: unknown, student: unknown): number {
  if (!examUsesMcPartialScoring(expected)) {
    return examAnswerMatches(expected, student) ? 1 : 0;
  }
  const correct = parseMcLetterSet(expected);
  if (!correct.length) return 0;

  const studentStr = String(student ?? '').trim();
  if (!studentStr) return 0;

  const studentSet = new Set<string>();
  if (/[|,;]/.test(studentStr)) {
    studentStr
      .split(/[|,;/]/)
      .map((x) => x.trim().toUpperCase())
      .filter((x) => /^[A-Z]$/.test(x))
      .forEach((x) => studentSet.add(x));
  } else if (/^[A-Za-z]$/.test(studentStr)) {
    studentSet.add(studentStr.toUpperCase());
  } else {
    return examAnswerMatches(expected, student) ? 1 : 0;
  }

  let right = 0;
  let wrong = 0;
  studentSet.forEach((l) => {
    if (correct.includes(l)) right += 1;
    else wrong += 1;
  });
  return Math.max(0, (right - wrong) / correct.length);
}
