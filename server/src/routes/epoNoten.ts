import express from 'express';
import { EpoNotenController } from '../controllers/EpoNotenController';

const router = express.Router();

router.get('/list', EpoNotenController.list);
router.get('/current', EpoNotenController.getCurrent);
router.get('/:id', EpoNotenController.getById);
router.post('/create', EpoNotenController.create);
router.put('/:id', EpoNotenController.update);
router.post('/:id/publish', EpoNotenController.publishById);
router.post('/:id/unpublish', EpoNotenController.unpublishById);
router.put('/:id/teacher/:studentId', EpoNotenController.saveTeacherEntry);
router.post('/:id/release', EpoNotenController.releaseToStudents);
router.post('/submit-self', EpoNotenController.submitSelf);
router.post('/submit-goals', EpoNotenController.submitGoals);
router.delete('/:id', EpoNotenController.remove);

export default router;
