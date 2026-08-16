import { Router } from 'express';
import {
  activateWochenaufgabe,
  claimWochenaufgabeVideo,
  listWochenaufgabeStates,
} from '../controllers/wochenaufgabenController';

const router = Router();

router.get('/states/:groupId', listWochenaufgabeStates);
router.put('/activate', activateWochenaufgabe);
router.post('/claim-video', claimWochenaufgabeVideo);

export default router;
