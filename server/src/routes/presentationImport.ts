import express from 'express';
import multer from 'multer';
import { PresentationImportController } from '../controllers/PresentationImportController';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
});

router.post('/parse-pptx', upload.single('file'), PresentationImportController.parsePptx);

export default router;
