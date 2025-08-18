import express from 'express';
import { 
  createGradingSchema, 
  getGradingSchemas, 
  updateGradingSchema, 
  deleteGradingSchema,
  createMSSSchema
} from '../controllers/GradingSchemaController';

const router = express.Router();

router.post('/', createGradingSchema);
router.post('/mss/:groupId', createMSSSchema); // Spezielle Route für MSS-Schema
router.get('/:groupId', getGradingSchemas);
router.put('/:id', updateGradingSchema);
router.delete('/:id', deleteGradingSchema);

export default router; 