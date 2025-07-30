import express from 'express';
import { PrismaClient } from '../generated/prisma';
import { 
  createQuiz, 
  getQuizzes, 
  getQuiz, 
  updateQuiz, 
  deleteQuiz,
  getQuizzesByTeacher 
} from '../controllers/QuizController';

const router = express.Router();
const prisma = new PrismaClient();

// Quiz CRUD operations
router.post('/create', createQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuiz);
router.put('/:id/settings', updateQuiz);
router.delete('/:id', deleteQuiz);

// Teacher-specific quiz operations
router.get('/teacher/:teacherId', getQuizzesByTeacher);

export default router; 