const { PrismaClient } = require('../dist/generated/prisma');
const { SpacedRepetitionService } = require('../dist/services/SpacedRepetitionService');

const prisma = new PrismaClient();

async function fixFlashcardLevels() {
  try {
    console.log('🔧 Starte Korrektur der Flashcard-Level...');
    
    // Hole alle FlashcardProgress Einträge mit Quality-Bewertungen
    const progressEntries = await prisma.flashcardProgress.findMany({
      where: {
        quality: {
          not: null
        }
      },
      include: {
        card: true
      }
    });
    
    console.log(`📊 Gefunden: ${progressEntries.length} Einträge mit Quality-Bewertungen`);
    
    let correctedCount = 0;
    
    for (const progress of progressEntries) {
      const currentLevel = progress.level;
      const quality = progress.quality;
      
      // Berechne den korrekten Level basierend auf der Quality
      let correctLevel = currentLevel;
      
      if (quality >= 4) {
        // Gut/Sehr gut - Level sollte mindestens 3 sein
        correctLevel = Math.max(3, currentLevel);
      } else if (quality === 3) {
        // Mittelmäßig - Level sollte 1-2 sein
        correctLevel = Math.max(1, Math.min(2, currentLevel));
      } else if (quality <= 2) {
        // Schlecht/Sehr schlecht - Level sollte 0-1 sein
        correctLevel = Math.min(1, currentLevel);
      }
      
      // Wenn der Level korrigiert werden muss
      if (correctLevel !== currentLevel) {
        console.log(`🔄 Korrigiere Karte ${progress.cardId}: Level ${currentLevel} → ${correctLevel} (Quality: ${quality})`);
        
        // Berechne das korrekte nextReview basierend auf dem neuen Level
        const reviewResult = SpacedRepetitionService.calculateNextReview(correctLevel, quality);
        
        // Aktualisiere den Eintrag
        await prisma.flashcardProgress.update({
          where: { id: progress.id },
          data: {
            level: correctLevel,
            interval: reviewResult.interval,
            nextReview: reviewResult.nextReview
          }
        });
        
        correctedCount++;
      }
    }
    
    console.log(`✅ Korrektur abgeschlossen: ${correctedCount} Einträge korrigiert`);
    
    // Zeige die aktualisierten Statistiken
    const updatedStats = await prisma.flashcardProgress.groupBy({
      by: ['level'],
      _count: {
        level: true
      },
      orderBy: {
        level: 'asc'
      }
    });
    
    console.log('\n📈 Aktuelle Level-Verteilung:');
    updatedStats.forEach(stat => {
      console.log(`  Level ${stat.level}: ${stat._count.level} Karten`);
    });
    
  } catch (error) {
    console.error('❌ Fehler bei der Korrektur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe das Skript aus
fixFlashcardLevels();
