import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listMatheLkLoginCodes() {
  const allGroups = await prisma.learningGroup.findMany({
    where: { name: { contains: 'Mathe' } }
  });
  const stammkurs = allGroups.find(g => g.name.includes('Stammkurs') && g.name.includes('LK'));
  if (!stammkurs) {
    console.log('Keine Lerngruppe "Mathe LK Stammkurs" gefunden.');
    return;
  }
  const students = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      learningGroups: { some: { id: stammkurs.id } }
    },
    select: { name: true, loginCode: true },
    orderBy: { name: 'asc' }
  });
  console.log('\nLogin-Codes für', stammkurs.name, '\n');
  students.forEach((s, i) => console.log(`${(i + 1).toString().padStart(2)}. ${s.name.padEnd(35)} ${s.loginCode}`));
  console.log('\nGesamt:', students.length, 'Schüler');
}

listMatheLkLoginCodes()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
