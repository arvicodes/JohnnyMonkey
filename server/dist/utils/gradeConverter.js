"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.percentageToGrade = percentageToGrade;
exports.percentageToMSSPoints = percentageToMSSPoints;
exports.mssPointsToPercentage = mssPointsToPercentage;
exports.mssPointsToGermanGrade = mssPointsToGermanGrade;
exports.germanGradeToMSSPoints = germanGradeToMSSPoints;
exports.getGradeRange = getGradeRange;
exports.getMSSPointsRange = getMSSPointsRange;
exports.calculateMSSWeightedAverage = calculateMSSWeightedAverage;
exports.calculateGermanWeightedAverage = calculateGermanWeightedAverage;
/**
 * Converts a percentage score to a German grade according to the specified scale
 * @param percentage - The percentage score (0-100)
 * @returns The German grade (1.0 to 6.0)
 */
function percentageToGrade(percentage) {
    if (percentage >= 95.0)
        return 1.0;
    if (percentage >= 90.0)
        return 1.3;
    if (percentage >= 85.0)
        return 1.7;
    if (percentage >= 80.0)
        return 2.0;
    if (percentage >= 75.0)
        return 2.3;
    if (percentage >= 70.0)
        return 2.7;
    if (percentage >= 65.0)
        return 3.0;
    if (percentage >= 60.0)
        return 3.3;
    if (percentage >= 55.0)
        return 3.7;
    if (percentage >= 50.0)
        return 4.0;
    if (percentage >= 45.0)
        return 4.3;
    if (percentage >= 40.0)
        return 4.7;
    if (percentage >= 35.0)
        return 5.0;
    if (percentage >= 20.0)
        return 5.3;
    return 6.0; // unter 20.0%
}
/**
 * Converts a percentage score to MSS points (0-15)
 * @param percentage - The percentage score (0-100)
 * @returns The MSS points (0 to 15)
 */
function percentageToMSSPoints(percentage) {
    if (percentage >= 95.0)
        return 15;
    if (percentage >= 90.0)
        return 14;
    if (percentage >= 85.0)
        return 13;
    if (percentage >= 80.0)
        return 12;
    if (percentage >= 75.0)
        return 11;
    if (percentage >= 70.0)
        return 10;
    if (percentage >= 65.0)
        return 9;
    if (percentage >= 60.0)
        return 8;
    if (percentage >= 55.0)
        return 7;
    if (percentage >= 50.0)
        return 6;
    if (percentage >= 45.0)
        return 5;
    if (percentage >= 40.0)
        return 4;
    if (percentage >= 35.0)
        return 3;
    if (percentage >= 20.0)
        return 2;
    if (percentage >= 10.0)
        return 1;
    return 0; // unter 10.0%
}
/**
 * Converts MSS points (0-15) to a percentage score
 * @param mssPoints - The MSS points (0-15)
 * @returns The percentage score (0-100)
 */
function mssPointsToPercentage(mssPoints) {
    const conversionMap = {
        15: 95.0, 14: 90.0, 13: 85.0, 12: 80.0, 11: 75.0,
        10: 70.0, 9: 65.0, 8: 60.0, 7: 55.0, 6: 50.0,
        5: 45.0, 4: 40.0, 3: 35.0, 2: 20.0, 1: 10.0, 0: 5.0
    };
    return conversionMap[mssPoints] || 0;
}
/**
 * Converts MSS points (0-15) to German grade (1.0-6.0)
 * @param mssPoints - The MSS points (0-15)
 * @returns The German grade (1.0 to 6.0)
 */
function mssPointsToGermanGrade(mssPoints) {
    if (mssPoints >= 13)
        return 1.0;
    if (mssPoints >= 10)
        return 2.0;
    if (mssPoints >= 7)
        return 3.0;
    if (mssPoints >= 4)
        return 4.0;
    if (mssPoints >= 1)
        return 5.0;
    return 6.0;
}
/**
 * Converts German grade (1.0-6.0) to MSS points (0-15)
 * @param germanGrade - The German grade (1.0-6.0)
 * @returns The MSS points (0 to 15)
 */
