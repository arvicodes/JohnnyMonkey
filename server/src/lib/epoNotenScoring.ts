const CATEGORY_COUNT = 5;

export const normalizeCategoryScores = (raw: unknown): number[] => {
  const base = Array.isArray(raw) ? raw : [];
  return Array.from({ length: CATEGORY_COUNT }, (_, i) => {
    const n = Number(base[i]);
    if (!Number.isFinite(n) || n < 0) return -1;
    return Math.min(3, Math.max(0, Math.round(n)));
  });
};

const simpleSum = (scores: number[]) =>
  scores.reduce((a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0), 0);

export const weightsAreValid = (weights: number[] | null | undefined): boolean =>
  Array.isArray(weights) &&
  weights.length === CATEGORY_COUNT &&
  weights.every((w) => Number.isFinite(w) && w > 0) &&
  Math.round(weights.reduce((a, b) => a + b, 0)) === 100;

/** Gesamtpunkte 0–15 (ggf. gewichtet). Unvollständige Raster: fehlende Zeilen = 0. */
export function epoPointsFromScores(
  rawScores: unknown,
  weightsPercent?: number[] | null,
): number {
  const scores = normalizeCategoryScores(rawScores);
  if (!weightsAreValid(weightsPercent)) {
    return simpleSum(scores);
  }
  let total = 0;
  for (let i = 0; i < CATEGORY_COUNT; i++) {
    const sc = scores[i] >= 0 ? scores[i] : 0;
    total += (sc / 3) * (weightsPercent![i] / 100) * 15;
  }
  return total;
}

export const epoRoundedPoints = (rawScores: unknown, weightsPercent?: number[] | null): number =>
  Math.max(0, Math.min(15, Math.round(epoPointsFromScores(rawScores, weightsPercent))));
