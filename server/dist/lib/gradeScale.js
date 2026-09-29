"use strict";
/**
 * App-weite Regel: Prozent → Schulnote mit Tendenz (Frau Christ / JohnnyMonkey).
 * Untere Grenze inklusive, obere Grenze der nächsthöheren Stufe exklusiv (außer 100 %).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRADE_TENDENCY_TO_NUMERIC = exports.GRADE_PERCENT_BANDS = void 0;
exports.clampPercent = clampPercent;
exports.percentageToGradeTendency = percentageToGradeTendency;
exports.percentageToGradeNumeric = percentageToGradeNumeric;
exports.scoreToGradeTendency = scoreToGradeTendency;
exports.scoreToGradeNumeric = scoreToGradeNumeric;
exports.pointsOnScaleToGradeTendency = pointsOnScaleToGradeTendency;
exports.minPointsOnScaleForTendency = minPointsOnScaleForTendency;
exports.gradeTableForMaxPoints = gradeTableForMaxPoints;
exports.minPointsThresholdForTotalOnScale = minPointsThresholdForTotalOnScale;
exports.percentageToMSSPoints = percentageToMSSPoints;
exports.tendencyToAsciiLabel = tendencyToAsciiLabel;
exports.gradeRangeLabelForTendency = gradeRangeLabelForTendency;
/** Absteigend nach minPercent — erste passende Zeile gewinnt. */
exports.GRADE_PERCENT_BANDS = [
    { minPercent: 95, grade: '1' },
    { minPercent: 90, grade: '1−' },
    { minPercent: 85, grade: '2+' },
    { minPercent: 80, grade: '2' },
    { minPercent: 75, grade: '2−' },
    { minPercent: 70, grade: '3+' },
    { minPercent: 65, grade: '3' },
    { minPercent: 60, grade: '3−' },
    { minPercent: 55, grade: '4+' },
    { minPercent: 50, grade: '4' },
    { minPercent: 45, grade: '4−' },
    { minPercent: 40, grade: '5+' },
    { minPercent: 30, grade: '5' },
    { minPercent: 20, grade: '5−' },
    { minPercent: 0, grade: '6' },
];
/** Für Durchschnitte / Speicherung (deutsches Notensystem). */
exports.GRADE_TENDENCY_TO_NUMERIC = {
    '1': 1.0,
    '1−': 1.3,
    '2+': 1.7,
    '2': 2.0,
    '2−': 2.3,
    '3+': 2.7,
    '3': 3.0,
    '3−': 3.3,
    '4+': 3.7,
    '4': 4.0,
    '4−': 4.3,
    '5+': 4.7,
    '5': 5.0,
    '5−': 5.3,
    '6': 6.0,
};
function clampPercent(percentage) {
    if (!Number.isFinite(percentage))
        return 0;
    return Math.max(0, Math.min(100, percentage));
}
function percentageToGradeTendency(percentage) {
    const p = clampPercent(percentage);
    for (const row of exports.GRADE_PERCENT_BANDS) {
        if (p >= row.minPercent)
            return row.grade;
    }
    return '6';
}
function percentageToGradeNumeric(percentage) {
    return exports.GRADE_TENDENCY_TO_NUMERIC[percentageToGradeTendency(percentage)];
}
/** Erreichte / Maximal → Tendenz-Note */
function scoreToGradeTendency(achieved, maxPoints) {
    if (!Number.isFinite(maxPoints) || maxPoints <= 0)
        return '6';
    const pct = (achieved / maxPoints) * 100;
    return percentageToGradeTendency(pct);
}
function scoreToGradeNumeric(achieved, maxPoints) {
    return exports.GRADE_TENDENCY_TO_NUMERIC[scoreToGradeTendency(achieved, maxPoints)];
}
/** Gerundete Punktzahl auf Skala (z. B. EPO 0–15) → Tendenz */
function pointsOnScaleToGradeTendency(points, maxPoints) {
    const t = Math.max(0, Math.min(maxPoints, Math.round(points)));
    return scoreToGradeTendency(t, maxPoints);
}
/** Mindest-Punkte auf Skala für eine Tendenz (Anzeige / Tabellen). */
function minPointsOnScaleForTendency(grade, maxPoints) {
    const band = exports.GRADE_PERCENT_BANDS.find((b) => b.grade === grade);
    if (!band || maxPoints <= 0)
        return 0;
    if (band.minPercent <= 0)
        return 0;
    return Math.min(maxPoints, Math.ceil((maxPoints * band.minPercent) / 100));
}
/** Für EPO-Notentabelle: Zeilen mit minPoints absteigend */
function gradeTableForMaxPoints(maxPoints) {
    const rows = exports.GRADE_PERCENT_BANDS.filter((b) => b.grade !== '6').map((b) => ({
        minPoints: minPointsOnScaleForTendency(b.grade, maxPoints),
        grade: b.grade,
    }));
    rows.push({ minPoints: 0, grade: '6' });
    const byMin = new Map();
    for (const r of rows) {
        if (!byMin.has(r.minPoints))
            byMin.set(r.minPoints, r.grade);
    }
    return [...byMin.entries()]
        .map(([minPoints, grade]) => ({ minPoints, grade }))
        .sort((a, b) => b.minPoints - a.minPoints);
}
function minPointsThresholdForTotalOnScale(total, maxPoints) {
    const grade = pointsOnScaleToGradeTendency(total, maxPoints);
    return minPointsOnScaleForTendency(grade, maxPoints);
}
/** MSS-Punkte 0–15 aus Prozent (gleiche Stufen) */
function percentageToMSSPoints(percentage) {
    const p = clampPercent(percentage);
    if (p >= 95)
        return 15;
    if (p >= 90)
        return 14;
    if (p >= 85)
        return 13;
    if (p >= 80)
        return 12;
    if (p >= 75)
        return 11;
    if (p >= 70)
        return 10;
    if (p >= 65)
        return 9;
    if (p >= 60)
        return 8;
    if (p >= 55)
        return 7;
    if (p >= 50)
        return 6;
    if (p >= 45)
        return 5;
    if (p >= 40)
        return 4;
    if (p >= 30)
        return 3;
    if (p >= 20)
        return 2;
    return 0;
}
function tendencyToAsciiLabel(grade) {
    return grade.replace(/−/g, '-');
}
function gradeRangeLabelForTendency(grade) {
    const idx = exports.GRADE_PERCENT_BANDS.findIndex((b) => b.grade === grade);
    if (idx < 0)
        return 'unbekannt';
    const min = exports.GRADE_PERCENT_BANDS[idx].minPercent;
    if (idx === 0)
        return `${min} – 100 %`;
    const upper = exports.GRADE_PERCENT_BANDS[idx - 1].minPercent;
    return `${min} – unter ${upper} %`;
}
//# sourceMappingURL=gradeScale.js.map