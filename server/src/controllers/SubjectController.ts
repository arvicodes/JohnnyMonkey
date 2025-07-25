import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const createSubject = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const teacherId = req.body.teacherId || req.query.teacherId || req.headers['x-user-id'];
    if (!teacherId) return res.status(400).json({ error: 'Lehrer-ID fehlt' });
    const subject = await prisma.subject.create({
      data: { name, description, teacherId }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Anlegen des Fachs' });
  }
};

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const teacherId = req.query.teacherId || req.headers['x-user-id'];
    if (!teacherId) return res.status(400).json({ error: 'Lehrer-ID fehlt' });
    const subjects = await prisma.subject.findMany({
      where: { teacherId: String(teacherId) },
      orderBy: { order: 'asc' }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Fächer' });
  }
};

export const getSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({ where: { id } });
    if (!subject) return res.status(404).json({ error: 'Subject nicht gefunden' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Subjects' });
  }
};

export const updateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const subject = await prisma.subject.update({
      where: { id },
      data: { name, description }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Fachs' });
  }
};

export const deleteSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.subject.delete({ where: { id } });
    res.json({ message: 'Fach gelöscht' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Fachs' });
  }
};

export const reorderSubjects = async (req: Request, res: Response) => {
  try {
    const { subjectIds } = req.body;
    const teacherId = req.body.teacherId || req.query.teacherId || req.headers['x-user-id'];
    
    if (!teacherId) return res.status(400).json({ error: 'Lehrer-ID fehlt' });
    if (!Array.isArray(subjectIds)) return res.status(400).json({ error: 'Ungültige Reihenfolge' });

    // Update order for each subject
    for (let i = 0; i < subjectIds.length; i++) {
      await prisma.subject.update({
        where: { 
          id: subjectIds[i],
          teacherId: String(teacherId) // Ensure teacher owns the subject
        },
        data: { order: i }
      });
    }

    res.json({ message: 'Reihenfolge aktualisiert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
};

export const reorderBlocks = async (req: Request, res: Response) => {
  try {
    const { blockIds, subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'Fach-ID fehlt' });
    if (!Array.isArray(blockIds)) return res.status(400).json({ error: 'Ungültige Reihenfolge' });
    for (let i = 0; i < blockIds.length; i++) {
      await prisma.block.update({
        where: { id: blockIds[i], subjectId },
        data: { order: i }
      });
    }
    res.json({ message: 'Reihenfolge aktualisiert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
};

export const reorderUnits = async (req: Request, res: Response) => {
  try {
    const { unitIds, blockId } = req.body;
    if (!blockId) return res.status(400).json({ error: 'Block-ID fehlt' });
    if (!Array.isArray(unitIds)) return res.status(400).json({ error: 'Ungültige Reihenfolge' });
    for (let i = 0; i < unitIds.length; i++) {
      await prisma.unit.update({
        where: { id: unitIds[i], blockId },
        data: { order: i }
      });
    }
    res.json({ message: 'Reihenfolge aktualisiert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
};

export const reorderTopics = async (req: Request, res: Response) => {
  try {
    const { topicIds, unitId } = req.body;
    if (!unitId) return res.status(400).json({ error: 'Unit-ID fehlt' });
    if (!Array.isArray(topicIds)) return res.status(400).json({ error: 'Ungültige Reihenfolge' });
    for (let i = 0; i < topicIds.length; i++) {
      await prisma.topic.update({
        where: { id: topicIds[i], unitId },
        data: { order: i }
      });
    }
    res.json({ message: 'Reihenfolge aktualisiert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
};

export const reorderLessons = async (req: Request, res: Response) => {
  try {
    const { lessonIds, topicId } = req.body;
    if (!topicId) return res.status(400).json({ error: 'Themen-ID fehlt' });
    if (!Array.isArray(lessonIds)) return res.status(400).json({ error: 'Ungültige Reihenfolge' });
    for (let i = 0; i < lessonIds.length; i++) {
      await prisma.lesson.update({
        where: { id: lessonIds[i], topicId },
        data: { order: i }
      });
    }
    res.json({ message: 'Reihenfolge aktualisiert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Reihenfolge' });
  }
}; 