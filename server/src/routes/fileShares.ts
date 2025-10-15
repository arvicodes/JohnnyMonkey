import express from 'express';
import {
  toggleFileShare,
  getSharedFilesForGroup,
  checkFileShare,
  batchCheckFileShares
} from '../controllers/fileSharesController';

const router = express.Router();

// Toggle file share (add or remove)
router.post('/toggle', toggleFileShare);

// Get all shared files for a group
router.get('/group/:groupId', getSharedFilesForGroup);

// Check if a specific file is shared with a group
router.get('/check', checkFileShare);

// Batch check file shares
router.post('/batch-check', batchCheckFileShares);

export default router;

