import express from 'express';
import { EntryTicketController } from '../controllers/EntryTicketController';

const router = express.Router();

router.get('/current', EntryTicketController.getCurrent);
router.get('/completed', EntryTicketController.getCompleted);
router.get('/completed-list', EntryTicketController.getCompletedList);
router.get('/history', EntryTicketController.getHistory);
router.get('/custom-sets', EntryTicketController.getCustomSets);
router.put('/custom-sets', EntryTicketController.saveCustomSets);
router.post('/signal', EntryTicketController.signal);
router.post('/complete', EntryTicketController.complete);

export default router;
