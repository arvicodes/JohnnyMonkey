import { Router } from 'express';
import { createLesson, getLessons, updateLesson, deleteLesson, getLesson } from '../controllers/LessonController';

const router = Router();

// Alle Lessons zu einem Topic
router.get('/', getLessons);
// Neue Lesson anlegen
router.post('/', createLesson);
// Lesson bearbeiten
router.put('/:id', updateLesson);
// Lesson löschen
router.delete('/:id', deleteLesson);
router.get('/:id', getLesson);

export default router; 