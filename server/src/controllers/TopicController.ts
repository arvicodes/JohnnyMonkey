import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const createTopic = async (req: Request, res: Response) => {
  try {
    const { name, description, unitId } = req.body;
    if (!unitId) return res.status(400).json({ error: 'UnitId fehlt' });
    const topic = await prisma.topic.create({
      data: { name, description, unitId }
    });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Anlegen des Themas' });
  }
};

export const getTopics = async (req: Request, res: Response) => {
  try {
    const { unitId } = req.query;
    if (!unitId) return res.status(400).json({ error: 'UnitId fehlt' });
    const topics = await prisma.topic.findMany({
      where: { unitId: String(unitId) },
      orderBy: { order: 'asc' }
    });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Themen' });
  }
};

export const updateTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const topic = await prisma.topic.update({
      where: { id },
      data: { name, description }
    });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Themas' });
  }
};

export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.topic.delete({ where: { id } });
    res.json({ message: 'Thema gelöscht' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Themas' });
  }
};

export const getTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const topic = await prisma.topic.findUnique({ where: { id } });
    if (!topic) return res.status(404).json({ error: 'Topic nicht gefunden' });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Topics' });
  }
}; 