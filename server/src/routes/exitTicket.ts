import express from 'express';
import { ExitTicketController } from '../controllers/ExitTicketController';

const router = express.Router();

router.get('/current', ExitTicketController.getCurrent);
router.post('/publish', ExitTicketController.publish);
router.post('/submit', ExitTicketController.submit);
router.get('/responses', ExitTicketController.getResponses);

export default router;

