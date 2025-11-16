import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Hilfsfunktion zur automatischen Berechnung der EPO-Noten für eine Gruppe
// Wird automatisch aufgerufen, wenn sich Teilnahmen ändern
async function calculateEpoGradesForGroup(groupId: string): Promise<void> {
  try {
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: {
        period1Hours: true,
        period2Hours: true
      }
    });
    
    if (!group || !group.period1Hours || !group.period2Hours) {
      // Keine Zeitraum-Konfiguration vorhanden, keine Berechnung möglich
      return;
    }
    
    const period1Hours = group.period1Hours;
    const period2Hours = group.period2Hours;
    
    // Lade alle Teilnahmen für diese Gruppe
    const participations = await prisma.participation.findMany({
      where: { groupId },
      orderBy: {
        lessonIndex: 'asc'
      }
    });
    
    // Berechne EPO-Noten für jeden Schüler
    const studentData: {[studentId: string]: {
      period1: {values: number[], count: number},
      period2: {values: number[], count: number}
    }} = {};
    
    participations.forEach(p => {
      if (!studentData[p.studentId]) {
        studentData[p.studentId] = {
          period1: { values: [], count: 0 },
          period2: { values: [], count: 0 }
        };
      }
      
      // Bestimme zu welchem Zeitraum diese Stunde gehört
      if (period1Hours !== null && p.lessonIndex < period1Hours) {
        studentData[p.studentId].period1.values.push(p.value);
        studentData[p.studentId].period1.count += 1;
      } else if (period2Hours !== null && period1Hours !== null && p.lessonIndex >= period1Hours && p.lessonIndex < period1Hours + period2Hours) {
        studentData[p.studentId].period2.values.push(p.value);
        studentData[p.studentId].period2.count += 1;
      } else if (period2Hours !== null && period1Hours === null && p.lessonIndex < period2Hours) {
        studentData[p.studentId].period2.values.push(p.value);
        studentData[p.studentId].period2.count += 1;
      }
    });
    
    // Hilfsfunktion zur Berechnung der Note aus dem Durchschnitt
    const calculateGradeFromAverage = (average: number): number => {
      if (average >= 1.5) return 1.0;
      if (average >= 0.5) return 2.0;
      if (average >= -0.5) return 3.0;
      if (average >= -1.5) return 4.0;
      return 5.0;
    };
    
    // Berechne Durchschnitte und Noten, speichere in Datenbank
    for (const [studentId, data] of Object.entries(studentData)) {
      // Zeitraum 1 (EPO 1)
      if (data.period1.count > 0) {
        const avg1 = data.period1.values.reduce((a, b) => a + b, 0) / data.period1.count;
        const grade1 = calculateGradeFromAverage(avg1);
        
        await prisma.participationPeriodGrade.upsert({
          where: {
            groupId_studentId_period: {
              groupId,
              studentId,
              period: 1
            }
          },
          update: {
            grade: grade1,
            averageValue: avg1,
            lessonCount: data.period1.count,
            updatedAt: new Date()
          },
          create: {
            groupId,
            studentId,
            period: 1,
            grade: grade1,
            averageValue: avg1,
            lessonCount: data.period1.count
          }
        });
      }
      
      // Zeitraum 2 (EPO 2)
      if (data.period2.count > 0) {
        const avg2 = data.period2.values.reduce((a, b) => a + b, 0) / data.period2.count;
        const grade2 = calculateGradeFromAverage(avg2);
        
        await prisma.participationPeriodGrade.upsert({
          where: {
            groupId_studentId_period: {
              groupId,
              studentId,
              period: 2
            }
          },
          update: {
            grade: grade2,
            averageValue: avg2,
            lessonCount: data.period2.count,
            updatedAt: new Date()
          },
          create: {
            groupId,
            studentId,
            period: 2,
            grade: grade2,
            averageValue: avg2,
            lessonCount: data.period2.count
          }
        });
      }
    }
  } catch (error: any) {
    console.error('Error calculating EPO grades for group:', groupId, error);
    // Fehler wird nur geloggt, damit das Speichern der Teilnahme nicht blockiert wird
  }
}

