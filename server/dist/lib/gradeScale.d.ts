/**
 * App-weite Regel: Prozent → Schulnote mit Tendenz (Frau Christ / JohnnyMonkey).
 * Untere Grenze inklusive, obere Grenze der nächsthöheren Stufe exklusiv (außer 100 %).
 */
export type GradeTendency = '1' | '1−' | '2+' | '2' | '2−' | '3+' | '3' | '3−' | '4+' | '4' | '4−' | '5+' | '5' | '5−' | '6';
/** Absteigend nach minPercent — erste passende Zeile gewinnt. */
export declare const GRADE_PERCENT_BANDS: {
    minPercent: number;
    grade: GradeTendency;
}[];
/** Für Durchschnitte / Speicherung (deutsches Notensystem). */
export declare const GRADE_TENDENCY_TO_NUMERIC: Record<GradeTendency, number>;
export declare function clampPercent(percentage: number): number;
export declare function percentageToGradeTendency(percentage: number): GradeTendency;
export declare function percentageToGradeNumeric(percentage: number): number;
/** Erreichte / Maximal → Tendenz-Note */
export declare function scoreToGradeTendency(achieved: number, maxPoints: number): GradeTendency;
export declare function scoreToGradeNumeric(achieved: number, maxPoints: number): number;
/** Gerundete Punktzahl auf Skala (z. B. EPO 0–15) → Tendenz */
export declare function pointsOnScaleToGradeTendency(points: number, maxPoints: number): GradeTendency;
/** Mindest-Punkte auf Skala für eine Tendenz (Anzeige / Tabellen). */
export declare function minPointsOnScaleForTendency(grade: GradeTendency, maxPoints: number): number;
/** Für EPO-Notentabelle: Zeilen mit minPoints absteigend */
export declare function gradeTableForMaxPoints(maxPoints: number): {
    minPoints: number;
    grade: GradeTendency;
}[];
export declare function minPointsThresholdForTotalOnScale(total: number, maxPoints: number): number;
/** MSS-Punkte 0–15 aus Prozent (gleiche Stufen) */
export declare function percentageToMSSPoints(percentage: number): number;
export declare function tendencyToAsciiLabel(grade: GradeTendency): string;
export declare function gradeRangeLabelForTendency(grade: GradeTendency): string;
//# sourceMappingURL=gradeScale.d.ts.map