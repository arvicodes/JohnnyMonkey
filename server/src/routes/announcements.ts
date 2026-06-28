import express from 'express';
import multer from 'multer';
import { AnnouncementController } from '../controllers/AnnouncementController';

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

router.get('/list', AnnouncementController.list);
router.get('/current', AnnouncementController.getCurrent);
router.get('/folder/:folderSlug/flyer', AnnouncementController.serveFlyer);
router.get('/folder/:folderSlug/flyer-design', AnnouncementController.getFlyerDesign);
router.put('/folder/:folderSlug/flyer-design', AnnouncementController.saveFlyerDesign);
router.post(
  '/folder/:folderSlug/image',
  imageUpload.single('image'),
  AnnouncementController.uploadFolderImage,
);
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
