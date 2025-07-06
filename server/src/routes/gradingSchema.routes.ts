import express from 'express';
import { createSchema, getSchemas, deleteSchema } from '../controllers/GradingSchemaController';

const router = express.Router();

router.post('/', createSchema);
router.get('/group/:groupId', getSchemas);
router.delete('/:id', deleteSchema);

export default router; 