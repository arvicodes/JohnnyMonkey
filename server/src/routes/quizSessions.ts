import express from 'express';
import { 
  startQuizSession, 
  getActiveSession, 
  getSessionResults, 
  getSessionById, 
  getSessionsForQuiz,
  stopQuizSession,
  getQuizForSession
} from '../controllers/QuizSessionController';

const router = express.Router();

// Quiz session routes
router.post('/:quizId/start', startQuizSession);
router.get('/:quizId/active', getActiveSession);
router.get('/session/:sessionId', getSessionById);
router.get('/:sessionId/quiz', getQuizForSession);
router.get('/:sessionId/results', getSessionResults);
router.get('/:quizId/sessions', getSessionsForQuiz);
router.post('/:sessionId/stop', stopQuizSession);

export default router; 