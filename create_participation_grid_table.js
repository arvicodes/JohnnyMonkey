const { execSync } = require('child_process');
const path = require('path');

const GROUP_ID = '8000d012-758d-4191-b47c-cc8816e88eba';
const DB_PATH = path.join(__dirname, 'server', 'prisma', 'dev.db');
const GRID_COLS = 4;
const GRID_ROWS = 5;

// Hole seatingOrder
let seatingOrderJson = '';
try {
  seatingOrderJson = execSync(`sqlite3 "${DB_PATH}" "SELECT seatingOrder FROM LearningGroup WHERE id = '${GROUP_ID}';"`, { encoding: 'utf8' }).trim();
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

// Parse seatingOrder (kann ein Objekt mit "order" Feld sein oder direkt ein Array)
let studentOrder = [];
if (seatingOrderJson) {
  try {
    const parsed = JSON.parse(seatingOrderJson);
    // Prüfe ob es ein Objekt mit "order" Feld ist
    if (parsed && typeof parsed === 'object' && parsed.order && Array.isArray(parsed.order)) {
      studentOrder = parsed.order;
    } else if (Array.isArray(parsed)) {
      studentOrder = parsed;
    } else {
      studentOrder = students.map(s => s.id);
    }
  } catch (e) {
    studentOrder = students.map(s => s.id);
  }
}

// Wenn keine seatingOrder, verwende Standard-Reihenfolge
if (studentOrder.length === 0) {
  studentOrder = students.map(s => s.id);
}

// Erstelle Map
const studentMap = new Map(students.map(s => [s.id, s.name]));

// Sortiere nach seatingOrder
const orderedStudents = studentOrder
  .map(id => ({ id, name: studentMap.get(id) }))
  .filter(s => s.name);

// Füge fehlende hinzu
const existingIds = new Set(studentOrder);
const missingStudents = students
  .filter(s => !existingIds.has(s.id))
  .map(s => ({ id: s.id, name: s.name }));

const finalStudents = [...orderedStudents, ...missingStudents];

// Funktion zur Berechnung der globalen Slot-Nummer (wie im Code)
const getGlobalSlotNumber = (slotIndex, gridRow, gridCol) => {
  return (gridRow * GRID_COLS + gridCol) * 2 + slotIndex + 1;
};

// Erstelle Grid-Tabelle
// Jede Grid-Zelle hat 2 Slots
const gridTable = [];
for (let row = 0; row < GRID_ROWS; row++) {
  const rowData = [];
  for (let col = 0; col < GRID_COLS; col++) {
    const slot0Index = (row * GRID_COLS + col) * 2;
    const slot1Index = slot0Index + 1;
    const slot0 = finalStudents[slot0Index];
    const slot1 = finalStudents[slot1Index];
    const slot0Number = getGlobalSlotNumber(0, row, col);
    const slot1Number = getGlobalSlotNumber(1, row, col);
    
    rowData.push({
      gridRow: row + 1,
      gridCol: col + 1,
      slot0: slot0 ? { number: slot0Number, student: slot0.name } : null,
      slot1: slot1 ? { number: slot1Number, student: slot1.name } : null
    });
  }
  gridTable.push(rowData);
}

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
console.log('EPOCHAL EINTRAGEN: Klasse 7a - GRID-AUFTEILUNG (4 Spalten × 5 Zeilen, 2 Slots pro Zelle)');
console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

// Zeige Grid-Tabelle
console.log('GRID-ZELLE | SPALTE 1                    | SPALTE 2                    | SPALTE 3                    | SPALTE 4');
console.log('───────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────');

gridTable.forEach((row, rowIndex) => {
  const rowNum = String(rowIndex + 1).padStart(2, ' ');
  const cells = row.map(cell => {
    const slot0Str = cell.slot0 ? `Slot ${cell.slot0.number}: ${cell.slot0.student.substring(0, 20)}` : 'Slot ' + (cell.gridRow * GRID_COLS + cell.gridCol - GRID_COLS) * 2 + ': <LEER>';
    const slot1Str = cell.slot1 ? `Slot ${cell.slot1.number}: ${cell.slot1.student.substring(0, 20)}` : 'Slot ' + ((cell.gridRow * GRID_COLS + cell.gridCol - GRID_COLS) * 2 + 1) + ': <LEER>';
    return `${slot0Str.padEnd(27)}\n${' '.repeat(12)}${slot1Str.padEnd(27)}`;
  });
  
  console.log(`Reihe ${rowNum}   | ${cells[0]}`);
  console.log(`           | ${cells[1]}`);
  console.log(`           | ${cells[2]}`);
  console.log(`           | ${cells[3]}`);
  console.log('───────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────┼─────────────────────────────');
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
console.log('DETAILLIERTE SLOT-LISTE (zeilenweise, beginnt bei 1):');
console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

finalStudents.forEach((student, index) => {
  // Berechne Grid-Position und Slot-Index
  const totalSlots = index + 1;
  const gridCellIndex = Math.floor((totalSlots - 1) / 2);
  const gridRow = Math.floor(gridCellIndex / GRID_COLS);
  const gridCol = gridCellIndex % GRID_COLS;
  const slotIndex = (totalSlots - 1) % 2;
  const slotNumber = getGlobalSlotNumber(slotIndex, gridRow, gridCol);
  
  console.log(`Slot ${String(slotNumber).padStart(3, ' ')} (Grid R${gridRow + 1}, C${gridCol + 1}, Slot ${slotIndex}): ${student.name}`);
});

console.log('\n═══════════════════════════════════════════════════════════════════════════════════════\n');

// Erstelle JSON für seatingOrder
const studentIds = finalStudents.map(s => s.id);
const jsonOutput = JSON.stringify(studentIds);
console.log('JSON für seatingOrder:');
console.log(jsonOutput);
console.log('');
