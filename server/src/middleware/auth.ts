import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    
    if (!loginCode) {
      return res.status(401).json({ error: 'Login-Code erforderlich' });
    }
    
    const user = await prisma.user.findUnique({
      where: { loginCode: String(loginCode) },
      select: { id: true, name: true, role: true }
    });
    
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
