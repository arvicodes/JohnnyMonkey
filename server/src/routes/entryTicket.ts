import express from 'express';
import { EntryTicketController } from '../controllers/EntryTicketController';

const router = express.Router();

router.get('/current', EntryTicketController.getCurrent);
router.post('/signal', EntryTicketController.signal);

export default router;
