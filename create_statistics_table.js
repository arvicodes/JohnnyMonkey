const { execSync } = require('child_process');
const path = require('path');

const GROUP_ID = '8000d012-758d-4191-b47c-cc8816e88eba';
const DB_PATH = path.join(__dirname, 'server', 'prisma', 'dev.db');
const FIELDS_PER_ROW = 8;

// Hole statisticsOrder
let statOrderJson = '';
try {
  statOrderJson = execSync(`sqlite3 "${DB_PATH}" "SELECT statisticsOrder FROM LearningGroup WHERE id = '${GROUP_ID}';"`, { encoding: 'utf8' }).trim();
} catch (e) {
  console.error('Fehler:', e.message);
  process.exit(1);
}

// Hole alle Schüler
let studentsOutput = '';
try {
  studentsOutput = execSync(`sqlite3 "${DB_PATH}" "SELECT u.id, u.name FROM Participation p JOIN User u ON p.studentId = u.id WHERE p.groupId = '${GROUP_ID}' GROUP BY u.id ORDER BY u.loginCode ASC;"`, { encoding: 'utf8' });
} catch (e) {
  console.error('Fehler:', e.message);
  process.exit(1);
}

// Parse Schüler
const students = studentsOutput.trim().split('\n').map(line => {
  const [id, ...nameParts] = line.split('|');
  return { id: id.trim(), name: nameParts.join('|').trim() };
});

// Parse statisticsOrder
let studentOrder = [];
if (statOrderJson) {
  try {
    studentOrder = JSON.parse(statOrderJson);
  } catch (e) {
    studentOrder = students.map(s => s.id);
  }
}

// Wenn keine statisticsOrder, verwende Standard-Reihenfolge
if (studentOrder.length === 0) {
  studentOrder = students.map(s => s.id);
}

// Erstelle Map
const studentMap = new Map(students.map(s => [s.id, s.name]));

// Sortiere nach statisticsOrder
const orderedStudents = studentOrder
  .map(id => ({ id, name: studentMap.get(id) }))
  .filter(s => s.name);

// Füge fehlende hinzu
const existingIds = new Set(studentOrder);
const missingStudents = students
  .filter(s => !existingIds.has(s.id))
  .map(s => ({ id: s.id, name: s.name }));

const finalStudents = [...orderedStudents, ...missingStudents];
const totalRows = Math.ceil(finalStudents.length / FIELDS_PER_ROW);

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
console.log('EPOCHALSTATISTIK: Klasse 7a - GRID-AUFTEILUNG (8 Spalten pro Reihe)');
console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// Erstelle Tabelle
const table = [];
Array.from({ length: totalRows }, (_, rowIndex) => {
  const row = [];
  Array.from({ length: FIELDS_PER_ROW }, (_, colIndex) => {
    const fieldIndex = rowIndex * FIELDS_PER_ROW + colIndex;
    const student = finalStudents[fieldIndex];
    const fieldNumber = rowIndex * FIELDS_PER_ROW + colIndex + 1;
    row.push({
      slot: fieldNumber,
      row: rowIndex + 1,
      col: colIndex + 1,
      student: student ? student.name : null
    });
  });
  table.push(row);
});

// Zeige Tabelle
console.log('REIHE | SPALTE 1      | SPALTE 2      | SPALTE 3      | SPALTE 4      | SPALTE 5      | SPALTE 6      | SPALTE 7      | SPALTE 8');
console.log('──────┼───────────────┼───────────────┼───────────────┼───────────────┼───────────────┼───────────────┼───────────────┼───────────────');

table.forEach((row, rowIndex) => {
  const rowNum = String(rowIndex + 1).padStart(5, ' ');
  const cells = row.map(cell => {
    if (cell.student) {
      return cell.student.padEnd(15).substring(0, 15);
    } else {
      return '<LEER>'.padEnd(15);
    }
  });
  console.log(`${rowNum} | ${cells.join(' | ')}`);
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
console.log('DETAILLIERTE SLOT-LISTE:');
console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

finalStudents.forEach((student, index) => {
  const slotNumber = index + 1;
  const row = Math.floor(index / FIELDS_PER_ROW) + 1;
  const col = (index % FIELDS_PER_ROW) + 1;
  console.log(`Slot ${String(slotNumber).padStart(3, ' ')} (Reihe ${row}, Spalte ${col}): ${student.name}`);
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════\n');

// Erstelle JSON für Datenbank
const studentIds = finalStudents.map(s => s.id);
const jsonOutput = JSON.stringify(studentIds);
console.log('JSON für statisticsOrder:');
console.log(jsonOutput);
console.log('');
