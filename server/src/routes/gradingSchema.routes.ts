import express from 'express';
import { createSchema, getSchemas, updateSchema, deleteSchema } from '../controllers/GradingSchemaController';

const router = express.Router();

router.post('/', createSchema);
router.get('/:groupId', getSchemas);
router.put('/:id', updateSchema);
router.delete('/:id', deleteSchema);

export default router; 