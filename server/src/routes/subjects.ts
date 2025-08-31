import { Router } from 'express';
import { createSubject, getSubjects, updateSubject, deleteSubject, reorderSubjects, reorderBlocks, reorderUnits, reorderTopics, reorderLessons, getSubject } from '../controllers/SubjectController';
import { authenticateUser, requireTeacher } from '../middleware/auth';

const router = Router();

// Alle Fächer eines Lehrers
router.get('/', authenticateUser, requireTeacher, getSubjects);
// Neues Fach anlegen
router.post('/', authenticateUser, requireTeacher, createSubject);
// Fach bearbeiten
router.put('/:id', authenticateUser, requireTeacher, updateSubject);
// Fach löschen
router.delete('/:id', authenticateUser, requireTeacher, deleteSubject);
router.post('/reorder', authenticateUser, requireTeacher, reorderSubjects);
router.post('/blocks/reorder', authenticateUser, requireTeacher, reorderBlocks);
router.post('/units/reorder', authenticateUser, requireTeacher, reorderUnits);
router.post('/topics/reorder', authenticateUser, requireTeacher, reorderTopics);
router.post('/lessons/reorder', authenticateUser, requireTeacher, reorderLessons);
router.get('/:id', authenticateUser, getSubject);

export default router; 