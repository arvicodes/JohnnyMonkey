"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.epoRoundedPoints = exports.weightsAreValid = exports.normalizeCategoryScores = void 0;
exports.epoPointsFromScores = epoPointsFromScores;
const CATEGORY_COUNT = 5;
const normalizeCategoryScores = (raw) => {
    const base = Array.isArray(raw) ? raw : [];
    return Array.from({ length: CATEGORY_COUNT }, (_, i) => {
        const n = Number(base[i]);
        if (!Number.isFinite(n) || n < 0)
            return -1;
        return Math.min(3, Math.max(0, Math.round(n)));
    });
};
exports.normalizeCategoryScores = normalizeCategoryScores;
const simpleSum = (scores) => scores.reduce((a, b) => a + (Number.isFinite(b) && b >= 0 ? b : 0), 0);
const weightsAreValid = (weights) => Array.isArray(weights) &&
    weights.length === CATEGORY_COUNT &&
    weights.every((w) => Number.isFinite(w) && w > 0) &&
    Math.round(weights.reduce((a, b) => a + b, 0)) === 100;
exports.weightsAreValid = weightsAreValid;
/** Gesamtpunkte 0–15 (ggf. gewichtet). Unvollständige Raster: fehlende Zeilen = 0. */
function epoPointsFromScores(rawScores, weightsPercent) {
    const scores = (0, exports.normalizeCategoryScores)(rawScores);
    if (!(0, exports.weightsAreValid)(weightsPercent)) {
        return simpleSum(scores);
    }
    let total = 0;
    for (let i = 0; i < CATEGORY_COUNT; i++) {
        const sc = scores[i] >= 0 ? scores[i] : 0;
        total += (sc / 3) * (weightsPercent[i] / 100) * 15;
    }
    return total;
}
const epoRoundedPoints = (rawScores, weightsPercent) => Math.max(0, Math.min(15, Math.round(epoPointsFromScores(rawScores, weightsPercent))));
exports.epoRoundedPoints = epoRoundedPoints;
//# sourceMappingURL=epoNotenScoring.js.map