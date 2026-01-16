const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function showStudentDistribution() {
  try {
    // Finde die Gruppe "7a" (oder die erste Gruppe)
    const groups = await prisma.learningGroup.findMany({
      include: {
        students: {
          orderBy: {
            name: 'asc'
          }
        }
      }
    });

    if (groups.length === 0) {
      console.log('Keine Gruppen gefunden');
      return;
    }

    // Verwende die erste Gruppe (oder suche nach "7a")
    const group = groups.find(g => g.name.includes('7a')) || groups[0];
    console.log(`\n📊 SCHÜLER-VERTEILUNG FÜR: ${group.name}`);
    console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

    // Lade seatingOrder
    let seatingOrder = null;
    let deskPositions = null;

    if (group.seatingOrder) {
      try {
        const parsed = JSON.parse(group.seatingOrder);
        if (parsed && typeof parsed === 'object' && parsed.order) {
          seatingOrder = parsed.order;
        } else if (Array.isArray(parsed)) {
          seatingOrder = parsed;
        } else {
          seatingOrder = parsed;
        }
      } catch (e) {
        // Falls nicht JSON, versuche direkt als Array
        if (Array.isArray(group.seatingOrder)) {
          seatingOrder = group.seatingOrder;
        }
      }
    }

    // Grid-System: 4x5 Kacheln (4 Spalten, 5 Zeilen)
    const gridCols = 4;
    const gridRows = 5;

    // Funktion zur Berechnung der globalen Slot-Nummer
    const getGlobalSlotNumber = (slotIndex, gridRow, gridCol) => {
      return (gridRow * gridCols + gridCol) * 2 + slotIndex + 1;
    };

    // Erstelle Map: studentId → Student
    const studentMap = {};
    group.students.forEach(s => {
      studentMap[s.id] = s;
    });

    // Sortiere Schüler nach seatingOrder oder alphabetisch
    let sortedStudents;
    if (seatingOrder && Array.isArray(seatingOrder) && seatingOrder.length > 0) {
      sortedStudents = seatingOrder.map(id => studentMap[id]).filter(s => s);
      // Füge fehlende Schüler am Ende hinzu
      const orderedIds = new Set(seatingOrder);
      const missing = group.students.filter(s => !orderedIds.has(s.id));
      sortedStudents = [...sortedStudents, ...missing];
    } else {
      sortedStudents = [...group.students];
    }

    // Lade deskPositions falls vorhanden
    if (group.seatingOrder) {
      try {
        const parsed = JSON.parse(group.seatingOrder);
        if (parsed && parsed.deskPositions) {
          deskPositions = parsed.deskPositions;
        }
      } catch (e) {
        // Ignore
      }
    }

    // Erstelle Tische (Zweiergruppen)
    const desks = [];
    for (let i = 0; i < sortedStudents.length; i += 2) {
      desks.push(sortedStudents.slice(i, i + 2));
    }

    // Standard-Grid-Positionen
    const getDefaultGridPosition = (deskIndex) => {
      if (deskIndex === 0) return { gridRow: 0, gridCol: 0 };
      if (deskIndex >= 1 && deskIndex <= 3) return { gridRow: 1, gridCol: deskIndex - 1 };
      if (deskIndex >= 4 && deskIndex <= 7) return { gridRow: 2, gridCol: deskIndex - 4 };
      if (deskIndex >= 8 && deskIndex <= 11) return { gridRow: 3, gridCol: deskIndex - 8 };
      if (deskIndex >= 12 && deskIndex <= 15) return { gridRow: 4, gridCol: deskIndex - 12 };
      return {
        gridRow: Math.floor(deskIndex / gridCols),
        gridCol: deskIndex % gridCols
      };
    };

    // Verwende deskPositions oder Standard-Positionen
    let finalDeskPositions = deskPositions || desks.map((_, index) => ({
      deskId: index,
      ...getDefaultGridPosition(index)
    }));

    // Erstelle Grid-Map
    const gridMap = {};
    finalDeskPositions.forEach(pos => {
      const key = `${pos.gridRow}-${pos.gridCol}`;
      gridMap[key] = pos.deskId;
    });

    // Erstelle detaillierte Liste
    console.log('DETAILLIERTE SLOT-LISTE (zeilenweise, beginnt bei 1):');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

    const slotList = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const gridKey = `${row}-${col}`;
        const deskId = gridMap[gridKey];
        
        if (deskId !== undefined && desks[deskId]) {
          const desk = desks[deskId];
          for (let slotIndex = 0; slotIndex < 2; slotIndex++) {
            const globalSlot = getGlobalSlotNumber(slotIndex, row, col);
            const student = desk[slotIndex];
            slotList.push({
              slot: globalSlot,
              gridRow: row + 1,
              gridCol: col + 1,
              slotIndex,
              deskId,
              student: student ? student.name : null
            });
          }
        } else {
          // Leere Zelle
          for (let slotIndex = 0; slotIndex < 2; slotIndex++) {
            const globalSlot = getGlobalSlotNumber(slotIndex, row, col);
            slotList.push({
              slot: globalSlot,
              gridRow: row + 1,
              gridCol: col + 1,
              slotIndex,
              deskId: null,
              student: null
            });
          }
        }
      }
    }

    // Zeige alle Slots
    slotList.forEach(item => {
      const studentStr = item.student ? item.student : '<LEER>';
      const deskStr = item.deskId !== null ? `Desk ${item.deskId}` : 'Kein Desk';
      console.log(`Slot ${String(item.slot).padStart(3, ' ')} (Grid R${item.gridRow}, C${item.gridCol}, Slot ${item.slotIndex}, ${deskStr}): ${studentStr}`);
    });

    // Prüfe Felder 2, 6 und 40
    console.log('\n═══════════════════════════════════════════════════════════════════════════════════════');
    console.log('PRÜFUNG: Felder 2, 6 und 40');
    console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

    const field2 = slotList.find(s => s.slot === 2);
    const field6 = slotList.find(s => s.slot === 6);
    const field40 = slotList.find(s => s.slot === 40);

    console.log('Feld 2:', field2 ? {
      student: field2.student,
      gridRow: field2.gridRow,
      gridCol: field2.gridCol,
      slotIndex: field2.slotIndex,
      deskId: field2.deskId
    } : 'NICHT GEFUNDEN');

    console.log('Feld 6:', field6 ? {
      student: field6.student,
      gridRow: field6.gridRow,
      gridCol: field6.gridCol,
      slotIndex: field6.slotIndex,
      deskId: field6.deskId
    } : 'NICHT GEFUNDEN');

    console.log('Feld 40:', field40 ? {
      student: field40.student,
      gridRow: field40.gridRow,
      gridCol: field40.gridCol,
      slotIndex: field40.slotIndex,
      deskId: field40.deskId
    } : 'NICHT GEFUNDEN');

    // Prüfe Verknüpfungen
    console.log('\nVERKNÜPFUNGS-ANALYSE:');
    console.log('───────────────────────────────────────────────────────────────────────────────────────');
    
    if (field2 && field6 && field40) {
      const sameDesk = field2.deskId === field6.deskId || field2.deskId === field40.deskId || field6.deskId === field40.deskId;
      const sameRow = field2.gridRow === field6.gridRow || field2.gridRow === field40.gridRow || field6.gridRow === field40.gridRow;
      const sameCol = field2.gridCol === field6.gridCol || field2.gridCol === field40.gridCol || field6.gridCol === field40.gridCol;
      
      console.log(`Gleicher Desk: ${sameDesk ? 'JA' : 'NEIN'}`);
      console.log(`Gleiche Zeile: ${sameRow ? 'JA' : 'NEIN'}`);
      console.log(`Gleiche Spalte: ${sameCol ? 'JA' : 'NEIN'}`);
      
      if (field2.deskId === field6.deskId) {
        console.log(`⚠️ Feld 2 und 6 sind im gleichen Desk (${field2.deskId})`);
      }
      if (field2.deskId === field40.deskId) {
        console.log(`⚠️ Feld 2 und 40 sind im gleichen Desk (${field2.deskId})`);
      }
      if (field6.deskId === field40.deskId) {
        console.log(`⚠️ Feld 6 und 40 sind im gleichen Desk (${field6.deskId})`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showStudentDistribution();
