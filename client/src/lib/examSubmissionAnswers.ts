/** Enthält die Abgabe mindestens eine ausgefüllte Antwort (z. B. nach Nachschrift). */
export function submissionHasFilledAnswers(answersJson: string | undefined | null): boolean {
  if (!answersJson?.trim()) return false;
  try {
    const parsed = JSON.parse(answersJson) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return false;
    return Object.values(parsed).some((v) => {
      if (v == null) return false;
      if (typeof v === 'object') return Object.keys(v as object).length > 0;
      return String(v).trim() !== '';
    });
  } catch {
    return false;
  }
}
