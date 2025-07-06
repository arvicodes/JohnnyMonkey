import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Get all learning groups for a teacher
router.get('/teacher/:id', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      where: { teacherId: req.params.id },
      include: { students: true }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all learning groups for a student
router.get('/student/:id', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      where: {
        students: {
          some: {
            id: req.params.id
          }
        }
      },
      include: {
        teacher: true,
        students: true
      }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get a single learning group by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await prisma.learningGroup.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: true,
        students: true
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching learning group:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new learning group
router.post('/', async (req: Request, res: Response) => {
  const { name, teacherId } = req.body;
  try {
    const group = await prisma.learningGroup.create({
      data: {
        name,
        teacher: {
          connect: { id: teacherId }
        }
      },
      include: { students: true }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add students to a learning group
router.post('/:id/students', async (req: Request, res: Response) => {
  const { studentIds } = req.body;
  try {
    const group = await prisma.learningGroup.update({
      where: { id: req.params.id },
      data: {
        students: {
          connect: studentIds.map((id: string) => ({ id }))
        }
      },
      include: { students: true }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a student from a learning group
router.delete('/:groupId/students/:studentId', async (req: Request, res: Response) => {
  try {
    const group = await prisma.learningGroup.update({
      where: { id: req.params.groupId },
      data: {
        students: {
          disconnect: { id: req.params.studentId }
        }
      },
      include: { students: true }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all available students (not in the specific group)
router.get('/:groupId/available-students', async (req: Request, res: Response) => {
  const { groupId } = req.params;

  try {
    // Get the current group's students
    const currentGroup = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      include: { students: true }
    });

    if (!currentGroup) {
      return res.status(404).json({ message: 'Lerngruppe nicht gefunden' });
    }

    // Get all students not in this group
    const availableStudents = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        AND: {
          id: {
            notIn: currentGroup.students.map(student => student.id)
          }
        }
      }
    });

    res.json(availableStudents);
  } catch (error) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der verfügbaren Schüler' });
  }
});

export default router; 