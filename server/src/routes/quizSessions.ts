import express from 'express';
import { 
  startQuizSession, 
  getActiveSession, 
  getSessionById,
  getSessionResults,
  getSessionsForQuiz
} from '../controllers/QuizSessionController';

const router = express.Router();

// Quiz session management (teacher only)
router.post('/:quizId/start', startQuizSession);
router.get('/:quizId/active', getActiveSession);
router.get('/session/:sessionId', getSessionById);
router.get('/:quizId/sessions', getSessionsForQuiz);
router.get('/:sessionId/results', getSessionResults);

export default router; 