// Hilfsfunktion: Übertrage berechnete EPO-Noten ins Notenschema (Grades)
// - Verwendet das erste verfügbare GradingSchema der Gruppe
// - Legt/aktualisiert Kategorien "EPO 1" und "EPO 2" je Schüler mit weight 1.0
async function integrateEpoGradesToSchema(groupId: string): Promise<void> {
  try {
    // Finde ein Schema für die Gruppe
    const schema = await prisma.gradingSchema.findFirst({
      where: { groupId },
      select: { id: true }
    });
    if (!schema) {
      // Kein Schema vorhanden → Abbruch ohne Fehler
      return;
    }
    const schemaId = schema.id;

    // Lade aktuelle EPO-Noten der Gruppe
    const epoGrades = await prisma.participationPeriodGrade.findMany({
      where: { groupId },
      select: {
        studentId: true,
        period: true,
        grade: true
      }
    });
    if (epoGrades.length === 0) {
      return;
    }

    // Upsert pro Eintrag
    for (const eg of epoGrades) {
      // Verwende kleingeschriebene Kategorienamen: "epo 1" / "epo 2"
      const targetName = `epo ${eg.period}`;
      // Hole vorhandene Noten des Schülers im Schema und gleiche case-insensitive ab
      const existingGrades = await prisma.grade.findMany({
        where: { studentId: eg.studentId, schemaId },
        select: { id: true, categoryName: true }
      });
      const match = existingGrades.find(g => g.categoryName.trim().toLowerCase() === targetName.toLowerCase());

      if (match) {
        // Update vorhandenen Eintrag (Name wird auf kleingeschriebenen Zielnamen normalisiert)
        await prisma.grade.update({
          where: { id: match.id },
          data: {
            categoryName: targetName,
            grade: eg.grade,
            weight: 1.0
          }
        });
      } else {
        // Falls keine case-insensitive Übereinstimmung: neu anlegen (mit kleingeschriebenem Namen)
        await prisma.grade.create({
          data: {
            studentId: eg.studentId,
            schemaId,
            categoryName: targetName,
            grade: eg.grade,
            weight: 1.0
          }
        });
      }
    }
  } catch (error) {
    console.error('Error integrating EPO grades into grading schema for group:', groupId, error);
    // Nicht werfen, um Benutzerinteraktionen nicht zu blockieren
  }
}

