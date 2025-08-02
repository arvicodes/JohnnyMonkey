import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

// Start participation in a quiz session (student only)
export const startParticipation = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { studentId } = req.body;

    // Check if session is active
    const session = await prisma.quizSession.findFirst({
      where: {
        id: sessionId,
        isActive: true
      },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Keine aktive Quiz-Session gefunden' });
    }

    // Check if student already participated
    const existingParticipation = await prisma.quizParticipation.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: sessionId,
          studentId: studentId
        }
      }
    });

    if (existingParticipation) {
      return res.status(400).json({ error: 'Sie haben bereits an diesem Quiz teilgenommen' });
    }

    // Create participation
    const participation = await prisma.quizParticipation.create({
      data: {
        sessionId: sessionId,
        studentId: studentId,
        startedAt: new Date(),
        maxScore: session.quiz.questions.length
      },
      include: {
        session: {
          include: {
            quiz: {
              include: {
                questions: {
                  orderBy: {
                    order: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    });

    // Prepare quiz data for student (without correct answers)
    const quizForStudent = {
      ...participation.session.quiz,
      questions: participation.session.quiz.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        order: q.order
      }))
    };

    res.json({
      participation: {
        id: participation.id,
        startedAt: participation.startedAt,
        maxScore: participation.maxScore
      },
      quiz: quizForStudent
    });
  } catch (error) {
    console.error('Error starting participation:', error);
    res.status(500).json({ error: 'Fehler beim Starten der Quiz-Teilnahme' });
  }
};

// Submit quiz answers (student only)
export const submitAnswers = async (req: Request, res: Response) => {
  try {
    const { participationId } = req.params;
    const { answers } = req.body; // Array of { questionId, selectedAnswer }

    // Get participation and quiz data
    const participation = await prisma.quizParticipation.findUnique({
      where: { id: participationId },
      include: {
        session: {
          include: {
            quiz: {
              include: {
                questions: true
              }
            }
          }
        }
      }
    });

    if (!participation) {
      return res.status(404).json({ error: 'Teilnahme nicht gefunden' });
    }

    if (participation.completedAt) {
      return res.status(400).json({ error: 'Quiz bereits abgeschlossen' });
    }

    // Calculate score and create answers
    let totalScore = 0;
    const answerRecords = [];

    // Convert answers object to array format
    const answersArray = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
      questionId,
      selectedAnswer: selectedAnswer as string
    }));

    for (const answer of answersArray) {
      const question = participation.session.quiz.questions.find((q: any) => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      const points = isCorrect ? 1 : 0;
      totalScore += points;

      answerRecords.push({
        participationId: participationId,
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: isCorrect,
        points: points
      });
    }

    // Create all answers in a transaction
    await prisma.$transaction([
      ...answerRecords.map(answer => 
        prisma.quizAnswer.create({ data: answer })
      ),
      prisma.quizParticipation.update({
        where: { id: participationId },
        data: {
          completedAt: new Date(),
          score: totalScore
        }
      })
    ]);

    // Get updated participation with answers
    const updatedParticipation = await prisma.quizParticipation.findUnique({
      where: { id: participationId },
      include: {
        answers: {
          include: {
            question: true
          }
        }
      }
    });

    res.json({
      participation: updatedParticipation,
      score: totalScore,
      maxScore: participation.maxScore,
      percentage: participation.maxScore ? Math.round((totalScore / participation.maxScore) * 100) : 0
    });
  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(500).json({ error: 'Fehler beim Einreichen der Antworten' });
  }
};

// Get participation results (student only)
export const getParticipationResults = async (req: Request, res: Response) => {
  try {
    const { participationId } = req.params;
    const studentId = req.query.studentId as string;

    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    const participation = await prisma.quizParticipation.findFirst({
      where: {
        id: participationId,
        studentId: studentId
      },
      include: {
        answers: {
          include: {
            question: true
          }
        },
        session: {
          include: {
            quiz: {
              include: {
                questions: true
              }
            }
          }
        }
      }
    });

    if (!participation) {
      return res.status(404).json({ error: 'Teilnahme nicht gefunden' });
    }

    if (!participation.completedAt) {
      return res.status(400).json({ error: 'Quiz noch nicht abgeschlossen' });
    }

    // Prepare results with correct answers
    const results = {
      participation: {
        id: participation.id,
        score: participation.score,
        maxScore: participation.maxScore,
        percentage: participation.maxScore && participation.score ? Math.round((participation.score / participation.maxScore) * 100) : 0,
        startedAt: participation.startedAt,
        completedAt: participation.completedAt
      },
      answers: participation.answers.map((answer: any) => ({
        question: answer.question.question,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: answer.question.correctAnswer,
        isCorrect: answer.isCorrect,
        points: answer.points
      }))
    };

    res.json(results);
  } catch (error) {
    console.error('Error getting participation results:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Teilnahme-Ergebnisse' });
  }
};

// Get student's participation status
export const getParticipationStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.query.studentId as string;

    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    const participation = await prisma.quizParticipation.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: sessionId,
          studentId: studentId
        }
      }
    });

    if (!participation) {
      return res.json({ hasParticipated: false });
    }

    res.json({
      hasParticipated: true,
      isCompleted: !!participation.completedAt,
      participationId: participation.id,
      score: participation.score,
      maxScore: participation.maxScore,
      startedAt: participation.startedAt,
      completedAt: participation.completedAt
    });
  } catch (error) {
    console.error('Error getting participation status:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Teilnahme-Status' });
  }
};

// Delete student's participation (teacher only)
export const deleteParticipation = async (req: Request, res: Response) => {
  try {
    const { participationId } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
    }

    // Verify the participation belongs to a session owned by the teacher
    const participation = await prisma.quizParticipation.findFirst({
      where: {
        id: participationId,
        session: {
          quiz: {
            teacherId: teacherId
          }
        }
      },
      include: {
        session: {
          include: {
            quiz: true
          }
        }
      }
    });

    if (!participation) {
      return res.status(404).json({ error: 'Teilnahme nicht gefunden oder Sie haben keine Berechtigung' });
    }

    // Delete all answers first, then the participation
    await prisma.$transaction([
      prisma.quizAnswer.deleteMany({
        where: {
          participationId: participationId
        }
      }),
      prisma.quizParticipation.delete({
        where: {
          id: participationId
        }
      })
    ]);

    res.json({ 
      message: 'Teilnahme erfolgreich gelöscht',
      studentId: participation.studentId,
      sessionId: participation.sessionId
    });
  } catch (error) {
    console.error('Error deleting participation:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Teilnahme' });
  }
}; 