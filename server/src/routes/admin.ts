import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Get all database tables content
router.get('/db-content', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        learningGroups: true,
        teacherGroups: true,
      }
    });

    const learningGroups = await prisma.learningGroup.findMany({
      include: {
        teacher: true,
        students: true,
      }
    });

    res.json({
      users,
      learningGroups
    });
  } catch (error) {
    console.error('Error fetching database content:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Datenbank-Inhalte' });
  }
});

export default router; 