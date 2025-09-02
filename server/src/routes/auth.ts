import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();

// Debug: Log environment variables
console.log('🔍 Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
console.log('DATABASE_URL starts with postgresql:', process.env.DATABASE_URL?.startsWith('postgresql://'));

// Debug: Try to create PrismaClient
let prisma: PrismaClient;
try {
  console.log('🔧 Creating PrismaClient...');
  prisma = new PrismaClient();
  console.log('✅ PrismaClient created successfully');
} catch (error) {
  console.error('❌ Failed to create PrismaClient:', error);
  throw error;
}

// Login route
router.post('/login', async (req: Request, res: Response) => {
  const { loginCode } = req.body;
  console.log('Login attempt with code:', loginCode);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

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