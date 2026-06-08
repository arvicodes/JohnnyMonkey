export declare function resolveJmReihenRoot(): string;
export declare function sanitizeErasmusSegment(input: string): string;
/** Nur der Titel-Teil vor dem ersten „ - “ (z. B. „Teaching Assignment - Kroatien …“ → Teaching Assignment). */
export declare function erasmusTitelFromSiteName(name: string): string;
/** Schema: „Jahr - Monat - Land - Titel“ */
export declare function buildErasmusFolderLabel(site: {
    name?: string;
    country?: string;
    createdAt?: string;
}): string;
/**
 * Legt J-M-Reihen/Erasmus/{Jahr - Monat - Land - Titel}/Bilder an (oder benennt um).
 * Setzt erasmusFolder auf den relativen Pfad unter J-M-Reihen.
 */
export declare function applyErasmusFoldersToSitePayload(raw: Record<string, unknown>): {
    payload: Record<string, unknown>;
    folderCreated: boolean;
    folderPath?: string;
};
//# sourceMappingURL=erasmusSiteFolders.d.ts.map