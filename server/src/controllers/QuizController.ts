import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { parseWordFile } from '../utils/wordParser';

const prisma = new PrismaClient();

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { teacherId, sourceFile, title, description, timeLimit, shuffleQuestions, shuffleAnswers, gradeCategory } = req.body;
    
    if (!teacherId || !sourceFile || !title) {
      return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Titel sind erforderlich' });
    }

    // Parse the Word file to extract questions
    console.log('Parsing Word file for quiz creation:', sourceFile);
    const parsedQuestions = await parseWordFile(sourceFile);
    
    if (parsedQuestions.length === 0) {
      return res.status(400).json({ error: 'Keine Fragen in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
    }

    // Create the quiz with questions
    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description || '',
        sourceFile,
        timeLimit: timeLimit || 30,
        shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : true,
        shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : true,
        teacherId,
        gradeCategory: gradeCategory || null,
        questions: {
          create: parsedQuestions.map((q, index) => ({
            question: q.question,
            correctAnswer: q.correctAnswer,
            options: JSON.stringify(q.options),
            order: index + 1
          }))
        }
      },
      include: {
        questions: true
      }
    });

    console.log(`Quiz created successfully with ${parsedQuestions.length} questions`);
    res.json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Quiz' });
  }
};

export const getQuizzes = async (req: Request, res: Response) => {
  try {
    const quizzes = await prisma.quiz.findMany({
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    // Deserialize options for each question
    const quizzesWithParsedOptions = quizzes.map(quiz => ({
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }))
    }));
    
    res.json(quizzesWithParsedOptions);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Quizzes' });
  }
};

export const getQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz nicht gefunden' });
    }
    
    // Deserialize options for each question
    const quizWithParsedOptions = {
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }))
    };
    
    res.json(quizWithParsedOptions);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Quiz' });
  }
};

export const updateQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, timeLimit, shuffleQuestions, shuffleAnswers } = req.body;
    
    const quiz = await prisma.quiz.update({
      where: { id },
      data: {
        title,
        description,
        timeLimit,
        shuffleQuestions,
        shuffleAnswers
      },
      include: {
        questions: true
      }
    });
    
    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Quiz' });
  }
};

export const deleteQuiz = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.quiz.delete({
      where: { id }
    });
    
    res.json({ message: 'Quiz erfolgreich gelöscht' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Quiz' });
  }
};

export const getQuizzesByTeacher = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    
    const quizzes = await prisma.quiz.findMany({
      where: { teacherId },
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });
    
    // Deserialize options for each question
    const quizzesWithParsedOptions = quizzes.map(quiz => ({
      ...quiz,
      questions: quiz.questions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }))
    }));
    
    res.json(quizzesWithParsedOptions);
  } catch (error) {
    console.error('Error fetching teacher quizzes:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Lehrer-Quizzes' });
  }
}; 