function germanGradeToMSSPoints(germanGrade) {
    if (germanGrade <= 1.7)
        return 13;
    if (germanGrade <= 2.7)
        return 10;
    if (germanGrade <= 3.7)
        return 7;
    if (germanGrade <= 4.7)
        return 4;
    if (germanGrade <= 5.7)
        return 1;
    return 0;
}
/**
 * Gets the grade range for a given grade
 * @param grade - The German grade
 * @returns The percentage range as a string
 */
function getGradeRange(grade) {
    switch (grade) {
        case 1.0: return "100,0 – 95,0 %";
        case 1.3: return "94,9 – 90,0 %";
        case 1.7: return "89,9 – 85,0 %";
        case 2.0: return "84,9 – 80,0 %";
        case 2.3: return "79,9 – 75,0 %";
        case 2.7: return "74,9 – 70,0 %";
        case 3.0: return "69,9 – 65,0 %";
        case 3.3: return "64,9 – 60,0 %";
        case 3.7: return "59,9 – 55,0 %";
        case 4.0: return "54,9 – 50,0 %";
        case 4.3: return "49,9 – 45,0 %";
        case 4.7: return "44,9 – 40,0 %";
        case 5.0: return "39,9 – 35,0 %";
        case 5.3: return "34,9 – 20,0 %";
        case 6.0: return "unter 20,0 %";
        default: return "unbekannt";
    }
}
/**
 * Gets the MSS points range for given points
 * @param mssPoints - The MSS points (0-15)
 * @returns The percentage range as a string
 */
function getMSSPointsRange(mssPoints) {
    const conversionMap = {
        15: "100,0 – 95,0 %", 14: "94,9 – 90,0 %", 13: "89,9 – 85,0 %",
        12: "84,9 – 80,0 %", 11: "79,9 – 75,0 %", 10: "74,9 – 70,0 %",
        9: "69,9 – 65,0 %", 8: "64,9 – 60,0 %", 7: "59,9 – 55,0 %",
        6: "54,9 – 50,0 %", 5: "49,9 – 45,0 %", 4: "44,9 – 40,0 %",
        3: "39,9 – 35,0 %", 2: "34,9 – 20,0 %", 1: "19,9 – 10,0 %",
        0: "unter 10,0 %"
    };
    return conversionMap[mssPoints] || "unbekannt";
}
/**
 * Calculates weighted average grade for MSS system
 * @param grades - Array of {grade: number, weight: number}
 * @returns The weighted average MSS points
 */
function calculateMSSWeightedAverage(grades) {
    if (grades.length === 0)
        return 0;
    const validGrades = grades.filter(g => g.grade !== null && g.grade !== undefined);
    if (validGrades.length === 0)
        return 0;
    const totalWeight = validGrades.reduce((sum, g) => sum + g.weight, 0);
    if (totalWeight === 0)
        return 0;
    const weightedSum = validGrades.reduce((sum, g) => sum + (g.grade * g.weight), 0);
    return Math.round((weightedSum / totalWeight) * 100) / 100; // Auf 2 Dezimalstellen runden
}
/**
 * Calculates weighted average grade for German system
 * @param grades - Array of {grade: number, weight: number}
 * @returns The weighted average German grade
 */
function calculateGermanWeightedAverage(grades) {
    if (grades.length === 0)
        return 0;
    const validGrades = grades.filter(g => g.grade !== null && g.grade !== undefined);
    if (validGrades.length === 0)
        return 0;
    const totalWeight = validGrades.reduce((sum, g) => sum + g.weight, 0);
    if (totalWeight === 0)
        return 0;
    const weightedSum = validGrades.reduce((sum, g) => sum + (g.grade * g.weight), 0);
    return Math.round((weightedSum / totalWeight) * 100) / 100; // Auf 2 Dezimalstellen runden
}
//# sourceMappingURL=gradeConverter.js.map