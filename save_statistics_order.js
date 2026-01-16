const { execSync } = require('child_process');
const path = require('path');

const GROUP_ID = '8000d012-758d-4191-b47c-cc8816e88eba';
const DB_PATH = path.join(__dirname, 'server', 'prisma', 'dev.db');

// Hole alle Schüler-IDs in der richtigen Reihenfolge (nach loginCode)
let studentsOutput = '';
try {
  studentsOutput = execSync(`sqlite3 "${DB_PATH}" "SELECT u.id FROM Participation p JOIN User u ON p.studentId = u.id WHERE p.groupId = '${GROUP_ID}' GROUP BY u.id ORDER BY u.loginCode ASC;"`, { encoding: 'utf8' });
} catch (e) {
  console.error('Fehler beim Lesen der Schüler:', e.message);
  process.exit(1);
}

// Parse Schüler-IDs
const studentIds = studentsOutput.trim().split('\n').filter(id => id.trim().length > 0);

// Erstelle JSON-Array
const statisticsOrderJson = JSON.stringify(studentIds);

console.log('Speichere statisticsOrder für Gruppe:', GROUP_ID);
console.log('Anzahl Schüler:', studentIds.length);
console.log('JSON:', statisticsOrderJson.substring(0, 100) + '...');

// Speichere in Datenbank - verwende printf für sicheres Escaping
try {
  // Schreibe JSON in temporäre Datei
  const fs = require('fs');
  const tmpFile = '/tmp/stat_order.json';
  fs.writeFileSync(tmpFile, statisticsOrderJson);
  
  // Lade JSON aus Datei in SQLite
  execSync(`sqlite3 "${DB_PATH}" << 'EOF'
.read /tmp/stat_order.json
UPDATE LearningGroup 
SET statisticsOrder = readfile('/tmp/stat_order.json')
WHERE id = '${GROUP_ID}';
EOF
`, { encoding: 'utf8' });
  
  // Alternative: Direkt mit printf
  const escapedJson = statisticsOrderJson.replace(/"/g, '\\"');
  execSync(`sqlite3 "${DB_PATH}" "UPDATE LearningGroup SET statisticsOrder = printf('\\\"%s\\\"', readfile('/tmp/stat_order.json')) WHERE id = '${GROUP_ID}';"`, { encoding: 'utf8' });
  
  // Noch einfacher: Verwende .mode und .import
  execSync(`echo "${statisticsOrderJson}" | sqlite3 "${DB_PATH}" "UPDATE LearningGroup SET statisticsOrder = '${statisticsOrderJson.replace(/'/g, "''")}' WHERE id = '${GROUP_ID}';"`, { encoding: 'utf8' });
  
  console.log('\n✅ statisticsOrder erfolgreich gespeichert!');
  
  // Verifiziere
  const verify = execSync(`sqlite3 "${DB_PATH}" "SELECT statisticsOrder FROM LearningGroup WHERE id = '${GROUP_ID}';"`, { encoding: 'utf8' }).trim();
  if (verify) {
    try {
      const parsed = JSON.parse(verify);
      console.log('✅ Verifiziert: ' + parsed.length + ' Schüler gespeichert');
    } catch (e) {
      console.log('⚠️ Gespeichert, aber Verifizierung fehlgeschlagen:', e.message);
      console.log('Gespeicherter Wert (erste 100 Zeichen):', verify.substring(0, 100));
    }
  }
} catch (e) {
  console.error('❌ Fehler beim Speichern:', e.message);
  process.exit(1);
}
