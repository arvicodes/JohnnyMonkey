import express from 'express';
import { 
  startParticipation, 
  submitAnswers, 
  getParticipationResults, 
  getParticipationResultsForTeacher,
  getParticipationStatus,
  deleteParticipation,
  resetParticipation,
  getQuizStatistics
} from '../controllers/QuizParticipationController';

const router = express.Router();

// Quiz participation routes (student only)
router.post('/:sessionId/start', startParticipation);
router.post('/:participationId/submit', submitAnswers);
router.get('/:participationId/results', getParticipationResults);
router.get('/:sessionId/status', getParticipationStatus);

// Teacher only routes
router.post('/:participationId/results/teacher', getParticipationResultsForTeacher);
router.post('/:participationId/reset', resetParticipation);
router.delete('/:participationId', deleteParticipation);
router.post('/:sessionId/statistics', getQuizStatistics);

export default router; 