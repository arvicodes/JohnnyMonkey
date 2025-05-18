import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Login route
router.post('/login', async (req: Request, res: Response) => {
  const { loginCode } = req.body;
  console.log('Login attempt with code:', loginCode);

  try {
    const user = await prisma.user.findUnique({
      where: { loginCode },
      include: {
        learningGroups: true,
      },
    });

    if (!user) {
      console.log('Invalid login code:', loginCode);
      res.status(401).json({ message: 'Ungültiger Login-Code' });
      return;
    }

    res.json({ 
      message: 'Login erfolgreich',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        groups: user.learningGroups.map(group => ({
          id: group.id,
          name: group.name
        }))
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server-Fehler' });
  }
});

export default router; 