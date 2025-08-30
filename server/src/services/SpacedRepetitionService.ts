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
   * @param quality Antwortqualität (1=Sehr schlecht, 2=Schlecht, 3=Mittelmäßig, 4=Gut, 5=Sehr gut)
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

    // Qualitätsbasierte Level-Anpassung für 5-Stufen-System
    if (quality >= 4) {
      // Gut/Sehr gut - Level erhöhen
      if (currentLevel === 0) {
        // Bei erstem Review mit guter Qualität direkt auf Level 3
        newLevel = 3;
      } else {
        // Bei höheren Leveln schrittweise erhöhen
        newLevel = Math.min(currentLevel + 1, finalConfig.maxLevel);
      }
    } else if (quality === 3) {
      // Mittelmäßig - Level leicht erhöhen oder beibehalten
      if (currentLevel === 0) {
        newLevel = 1;
      } else {
        newLevel = currentLevel; // Beibehalten
      }
    } else if (quality <= 2) {
      // Sehr schlecht/Schlecht - Level zurücksetzen
      newLevel = Math.max(0, currentLevel - 1);
    }

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

    // Erstelle das nächste Review-Datum in Mitteleuropa-Zeit
    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);
    
    // Setze die Zeit auf Mitternacht (00:00:00) in Mitteleuropa
    nextReview.setHours(0, 0, 0, 0);

    return {
      newLevel,
      nextReview,
      interval
    };
  }

  /**
   * Prüft, ob eine Karte für Review bereit ist
   * @param nextReview Nächstes Review-Datum (kann Date oder Millisekunden-Timestamp sein)
   * @returns true wenn die Karte reviewbar ist
   */
  static isCardReadyForReview(nextReview: Date | number): boolean {
    const now = new Date();
    // Setze aktuelle Zeit auf Mitternacht für korrekten Vergleich
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let reviewDate: Date;
    if (typeof nextReview === 'number') {
      // Wenn es ein Millisekunden-Timestamp ist
      reviewDate = new Date(nextReview);
    } else {
      // Wenn es bereits ein Date-Objekt ist
      reviewDate = nextReview;
    }
    
    const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
    
    return reviewDateMidnight <= today;
  }

  /**
   * Berechnet die Anzahl der fälligen Karten für einen Schüler
   * @param progressList Liste aller Karten-Fortschritte eines Schülers
   * @returns Anzahl der fälligen Karten
   */
  static getDueCardsCount(progressList: Array<{ nextReview: Date | number }>): number {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return progressList.filter(progress => {
      let reviewDate: Date;
      if (typeof progress.nextReview === 'number') {
        // Wenn es ein Millisekunden-Timestamp ist
        reviewDate = new Date(progress.nextReview);
      } else {
        // Wenn es bereits ein Date-Objekt ist
        reviewDate = progress.nextReview;
      }
      
      const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      return reviewDateMidnight <= today;
    }).length;
  }

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
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return progressList.map(progress => {
      let reviewDate: Date;
      if (typeof progress.nextReview === 'number') {
        reviewDate = new Date(progress.nextReview);
      } else {
        reviewDate = progress.nextReview;
      }
      
      const reviewDateMidnight = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      const isDue = reviewDateMidnight <= today;
      
      let daysSinceLastReview = 999;
      if (progress.lastReviewed) {
        let lastReviewedDate: Date;
        if (typeof progress.lastReviewed === 'number') {
          lastReviewedDate = new Date(progress.lastReviewed);
        } else {
          lastReviewedDate = progress.lastReviewed;
        }
        daysSinceLastReview = Math.floor((now.getTime() - lastReviewedDate.getTime()) / (1000 * 60 * 60 * 24));
      }
      
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
