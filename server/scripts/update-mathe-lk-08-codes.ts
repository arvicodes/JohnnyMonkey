import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CODES_09_TO_08 = [
  'RojAnn09', // Annika Rojan
  'KorHar09', // Harald Korn
  'BecMor09', // Moritz Friedrich Becker
  'JurNoa09', // Noah Juranovic
  'JaecOsk09' // Oskar Jäckel
];

async function updateCodes() {
  console.log('Aktualisiere Login-Codes 09 → 08 für 5 Schüler...\n');
  for (const oldCode of CODES_09_TO_08) {
    const newCode = oldCode.replace('09', '08');
    const updated = await prisma.user.updateMany({
      where: { loginCode: oldCode },
      data: { loginCode: newCode }
    });
    if (updated.count > 0) {
      const u = await prisma.user.findFirst({ where: { loginCode: newCode }, select: { name: true } });
      console.log(`  ${u?.name ?? oldCode}: ${oldCode} → ${newCode}`);
    } else {
      console.log(`  ⚠️ Nicht gefunden: ${oldCode}`);
    }
  }
  console.log('\n✅ Fertig.');
}

updateCodes()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
