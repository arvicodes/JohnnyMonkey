export interface SpacedRepetitionConfig {
  baseInterval: number; // Basis-Intervall in Tagen
  maxLevel: number;     // Maximales Level
  easeFactor: number;   // Einfachheitsfaktor
}

export interface ReviewResult {
  newLevel: number;
  nextReview: Date;
  interval: number;
}

export class SpacedRepetitionService {
  private static readonly DEFAULT_CONFIG: SpacedRepetitionConfig = {
    baseInterval: 1,
    maxLevel: 5,
    easeFactor: 2.5
  };

  /**
   * Berechnet das nächste Review-Datum basierend auf der Antwortqualität
   * @param currentLevel Aktuelles Level (0-5)
   * @param quality Antwortqualität (1-5, wobei 1=schlecht, 5=perfekt)
   * @param config Konfiguration für den Algorithmus
   * @returns ReviewResult mit neuem Level und nächstem Review-Datum
   */
  static calculateNextReview(
    currentLevel: number,
    quality: number,
    config: Partial<SpacedRepetitionConfig> = {}
  ): ReviewResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    let newLevel = currentLevel;
    let interval: number;

    // Qualitätsbasierte Level-Anpassung
    if (quality >= 4) {
      // Richtige Antwort - Level erhöhen
      newLevel = Math.min(currentLevel + 1, finalConfig.maxLevel);
    } else if (quality <= 2) {
      // Falsche Antwort - Level zurücksetzen
      newLevel = Math.max(0, currentLevel - 1);
    }
    // Bei Qualität 3 bleibt das Level gleich

    // Intervall basierend auf neuem Level berechnen
    if (newLevel === 0) {
      interval = finalConfig.baseInterval; // 1 Tag
    } else if (newLevel === 1) {
      interval = finalConfig.baseInterval * 2; // 2 Tage
    } else if (newLevel === 2) {
      interval = finalConfig.baseInterval * 4; // 4 Tage
    } else if (newLevel === 3) {
      interval = finalConfig.baseInterval * 8; // 8 Tage
    } else if (newLevel === 4) {
      interval = finalConfig.baseInterval * 16; // 16 Tage
    } else {
      interval = finalConfig.baseInterval * 30; // 30 Tage
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      newLevel,
      nextReview,
      interval
    };
  }

  /**
   * Prüft, ob eine Karte für Review bereit ist
   * @param nextReview Nächstes Review-Datum
   * @returns true wenn die Karte reviewbar ist
   */
  static isCardReadyForReview(nextReview: Date): boolean {
    return new Date() >= nextReview;
  }

  /**
   * Berechnet die Anzahl der fälligen Karten für einen Schüler
   * @param progressList Liste aller Karten-Fortschritte eines Schülers
   * @returns Anzahl der fälligen Karten
   */
  static getDueCardsCount(progressList: Array<{ nextReview: Date }>): number {
    const now = new Date();
    return progressList.filter(progress => 
      new Date(progress.nextReview) <= now
    ).length;
  }

  /**
   * Sortiert Karten nach Priorität (fällige zuerst, dann nach Level)
   * @param progressList Liste aller Karten-Fortschritte
   * @returns Sortierte Liste
   */
  static sortCardsByPriority(progressList: Array<{
    nextReview: Date;
    level: number;
    lastReviewed?: Date;
  }>): Array<{
    nextReview: Date;
    level: number;
    lastReviewed?: Date;
    priority: number;
  }> {
    const now = new Date();
    
    return progressList.map(progress => {
      const isDue = new Date(progress.nextReview) <= now;
      const daysSinceLastReview = progress.lastReviewed 
        ? Math.floor((now.getTime() - new Date(progress.lastReviewed).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      
      // Priorität: fällige Karten zuerst, dann nach Level und letztem Review
      let priority = 0;
      if (isDue) {
        priority = 1000 + daysSinceLastReview; // Höhere Priorität für länger überfällige Karten
      } else {
        priority = progress.level; // Niedrigere Priorität für höhere Level
      }
      
      return {
        ...progress,
        priority
      };
    }).sort((a, b) => b.priority - a.priority);
  }
}
