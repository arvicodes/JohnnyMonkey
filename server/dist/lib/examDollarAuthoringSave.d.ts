/** Dollar-Autoreninhalt in Prüfungs-HTML persistieren (textarea.exam-dollar-source pro Aufgabe). */
export declare function buildDollarTaskBlock(taskNumber: number, source: string): string;
export declare function parseMinutesFromAidsLabel(text: string): number | null;
/** Zeit / Hilfsmittel in der Prüfungs-HTML (inkl. Timer-Startwert). */
export declare function syncExamHeaderMetaInHtml(html: string, meta: {
    aidsTime?: string;
    aidsTools?: string;
    aidsGeneralRules?: string;
}): string;
/** „Allgemeine Regeln“ unter Hilfsmittel (ältere Prüfungs-HTML). */
export declare function patchExamAidsGeneralRulesMarkup(html: string): string;
export declare function formatAidsGeneralRulesDisplayHtml(plain: string): string;
export declare function patchAidsGeneralRulesListDisplay(html: string): string;
/** Regeln-Zeile: Überschrift oben, Liste volle Breite darunter. */
export declare function patchExamAidsRulesRowLayout(html: string): string;
export declare function syncExamDollarTasksInHtml(html: string, sources: string[]): string;
export declare const EXAM_FILE_PATH_MARKER = "data-jm-exam-file-path";
export declare function injectExamFilePathForClient(html: string, filePath: string): string;
//# sourceMappingURL=examDollarAuthoringSave.d.ts.map