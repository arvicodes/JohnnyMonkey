import express from 'express';
import { ExcursionProtocolController } from '../controllers/ExcursionProtocolController';

const router = express.Router();

router.get('/list', ExcursionProtocolController.list);
router.get('/current', ExcursionProtocolController.getCurrent);
router.post('/create', ExcursionProtocolController.create);
router.put('/:id', ExcursionProtocolController.update);
router.post('/:id/publish', ExcursionProtocolController.publishById);
router.delete('/:id', ExcursionProtocolController.remove);
router.post('/publish', ExcursionProtocolController.publish);
router.post('/submit', ExcursionProtocolController.submit);
router.get('/submissions', ExcursionProtocolController.getSubmissions);

export default router;
