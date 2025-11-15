import express from 'express';
import { authenticateUser } from '../middleware/auth';
import {
  getDoors,
  getDoor,
  submitAnswer,
  getDoorResults,
  createDoor,
  createDoorsForYear
} from '../controllers/AdventCalendarController';

const router = express.Router();

// Alle Routen benötigen Authentifizierung
router.use(authenticateUser);

// Öffentliche Routen (für Schüler)
router.get('/doors', getDoors);
router.get('/doors/:doorId', getDoor);
router.post('/doors/:doorId/submit', submitAnswer);
router.get('/doors/:doorId/results', getDoorResults);

// Admin/Teacher Routen (können später mit requireTeacher Middleware geschützt werden)
router.post('/doors', createDoor);
router.post('/doors/bulk', createDoorsForYear);

export default router;

