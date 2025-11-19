const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function checkKASubmissions() {
  try {
    const kaFilePath = 'KA_prozent-zinsrechnung.html';
    
    console.log(`\n🔍 Suche nach Einreichungen für: ${kaFilePath}\n`);
    
    // Suche mit verschiedenen Varianten des Dateinamens
    const possiblePaths = [
      kaFilePath,
      kaFilePath.replace('.html', ''),
      'KA_prozent-zinsrechnung',
      'prozent-zinsrechnung.html',
      'prozent-zinsrechnung'
    ];
    
    // Zuerst: Alle Submissions anzeigen (für Debugging)
    const allSubmissions = await prisma.kASubmission.findMany({
      select: {
        kaFilePath: true,
        status: true,
        submittedAt: true
      }
    });
    
    console.log('📊 Alle KA-Einreichungen in der Datenbank:');
    const uniqueFiles = [...new Set(allSubmissions.map(s => s.kaFilePath))];
    uniqueFiles.forEach(file => {
      const count = allSubmissions.filter(s => s.kaFilePath === file).length;
      console.log(`   - ${file}: ${count} Einreichung(en)`);
    });
    console.log('');
    
    // Suche nach spezifischer KA
    let submissions = await prisma.kASubmission.findMany({
      where: {
        OR: possiblePaths.map(path => ({
          kaFilePath: {
            contains: path
          }
        }))
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            loginCode: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });
    
    if (submissions.length === 0) {
      console.log('❌ Keine Einreichungen gefunden für diese Klassenarbeit.\n');
      console.log('💡 Mögliche Gründe:');
      console.log('   - Noch keine Schüler haben die Arbeit eingereicht');
      console.log('   - Der Dateiname in der Datenbank ist anders');
      console.log('   - Die Einreichungen wurden gelöscht\n');
    } else {
      console.log(`✅ Gefunden: ${submissions.length} Einreichung(en)\n`);
      console.log('📝 Schüler, die bereits eingereicht haben:\n');
      
      submissions.forEach((submission, index) => {
        console.log(`${index + 1}. ${submission.student.name} (Login-Code: ${submission.student.loginCode})`);
        console.log(`   - Status: ${submission.status}`);
        console.log(`   - Eingereicht am: ${submission.submittedAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`);
        console.log(`   - Automatische Punkte: ${submission.autoPoints}`);
        console.log(`   - Gesamtpunkte: ${submission.totalPoints}`);
        console.log(`   - Dateipfad in DB: ${submission.kaFilePath}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKASubmissions();

