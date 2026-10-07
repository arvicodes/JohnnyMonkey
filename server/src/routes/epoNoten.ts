import express from 'express';
import { EpoNotenController } from '../controllers/EpoNotenController';

const router = express.Router();

router.get('/list', EpoNotenController.list);
router.get('/current', EpoNotenController.getCurrent);
router.get('/variants', EpoNotenController.listVariants);
router.post('/variants', EpoNotenController.createVariant);
router.put('/variants/:variantId', EpoNotenController.saveVariant);
router.delete('/variants/:variantId', EpoNotenController.deleteVariant);
router.get('/:id', EpoNotenController.getById);
router.post('/create', EpoNotenController.create);
router.put('/:id', EpoNotenController.update);
router.post('/:id/publish', EpoNotenController.publishById);
router.post('/:id/publish-group', EpoNotenController.publishGroupById);
router.put('/:id/group-meta', EpoNotenController.patchGroupMeta);
router.post('/:id/unpublish', EpoNotenController.unpublishById);
router.put('/:id/teacher/:studentId', EpoNotenController.saveTeacherEntry);
router.post('/:id/release', EpoNotenController.releaseToStudents);
router.post('/:id/reset-all', EpoNotenController.resetAllEntries);
router.post('/:id/bulk-grade-only', EpoNotenController.bulkGradeOnlyForGroup);
router.post('/:id/bulk-goals-waived', EpoNotenController.bulkGoalsWaivedForGroup);
router.post('/:id/integrate-grading-schema', EpoNotenController.integrateGradingSchema);
router.post('/submit-self', EpoNotenController.submitSelf);
router.post('/submit-goals', EpoNotenController.submitGoals);
router.delete('/:id', EpoNotenController.remove);

export default router;
