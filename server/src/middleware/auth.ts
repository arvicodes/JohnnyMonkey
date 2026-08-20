import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type AuthUser = { id: string; name: string; role: string };

async function findUserByLoginCode(raw: unknown): Promise<AuthUser | null> {
  const loginCode = String(raw ?? '').trim();
  if (!loginCode) return null;
  const exact = await prisma.user.findUnique({
    where: { loginCode },
    select: { id: true, name: true, role: true },
  });
  if (exact) return exact;
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM User WHERE lower(loginCode) = lower(${loginCode}) LIMIT 1`,
  );
  const id = rows[0]?.id;
  if (!id) return null;
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true },
  });
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        role: string;
      };
    }
  }
}

// Authentication middleware
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loginCode = req.headers['x-login-code'] || req.query.loginCode || req.body.loginCode;
    if (!String(loginCode ?? '').trim()) {
      return res.status(401).json({ error: 'Login-Code erforderlich' });
    }

    const user = await findUserByLoginCode(loginCode);
    if (!user) {
      return res.status(401).json({ error: 'Ungültiger Login-Code' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentifizierungsfehler' });
  }
};

// Teacher role middleware
export const requireTeacher = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  
  if (req.user.role !== 'TEACHER') {
    return res.status(403).json({ error: 'Nur Lehrer haben Zugriff' });
  }
  
  next();
};

// Student role middleware
export const requireStudent = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  
  if (req.user.role !== 'STUDENT') {
    return res.status(403).json({ error: 'Nur Schüler haben Zugriff' });
  }
  
  next();
};
