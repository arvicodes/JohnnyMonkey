import { Router } from 'express';
import { createUnit, getUnits, updateUnit, deleteUnit } from '../controllers/UnitController';

const router = Router();

// Alle Units zu einem Subject
router.get('/', getUnits);
// Neue Unit anlegen
router.post('/', createUnit);
// Unit bearbeiten
router.put('/:id', updateUnit);
// Unit löschen
router.delete('/:id', deleteUnit);

export default router; 