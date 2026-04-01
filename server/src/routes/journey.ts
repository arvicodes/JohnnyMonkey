import express from 'express';
import { getJourney, postCare } from '../controllers/JourneyController';

const router = express.Router();

router.get('/', getJourney);
router.post('/care', postCare);

export default router;
