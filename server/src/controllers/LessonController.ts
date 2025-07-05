import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { name, description, topicId } = req.body;
    if (!topicId) return res.status(400).json({ error: 'TopicId fehlt' });
    const lesson = await prisma.lesson.create({
      data: { name, description, topicId }
    });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Anlegen der Stunde' });
  }
};

export const getLessons = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.query;
    if (!topicId) return res.status(400).json({ error: 'TopicId fehlt' });
    const lessons = await prisma.lesson.findMany({
      where: { topicId: String(topicId) }
    });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Stunden' });
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const lesson = await prisma.lesson.update({
      where: { id },
      data: { name, description }
    });
    res.json(lesson);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Stunde' });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.lesson.delete({ where: { id } });
    res.json({ message: 'Stunde gelöscht' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Stunde' });
  }
}; 