/** WebUntis „Schüler*innen im Unterricht“-PDF/Text → SuS-Namen (ohne Mittelnamen). */
export type ParsedWebUntisStudent = {
    firstName: string;
    lastName: string;
    /** Vorname + Nachname, ohne Mittelname */
    fullName: string;
    /** Laufende Nummer aus der Liste (falls erkannt) */
    listIndex?: number;
};
export type WebUntisParseResult = {
    students: ParsedWebUntisStudent[];
    /** z. B. „05a“, „11“ */
    klasse?: string;
    fach?: string;
    schuelergruppe?: string;
};
/** Erster Vorname + vollständiger Nachname (Mittelnamen nur beim Vornamen streichen). */
export declare function studentDisplayName(firstName: string, lastName: string): string;
/** Mittelname(n) aus „Vorname … Nachname“ streichen. */
export declare function stripMiddleNames(fullName: string): string;
export declare function generateLoginCode(firstName: string, lastName: string, groupNumber: string): string;
export declare function normalizeLoginCode(code: string): string;
/** Ziffern aus Gruppennamen, z. B. „Informatik GK 11“ → „11“. */
export declare function groupNumberFromName(groupName: string, fallback?: string): string;
/** Login-Code-Suffix: nur Ziffern aus „05a“ → „05“. */
export declare function loginGroupNumberFromKlasse(klasse: string | undefined, fallback?: string): string;
/** „NachnameVorname(n)“ an CamelCase-Grenze (Unicode) trennen. */
export declare function splitGluedLastFirst(namePart: string): {
    lastName: string;
    firstName: string;
} | null;
/**
 * pdf-parse liefert Zeilen wie „BaumeisterDamian105a“ / „BröderLevi Shaman311“.
 * Tab-getrennte Exports: „Abas Mateo\\t1 11“.
 */
export declare function parseWebUntisStudentListText(rawText: string): WebUntisParseResult;
//# sourceMappingURL=webUntisStudentList.d.ts.map