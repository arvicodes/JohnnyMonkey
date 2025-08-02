import { Router, RequestHandler } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Get a single user by ID
const getUserById: RequestHandler = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        role: true,
        loginCode: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all learning groups for a teacher
const getTeacherGroups: RequestHandler = async (req, res) => {
  try {
    const groups = await prisma.learningGroup.findMany({
      where: { teacherId: req.params.id },
      include: { students: true },
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all learning groups for a student
const getStudentGroups: RequestHandler = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        learningGroups: {
          include: {
            teacher: true,
            students: true,
          },
        },
      },
    });
    res.json(user?.learningGroups || []);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/:id', getUserById);
router.get('/teacher/:id/groups', getTeacherGroups);
router.get('/student/:id/groups', getStudentGroups);

export default router; 