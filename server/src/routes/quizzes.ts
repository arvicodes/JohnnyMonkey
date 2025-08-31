import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  createQuiz, 
  getQuizzes, 
  getQuiz, 
  updateQuiz, 
  deleteQuiz,
  getQuizzesByTeacher,
  updateQuizQuestions,
  checkQuizExists,
  reloadQuizFromSource
} from '../controllers/QuizController';

const router = express.Router();
const prisma = new PrismaClient();

// Quiz CRUD operations
router.post('/create', createQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuiz);
router.put('/:id/settings', updateQuiz);
router.put('/:id/questions', updateQuizQuestions);
router.post('/:id/reload-from-source', reloadQuizFromSource);
router.delete('/:id', deleteQuiz);

// Quiz existence check
router.get('/check/exists', checkQuizExists);

// Teacher-specific quiz operations
router.get('/teacher/:teacherId', getQuizzesByTeacher);

export default router; 