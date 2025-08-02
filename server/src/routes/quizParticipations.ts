import express from 'express';
import { 
  startParticipation, 
  submitAnswers, 
  getParticipationResults, 
  getParticipationStatus,
  deleteParticipation
} from '../controllers/QuizParticipationController';

const router = express.Router();

// Quiz participation routes (student only)
router.post('/:sessionId/start', startParticipation);
router.post('/:participationId/submit', submitAnswers);
router.get('/:participationId/results', getParticipationResults);
router.get('/:sessionId/status', getParticipationStatus);

// Teacher only route
router.delete('/:participationId', deleteParticipation);

export default router; 