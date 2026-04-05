/** Mindestwert in jeder der drei Reisekräfte, damit das Ei erscheint */
export declare const JOURNEY_THRESHOLD = 48;
export type JourneyEventType = 'quiz_complete' | 'flashcard_session' | 'homework_submit';
export declare function getOrCreateProgress(userId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    weitePoints: number;
    funkenPoints: number;
    hingabePoints: number;
    companionStage: string;
    eggCarePercent: number;
    lastCareDate: string | null;
    eggFoundAt: Date | null;
    hatchedAt: Date | null;
    lastDailyVisitDate: string | null;
    postHatchXp: number;
}>;
/**
 * Täglicher Besuch: einmal pro Kalendertag Weite + Funken
 */
export declare function ensureDailyVisitBonus(userId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    weitePoints: number;
    funkenPoints: number;
    hingabePoints: number;
    companionStage: string;
    eggCarePercent: number;
    lastCareDate: string | null;
    eggFoundAt: Date | null;
    hatchedAt: Date | null;
    lastDailyVisitDate: string | null;
    postHatchXp: number;
}>;
export declare function applyJourneyEvent(userId: string, type: JourneyEventType, meta?: {
    cardsReviewed?: number;
}): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    weitePoints: number;
    funkenPoints: number;
    hingabePoints: number;
    companionStage: string;
    eggCarePercent: number;
    lastCareDate: string | null;
    eggFoundAt: Date | null;
    hatchedAt: Date | null;
    lastDailyVisitDate: string | null;
    postHatchXp: number;
}>;
/**
 * Ei täglich pflegen (einmal pro Tag möglich)
 */
export declare function applyEggCare(userId: string): Promise<{
    ok: false;
    reason: string;
    progress?: undefined;
} | {
    ok: true;
    progress: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        weitePoints: number;
        funkenPoints: number;
        hingabePoints: number;
        companionStage: string;
        eggCarePercent: number;
        lastCareDate: string | null;
        eggFoundAt: Date | null;
        hatchedAt: Date | null;
        lastDailyVisitDate: string | null;
        postHatchXp: number;
    };
    reason?: undefined;
}>;
export declare function serializeProgress(row: Awaited<ReturnType<typeof getOrCreateProgress>>): {
    weitePoints: number;
    funkenPoints: number;
    hingabePoints: number;
    companionStage: string;
    eggCarePercent: number;
    eggFoundAt: Date;
    hatchedAt: Date;
    postHatchXp: number;
    journeyThreshold: number;
    journeyComplete: boolean;
    minOfThree: number;
    canCareToday: boolean;
};
//# sourceMappingURL=journeyService.d.ts.map