/**
 * Fügt die Schüler aus der WebUntis-Liste (LessonStudentListImg) der Lerngruppe "Informatik GK 11" hinzu.
 * Muster wie create-mathe-lk11-students: Login-Code = Nachname(3) + Vorname(3) + Gruppenummer, Buchstabe 2+3 klein.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StudentData {
  lastName: string;
  firstName: string;
  fullName: string;
}

// Schüler aus PDF: "Nachname Vorname(n)" (WebUntis-Export)
const PDF_STUDENTS: Array<{ lastName: string; firstName: string }> = [
  { lastName: 'Beil', firstName: 'Julia' },
  { lastName: 'Birro', firstName: 'Yannis Luca' },
  { lastName: 'Bischoff', firstName: 'Emilian Florian' },
  { lastName: 'Böhm', firstName: 'Anton' },
  { lastName: 'Breidert', firstName: 'Jannis' },
  { lastName: 'Franz', firstName: 'Sonea Malou' },
  { lastName: 'Friesenhahn', firstName: 'Lena Marie' },
  { lastName: 'Gartlib', firstName: 'Leon' },
  { lastName: 'Grenz', firstName: 'David' },
  { lastName: 'Günter', firstName: 'Marie' },
  { lastName: 'Jäckel', firstName: 'Oskar' },
  { lastName: 'Köhler', firstName: 'Paul Jonas' },
  { lastName: 'Korn', firstName: 'Harald' },
  { lastName: 'Lindner', firstName: 'Silas Martin' },
  { lastName: 'Long', firstName: 'Gentatsu' },
  { lastName: 'Mosgold', firstName: 'Jasmin' },
  { lastName: 'Sasse', firstName: 'Pia' },
  { lastName: 'Schmidt', firstName: 'Henrik Aron' },
  { lastName: 'Singhof', firstName: 'Milo' },
  { lastName: 'Stammer', firstName: 'Julian' },
  { lastName: 'Weinhold', firstName: 'Thorben Emanuel' },
  { lastName: 'Wilke', firstName: 'Linus Samuel' },
  { lastName: 'Wöll', firstName: 'Paul' }
];

function generateLoginCode(firstName: string, lastName: string, groupNumber: string): string {
  const lastNameFirst = lastName.substring(0, 1).toUpperCase();
  const lastNameRest = lastName.substring(1, 3).toLowerCase().padEnd(2, lastName[1] || lastName[0] || 'x');
  const lastNamePart = lastNameFirst + lastNameRest;

  const firstNameFirst = firstName.substring(0, 1).toUpperCase();
  const firstNameRest = firstName.substring(1, 3).toLowerCase().padEnd(2, firstName[1] || firstName[0] || 'x');
  const firstNamePart = firstNameFirst + firstNameRest;

  return `${lastNamePart}${firstNamePart}${groupNumber}`;
}

function normalizeLoginCode(code: string): string {
  return code
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss');
}

async function main() {
  const groupName = 'Informatik GK 11';
  const groupNumber = '11';

  console.log(`🔄 Füge Schüler der Lerngruppe "${groupName}" hinzu (aus PDF-Liste)...\n`);

  let learningGroup = await prisma.learningGroup.findFirst({
    where: { name: groupName }
  });

  if (!learningGroup) {
    const teacher = await prisma.user.findFirst({
      where: { role: 'TEACHER' }
    });
    if (!teacher) {
      console.error('❌ Kein Lehrer gefunden.');
      process.exit(1);
    }
    learningGroup = await prisma.learningGroup.create({
      data: { name: groupName, teacherId: teacher.id }
    });
    console.log(`📚 Lerngruppe erstellt: ${groupName}\n`);
  } else {
    console.log(`✅ Lerngruppe gefunden: ${groupName}\n`);
  }

  const students: StudentData[] = PDF_STUDENTS.map((s) => ({
    lastName: s.lastName,
    firstName: s.firstName,
    fullName: `${s.firstName} ${s.lastName}`
  }));

  const loginCodeMap = new Map<string, number>();
  const toConnect: string[] = [];

  console.log('📝 Verarbeite Schüler:\n');
  console.log('='.repeat(80));

  for (const studentData of students) {
    const firstFirstName = studentData.firstName.split(' ')[0];
    let loginCode = generateLoginCode(firstFirstName, studentData.lastName, groupNumber);
    loginCode = normalizeLoginCode(loginCode);

    if (loginCodeMap.has(loginCode)) {
      const count = loginCodeMap.get(loginCode)! + 1;
      loginCodeMap.set(loginCode, count);
      loginCode = `${loginCode}${count}`;
    } else {
      loginCodeMap.set(loginCode, 0);
    }

    let user = await prisma.user.findFirst({
      where: {
        role: 'STUDENT',
        name: studentData.fullName
      }
    });

    if (user) {
      toConnect.push(user.id);
      console.log(`  ✓ ${studentData.fullName.padEnd(35)} (bereits vorhanden) → Gruppe zuweisen`);
      continue;
    }

    const existingByCode = await prisma.user.findUnique({
      where: { loginCode }
    });
    if (existingByCode) {
      console.log(`  ⚠ ${studentData.fullName.padEnd(35)} Login ${loginCode} belegt von ${existingByCode.name}, überspringe`);
      continue;
    }

    user = await prisma.user.create({
      data: {
        name: studentData.fullName,
        loginCode,
        role: 'STUDENT'
      }
    });
    toConnect.push(user.id);
    console.log(`  + ${studentData.fullName.padEnd(35)} | ${loginCode}`);
  }

  console.log('='.repeat(80));

  const existingInGroup = await prisma.user.findMany({
    where: {
      id: { in: toConnect },
      learningGroups: { some: { id: learningGroup!.id } }
    }
  });
  const existingIds = new Set(existingInGroup.map((s) => s.id));
  const newIds = toConnect.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await prisma.learningGroup.update({
      where: { id: learningGroup!.id },
      data: {
        students: { connect: newIds.map((id) => ({ id })) }
      }
    });
    console.log(`\n✅ ${newIds.length} Schüler der Lerngruppe "${groupName}" zugeordnet.`);
  } else {
    console.log(`\nℹ️  Alle betreffenden Schüler sind bereits in der Lerngruppe.`);
  }

  console.log('='.repeat(80));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
