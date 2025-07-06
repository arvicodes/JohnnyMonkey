import { Router } from 'express';
import { createSubject, getSubjects, updateSubject, deleteSubject, reorderSubjects, reorderBlocks, reorderUnits, reorderTopics, reorderLessons } from '../controllers/SubjectController';

const router = Router();

// Alle Fächer eines Lehrers
router.get('/', getSubjects);
// Neues Fach anlegen
router.post('/', createSubject);
// Fach bearbeiten
router.put('/:id', updateSubject);
// Fach löschen
router.delete('/:id', deleteSubject);
router.post('/reorder', reorderSubjects);
router.post('/blocks/reorder', reorderBlocks);
router.post('/units/reorder', reorderUnits);
router.post('/topics/reorder', reorderTopics);
router.post('/lessons/reorder', reorderLessons);

export default router; 