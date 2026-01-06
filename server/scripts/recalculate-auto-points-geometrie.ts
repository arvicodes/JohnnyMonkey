import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Richtige Antworten für Aufgabe 1
const correctAnswersTask1: Record<string, string> = {
  a1a: 'Mittelsenkrechte',
  a1b: 'Winkelhalbierende',
  a1c: 'Achsenspiegelung',
  a1d: 'Punktspiegelung',
  a1e: 'Verschiebung',
  a1f: 'Drehung',
  a1g: 'Kongruenzabbildung',
  a1h: 'Doppelspiegelung'
};

// Richtige Antworten für Aufgabe 2
const correctAnswersTask2: Record<string, string> = {
  a2a: 'b',
  a2b: 'a',
  a2c: 'a'
};

// Richtige Koordinaten für Aufgabe 3
const correctCoordinates: Record<string, number> = {
  'a3a_x': -6, 'a3a_y': -4,
  'a3b_x': -3, 'a3b_y': -7,
  'a3c_x': -4, 'a3c_y': -2,
  'a3d_x': -4, 'a3d_y': -6,
  'a3e_x': -7, 'a3e_y': -3,
  'a3f_x': -2, 'a3f_y': -4,
  'a3g_x': 2, 'a3g_y': 7,
  'a3h_x': 5, 'a3h_y': 10,
  'a3i_x': 4, 'a3i_y': 5,
  'a3j_x': 10, 'a3j_y': -6,
  'a3k_x': 7, 'a3k_y': -9,
  'a3l_x': 8, 'a3l_y': -4
};

function calculateAutoPoints(answers: Record<string, any>): number {
  let autoPoints = 0;

  // Aufgabe 1: Prüfe ob Antwort richtig ist
  Object.keys(correctAnswersTask1).forEach(key => {
    const studentAnswer = String(answers[key] || '').trim().toLowerCase();
    const correctAnswer = String(correctAnswersTask1[key] || '').trim().toLowerCase();
    if (studentAnswer === correctAnswer) {
      autoPoints += 1;
    }
  });

  // Aufgabe 2: Prüfe ob Antwort richtig ist
  Object.keys(correctAnswersTask2).forEach(key => {
    if (answers[key] === correctAnswersTask2[key]) {
      autoPoints += 1;
    }
  });

  // Aufgabe 3: Prüfe Koordinaten (0.25 Punkte pro richtige Koordinate)
  Object.keys(correctCoordinates).forEach(key => {
    const studentValue = parseFloat(answers[key]);
    const correctValue = correctCoordinates[key];
    if (!isNaN(studentValue) && studentValue === correctValue) {
      autoPoints += 0.25;
    }
  });

  return Math.round(autoPoints * 100) / 100; // Runde auf 2 Dezimalstellen
}

async function recalculateAutoPoints() {
  try {
    console.log('🔄 Starte Neuberechnung der autoPoints für Geometrie-KA...');

    // Finde alle Submissions für die Geometrie-KA
    const submissions = await prisma.kASubmission.findMany({
      where: {
        kaFilePath: {
          contains: 'geometrische-abbildungen'
        }
      },
      include: {
        corrections: true,
        student: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📋 Gefunden: ${submissions.length} Submissions`);

    for (const submission of submissions) {
      const answers = JSON.parse(submission.answers);
      const oldAutoPoints = submission.autoPoints;
      const newAutoPoints = calculateAutoPoints(answers);

      // Berechne neue totalPoints
      const totalManualPoints = submission.corrections.reduce((sum, c) => sum + (c.manualPoints || 0), 0);
      const newTotalPoints = newAutoPoints + totalManualPoints;

      console.log(`\n👤 ${submission.student.name}:`);
      console.log(`   Alte autoPoints: ${oldAutoPoints}`);
      console.log(`   Neue autoPoints: ${newAutoPoints}`);
      console.log(`   ManualPoints: ${totalManualPoints}`);
      console.log(`   Alte totalPoints: ${submission.totalPoints}`);
      console.log(`   Neue totalPoints: ${newTotalPoints}`);

      // Update in Datenbank
      await prisma.kASubmission.update({
        where: { id: submission.id },
        data: {
          autoPoints: newAutoPoints,
          totalPoints: newTotalPoints
        }
      });

      console.log(`   ✅ Aktualisiert`);
    }

    console.log('\n✨ Neuberechnung abgeschlossen!');
  } catch (error) {
    console.error('❌ Fehler bei der Neuberechnung:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recalculateAutoPoints();

