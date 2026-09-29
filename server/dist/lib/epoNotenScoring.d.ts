export declare const normalizeCategoryScores: (raw: unknown) => number[];
export declare const weightsAreValid: (weights: number[] | null | undefined) => boolean;
/** Gesamtpunkte 0–15 (ggf. gewichtet). Unvollständige Raster: fehlende Zeilen = 0. */
export declare function epoPointsFromScores(rawScores: unknown, weightsPercent?: number[] | null): number;
export declare const epoRoundedPoints: (rawScores: unknown, weightsPercent?: number[] | null) => number;
//# sourceMappingURL=epoNotenScoring.d.ts.map