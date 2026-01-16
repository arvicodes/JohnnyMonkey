const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'prisma', 'dev.db');
const db = new sqlite3.Database(dbPath);

const GROUP_ID = '8000d012-758d-4191-b47c-cc8816e88eba';
const FIELDS_PER_ROW = 8;

// Hole statisticsOrder
db.get("SELECT statisticsOrder FROM LearningGroup WHERE id = ?", [GROUP_ID], (err, row) => {
  if (err) {
    console.error('Fehler:', err);
    db.close();
    return;
  }

  let studentOrder = [];
  if (row && row.statisticsOrder) {
    try {
      studentOrder = JSON.parse(row.statisticsOrder);
    } catch (e) {
      console.log('Keine statisticsOrder gefunden, verwende Standard-Reihenfolge');
    }
  }

  // Hole alle Schüler mit ihren Participation-Daten
  db.all(`
    SELECT DISTINCT u.id, u.name
    FROM Participation p
    JOIN User u ON p.studentId = u.id
    WHERE p.groupId = ?
    ORDER BY u.loginCode ASC
  `, [GROUP_ID], (err, students) => {
    if (err) {
      console.error('Fehler:', err);
      db.close();
      return;
    }

    // Wenn keine statisticsOrder vorhanden, verwende Standard-Reihenfolge
    if (studentOrder.length === 0) {
      studentOrder = students.map(s => s.id);
    }

    // Erstelle Map für schnellen Zugriff
    const studentMap = new Map(students.map(s => [s.id, s.name]));

    // Sortiere nach statisticsOrder
    const orderedStudents = studentOrder
      .map(id => ({ id, name: studentMap.get(id) }))
      .filter(s => s.name);

    // Füge fehlende Schüler hinzu
    const existingIds = new Set(studentOrder);
    const missingStudents = students
      .filter(s => !existingIds.has(s.id))
      .map(s => ({ id: s.id, name: s.name }));
    
    const finalStudents = [...orderedStudents, ...missingStudents];
    const totalRows = Math.ceil(finalStudents.length / FIELDS_PER_ROW);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SLOT-VERTEILUNG: Klasse 7a');
    console.log('═══════════════════════════════════════════════════════════════\n');

    Array.from({ length: totalRows }, (_, rowIndex) => {
      Array.from({ length: FIELDS_PER_ROW }, (_, colIndex) => {
        const fieldIndex = rowIndex * FIELDS_PER_ROW + colIndex;
        const student = finalStudents[fieldIndex];
        const fieldNumber = rowIndex * FIELDS_PER_ROW + colIndex + 1;
        
        if (student) {
          console.log(`Slot ${fieldNumber}: ${student.name}`);
        }
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    
    db.close();
  });
});
