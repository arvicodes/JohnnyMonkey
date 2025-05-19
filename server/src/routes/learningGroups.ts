import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Get all learning groups for a teacher
router.get('/teacher/:teacherId', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      where: { teacherId: req.params.teacherId },
      include: {
        students: true,
        teacher: true,
      },
    });
    res.json(groups);
  } catch (error) {
    console.error('Error fetching teacher groups:', error);
    res.status(500).json({ message: 'Server-Fehler beim Laden der Lerngruppen' });
  }
});

// Create a new learning group
router.post('/', async (req: Request, res: Response) => {
  const { name, teacherId } = req.body;
  
  try {
    const newGroup = await prisma.learningGroup.create({
      data: {
        name,
        teacher: {
          connect: { id: teacherId }
        }
      },
      include: {
        teacher: true,
        students: true
      }
    });
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating learning group:', error);
    res.status(500).json({ message: 'Server-Fehler beim Erstellen der Lerngruppe' });
  }
});

// Add students to a learning group
router.post('/:groupId/students', async (req: Request, res: Response) => {
  const { studentIds } = req.body;
  const { groupId } = req.params;

  try {
    const updatedGroup = await prisma.learningGroup.update({
      where: { id: groupId },
      data: {
        students: {
          connect: studentIds.map((id: string) => ({ id }))
        }
      },
      include: {
        students: true,
        teacher: true
      }
    });
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error adding students to group:', error);
    res.status(500).json({ message: 'Server-Fehler beim Hinzufügen der Schüler' });
  }
});

// Remove a student from a learning group
router.delete('/:groupId/students/:studentId', async (req: Request, res: Response) => {
  const { groupId, studentId } = req.params;

  try {
    const updatedGroup = await prisma.learningGroup.update({
      where: { id: groupId },
      data: {
        students: {
          disconnect: { id: studentId }
        }
      },
      include: {
        students: true,
        teacher: true
      }
    });
    res.json(updatedGroup);
  } catch (error) {
    console.error('Error removing student from group:', error);
    res.status(500).json({ message: 'Server-Fehler beim Entfernen des Schülers' });
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