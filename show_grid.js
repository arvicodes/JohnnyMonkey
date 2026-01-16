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
  console.error('Fehler beim Lesen der Datenbank:', e.message);
  process.exit(1);
}

// Hole alle Schüler
let studentsOutput = '';
try {
  studentsOutput = execSync(`sqlite3 "${DB_PATH}" "SELECT u.id, u.name FROM Participation p JOIN User u ON p.studentId = u.id WHERE p.groupId = '${GROUP_ID}' GROUP BY u.id ORDER BY u.loginCode ASC;"`, { encoding: 'utf8' });
} catch (e) {
  console.error('Fehler beim Lesen der Schüler:', e.message);
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
    // Keine gültige JSON, verwende Standard-Reihenfolge
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

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('GRID-VERTEILUNG: Klasse 7a (8 Spalten pro Reihe)');
console.log('═══════════════════════════════════════════════════════════════\n');

// Tabellarische Darstellung
Array.from({ length: totalRows }, (_, rowIndex) => {
  const rowStudents = [];
  Array.from({ length: FIELDS_PER_ROW }, (_, colIndex) => {
    const fieldIndex = rowIndex * FIELDS_PER_ROW + colIndex;
    const student = finalStudents[fieldIndex];
    const fieldNumber = rowIndex * FIELDS_PER_ROW + colIndex + 1;
    rowStudents.push({ slot: fieldNumber, student: student ? student.name : '<LEER>' });
  });
  
  // Zeige Reihe
  console.log(`Reihe ${rowIndex + 1}:`);
  rowStudents.forEach(({ slot, student }) => {
    console.log(`  Slot ${String(slot).padStart(3, ' ')}: ${student}`);
  });
  console.log('');
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('KOMPAKTE LISTE:');
console.log('═══════════════════════════════════════════════════════════════\n');

finalStudents.forEach((student, index) => {
  const slotNumber = index + 1;
  const row = Math.floor(index / FIELDS_PER_ROW) + 1;
  const col = (index % FIELDS_PER_ROW) + 1;
  console.log(`Slot ${String(slotNumber).padStart(3, ' ')} (R${row}, C${col}): ${student.name}`);
});

console.log('\n═══════════════════════════════════════════════════════════════\n');
