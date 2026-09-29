"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreToGradeTendency = exports.percentageToGradeTendency = void 0;
exports.percentageToGrade = percentageToGrade;
exports.percentageToMSSPoints = percentageToMSSPoints;
exports.mssPointsToPercentage = mssPointsToPercentage;
exports.mssPointsToGermanGrade = mssPointsToGermanGrade;
exports.germanGradeToMSSPoints = germanGradeToMSSPoints;
exports.getGradeRange = getGradeRange;
exports.getMSSPointsRange = getMSSPointsRange;
exports.calculateMSSWeightedAverage = calculateMSSWeightedAverage;
exports.calculateGermanWeightedAverage = calculateGermanWeightedAverage;
const gradeScale_1 = require("../lib/gradeScale");
/** @deprecated Alias — nutze percentageToGradeNumeric */
function percentageToGrade(percentage) {
    return (0, gradeScale_1.percentageToGradeNumeric)(percentage);
}
function percentageToMSSPoints(percentage) {
    return (0, gradeScale_1.percentageToMSSPoints)(percentage);
}
function mssPointsToPercentage(mssPoints) {
    var _a;
    const map = {
        15: 95,
        14: 90,
        13: 85,
        12: 80,
        11: 75,
        10: 70,
        9: 65,
        8: 60,
        7: 55,
        6: 50,
        5: 45,
        4: 40,
        3: 30,
        2: 20,
        0: 0,
    };
    const k = Math.max(0, Math.min(15, Math.round(mssPoints)));
    return (_a = map[k]) !== null && _a !== void 0 ? _a : 0;
}
const numericToTendency = (g) => {
    const entries = Object.entries(gradeScale_1.GRADE_TENDENCY_TO_NUMERIC);
    let best = '6';
    let bestDist = Infinity;
    for (const [t, n] of entries) {
        const d = Math.abs(n - g);
        if (d < bestDist) {
            bestDist = d;
            best = t;
        }
    }
    return best;
};
function mssPointsToGermanGrade(mssPoints) {
    const pct = mssPointsToPercentage(mssPoints);
    return (0, gradeScale_1.percentageToGradeNumeric)(pct);
}
const TENDENCY_TO_MSS = {
    '1': 15,
    '1−': 14,
    '2+': 13,
    '2': 12,
    '2−': 11,
    '3+': 10,
    '3': 9,
    '3−': 8,
    '4+': 7,
    '4': 6,
    '4−': 5,
    '5+': 4,
    '5': 3,
    '5−': 2,
    '6': 0,
};
function germanGradeToMSSPoints(germanGrade) {
    var _a;
    return (_a = TENDENCY_TO_MSS[numericToTendency(germanGrade)]) !== null && _a !== void 0 ? _a : 0;
}
function getGradeRange(grade) {
    return (0, gradeScale_1.gradeRangeLabelForTendency)(numericToTendency(grade));
}
function getMSSPointsRange(mssPoints) {
    const pct = mssPointsToPercentage(mssPoints);
    const t = (0, gradeScale_1.percentageToGradeTendency)(pct);
    return (0, gradeScale_1.gradeRangeLabelForTendency)(t);
}
function calculateMSSWeightedAverage(grades) {
    if (grades.length === 0)
        return 0;
    const validGrades = grades.filter((g) => g.grade !== null && g.grade !== undefined);
    if (validGrades.length === 0)
        return 0;
    const totalWeight = validGrades.reduce((sum, g) => sum + g.weight, 0);
    if (totalWeight === 0)
        return 0;
    const weightedSum = validGrades.reduce((sum, g) => sum + g.grade * g.weight, 0);
    return Math.round((weightedSum / totalWeight) * 100) / 100;
}
function calculateGermanWeightedAverage(grades) {
    return calculateMSSWeightedAverage(grades);
}
var gradeScale_2 = require("../lib/gradeScale");
Object.defineProperty(exports, "percentageToGradeTendency", { enumerable: true, get: function () { return gradeScale_2.percentageToGradeTendency; } });
Object.defineProperty(exports, "scoreToGradeTendency", { enumerable: true, get: function () { return gradeScale_2.scoreToGradeTendency; } });
//# sourceMappingURL=gradeConverter.js.map