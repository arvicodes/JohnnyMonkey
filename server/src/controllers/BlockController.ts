import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const createBlock = async (req: Request, res: Response) => {
  try {
    const { name, description, subjectId } = req.body;
    if (!subjectId) return res.status(400).json({ error: 'SubjectId fehlt' });
    const block = await prisma.block.create({
      data: { name, description, subjectId }
    });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Anlegen des Blocks' });
  }
};

export const getBlocks = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) return res.status(400).json({ error: 'SubjectId fehlt' });
    const blocks = await prisma.block.findMany({
      where: { subjectId: String(subjectId) },
      orderBy: { order: 'asc' }
    });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Blöcke' });
  }
};

export const updateBlock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const block = await prisma.block.update({
      where: { id },
      data: { name, description }
    });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Blocks' });
  }
};

export const deleteBlock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.block.delete({ where: { id } });
    res.json({ message: 'Block gelöscht' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen des Blocks' });
  }
};

export const getBlock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const block = await prisma.block.findUnique({ where: { id } });
    if (!block) return res.status(404).json({ error: 'Block nicht gefunden' });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden des Blocks' });
  }
}; 