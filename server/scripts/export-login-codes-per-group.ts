import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

function safeFileName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

async function exportLoginCodesPerGroup() {
  const outDir = path.join(__dirname, '../../Lerngruppen-LoginCodes');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const groups = await prisma.learningGroup.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      students: {
        where: { role: 'STUDENT' },
        select: { name: true, loginCode: true },
        orderBy: { name: 'asc' },
      },
    },
  });

  console.log(`Exportiere ${groups.length} Lerngruppen nach ${outDir}\n`);

  for (const group of groups) {
    const lines: string[] = [
      `${group.name}`,
      `${'='.repeat(50)}`,
      '',
      'Name                              Login-Code',
      '-------------------------------- ---------------',
      ...group.students.map((s) => `${s.name.padEnd(34)} ${s.loginCode}`),
      '',
      `Gesamt: ${group.students.length} Schüler`,
    ];
    const fileName = `${safeFileName(group.name)}.txt`;
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`  ${fileName} (${group.students.length} Schüler)`);
  }

  console.log('\n✅ Fertig.');
}

exportLoginCodesPerGroup()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