// Get participation data for a specific student in all their groups
// WICHTIG: Diese Route muss VOR der /:groupId Route kommen!
router.get('/student/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    // Lade alle Mitarbeitsbewertungen für diesen Schüler
    const participations = await prisma.participation.findMany({
      where: { studentId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            period1Hours: true,
            period2Hours: true
          }
        }
      },
      orderBy: [
        { groupId: 'asc' },
        { lessonIndex: 'asc' }
      ]
    });

    // Strukturiere die Daten nach Lerngruppe und Unterrichtsstunde
    const structured: {[groupId: string]: {
      groupName: string;
      period1Hours: number | null;
      period2Hours: number | null;
      participations: {lessonIndex: number; value: number; comment?: string | null; period?: number}[];
      average: number;
      count: number;
      grade: number | null;
    }} = {};
    
    // Sammle alle Bewertungen pro Gruppe
    const groupParticipations: {[groupId: string]: {[lessonIndex: number]: {value: number; comment?: string | null}}} = {};
    
    participations.forEach(p => {
      if (!groupParticipations[p.groupId]) {
        groupParticipations[p.groupId] = {};
        structured[p.groupId] = {
          groupName: p.group.name,
          period1Hours: p.group.period1Hours,
          period2Hours: p.group.period2Hours,
          participations: [],
          average: 0,
          count: 0,
          grade: null
        };
      }
      groupParticipations[p.groupId][p.lessonIndex] = {
        value: p.value,
        comment: p.comment || undefined
      };
    });

    // Für jede Gruppe: Fülle fehlende Stunden zwischen min und max mit neutral (0)
    Object.keys(groupParticipations).forEach(groupId => {
      const lessons = groupParticipations[groupId];
      const lessonIndices = Object.keys(lessons).map(Number).sort((a, b) => a - b);
      const groupConfig = structured[groupId];
      const period1Hours = groupConfig.period1Hours;
      const period2Hours = groupConfig.period2Hours;
      
      if (lessonIndices.length === 0) {
        return;
      }
      
      const minLesson = lessonIndices[0];
      const maxLesson = lessonIndices[lessonIndices.length - 1];
      const lessonSet = new Set(lessonIndices);
      
      // Erstelle vollständige Liste von min bis max, fülle fehlende mit 0
      const allParticipations: {lessonIndex: number; value: number; comment?: string | null; period?: number}[] = [];
      for (let i = minLesson; i <= maxLesson; i++) {
        let period = 0; // 0 = nicht zugeordnet, 1 = Zeitraum 1, 2 = Zeitraum 2
        if (period1Hours !== null && i <= period1Hours) {
          period = 1;
        } else if (period2Hours !== null && period1Hours !== null && i <= period1Hours + period2Hours) {
          period = 2;
        } else if (period2Hours !== null && period1Hours === null && i <= period2Hours) {
          period = 2;
        }
        
        if (lessonSet.has(i)) {
          allParticipations.push({
            lessonIndex: i,
            value: lessons[i].value,
            comment: lessons[i].comment,
            period: period
          });
        } else {
          allParticipations.push({
            lessonIndex: i,
            value: 0,
            period: period
          });
        }
      }
      
      structured[groupId].participations = allParticipations;
      
      // Berechne Durchschnitt (inkl. neutraler Bewertungen)
      let sum = 0;
      allParticipations.forEach(p => {
        sum += p.value;
      });
      structured[groupId].average = sum / allParticipations.length;
      structured[groupId].count = allParticipations.length;
      
      // Konvertiere Durchschnitt zu Note
      if (structured[groupId].average >= 1.5) structured[groupId].grade = 1.0;
      else if (structured[groupId].average >= 0.5) structured[groupId].grade = 2.0;
      else if (structured[groupId].average >= -0.5) structured[groupId].grade = 3.0;
      else if (structured[groupId].average >= -1.5) structured[groupId].grade = 4.0;
      else structured[groupId].grade = 5.0;
    });

    res.json(structured);
  } catch (error: any) {
    console.error('Error fetching student participations:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Get or update period configuration for a learning group
// WICHTIG: Diese Routen müssen VOR der /:groupId Route kommen!
router.get('/:groupId/periods', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: {
        period1Hours: true,
        period2Hours: true
      }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }
    
    res.json({
      period1Hours: group.period1Hours || null,
      period2Hours: group.period2Hours || null
    });
  } catch (error) {
    console.error('Error fetching period configuration:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:groupId/periods', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const { period1Hours, period2Hours } = req.body;
    
    console.log('PUT /:groupId/periods - groupId:', groupId, 'body:', { period1Hours, period2Hours });
    
    // Validiere, dass die Gruppe existiert
    const existingGroup = await prisma.learningGroup.findUnique({
      where: { id: groupId }
    });
    
    if (!existingGroup) {
      console.error('Group not found:', groupId);
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }
    
    // Validiere period1Hours
    if (period1Hours !== undefined && period1Hours !== null) {
      const period1HoursNum = typeof period1Hours === 'string' ? parseInt(period1Hours) : period1Hours;
      if (isNaN(period1HoursNum) || period1HoursNum < 1 || period1HoursNum > 1000) {
        return res.status(400).json({ error: 'period1Hours muss zwischen 1 und 1000 liegen' });
      }
    }
    
    // Validiere period2Hours
    if (period2Hours !== undefined && period2Hours !== null) {
      const period2HoursNum = typeof period2Hours === 'string' ? parseInt(period2Hours) : period2Hours;
      if (isNaN(period2HoursNum) || period2HoursNum < 1 || period2HoursNum > 1000) {
        return res.status(400).json({ error: 'period2Hours muss zwischen 1 und 1000 liegen' });
      }
    }
    
    // Konvertiere zu Zahlen oder null
    const period1HoursValue = period1Hours !== undefined && period1Hours !== null 
      ? (typeof period1Hours === 'string' ? parseInt(period1Hours) : period1Hours)
      : null;
    const period2HoursValue = period2Hours !== undefined && period2Hours !== null
      ? (typeof period2Hours === 'string' ? parseInt(period2Hours) : period2Hours)
      : null;
    
    console.log('Updating group with values:', { period1HoursValue, period2HoursValue });
    
    const group = await prisma.learningGroup.update({
      where: { id: groupId },
      data: {
        period1Hours: period1HoursValue,
        period2Hours: period2HoursValue
      }
    });
    
    console.log('Group updated successfully:', { period1Hours: group.period1Hours, period2Hours: group.period2Hours });
    
    res.json({
      period1Hours: group.period1Hours,
      period2Hours: group.period2Hours
    });
  } catch (error: any) {
    console.error('Error updating period configuration:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler',
      code: error?.code || 'UNKNOWN'
    });
  }
});

