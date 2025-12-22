import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const saveGrades = async (req: Request, res: Response) => {
  try {
    const { studentId, schemaId, grades } = req.body;

    if (!studentId || !schemaId || !grades || !Array.isArray(grades)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Verwende upsert für jede Note (erstellt neue oder aktualisiert bestehende)
    const createdGrades = await Promise.all(
      grades.map((gradeData: any) =>
        prisma.grade.upsert({
          where: {
            studentId_schemaId_categoryName: {
              studentId,
              schemaId,
              categoryName: gradeData.categoryName
            }
          },
          update: {
            grade: gradeData.grade,
            weight: gradeData.weight
          },
          create: {
            studentId,
            schemaId,
            categoryName: gradeData.categoryName,
            grade: gradeData.grade,
            weight: gradeData.weight
          }
        })
      )
    );

    res.status(201).json(createdGrades);
  } catch (error) {
    console.error('Error saving grades:', error);
    res.status(500).json({ error: 'Fehler beim Speichern der Noten' });
  }
};

export const getGrades = async (req: Request, res: Response) => {
  try {
    const { studentId, schemaId } = req.params;

    if (!studentId || !schemaId) {
      return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        schemaId
      },
      orderBy: {
        categoryName: 'asc'
      }
    });

    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Noten' });
  }
};

export const getGradesByStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID erforderlich' });
    }

    const grades = await prisma.grade.findMany({
      where: {
        studentId
      },
      include: {
        schema: true
      },
      orderBy: {
        schemaId: 'asc'
      }
    });

    res.json(grades);
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Schüler-Noten' });
  }
};

// Freigabe der Gesamtnote für einen Schüler
export const toggleGradeRelease = async (req: Request, res: Response) => {
  try {
    const { studentId, schemaId, isReleased } = req.body;

    console.log('toggleGradeRelease - Request body:', req.body);
    console.log('toggleGradeRelease - studentId:', studentId, 'schemaId:', schemaId, 'isReleased:', isReleased);

    if (!studentId || !schemaId) {
      return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
    }

    const gradeRelease = await prisma.gradeRelease.upsert({
      where: {
        studentId_schemaId: {
          studentId,
          schemaId
        }
      },
      update: {
        isReleased: isReleased !== undefined ? isReleased : true
      },
      create: {
        studentId,
        schemaId,
        isReleased: isReleased !== undefined ? isReleased : true
      }
    });

    console.log('toggleGradeRelease - Success:', gradeRelease);
    res.json(gradeRelease);
  } catch (error: any) {
    console.error('Error toggling grade release:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Fehler beim Freigeben der Gesamtnote', details: error.message });
  }
};

// Hole Freigabestatus für einen Schüler und Schema
export const getGradeRelease = async (req: Request, res: Response) => {
  try {
    const { studentId, schemaId } = req.params;

    if (!studentId || !schemaId) {
      return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
    }

    const gradeRelease = await prisma.gradeRelease.findUnique({
      where: {
        studentId_schemaId: {
          studentId,
          schemaId
        }
      }
    });

    res.json(gradeRelease || { isReleased: false });
  } catch (error) {
    console.error('Error fetching grade release:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Freigabestatus' });
  }
}; 