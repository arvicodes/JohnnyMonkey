/**
 * Überträgt die Login-Codes aus student-login-codes.json in die Datenbank.
 * Nützlich nach manueller Anpassung der JSON (z. B. Format Buchstabe 2+3 klein, Nummer 08).
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface JsonEntry {
  id: string;
  name: string;
  currentLoginCode: string;
  newLoginCode: string;
  groups: string[];
}

async function applyLoginCodesFromJson() {
  const jsonPath = path.join(__dirname, '../../student-login-codes.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Datei nicht gefunden:', jsonPath);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as JsonEntry[];
  console.log(`📋 Lade ${data.length} Einträge aus student-login-codes.json\n`);

  for (const entry of data) {
    await prisma.user.update({
      where: { id: entry.id },
      data: { loginCode: entry.newLoginCode }
    });
    console.log(`  ✅ ${entry.name.padEnd(25)} → ${entry.newLoginCode}`);
  }

  console.log('\n✅ Alle Login-Codes in der Datenbank aktualisiert.');
}

applyLoginCodesFromJson()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
