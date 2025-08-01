import express from 'express';
import { PrismaClient } from '../generated/prisma';
import { assignQuizToLesson, getLessonQuiz, getAvailableQuizzes, removeQuizFromLesson } from '../controllers/LessonQuizController';

const router = express.Router();
const prisma = new PrismaClient();

// Lesson-Quiz assignment operations
router.post('/assign', assignQuizToLesson);
router.get('/lesson/:lessonId', getLessonQuiz);
router.get('/available/:teacherId', getAvailableQuizzes);
router.delete('/lesson/:lessonId', removeQuizFromLesson);

export default router; 