import { Router } from 'express';
import { createBlock, getBlocks, updateBlock, deleteBlock, getBlock } from '../controllers/BlockController';

const router = Router();

// Alle Blocks zu einem Subject
router.get('/', getBlocks);
// Neuen Block anlegen
router.post('/', createBlock);
// Block bearbeiten
router.put('/:id', updateBlock);
// Block löschen
router.delete('/:id', deleteBlock);
// Block per ID holen
router.get('/:id', getBlock);

export default router; 