// Get all participation records for a learning group
router.get('/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    // Lade alle Mitarbeitsbewertungen für diese Lerngruppe
    const participations = await prisma.participation.findMany({
      where: { groupId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      },
      orderBy: [
        { lessonIndex: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Strukturiere die Daten nach Unterrichtsstunde und Schüler
    const structured: {[lessonIndex: number]: {[studentId: string]: {value: number; comment?: string | null}}} = {};
    
    participations.forEach(p => {
      if (!structured[p.lessonIndex]) {
        structured[p.lessonIndex] = {};
      }
      structured[p.lessonIndex][p.studentId] = {
        value: p.value,
        comment: p.comment || undefined
      };
    });

    res.json(structured);
  } catch (error) {
    console.error('Error fetching participations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate and save EPO grades for all students in a group
// WICHTIG: Diese Route muss VOR der /:groupId/:lessonIndex Route kommen!
router.post('/:groupId/calculate-epo', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: {
        period1Hours: true,
        period2Hours: true
      }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }
    
    if (!group.period1Hours || !group.period2Hours) {
      return res.status(400).json({ error: 'Zeitraum-Konfiguration fehlt. Bitte zuerst die Stunden pro Zeitraum einstellen.' });
    }
    
    // Verwende die wiederverwendbare Funktion
    await calculateEpoGradesForGroup(groupId);
    
    // Integriere EPO-Noten ins Notenschema (Server-seitig automatisch)
    await integrateEpoGradesToSchema(groupId);

    // Lade die berechneten EPO-Noten, um die Anzahl zurückzugeben
    const epoGrades = await prisma.participationPeriodGrade.findMany({
      where: { groupId }
    });
    
    res.json({ 
      message: 'EPO-Noten erfolgreich berechnet',
      count: epoGrades.length
    });
  } catch (error: any) {
    console.error('Error calculating EPO grades:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Save or update a participation record
router.post('/:groupId/:lessonIndex', async (req: Request, res: Response) => {
  try {
    const { groupId, lessonIndex } = req.params;
    const { studentId, value } = req.body;
    
    if (!studentId || value === undefined) {
      return res.status(400).json({ error: 'studentId und value sind erforderlich' });
    }

    const lessonIndexNum = parseInt(lessonIndex);
    if (isNaN(lessonIndexNum)) {
      return res.status(400).json({ error: 'Ungültiger lessonIndex' });
    }

    // Prüfe ob die Lerngruppe existiert
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }

    // Prüfe ob der Schüler in der Lerngruppe ist
    const studentInGroup = await prisma.learningGroup.findFirst({
      where: {
        id: groupId,
        students: {
          some: { id: studentId }
        }
      }
    });

    if (!studentInGroup) {
      return res.status(404).json({ error: 'Schüler ist nicht in dieser Lerngruppe' });
    }

    // Aktualisiere oder erstelle die Bewertung
    const participation = await prisma.participation.upsert({
      where: {
        groupId_lessonIndex_studentId: {
          groupId,
          lessonIndex: lessonIndexNum,
          studentId
        }
      },
      update: {
        value: value,
        updatedAt: new Date()
      },
      create: {
        groupId,
        lessonIndex: lessonIndexNum,
        studentId,
        value: value
      }
    });

    // Berechne EPO-Noten automatisch im Hintergrund (non-blocking)
    // Wird asynchron ausgeführt, damit die Antwort nicht verzögert wird
    (async () => {
      try {
        await calculateEpoGradesForGroup(groupId);
        await integrateEpoGradesToSchema(groupId);
      } catch (error) {
        console.error('Background EPO calc/integration failed:', error);
      }
    })();

    res.json(participation);
  } catch (error) {
    console.error('Error saving participation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics for a learning group
router.get('/:groupId/stats', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    // Lade Perioden-Konfiguration
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      select: {
        period1Hours: true,
        period2Hours: true
      }
    });
    
    const period1Hours = group?.period1Hours || null;
    const period2Hours = group?.period2Hours || null;
    
    const participations = await prisma.participation.findMany({
      where: { groupId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            loginCode: true
          }
        }
      },
      orderBy: {
        lessonIndex: 'asc'
      }
    });

    // Berechne Durchschnitte pro Schüler und kategorisiere nach Zeiträumen
    const studentStats: {[studentId: string]: {
      student: any;
      average: number;
      count: number;
      grade: number | null;
      period1: {
        average: number;
        count: number;
        grade: number | null;
      };
      period2: {
        average: number;
        count: number;
        grade: number | null;
      };
    }} = {};

    participations.forEach(p => {
      if (!studentStats[p.studentId]) {
        studentStats[p.studentId] = {
          student: p.student,
          average: 0,
          count: 0,
          grade: null,
          period1: {
            average: 0,
            count: 0,
            grade: null
          },
          period2: {
            average: 0,
            count: 0,
            grade: null
          }
        };
      }
      
      const stats = studentStats[p.studentId];
      stats.average += p.value;
      stats.count += 1;
      
      // Kategorisiere nach Zeitraum
      let period = 0; // 0 = nicht zugeordnet, 1 = Zeitraum 1, 2 = Zeitraum 2
      if (period1Hours !== null && p.lessonIndex <= period1Hours) {
        period = 1;
        stats.period1.average += p.value;
        stats.period1.count += 1;
      } else if (period2Hours !== null && period1Hours !== null && p.lessonIndex <= period1Hours + period2Hours) {
        period = 2;
        stats.period2.average += p.value;
        stats.period2.count += 1;
      } else if (period2Hours !== null && period1Hours === null && p.lessonIndex <= period2Hours) {
        period = 2;
        stats.period2.average += p.value;
        stats.period2.count += 1;
      }
    });

    // Berechne Durchschnitte und Noten
    Object.keys(studentStats).forEach(studentId => {
      const stats = studentStats[studentId];
      if (stats.count > 0) {
        stats.average = stats.average / stats.count;
        
        // Konvertiere Durchschnitt zu Note
        if (stats.average >= 1.5) stats.grade = 1.0;
        else if (stats.average >= 0.5) stats.grade = 2.0;
        else if (stats.average >= -0.5) stats.grade = 3.0;
        else if (stats.average >= -1.5) stats.grade = 4.0;
        else stats.grade = 5.0;
      }
      
      // Berechne Period 1
      if (stats.period1.count > 0) {
        stats.period1.average = stats.period1.average / stats.period1.count;
        if (stats.period1.average >= 1.5) stats.period1.grade = 1.0;
        else if (stats.period1.average >= 0.5) stats.period1.grade = 2.0;
        else if (stats.period1.average >= -0.5) stats.period1.grade = 3.0;
        else if (stats.period1.average >= -1.5) stats.period1.grade = 4.0;
        else stats.period1.grade = 5.0;
      }
      
      // Berechne Period 2
      if (stats.period2.count > 0) {
        stats.period2.average = stats.period2.average / stats.period2.count;
        if (stats.period2.average >= 1.5) stats.period2.grade = 1.0;
        else if (stats.period2.average >= 0.5) stats.period2.grade = 2.0;
        else if (stats.period2.average >= -0.5) stats.period2.grade = 3.0;
        else if (stats.period2.average >= -1.5) stats.period2.grade = 4.0;
        else stats.period2.grade = 5.0;
      }
    });

    res.json(Object.values(studentStats));
  } catch (error: any) {
    console.error('Error fetching participation stats:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Update comment for a participation record
router.put('/:groupId/:lessonIndex/:studentId/comment', async (req: Request, res: Response) => {
  try {
    const { groupId, lessonIndex, studentId } = req.params;
    const { comment } = req.body;
    
    const lessonIndexNum = parseInt(lessonIndex);
    if (isNaN(lessonIndexNum)) {
      return res.status(400).json({ error: 'Ungültiger lessonIndex' });
    }

    // Prüfe ob die Teilnahme existiert, wenn nicht, erstelle sie mit neutral (0)
    const participation = await prisma.participation.upsert({
      where: {
        groupId_lessonIndex_studentId: {
          groupId,
          lessonIndex: lessonIndexNum,
          studentId
        }
      },
      update: {
        comment: comment || null,
        updatedAt: new Date()
      },
      create: {
        groupId,
        lessonIndex: lessonIndexNum,
        studentId,
        value: 0, // Neutral als Standard
        comment: comment || null
      }
    });

    // Berechne EPO-Noten automatisch im Hintergrund (non-blocking)
    // Kommentare ändern die Noten nicht, aber falls sich gleichzeitig Werte ändern, wird neu berechnet
    (async () => {
      try {
        await calculateEpoGradesForGroup(groupId);
        await integrateEpoGradesToSchema(groupId);
      } catch (error) {
        console.error('Background EPO calc/integration failed after comment update:', error);
      }
    })();

    res.json(participation);
  } catch (error) {
    console.error('Error updating participation comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



// Helper function: Convert average participation value to German grade
function calculateGradeFromAverage(average: number): number {
  // -2 bis +2 -> 1.0 bis 5.0
  // -2 = 5.0, -1 = 4.0, 0 = 3.0, 1 = 2.0, 2 = 1.0
  if (average >= 1.5) return 1.0;
  if (average >= 0.5) return 2.0;
  if (average >= -0.5) return 3.0;
  if (average >= -1.5) return 4.0;
  return 5.0;
}

// Get EPO grades for a specific student
// WICHTIG: Diese Route muss VOR der /:groupId/epo-grades Route kommen!
router.get('/student/:studentId/epo-grades', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    const epoGrades = await prisma.participationPeriodGrade.findMany({
      where: { studentId },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { groupId: 'asc' },
        { period: 'asc' }
      ]
    });
    
    res.json(epoGrades);
  } catch (error) {
    console.error('Error fetching student EPO grades:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get EPO grades for a learning group
router.get('/:groupId/epo-grades', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    
    const epoGrades = await prisma.participationPeriodGrade.findMany({
      where: { groupId },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { studentId: 'asc' },
        { period: 'asc' }
      ]
    });
    
    res.json(epoGrades);
  } catch (error) {
    console.error('Error fetching EPO grades:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

