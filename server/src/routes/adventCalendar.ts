import express from 'express';
import { authenticateUser, requireTeacher } from '../middleware/auth';
import {
  getDoors,
  getDoor,
  submitAnswer,
  getDoorResults,
  getLeaderboard,
  createDoor,
  createDoorsForYear,
  fixThemeYear
} from '../controllers/AdventCalendarController';

const router = express.Router();

// Alle Routen benötigen Authentifizierung
router.use(authenticateUser);

// Öffentliche Routen (für Schüler)
router.get('/doors', getDoors);
router.get('/doors/:doorId', getDoor);
router.post('/doors/:doorId/submit', submitAnswer);
router.get('/doors/:doorId/results', getDoorResults);
router.get('/leaderboard', getLeaderboard);

// Admin/Teacher Routen (können später mit requireTeacher Middleware geschützt werden)
router.post('/doors', createDoor);
router.post('/doors/bulk', createDoorsForYear);
router.post('/fix-theme', requireTeacher, fixThemeYear);

export default router;

