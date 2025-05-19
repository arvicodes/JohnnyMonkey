import { Router } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Get learning groups for a teacher (including students)
router.get('/teacher/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const teacherGroups = await prisma.learningGroup.findMany({
      where: {
        teacherId: userId
      },
      include: {
        students: {
          select: {
            id: true,
            name: true,
            loginCode: true
          }
        }
      }
    });

    res.json(teacherGroups);
  } catch (error) {
    console.error('Error fetching teacher groups:', error);
    res.status(500).json({ error: 'Failed to fetch learning groups' });
  }
});

// Get learning groups for a student
router.get('/student/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const studentGroups = await prisma.learningGroup.findMany({
      where: {
        students: {
          some: {
            id: userId
          }
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json(studentGroups);
  } catch (error) {
    console.error('Error fetching student groups:', error);
    res.status(500).json({ error: 'Failed to fetch learning groups' });
  }
});

export default router; 