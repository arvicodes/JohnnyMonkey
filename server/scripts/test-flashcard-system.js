const { PrismaClient } = require('../dist/generated/prisma');
const { SpacedRepetitionService } = require('../dist/services/SpacedRepetitionService');

const prisma = new PrismaClient();

async function testFlashcardSystem() {
  try {
    console.log('🧪 Teste das Flashcard-System...\n');
    
    // Test 1: Überprüfe die Daten für Jakob Ackermann
    console.log('📊 Test 1: Jakob Ackermanns Daten für Didaktik_Bruchrechnung');
    console.log('=' .repeat(60));
    
    const jakobProgress = await prisma.flashcardProgress.findMany({
      where: {
        studentId: '4b09f68d-a1cd-4a5a-9cf8-e30d2732942e',
        card: {
          deckId: '10e83a3c-d204-4973-81d9-624165e38f04'
        }
      },
      include: {
        card: true
      }
    });
    
    console.log(`Gefunden: ${jakobProgress.length} Karten mit Fortschritt`);
    
    jakobProgress.forEach(progress => {
      console.log(`  - ${progress.card.front.substring(0, 50)}...`);
      console.log(`    Level: ${progress.level}, Quality: ${progress.quality || 'N/A'}`);
      console.log(`    Next Review: ${new Date(progress.nextReview).toLocaleDateString('de-DE')}`);
      console.log(`    Last Reviewed: ${progress.lastReviewed ? new Date(progress.lastReviewed).toLocaleDateString('de-DE') : 'N/A'}`);
      console.log('');
    });
    
    // Test 2: Überprüfe die Level-Quality-Korrelation
    console.log('🔍 Test 2: Level-Quality-Korrelation');
    console.log('=' .repeat(60));
    
    const levelQualityStats = await prisma.flashcardProgress.groupBy({
      by: ['level', 'quality'],
      _count: {
        level: true
      },
      where: {
        quality: {
          not: null
        }
      },
      orderBy: [
        { level: 'asc' },
        { quality: 'asc' }
      ]
    });
    
    console.log('Level-Quality-Verteilung:');
    levelQualityStats.forEach(stat => {
      console.log(`  Level ${stat.level}, Quality ${stat.quality}: ${stat._count.level} Karten`);
    });
    
    // Test 3: Überprüfe die fälligen Karten
    console.log('\n📅 Test 3: Fällige Karten');
    console.log('=' .repeat(60));
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const dueCards = await prisma.flashcardProgress.findMany({
      where: {
        nextReview: {
          lte: today
        },
        card: {
          deckId: '10e83a3c-d204-4973-81d9-624165e38f04'
        }
      },
      include: {
        card: true
      }
    });
    
    console.log(`Fällige Karten heute: ${dueCards.length}`);
    
    // Gruppiere nach Level
    const dueByLevel = {};
    dueCards.forEach(card => {
      const level = card.level;
      if (!dueByLevel[level]) dueByLevel[level] = 0;
      dueByLevel[level]++;
    });
    
    Object.keys(dueByLevel).sort().forEach(level => {
      console.log(`  Level ${level}: ${dueByLevel[level]} Karten`);
    });
    
    // Test 4: Teste den SpacedRepetitionService
    console.log('\n⚡ Test 4: SpacedRepetitionService');
    console.log('=' .repeat(60));
    
    const testCases = [
      { level: 0, quality: 1, expected: 'Level sollte 0 bleiben' },
      { level: 0, quality: 3, expected: 'Level sollte 1 werden' },
      { level: 0, quality: 4, expected: 'Level sollte 3 werden' },
      { level: 0, quality: 5, expected: 'Level sollte 3 werden' },
      { level: 3, quality: 1, expected: 'Level sollte 2 werden' },
      { level: 3, quality: 5, expected: 'Level sollte 4 werden' }
    ];
    
    testCases.forEach(testCase => {
      const result = SpacedRepetitionService.calculateNextReview(testCase.level, testCase.quality);
      console.log(`  Level ${testCase.level} + Quality ${testCase.quality} → Level ${result.newLevel} (${testCase.expected})`);
      console.log(`    Next Review: ${result.nextReview.toLocaleDateString('de-DE')} (in ${result.interval} Tagen)`);
    });
    
    // Test 5: Überprüfe die Gesamtstatistiken
    console.log('\n📈 Test 5: Gesamtstatistiken für Didaktik_Bruchrechnung');
    console.log('=' .repeat(60));
    
    const totalCards = await prisma.flashcard.count({
      where: { deckId: '10e83a3c-d204-4973-81d9-624165e38f04' }
    });
    
    const totalProgress = await prisma.flashcardProgress.count({
      where: {
        card: { deckId: '10e83a3c-d204-4973-81d9-624165e38f04' }
      }
    });
    
    const levelDistribution = await prisma.flashcardProgress.groupBy({
      by: ['level'],
      _count: { level: true },
      where: {
        card: { deckId: '10e83a3c-d204-4973-81d9-624165e38f04' }
      },
      orderBy: { level: 'asc' }
    });
    
    const qualityDistribution = await prisma.flashcardProgress.groupBy({
      by: ['quality'],
      _count: { quality: true },
      where: {
        quality: { not: null },
        card: { deckId: '10e83a3c-d204-4973-81d9-624165e38f04' }
      },
      orderBy: { quality: 'asc' }
    });
    
    console.log(`Gesamtkarten: ${totalCards}`);
    console.log(`Karten mit Fortschritt: ${totalProgress}`);
    console.log(`Karten ohne Fortschritt: ${totalCards - totalProgress}`);
    
    console.log('\nLevel-Verteilung:');
    levelDistribution.forEach(stat => {
      console.log(`  Level ${stat.level}: ${stat._count.level} Karten`);
    });
    
    console.log('\nQuality-Verteilung:');
    qualityDistribution.forEach(stat => {
      console.log(`  Quality ${stat.quality}: ${stat._count.quality} Karten`);
    });
    
    console.log('\n✅ Alle Tests abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe die Tests aus
testFlashcardSystem();
