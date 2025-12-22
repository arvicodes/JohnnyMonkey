import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface StudentInfo {
  id: string;
  name: string;
  currentLoginCode: string;
  newLoginCode: string;
  groups: string[];
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
  const numberPart = groupNumber;
  
  return `${lastNamePart}${firstNamePart}${numberPart}`;
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
  // Fallback: Wenn nur ein Name vorhanden ist
  return {
    firstName: parts[0] || 'Unknown',
    lastName: parts[0] || 'Unknown'
  };
}

function getGroupNumber(groupName: string): string | null {
  const name = groupName.toLowerCase();
  
  if (name.includes('7a')) {
    return '13';
  }
  
  if (name.includes('gk') && name.includes('informatik')) {
    return '07';
  }
  
  return null;
}

async function updateStudentLoginCodes() {
  console.log('🔄 Starte Update der Schüler-Login-Codes...\n');
  
  try {
    // Lade alle Schüler
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT'
      },
      include: {
        learningGroups: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`📊 Gefundene Schüler: ${students.length}\n`);
    
    const studentInfos: StudentInfo[] = [];
    const updates: Array<{ id: string; newLoginCode: string }> = [];
    
    for (const student of students) {
      const { firstName, lastName } = parseName(student.name);
      
      // Finde die passende Lerngruppe (7a oder GK Informatik)
      let groupNumber: string | null = null;
      const groupNames: string[] = [];
      
      for (const group of student.learningGroups) {
        const number = getGroupNumber(group.name);
        if (number) {
          groupNumber = number;
          groupNames.push(group.name);
        }
      }
      
      if (!groupNumber) {
        console.log(`⚠️  Schüler ${student.name} hat keine passende Lerngruppe (7a oder GK Informatik), überspringe...`);
        continue;
      }
      
      const newLoginCode = generateLoginCode(firstName, lastName, groupNumber);
      
      studentInfos.push({
        id: student.id,
        name: student.name,
        currentLoginCode: student.loginCode,
        newLoginCode: newLoginCode,
        groups: groupNames
      });
      
      updates.push({
        id: student.id,
        newLoginCode: newLoginCode
      });
    }
    
    console.log(`\n📝 Zu aktualisierende Schüler: ${updates.length}\n`);
    
    // Zeige alle Login-Codes an
    console.log('📋 Neue Login-Codes:');
    console.log('='.repeat(80));
    studentInfos.forEach((info, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${info.name.padEnd(30)} | Alt: ${info.currentLoginCode.padEnd(10)} | Neu: ${info.newLoginCode.padEnd(10)} | Gruppen: ${info.groups.join(', ')}`);
    });
    console.log('='.repeat(80));
    
    // Behandle Duplikate - füge Nummer hinzu
    const loginCodeMap = new Map<string, number>();
    const finalStudentInfos: StudentInfo[] = [];
    
    for (const info of studentInfos) {
      let finalLoginCode = info.newLoginCode;
      
      if (loginCodeMap.has(finalLoginCode)) {
        const count = loginCodeMap.get(finalLoginCode)! + 1;
        loginCodeMap.set(finalLoginCode, count);
        // Füge Nummer hinzu (z.B. SCHJAN07 -> SCHJAN071)
        finalLoginCode = finalLoginCode + count.toString();
        console.log(`⚠️  Duplikat gefunden: ${info.name} -> ${finalLoginCode} (ursprünglich: ${info.newLoginCode})`);
      } else {
        loginCodeMap.set(finalLoginCode, 0);
      }
      
      finalStudentInfos.push({
        ...info,
        newLoginCode: finalLoginCode
      });
    }
    
    // Aktualisiere die Updates-Liste
    updates.length = 0;
    finalStudentInfos.forEach(info => {
      updates.push({
        id: info.id,
        newLoginCode: info.newLoginCode
      });
    });
    
    // Zeige aktualisierte Liste
    console.log('\n📋 Finale Login-Codes (nach Duplikat-Behandlung):');
    console.log('='.repeat(80));
    finalStudentInfos.forEach((info, index) => {
      console.log(`${(index + 1).toString().padStart(3)}. ${info.name.padEnd(30)} | Alt: ${info.currentLoginCode.padEnd(10)} | Neu: ${info.newLoginCode.padEnd(12)} | Gruppen: ${info.groups.join(', ')}`);
    });
    console.log('='.repeat(80));
    
    // Aktualisiere die Datenbank
    console.log('\n💾 Aktualisiere Datenbank...');
    for (const update of updates) {
      await prisma.user.update({
        where: { id: update.id },
        data: { loginCode: update.newLoginCode }
      });
    }
    
    console.log('✅ Datenbank erfolgreich aktualisiert!\n');
    
    // Erstelle CSV-Datei
    const csvContent = [
      'Name,Alter Login-Code,Neuer Login-Code,Gruppen',
      ...finalStudentInfos.map(info => 
        `"${info.name}","${info.currentLoginCode}","${info.newLoginCode}","${info.groups.join('; ')}"`
      )
    ].join('\n');
    
    const csvPath = path.join(__dirname, '../../student-login-codes.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log(`📄 CSV-Datei erstellt: ${csvPath}`);
    
    // Erstelle Text-Datei mit vollständiger Liste
    const textContent = [
      'VOLLSTÄNDIGE LISTE DER SCHÜLER-LOGIN-CODES',
      '='.repeat(80),
      `Erstellt am: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}`,
      `Anzahl Schüler: ${finalStudentInfos.length}`,
      '',
      'SCHEMA:',
      '- Erste 3 Buchstaben des Nachnamens (erster groß, rest klein)',
      '- Erste 3 Buchstaben des Vornamens (erster groß, rest klein)',
      '- Nummer: 13 für Klasse 7a, 07 für GK Informatik',
      '- Bei Duplikaten wird eine zusätzliche Nummer angehängt',
      '- Beispiel: Jakob Ackermann -> AckJak13',
      '',
      '='.repeat(80),
      '',
      ...finalStudentInfos.map((info, index) => 
        `${(index + 1).toString().padStart(3)}. ${info.name.padEnd(35)} | ${info.newLoginCode.padEnd(12)} | Gruppen: ${info.groups.join(', ')}`
      ),
      '',
      '='.repeat(80),
      '',
      'ALPHABETISCHE SORTIERUNG:',
      '',
      ...finalStudentInfos
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((info, index) => 
          `${(index + 1).toString().padStart(3)}. ${info.name.padEnd(35)} | ${info.newLoginCode}`
        )
    ].join('\n');
    
    const textPath = path.join(__dirname, '../../student-login-codes.txt');
    fs.writeFileSync(textPath, textContent, 'utf-8');
    console.log(`📄 Text-Datei erstellt: ${textPath}`);
    
    // Erstelle JSON-Datei für späteren Zugriff
    const jsonContent = JSON.stringify(finalStudentInfos, null, 2);
    const jsonPath = path.join(__dirname, '../../student-login-codes.json');
    fs.writeFileSync(jsonPath, jsonContent, 'utf-8');
    console.log(`📄 JSON-Datei erstellt: ${jsonPath}`);
    
    console.log('\n✅ Alle Dateien erfolgreich erstellt!');
    
  } catch (error) {
    console.error('❌ Fehler beim Update der Login-Codes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateStudentLoginCodes()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

