import express from 'express';
import { 
  createGradingSchema, 
  getGradingSchemas, 
  updateGradingSchema, 
  deleteGradingSchema,
  createMSSSchema,
  getAllSchemas
} from '../controllers/GradingSchemaController';

const router = express.Router();

router.post('/', createGradingSchema);
router.post('/mss/:groupId', createMSSSchema); // Spezielle Route für MSS-Schema
router.get('/all', getAllSchemas); // Route für alle Schemata
router.get('/:groupId', getGradingSchemas);
router.put('/:id', updateGradingSchema);
router.delete('/:id', deleteGradingSchema);

export default router; 