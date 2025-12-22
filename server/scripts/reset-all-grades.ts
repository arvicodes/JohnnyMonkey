import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAllGrades() {
  try {
    console.log('🗑️  Lösche alle Noten aus der Datenbank...');
    
    // Zähle zuerst die Anzahl der Noten
    const countBefore = await prisma.grade.count();
    console.log(`📊 Gefundene Noten: ${countBefore}`);
    
    if (countBefore === 0) {
      console.log('✅ Keine Noten gefunden. Nichts zu löschen.');
      return;
    }
    
    // Lösche alle Noten
    const result = await prisma.grade.deleteMany({});
    
    console.log(`✅ Erfolgreich ${result.count} Noten gelöscht.`);
    console.log('📝 Die UI zeigt jetzt Platzhalter für alle Notenfelder.');
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Noten:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
resetAllGrades()
  .then(() => {
    console.log('✅ Script erfolgreich abgeschlossen.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

