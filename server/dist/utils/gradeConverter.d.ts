/** @deprecated Alias — nutze percentageToGradeNumeric */
export declare function percentageToGrade(percentage: number): number;
export declare function percentageToMSSPoints(percentage: number): number;
export declare function mssPointsToPercentage(mssPoints: number): number;
export declare function mssPointsToGermanGrade(mssPoints: number): number;
export declare function germanGradeToMSSPoints(germanGrade: number): number;
export declare function getGradeRange(grade: number): string;
export declare function getMSSPointsRange(mssPoints: number): string;
export declare function calculateMSSWeightedAverage(grades: {
    grade: number;
    weight: number;
}[]): number;
export declare function calculateGermanWeightedAverage(grades: {
    grade: number;
    weight: number;
}[]): number;
export { percentageToGradeTendency, scoreToGradeTendency } from '../lib/gradeScale';
//# sourceMappingURL=gradeConverter.d.ts.map