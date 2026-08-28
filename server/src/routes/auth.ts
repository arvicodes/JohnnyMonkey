import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findUserIdByLoginCode } from '../utils/loginCodeCrypto';

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
  let { loginCode } = req.body;
  console.log('🔐 Login attempt');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);

  try {
    if (!loginCode) {
      console.log('❌ No login code provided');
      return res.status(400).json({ message: 'Login-Code ist erforderlich' });
    }

    // Trim whitespace
    loginCode = String(loginCode).trim();
    console.log('🔐 Login code length:', loginCode.length);

    const userId = await findUserIdByLoginCode(prisma, loginCode);
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          include: {
            learningGroups: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      : null;

    if (!user) {
      console.log('❌ Invalid login code');
      return res.status(401).json({ message: 'Ungültiger Login-Code' });
    }

    console.log('✅ User found:', user.id, user.name, user.role);
    console.log('📚 Learning groups:', user.learningGroups?.length || 0);
    console.log('📚 Learning groups data:', JSON.stringify(user.learningGroups, null, 2));

    // Handle both students and teachers - students might not have learningGroups
    // Also handle case where learningGroups might be undefined or null
    let groups: Array<{id: string; name: string}> = [];
    if (user.learningGroups && Array.isArray(user.learningGroups)) {
      groups = user.learningGroups.map((group: any) => ({
        id: group.id,
        name: group.name
      }));
    }

    res.json({ 
      message: 'Login erfolgreich',
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        loginCode,
        groups: groups
      }
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    res.status(500).json({ 
      message: 'Server-Fehler',
      error: error?.message || 'Unbekannter Fehler',
      code: error?.code || 'UNKNOWN'
    });
  }
});

export default router; 