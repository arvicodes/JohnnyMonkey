import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Start a quiz session (teacher only)
export const startQuizSession = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
    }

    // Check if quiz exists and belongs to teacher
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        teacherId: teacherId
      }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz nicht gefunden oder Sie haben keine Berechtigung' });
    }

    // Check if there's already an active session
    const existingSession = await prisma.quizSession.findFirst({
      where: {
        quizId: quizId,
        isActive: true
      }
    });

    if (existingSession) {
      return res.status(400).json({ error: 'Es läuft bereits eine aktive Session für dieses Quiz' });
    }

    // Create new session
    const session = await prisma.quizSession.create({
      data: {
        quizId: quizId,
        isActive: true,
        startedAt: new Date()
      },
      include: {
        participations: {
          include: {
            student: true
          }
        },
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    res.json(session);
  } catch (error) {
    console.error('Error starting quiz session:', error);
    res.status(500).json({ error: 'Fehler beim Starten der Quiz-Session' });
  }
};

// Get active session for a quiz
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    const session = await prisma.quizSession.findFirst({
      where: {
        quizId: quizId,
        isActive: true
      },
      include: {
        participations: {
          include: {
            student: true
          }
        },
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Keine aktive Session gefunden' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der aktiven Session' });
  }
};

export const getSessionById = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.quizSession.findUnique({
      where: {
        id: sessionId
      },
      include: {
        participations: {
          include: {
            student: true
          }
        },
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session nicht gefunden' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session by ID:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Session' });
  }
};

// Get all sessions for a quiz
export const getSessionsForQuiz = async (req: Request, res: Response) => {
  try {
    const { quizId } = req.params;

    const sessions = await prisma.quizSession.findMany({
      where: {
        quizId: quizId
      },
      include: {
        participations: {
          include: {
            student: true
          }
        },
        quiz: {
          include: {
            questions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(sessions);
  } catch (error) {
    console.error('Error getting sessions for quiz:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Sessions' });
  }
};

// Get session results (teacher only)
export const getSessionResults = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const teacherId = req.query.teacherId as string;

    if (!teacherId) {
      return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
    }

    const session = await prisma.quizSession.findFirst({
      where: {
        id: sessionId,
        quiz: {
          teacherId: teacherId as string
        }
      },
      include: {
        participations: {
          include: {
            student: true,
            answers: {
              include: {
                question: true
              }
            }
          }
        },
        quiz: {
          include: {
            questions: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session nicht gefunden oder Sie haben keine Berechtigung' });
    }

    res.json(session);
  } catch (error) {
    console.error('Error getting session results:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Session-Ergebnisse' });
  }
};

// Stop quiz session
export const stopQuizSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Session nicht gefunden' });
    }

    if (session.quiz.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Nur der Quiz-Ersteller kann die Session beenden' });
    }

    await prisma.quizSession.update({
      where: { id: sessionId },
      data: { 
        isActive: false,
        endedAt: new Date()
      }
    });

    res.json({ message: 'Session erfolgreich beendet' });
  } catch (error) {
    console.error('Error stopping quiz session:', error);
    res.status(500).json({ error: 'Fehler beim Beenden der Session' });
  }
}; 