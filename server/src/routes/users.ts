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
        loginCode: true,
        avatarEmoji: true
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

// Update user avatar emoji
const updateUserAvatarEmoji: RequestHandler = async (req, res) => {
  try {
    const { avatarEmoji } = req.body;
    
    if (!avatarEmoji) {
      return res.status(400).json({ error: 'Avatar emoji is required' });
    }
    
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { avatarEmoji },
      select: {
        id: true,
        name: true,
        role: true,
        loginCode: true,
        avatarEmoji: true
      }
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user avatar emoji:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/:id', getUserById);
router.put('/:id/avatar-emoji', updateUserAvatarEmoji);
router.get('/teacher/:id/groups', getTeacherGroups);
router.get('/student/:id/groups', getStudentGroups);

export default router; 