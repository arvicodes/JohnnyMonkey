/**
 * Schüler: Teile innerhalb jeder Aufgabe (exam-subsection / Rasterzellen) pro SuS
 * deterministisch mischen — Aufgaben 1/2/3 bleiben in fester Reihenfolge.
 */
export declare const EXAM_SUBSECTION_SHUFFLE_MARKER = "data-jm-exam-subsection-shuffle";
export declare function isDeliverableExamHtml(html: string, filePath?: string): boolean;
/** IIFE-Body: definiert setupExamSubsectionShuffleForStudent() (ES5). */
export declare const EXAM_SUBSECTION_SHUFFLE_FUNCTION: string;
export declare function transformExamHtmlForDelivery(html: string, filePath?: string): string;
//# sourceMappingURL=examSubsectionShuffle.d.ts.map