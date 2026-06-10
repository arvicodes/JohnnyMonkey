import express from 'express';
import { AnnouncementController } from '../controllers/AnnouncementController';

const router = express.Router();

router.get('/list', AnnouncementController.list);
router.get('/current', AnnouncementController.getCurrent);
router.post('/create', AnnouncementController.create);
router.post('/folder/create', AnnouncementController.createFolder);
router.put('/folder/:folderSlug', AnnouncementController.updateFolder);
router.post('/folder/:folderSlug/publish', AnnouncementController.publishFolder);
router.delete('/folder/:folderSlug', AnnouncementController.removeFolder);
router.put('/:id', AnnouncementController.update);
router.post('/:id/publish', AnnouncementController.publishById);
router.delete('/:id', AnnouncementController.remove);
router.post('/read', AnnouncementController.markRead);

export default router;
