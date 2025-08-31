/**
 * Converts a percentage score to a German grade according to the specified scale
 * @param percentage - The percentage score (0-100)
 * @returns The German grade (1.0 to 6.0)
 */
export declare function percentageToGrade(percentage: number): number;
/**
 * Converts a percentage score to MSS points (0-15)
 * @param percentage - The percentage score (0-100)
 * @returns The MSS points (0 to 15)
 */
export declare function percentageToMSSPoints(percentage: number): number;
/**
 * Converts MSS points (0-15) to a percentage score
 * @param mssPoints - The MSS points (0-15)
 * @returns The percentage score (0-100)
 */
export declare function mssPointsToPercentage(mssPoints: number): number;
/**
 * Converts MSS points (0-15) to German grade (1.0-6.0)
 * @param mssPoints - The MSS points (0-15)
 * @returns The German grade (1.0 to 6.0)
 */
export declare function mssPointsToGermanGrade(mssPoints: number): number;
/**
 * Converts German grade (1.0-6.0) to MSS points (0-15)
 * @param germanGrade - The German grade (1.0-6.0)
 * @returns The MSS points (0 to 15)
 */
export declare function germanGradeToMSSPoints(germanGrade: number): number;
/**
 * Gets the grade range for a given grade
 * @param grade - The German grade
 * @returns The percentage range as a string
 */
export declare function getGradeRange(grade: number): string;
/**
 * Gets the MSS points range for given points
 * @param mssPoints - The MSS points (0-15)
 * @returns The percentage range as a string
 */
export declare function getMSSPointsRange(mssPoints: number): string;
/**
 * Calculates weighted average grade for MSS system
 * @param grades - Array of {grade: number, weight: number}
 * @returns The weighted average MSS points
 */
export declare function calculateMSSWeightedAverage(grades: {
    grade: number;
    weight: number;
}[]): number;
/**
 * Calculates weighted average grade for German system
 * @param grades - Array of {grade: number, weight: number}
 * @returns The weighted average German grade
 */
export declare function calculateGermanWeightedAverage(grades: {
    grade: number;
    weight: number;
}[]): number;
//# sourceMappingURL=gradeConverter.d.ts.map