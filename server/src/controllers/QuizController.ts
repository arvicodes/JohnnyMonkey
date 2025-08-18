import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { parseWordFile } from '../utils/wordParser';
import path from 'path';

const prisma = new PrismaClient();

export const createQuiz = async (req: Request, res: Response) => {
  try {
    const { teacherId, sourceFile, title, description, timeLimit, shuffleQuestions, shuffleAnswers, gradeCategory } = req.body;
    
    if (!teacherId || !sourceFile || !title) {
      return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Titel sind erforderlich' });
    }

    console.log('Creating quiz with data:', {
      teacherId,
      sourceFile,
      title,
      description,
      timeLimit,
      shuffleQuestions,
      shuffleAnswers,
      gradeCategory
    });

    // Parse the Word file to extract questions
    console.log('Parsing Word file for quiz creation:', sourceFile);
    
    // The wordParser can now handle absolute paths directly
    let filePath = sourceFile;
    console.log('Using file path for parsing:', filePath);
    
    let parsedQuestions;
    try {
      parsedQuestions = await parseWordFile(filePath);
      console.log('Parsed questions result:', parsedQuestions);
    } catch (parseError) {
      console.error('Error parsing Word file:', parseError);
      return res.status(400).json({ 
        error: `Fehler beim Parsen der Word-Datei: ${parseError instanceof Error ? parseError.message : String(parseError)}` 
      });
    }
    
    if (!parsedQuestions || parsedQuestions.length === 0) {
      return res.status(400).json({ error: 'Keine Fragen in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
    }

    console.log(`Found ${parsedQuestions.length} questions, creating quiz...`);

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
            tip: q.tip || '',
            explanation: q.explanation || '',
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
    res.status(500).json({ 
      error: 'Fehler beim Erstellen des Quiz',
      details: error instanceof Error ? error.message : String(error)
    });
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

export const updateQuizQuestions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Fragen sind erforderlich und müssen ein Array sein' });
    }

    // Alle bestehenden Fragen für dieses Quiz löschen
    await prisma.quizQuestion.deleteMany({
      where: { quizId: id }
    });

    // Neue Fragen erstellen
    const createdQuestions = await prisma.quizQuestion.createMany({
      data: questions.map((q: any, index: number) => ({
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: JSON.stringify(q.options),
        order: index + 1,
        quizId: id
      }))
    });

    // Aktualisiertes Quiz mit Fragen zurückgeben
    const updatedQuiz = await prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    });

    if (!updatedQuiz) {
      return res.status(404).json({ error: 'Quiz nicht gefunden' });
    }

    // Deserialize options for each question
    const quizWithParsedOptions = {
      ...updatedQuiz,
      questions: updatedQuiz.questions.map(q => ({
        ...q,
        options: JSON.parse(q.options)
      }))
    };
    
    res.json(quizWithParsedOptions);
  } catch (error) {
    console.error('Error updating quiz questions:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Quiz-Fragen' });
  }
}; 