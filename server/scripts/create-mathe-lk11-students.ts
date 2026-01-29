import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StudentData {
  lastName: string;
  firstName: string;
  fullName: string;
}

function generateLoginCode(firstName: string, lastName: string, groupNumber: string): string {
  // Erste 3 Buchstaben des Nachnamens (erster groß, rest klein)
  const lastNameFirst = lastName.substring(0, 1).toUpperCase();
  const lastNameRest = lastName.substring(1, 3).toLowerCase().padEnd(2, lastName[1] || lastName[0] || 'x');
  const lastNamePart = lastNameFirst + lastNameRest;
  
  
  // Erste 3 Buchstaben des Vornamens (erster groß, rest klein)
  const firstNameFirst = firstName.substring(0, 1).toUpperCase();
  const firstNameRest = firstName.substring(1, 3).toLowerCase().padEnd(2, firstName[1] || firstName[0] || 'x');
  const firstNamePart = firstNameFirst + firstNameRest;
  
  // Nummer basierend auf Lerngruppe
  return `${lastNamePart}${firstNamePart}${groupNumber}`;
}

function normalizeLoginCode(code: string): string {
  // Ersetze Umlaute für Login-Codes
  return code
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

async function createMatheLK11Students() {
  console.log('🔄 Starte Erstellung der Schüler für Mathe LK 11 - Stammkurs...\n');
  
  try {
    // Finde oder erstelle die Lerngruppe
    const groupName = 'Mathe LK 11 - Stammkurs';
    let learningGroup = await prisma.learningGroup.findFirst({
      where: {
        name: groupName
      }
    });

    if (!learningGroup) {
      // Finde einen Lehrer (nehme den ersten verfügbaren)
      const teacher = await prisma.user.findFirst({
        where: {
          role: 'TEACHER'
        }
      });

      if (!teacher) {
        console.error('❌ Kein Lehrer gefunden! Bitte zuerst einen Lehrer erstellen.');
        return;
      }

      console.log(`📚 Erstelle Lerngruppe: ${groupName}`);
      learningGroup = await prisma.learningGroup.create({
        data: {
          name: groupName,
          teacherId: teacher.id
        }
      });
      console.log(`✅ Lerngruppe erstellt: ${learningGroup.id}\n`);
    } else {
      console.log(`✅ Lerngruppe gefunden: ${groupName} (ID: ${learningGroup.id})\n`);
    }

    // Schüler-Daten aus dem PDF
    const students: StudentData[] = [
      { lastName: 'Becker', firstName: 'Moritz Friedrich', fullName: 'Moritz Friedrich Becker' },
      { lastName: 'Bischoff', firstName: 'Emilian Florian', fullName: 'Emilian Florian Bischoff' },
      { lastName: 'Breidert', firstName: 'Jannis', fullName: 'Jannis Breidert' },
      { lastName: 'Busch', firstName: 'Jannis', fullName: 'Jannis Busch' },
      { lastName: 'Eremeev', firstName: 'Roman Vladimirovich', fullName: 'Roman Vladimirovich Eremeev' },
      { lastName: 'Galler', firstName: 'Louisa', fullName: 'Louisa Galler' },
      { lastName: 'Hahn', firstName: 'Anton', fullName: 'Anton Hahn' },
      { lastName: 'Hanrath', firstName: 'Gero', fullName: 'Gero Hanrath' },
      { lastName: 'Jäckel', firstName: 'Oskar', fullName: 'Oskar Jäckel' },
      { lastName: 'Juranovic', firstName: 'Noah', fullName: 'Noah Juranovic' },
      { lastName: 'Köhler', firstName: 'Paul Jonas', fullName: 'Paul Jonas Köhler' },
      { lastName: 'Korn', firstName: 'Harald', fullName: 'Harald Korn' },
      { lastName: 'Kux', firstName: 'Maximilian', fullName: 'Maximilian Kux' },
      { lastName: 'Rickert', firstName: 'Magnus Paul', fullName: 'Magnus Paul Rickert' },
      { lastName: 'Rojan', firstName: 'Annika', fullName: 'Annika Rojan' },
      { lastName: 'Schäfer', firstName: 'Johanna', fullName: 'Johanna Schäfer' },
      { lastName: 'Simonis', firstName: 'Elias Karl', fullName: 'Elias Karl Simonis' },
      { lastName: 'Singhof', firstName: 'Milo', fullName: 'Milo Singhof' },
      { lastName: 'Weinhold', firstName: 'Thorben Emanuel', fullName: 'Thorben Emanuel Weinhold' }
    ];

    const groupNumber = '09';
    const createdStudents: Array<{ name: string; loginCode: string; id: string }> = [];
    const loginCodeMap = new Map<string, number>(); // Für Duplikate

    console.log('📝 Erstelle Schüler:\n');
    console.log('='.repeat(80));

    for (const studentData of students) {
      // Verwende nur den ersten Vornamen (ohne Zweitnamen) für den Login-Code
      const firstFirstName = studentData.firstName.split(' ')[0];
      
      // Generiere Login-Code mit nur dem ersten Vornamen
      let loginCode = generateLoginCode(firstFirstName, studentData.lastName, groupNumber);
      loginCode = normalizeLoginCode(loginCode);

      // Prüfe auf Duplikate
      if (loginCodeMap.has(loginCode)) {
        const count = loginCodeMap.get(loginCode)! + 1;
        loginCodeMap.set(loginCode, count);
        loginCode = `${loginCode}${count}`;
      } else {
        loginCodeMap.set(loginCode, 0);
      }

      // Prüfe ob Login-Code bereits existiert
      const existingStudent = await prisma.user.findUnique({
        where: { loginCode }
      });

      if (existingStudent) {
        console.log(`⚠️  Login-Code ${loginCode} bereits vorhanden für ${existingStudent.name}, überspringe...`);
        continue;
      }

      // Erstelle Schüler
      const student = await prisma.user.create({
        data: {
          name: studentData.fullName,
          loginCode: loginCode,
          role: 'STUDENT'
        }
      });

      createdStudents.push({
        name: studentData.fullName,
        loginCode: loginCode,
        id: student.id
      });

      console.log(`${createdStudents.length.toString().padStart(2)}. ${studentData.fullName.padEnd(35)} | ${loginCode}`);
    }

    console.log('='.repeat(80));
    console.log(`\n✅ ${createdStudents.length} Schüler erstellt\n`);

    // Ordne Schüler der Lerngruppe zu
    console.log('🔗 Ordne Schüler der Lerngruppe zu...\n');
    
    const studentIds = createdStudents.map(s => s.id);
    
    // Prüfe welche Schüler bereits in der Gruppe sind
    const existingGroupStudents = await prisma.user.findMany({
      where: {
        id: { in: studentIds },
        learningGroups: {
          some: {
            id: learningGroup.id
          }
        }
      }
    });

    const existingIds = new Set(existingGroupStudents.map(s => s.id));
    const newStudentIds = studentIds.filter(id => !existingIds.has(id));

    if (newStudentIds.length > 0) {
      await prisma.learningGroup.update({
        where: { id: learningGroup.id },
        data: {
          students: {
            connect: newStudentIds.map(id => ({ id }))
          }
        }
      });
      console.log(`✅ ${newStudentIds.length} Schüler der Lerngruppe zugeordnet\n`);
    } else {
      console.log('ℹ️  Alle Schüler sind bereits in der Lerngruppe\n');
    }

    // Zeige Zusammenfassung
    console.log('📋 Zusammenfassung:');
    console.log('='.repeat(80));
    console.log(`Lerngruppe: ${groupName}`);
    console.log(`Anzahl Schüler: ${createdStudents.length}`);
    console.log('\nLogin-Codes:');
    createdStudents.forEach((student, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${student.name.padEnd(35)} | ${student.loginCode}`);
    });
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMatheLK11Students()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler beim Ausführen des Scripts:', error);
    process.exit(1);
  });
