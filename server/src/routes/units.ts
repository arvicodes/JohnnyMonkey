import { Router } from 'express';
import { createUnit, getUnits, updateUnit, deleteUnit, getUnit } from '../controllers/UnitController';

const router = Router();

// Alle Units zu einem Subject
router.get('/', getUnits);
// Neue Unit anlegen
router.post('/', createUnit);
// Unit bearbeiten
router.put('/:id', updateUnit);
// Unit löschen
router.delete('/:id', deleteUnit);
router.get('/:id', getUnit);

export default router; 