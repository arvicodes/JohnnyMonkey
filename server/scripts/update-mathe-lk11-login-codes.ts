import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateLoginCode(firstName: string, lastName: string, groupNumber: string): string {
  // Erste 3 Buchstaben des Nachnamens (erster groß, rest klein)
  const lastNameFirst = lastName.substring(0, 1).toUpperCase();
  const lastNameRest = lastName.substring(1, 3).toLowerCase().padEnd(2, lastName[1] || lastName[0] || 'x');
  const lastNamePart = lastNameFirst + lastNameRest;
  
  // Erste 3 Buchstaben des Vornamens (erster groß, rest klein) - NUR ERSTER VORNAME
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

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    // Der letzte Teil ist der Nachname, alles davor sind Vornamen
    // Wir nehmen nur den ersten Vornamen
    const firstName = parts[0]; // Erster Vorname
    const lastName = parts[parts.length - 1]; // Letzter Teil = Nachname
    return {
      firstName: firstName,
      lastName: lastName
    };
  }
  return {
    firstName: parts[0] || 'Unknown',
    lastName: parts[0] || 'Unknown'
  };
}

async function updateMatheLK11LoginCodes() {
  console.log('🔄 Aktualisiere Login-Codes für Mathe LK 11 - Stammkurs...\n');
  
  try {
    // Finde die Lerngruppe
    const groupName = 'Mathe LK 11 - Stammkurs';
    const learningGroup = await prisma.learningGroup.findFirst({
      where: {
        name: groupName
      },
      include: {
        students: {
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!learningGroup) {
      console.error('❌ Lerngruppe nicht gefunden!');
      return;
    }

    console.log(`✅ Lerngruppe gefunden: ${groupName}`);
    console.log(`📊 Anzahl Schüler: ${learningGroup.students.length}\n`);

    const groupNumber = '09';
    const updates: Array<{ id: string; name: string; oldCode: string; newCode: string }> = [];

    console.log('📝 Aktualisiere Login-Codes:\n');
    console.log('='.repeat(80));

    for (const student of learningGroup.students) {
      const { firstName, lastName } = parseName(student.name);
      
      // Generiere neuen Login-Code mit nur dem ersten Vornamen
      let newLoginCode = generateLoginCode(firstName, lastName, groupNumber);
      newLoginCode = normalizeLoginCode(newLoginCode);

      // Prüfe ob Login-Code bereits existiert (außer für diesen Schüler)
      const existingStudent = await prisma.user.findFirst({
        where: {
          loginCode: newLoginCode,
          id: { not: student.id }
        }
      });

      if (existingStudent) {
        console.log(`⚠️  Login-Code ${newLoginCode} bereits vorhanden für ${existingStudent.name}, überspringe ${student.name}...`);
        continue;
      }

      if (student.loginCode !== newLoginCode) {
        updates.push({
          id: student.id,
          name: student.name,
          oldCode: student.loginCode,
          newCode: newLoginCode
        });
      }
    }

    // Zeige alle Updates
    updates.forEach((update, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${update.name.padEnd(35)} | ${update.oldCode.padEnd(12)} -> ${update.newCode}`);
    });

    console.log('='.repeat(80));
    console.log(`\n📊 ${updates.length} Login-Codes müssen aktualisiert werden\n`);

    if (updates.length > 0) {
      // Aktualisiere die Login-Codes
      console.log('💾 Aktualisiere Datenbank...\n');
      for (const update of updates) {
        await prisma.user.update({
          where: { id: update.id },
          data: { loginCode: update.newCode }
        });
        console.log(`✅ ${update.name}: ${update.oldCode} -> ${update.newCode}`);
      }
      console.log('\n✅ Alle Login-Codes erfolgreich aktualisiert!');
    } else {
      console.log('ℹ️  Keine Updates notwendig - alle Login-Codes sind bereits korrekt.');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateMatheLK11LoginCodes()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler beim Ausführen des Scripts:', error);
    process.exit(1);
  });
