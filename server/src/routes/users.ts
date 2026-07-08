import { Router, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, requireTeacher } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get all users (for teachers only)
const getAllUsers: RequestHandler = async (req, res) => {
  try {
    // User is already authenticated and verified as teacher by middleware
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        loginCode: true,
        avatarEmoji: true,
        profileColor: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user (myself)
const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    // req.user is set by authenticateUser middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        role: true,
        loginCode: true,
        avatarEmoji: true,
        profileColor: true
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
        avatarEmoji: true,
        profileColor: true
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
        avatarEmoji: true,
        profileColor: true,
      }
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error updating user avatar emoji:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProfileAppearance: RequestHandler = async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Nur das eigene Profil kann bearbeitet werden' });
    }

    const { avatarEmoji, profileColor } = req.body as {
      avatarEmoji?: string;
      profileColor?: string | null;
    };

    const data: { avatarEmoji?: string; profileColor?: string | null } = {};
    if (typeof avatarEmoji === 'string' && avatarEmoji.trim()) {
      data.avatarEmoji = avatarEmoji.trim();
    }
    if (profileColor === null || profileColor === '') {
      data.profileColor = null;
    } else if (typeof profileColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(profileColor.trim())) {
      data.profileColor = profileColor.trim();
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Profildaten' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: {
        id: true,
        name: true,
        role: true,
        loginCode: true,
        avatarEmoji: true,
        profileColor: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error('Error updating profile appearance:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/', authenticateUser, requireTeacher, getAllUsers);
router.get('/me', authenticateUser, getCurrentUser);
router.get('/:id', authenticateUser, getUserById);
router.put('/:id/avatar-emoji', authenticateUser, updateUserAvatarEmoji);
router.put('/:id/profile-appearance', authenticateUser, updateProfileAppearance);
router.get('/teacher/:id/groups', authenticateUser, requireTeacher, getTeacherGroups);
router.get('/student/:id/groups', authenticateUser, getStudentGroups);

export default router; 