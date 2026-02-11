import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkQuizSubmission() {
  try {
    console.log('🔍 Suche nach Quiz-Abgabe für Josefine Baierl (BaiJos13) und QZ_Daten_Mittel...\n');

    // Finde den Schüler
    const student = await prisma.user.findUnique({
      where: { loginCode: 'BaiJos13' }
    });

    if (!student) {
      console.log('❌ Schüler mit Login-Code BaiJos13 nicht gefunden!');
      return;
    }

    console.log(`✅ Schüler gefunden: ${student.name} (ID: ${student.id})\n`);

    // Suche nach Quiz mit "QZ_Daten_Mittel"
    const quizzes = await prisma.quiz.findMany({
      where: {
        OR: [
          { title: { contains: 'QZ_Daten_Mittel' } },
          { title: { contains: 'QZ_Daten' } },
          { sourceFile: { contains: 'QZ_Daten_Mittel' } },
          { sourceFile: { contains: 'QZ_Daten' } }
        ]
      },
      include: {
        sessions: {
          include: {
            participations: {
              where: {
                studentId: student.id
              },
              include: {
                answers: {
                  include: {
                    question: true
                  }
                }
              }
            }
          }
        },
        teacher: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📋 Gefundene Quizzes: ${quizzes.length}\n`);

    if (quizzes.length === 0) {
      console.log('❌ Keine Quizzes mit "QZ_Daten" gefunden!\n');
      console.log('🔍 Suche nach allen Quizzes...\n');
      
      const allQuizzes = await prisma.quiz.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: {
            select: { name: true }
          }
        }
      });

      console.log('Letzte 10 Quizzes:');
      allQuizzes.forEach((q, i) => {
        console.log(`${i + 1}. ${q.title} (${q.sourceFile}) - Lehrer: ${q.teacher.name}`);
      });
    } else {
      quizzes.forEach((quiz, index) => {
        console.log(`\n📄 Quiz ${index + 1}:`);
        console.log(`   Titel: ${quiz.title}`);
        console.log(`   Quelldatei: ${quiz.sourceFile}`);
        console.log(`   Lehrer: ${quiz.teacher.name}`);
        console.log(`   Erstellt: ${quiz.createdAt}`);
        console.log(`   Sessions: ${quiz.sessions.length}`);

        // Prüfe alle Sessions
        quiz.sessions.forEach((session, sIndex) => {
          console.log(`\n   Session ${sIndex + 1}:`);
          console.log(`      ID: ${session.id}`);
          console.log(`      Teilnahmen: ${session.participations.length}`);

          const participation = session.participations.find(
            p => p.studentId === student.id
          );

          if (participation) {
            console.log(`\n      ✅ TEILNAHME GEFUNDEN für ${student.name}:`);
            console.log(`         ID: ${participation.id}`);
            console.log(`         Gestartet: ${participation.startedAt}`);
            console.log(`         Abgeschlossen: ${participation.completedAt || 'Noch nicht abgeschlossen'}`);
            console.log(`         Punkte: ${participation.score || 0}`);
            console.log(`         Antworten: ${participation.answers.length}`);
            
            if (participation.answers.length > 0) {
              console.log(`\n         Antworten:`);
              participation.answers.forEach((answer, aIndex) => {
                console.log(`            ${aIndex + 1}. Frage: ${answer.question.question.substring(0, 50)}...`);
                console.log(`               Antwort: ${answer.selectedAnswer}`);
                console.log(`               Richtig: ${answer.isCorrect ? '✅' : '❌'}`);
                console.log(`               Punkte: ${answer.points}`);
              });
            }
          } else {
            console.log(`      ❌ Keine Teilnahme für ${student.name} gefunden`);
          }
        });
      });
    }

    // Prüfe auch alle Quiz-Teilnahmen des Schülers
    console.log(`\n\n🔍 Alle Quiz-Teilnahmen von ${student.name}:\n`);
    const allParticipations = await prisma.quizParticipation.findMany({
      where: { studentId: student.id },
      include: {
        session: {
          include: {
            quiz: {
              include: {
                teacher: {
                  select: { name: true }
                }
              }
            }
          }
        },
        answers: {
          include: {
            question: true
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 10
    });

    if (allParticipations.length === 0) {
      console.log('❌ Keine Quiz-Teilnahmen gefunden!');
    } else {
      console.log(`✅ ${allParticipations.length} Quiz-Teilnahmen gefunden:\n`);
      allParticipations.forEach((part, i) => {
        console.log(`${i + 1}. Quiz: ${part.session.quiz.title}`);
        console.log(`   Quelldatei: ${part.session.quiz.sourceFile}`);
        console.log(`   Lehrer: ${part.session.quiz.teacher.name}`);
        console.log(`   Gestartet: ${part.startedAt}`);
        console.log(`   Abgeschlossen: ${part.completedAt || 'Noch nicht abgeschlossen'}`);
        console.log(`   Punkte: ${part.score || 0}`);
        console.log(`   Antworten: ${part.answers.length}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuizSubmission()
  .then(() => {
    console.log('\n✅ Prüfung abgeschlossen!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });
