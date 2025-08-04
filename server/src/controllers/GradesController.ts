import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const saveGrades = async (req: Request, res: Response) => {
  try {
    const { studentId, schemaId, grades } = req.body;

    if (!studentId || !schemaId || !grades || !Array.isArray(grades)) {
      return res.status(400).json({ error: 'Ungültige Daten' });
    }

    // Lösche bestehende Noten für diesen Schüler und dieses Schema
    await prisma.grade.deleteMany({
      where: {
        studentId,
        schemaId
      }
    });

    // Erstelle neue Noten
    const createdGrades = await Promise.all(
      grades.map((gradeData: any) =>
        prisma.grade.create({
          data: {
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