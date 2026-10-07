/**
 * Schüler: Teile innerhalb jeder Aufgabe (exam-subsection / Rasterzellen) pro SuS
 * deterministisch mischen — Aufgaben 1/2/3 bleiben in fester Reihenfolge.
 */
export declare const EXAM_SUBSECTION_SHUFFLE_MARKER = "data-jm-exam-subsection-shuffle";
export declare function isDeliverableExamHtml(html: string, filePath?: string): boolean;
/** IIFE-Body: definiert setupExamSubsectionShuffleForStudent() (ES5). */
export declare const EXAM_SUBSECTION_SHUFFLE_FUNCTION: string;
/** Live-Punkte/Note im Footer nur bei eingeschalteter Musterlösung. */
export declare const EXAM_HIDE_LIVE_SCORE_MARKER = "data-jm-hide-live-exam-scores";
export declare const EXAM_DOLLAR_SCRIPT_MARKER = "data-jm-exam-dollar-script";
export declare const EXAM_CHROME_SCRIPT_MARKER = "data-jm-exam-chrome-script";
/** Uhr-Button in der linken Leiste (ältere Dateien). */
export declare function patchExamChromeMarkup(html: string): string;
/** „+ Aufgabe“-Eingabe unter den Aufgaben im Blatt, nicht in der Sidebar. */
export declare function patchExamPaperComposeMarkup(html: string): string;
export declare function taskDollarSourceHasZufall(source: string): boolean;
/** $Zufall$ in Aufgabenquelle → data-jm-task-shuffle am .task-Element */
export declare function patchExamTaskShuffleMarkersFromDollarSource(html: string): string;
export declare function transformExamHtmlForDelivery(html: string, filePath?: string, assetBase?: string): string;
//# sourceMappingURL=examSubsectionShuffle.d.ts.map