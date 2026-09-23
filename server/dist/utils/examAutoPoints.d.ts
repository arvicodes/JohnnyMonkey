export type ExamAnswerKey = {
    answers: Record<string, string | string[] | number>;
    points: Record<string, number>;
    taskPoints: Record<string, number>;
    maxPoints: number;
    isGeometry: boolean;
};
export declare function parseExamTaskPointsFromHtml(html: string): Record<string, number>;
export declare function buildFieldPointsFromTaskPoints(answers: Record<string, string | string[] | number>, taskPoints: Record<string, number>, isGeometry: boolean): Record<string, number>;
export declare function updateExamTotalPointsInHtml(html: string, total: number): string;
export declare function replaceExamTaskPointsInHtml(html: string, updates: Record<string, number>): string;
export declare function examAnswerMatches(expected: unknown, student: unknown): boolean;
export declare function parseExamAnswerKey(html: string): ExamAnswerKey;
export declare function resolveExamHtmlPath(filePath: string): string;
export declare function readExamHtml(filePath: string): string;
export declare function replaceCorrectAnswersInHtml(html: string, updates: Record<string, string | string[] | number>): string;
export declare function writeExamHtml(filePath: string, html: string): void;
export declare function calculateAutoPoints(answers: Record<string, unknown>, key: ExamAnswerKey): number;
type CorrectionRow = {
    taskNumber: string;
    manualPoints: number | null;
};
/** Gesamtpunkte: pro Feld Override oder Auto; Geometrie behält Zusatz-Manualpunkte. */
export declare function computeSubmissionTotal(answersJson: string, key: ExamAnswerKey, corrections: CorrectionRow[]): {
    autoPoints: number;
    totalPoints: number;
};
export {};
//# sourceMappingURL=examAutoPoints.d.ts.map