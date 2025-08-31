export interface SpacedRepetitionConfig {
    baseInterval: number;
    maxLevel: number;
    easeFactor: number;
}
export interface ReviewResult {
    newLevel: number;
    nextReview: Date;
    interval: number;
}
export declare class SpacedRepetitionService {
    private static readonly DEFAULT_CONFIG;
    /**
     * Berechnet das nächste Review-Datum basierend auf der Antwortqualität
     * @param currentLevel Aktuelles Level (0-5)
     * @param quality Antwortqualität (1=Sehr schlecht, 2=Schlecht, 3=Mittelmäßig, 4=Gut, 5=Sehr gut)
     * @param config Konfiguration für den Algorithmus
     * @returns ReviewResult mit neuem Level und nächstem Review-Datum
     */
    static calculateNextReview(currentLevel: number, quality: number, config?: Partial<SpacedRepetitionConfig>): ReviewResult;
    /**
     * Prüft, ob eine Karte für Review bereit ist
     * @param nextReview Nächstes Review-Datum (kann Date oder Millisekunden-Timestamp sein)
     * @returns true wenn die Karte reviewbar ist
     */
    static isCardReadyForReview(nextReview: Date | number): boolean;
    /**
     * Berechnet die Anzahl der fälligen Karten für einen Schüler
     * @param progressList Liste aller Karten-Fortschritte eines Schülers
     * @returns Anzahl der fälligen Karten
     */
    static getDueCardsCount(progressList: Array<{
        nextReview: Date | number;
    }>): number;
    /**
     * Sortiert Karten nach Priorität (fällige zuerst, dann nach Level)
     * @param progressList Liste aller Karten-Fortschritte
     * @returns Sortierte Liste
     */
    static sortCardsByPriority(progressList: Array<{
        nextReview: Date | number;
        level: number;
        lastReviewed?: Date | number;
    }>): Array<{
        nextReview: Date | number;
        level: number;
        lastReviewed?: Date | number;
        priority: number;
    }>;
}
//# sourceMappingURL=SpacedRepetitionService.d.ts.map