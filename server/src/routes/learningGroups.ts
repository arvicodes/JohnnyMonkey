import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all learning groups (for testing purposes)
router.get('/', async (req: Request, res: Response) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// WICHTIG: Spezifische Routen müssen VOR den allgemeinen Routen kommen!
// Get all learning groups for a teacher
router.get('/teacher/:id', async (req: Request, res: Response) => {
  try {
    console.log('📚 Fetching groups for teacher:', req.params.id);
    const groups = await prisma.learningGroup.findMany({
      where: { teacherId: req.params.id },
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
    });
    console.log('✅ Found', groups.length, 'groups for teacher');
    res.json(groups);
  } catch (error: any) {
    console.error('❌ Error fetching teacher groups:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Get all learning groups for a student
// WICHTIG: Diese Route muss VOR der /:id Route kommen!
router.get('/student/:id', async (req: Request, res: Response) => {
  try {
    console.log('👤 Fetching groups for student:', req.params.id);
    const groups = await prisma.learningGroup.findMany({
      where: {
        students: {
          some: {
            id: req.params.id
          }
        }
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        },
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
    });
    console.log('✅ Found', groups.length, 'groups for student');
    res.json(groups);
  } catch (error: any) {
    console.error('❌ Error fetching student groups:', error);
    console.error('Error stack:', error?.stack);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// WICHTIG: Alle spezifischen Routen müssen VOR der allgemeinen /:id Route kommen!
// Get available students for a group (before /:id)
router.get('/:groupId/available-students', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId },
      include: { students: { select: { id: true } } }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }
    
    const studentIdsInGroup = new Set(group.students.map(s => s.id));
    const allStudents = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        loginCode: true,
        avatarEmoji: true
      },
      orderBy: { loginCode: 'asc' }
    });
    
    const availableStudents = allStudents.filter(s => !studentIdsInGroup.has(s.id));
    res.json(availableStudents);
  } catch (error: any) {
    console.error('Error fetching available students:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Get assignments for a group (before /:id)
router.get('/:groupId/assignments', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const assignments = await prisma.groupAssignment.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(assignments);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Get a single learning group by ID (MUST BE LAST among GET routes with :id)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const group = await prisma.learningGroup.findUnique({
      where: { id: req.params.id },
      include: {
        teacher: {
          select: {
            id: true,
            name: true
          }
        },
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Lerngruppe nicht gefunden' });
    }

    res.json(group);
  } catch (error: any) {
    console.error('Error fetching learning group:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Update a learning group
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    const group = await prisma.learningGroup.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
      include: {
        teacher: true,
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
    });

    res.json(group);
  } catch (error) {
    console.error('Error updating learning group:', error);
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
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
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
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
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
      include: { 
        students: {
          orderBy: { loginCode: 'asc' },
          select: {
            id: true,
            name: true,
            loginCode: true,
            avatarEmoji: true
          }
        }
      }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Zuordnung von Inhalten zu Lerngruppen
router.post('/:groupId/assign', async (req: Request, res: Response) => {
  const { type, refId } = req.body;
  try {
    const assignment = await prisma.groupAssignment.create({
      data: {
        groupId: req.params.groupId,
        type,
        refId,
      },
    });
    res.json(assignment);
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

router.delete('/:groupId/assign', async (req: Request, res: Response) => {
  const { type, refId } = req.body;
  try {
    const deleted = await prisma.groupAssignment.deleteMany({
      where: {
        groupId: req.params.groupId,
        type,
        refId,
      },
    });
    res.json({ deleted: deleted.count });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ 
      error: 'Server error',
      message: error?.message || 'Unbekannter Fehler'
    });
  }
});

// Delete a learning group by ID
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Zuerst alle zugehörigen GroupAssignments löschen
    await prisma.groupAssignment.deleteMany({ where: { groupId: req.params.id } });
    // Dann alle zugehörigen GradingSchemas löschen
    await prisma.gradingSchema.deleteMany({ where: { groupId: req.params.id } });
    // Jetzt die Lerngruppe selbst löschen
    await prisma.learningGroup.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get assigned folders for a learning group
router.get('/:id/folders', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    
    const assignments = await prisma.groupAssignment.findMany({
      where: { 
        groupId: groupId,
        type: 'FOLDER'
      },
      select: {
        refId: true
      }
    });

    // Convert refId to folder paths
    const folders = assignments.map(assignment => ({
      path: assignment.refId
    }));

    res.json(folders);
  } catch (error) {
    console.error('Error fetching assigned folders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign a folder to a learning group
router.post('/:id/folders', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ error: 'Pfad ist erforderlich' });
    }

    // Check if folder is already assigned
    const existingAssignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: groupId,
        type: 'FOLDER',
        refId: path
      }
    });

    if (existingAssignment) {
      return res.status(400).json({ error: 'Ordner ist bereits zugeordnet' });
    }

    // Create new assignment
    const assignment = await prisma.groupAssignment.create({
      data: {
        groupId: groupId,
        type: 'FOLDER',
        refId: path
      }
    });

    res.json(assignment);
  } catch (error) {
    console.error('Error assigning folder:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove a folder assignment from a learning group
router.delete('/:id/folders/:path(*)', async (req: Request, res: Response) => {
  try {
    const groupId = req.params.id;
    const folderPath = req.params.path;
    
    // Find and delete the assignment
    const assignment = await prisma.groupAssignment.findFirst({
      where: {
        groupId: groupId,
        type: 'FOLDER',
        refId: folderPath
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Ordner-Zuordnung nicht gefunden' });
    }

    await prisma.groupAssignment.delete({
      where: { id: assignment.id }
    });

    res.json({ message: 'Ordner-Zuordnung erfolgreich entfernt' });
  } catch (error) {
    console.error('Error removing folder assignment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 