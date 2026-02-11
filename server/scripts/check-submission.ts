import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSubmission() {
  try {
    console.log('🔍 Suche nach Abgabe für Josefine Baierl (BaiJos13) und QZ_Daten_Mittel...\n');

    // Finde den Schüler
    const student = await prisma.user.findUnique({
      where: { loginCode: 'BaiJos13' }
    });

    if (!student) {
      console.log('❌ Schüler mit Login-Code BaiJos13 nicht gefunden!');
      return;
    }

    console.log(`✅ Schüler gefunden: ${student.name} (ID: ${student.id})\n`);

    // Suche nach Assignments mit "QZ_Daten_Mittel"
    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { fileName: { contains: 'QZ_Daten_Mittel' } },
          { fileName: { contains: 'QZ_Daten' } },
          { filePath: { contains: 'QZ_Daten_Mittel' } },
          { filePath: { contains: 'QZ_Daten' } }
        ]
      },
      include: {
        submissions: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                loginCode: true
              }
            }
          }
        },
        teacher: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📋 Gefundene Assignments: ${assignments.length}\n`);

    if (assignments.length === 0) {
      console.log('❌ Keine Assignments mit "QZ_Daten" gefunden!\n');
      console.log('🔍 Suche nach allen Assignments...\n');
      
      const allAssignments = await prisma.assignment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: {
            select: { name: true }
          }
        }
      });

      console.log('Letzte 10 Assignments:');
      allAssignments.forEach((a, i) => {
        console.log(`${i + 1}. ${a.fileName} (${a.filePath}) - Lehrer: ${a.teacher.name}`);
      });
    } else {
      assignments.forEach((assignment, index) => {
        console.log(`\n📄 Assignment ${index + 1}:`);
        console.log(`   Dateiname: ${assignment.fileName}`);
        console.log(`   Pfad: ${assignment.filePath}`);
        console.log(`   Lehrer: ${assignment.teacher.name}`);
        console.log(`   Erstellt: ${assignment.createdAt}`);
        console.log(`   Abgaben: ${assignment.submissions.length}`);

        // Prüfe ob Josefine eine Abgabe hat
        const josefineSubmission = assignment.submissions.find(
          s => s.student.id === student.id
        );

        if (josefineSubmission) {
          console.log(`\n   ✅ ABGABE GEFUNDEN für ${student.name}:`);
          console.log(`      ID: ${josefineSubmission.id}`);
          console.log(`      Abgegeben: ${josefineSubmission.submittedAt}`);
          console.log(`      Dateiname: ${josefineSubmission.originalFileName}`);
          console.log(`      Typ: ${josefineSubmission.fileType}`);
        } else {
          console.log(`\n   ❌ Keine Abgabe für ${student.name} gefunden`);
          console.log(`   Verfügbare Abgaben:`);
          assignment.submissions.forEach((s, i) => {
            console.log(`      ${i + 1}. ${s.student.name} (${s.student.loginCode}) - ${s.submittedAt}`);
          });
        }
      });
    }

    // Prüfe auch alle Submissions des Schülers
    console.log(`\n\n🔍 Alle Abgaben von ${student.name}:\n`);
    const allSubmissions = await prisma.submission.findMany({
      where: { studentId: student.id },
      include: {
        assignment: {
          include: {
            teacher: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
      take: 10
    });

    if (allSubmissions.length === 0) {
      console.log('❌ Keine Abgaben gefunden!');
    } else {
      console.log(`✅ ${allSubmissions.length} Abgaben gefunden:\n`);
      allSubmissions.forEach((sub, i) => {
        console.log(`${i + 1}. ${sub.assignment.fileName}`);
        console.log(`   Pfad: ${sub.assignment.filePath}`);
        console.log(`   Lehrer: ${sub.assignment.teacher.name}`);
        console.log(`   Abgegeben: ${sub.submittedAt}`);
        console.log(`   Dateiname: ${sub.originalFileName}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubmission()
  .then(() => {
    console.log('\n✅ Prüfung abgeschlossen!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });
