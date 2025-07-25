import { Router, Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const router = Router();
const prisma = new PrismaClient();

// Get all database content
router.get('/db-content', async (req: Request, res: Response) => {
  try {
    const [users, learningGroups, subjects] = await Promise.all([
      prisma.user.findMany({
        include: {
          learningGroups: true,
          teacherGroups: true
        }
      }),
      prisma.learningGroup.findMany({
        include: {
          teacher: true,
          students: true
        }
      }),
      prisma.subject.findMany({
        include: {
          teacher: true,
          blocks: {
            include: {
              units: {
                include: {
                  topics: {
                    include: {
                      lessons: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    ]);

    res.json({ users, learningGroups, subjects });
  } catch (error) {
    console.error('Error fetching database content:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router; 