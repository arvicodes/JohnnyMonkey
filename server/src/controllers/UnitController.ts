import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

export const createUnit = async (req: Request, res: Response) => {
  try {
    const { name, description, blockId } = req.body;
    if (!blockId) return res.status(400).json({ error: 'BlockId fehlt' });
    const unit = await prisma.unit.create({
      data: { name, description, blockId }
    });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Anlegen der Unterrichtsreihe' });
  }
};

export const getUnits = async (req: Request, res: Response) => {
  try {
    const { blockId } = req.query;
    if (!blockId) return res.status(400).json({ error: 'BlockId fehlt' });
    const units = await prisma.unit.findMany({
      where: { blockId: String(blockId) },
      orderBy: { order: 'asc' }
    });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Unterrichtsreihen' });
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const unit = await prisma.unit.update({
      where: { id },
      data: { name, description }
    });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Unterrichtsreihe' });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.unit.delete({ where: { id } });
    res.json({ message: 'Unterrichtsreihe gelöscht' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Unterrichtsreihe' });
  }
};

export const getUnit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) return res.status(404).json({ error: 'Unit nicht gefunden' });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Unit' });
  }
}; 