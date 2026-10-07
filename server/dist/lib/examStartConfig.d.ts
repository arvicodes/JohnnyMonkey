/** Einstellungen beim Prüfungsstart (pro Lerngruppe, in LessonExamBeacon.configJson). */
export type ExamBeaconGroupConfig = {
    /** Wenn gesetzt: nur diese SuS sehen den Beacon. Leer = alle der Gruppe. */
    studentIds?: string[];
    /** 1–3: wie viele Prüfungsversionen (A/B/C) aktiv sind. */
    versionCount?: 1 | 2 | 3;
    /** Manuelle Zuweisung SuS → Versionsbuchstabe. */
    versionAssignments?: Record<string, string>;
};
export declare function parseExamBeaconGroupConfig(raw: string | null | undefined): ExamBeaconGroupConfig;
export declare function normalizeVersionCount(n: unknown): 1 | 2 | 3;
export declare function activeVersionLetters(allLetters: string[], versionCount: 1 | 2 | 3): string[];
export declare function resolveStudentVersionLetter(studentId: string, beaconId: string, letters: string[], assignments?: Record<string, string>): string;
export declare function studentAllowedInBeacon(studentId: string, cfg: ExamBeaconGroupConfig): boolean;
//# sourceMappingURL=examStartConfig.d.ts.map