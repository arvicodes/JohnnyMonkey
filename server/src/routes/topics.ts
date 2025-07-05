import { Router } from 'express';
import { createTopic, getTopics, updateTopic, deleteTopic } from '../controllers/TopicController';

const router = Router();

// Alle Topics zu einer Unit
router.get('/', getTopics);
// Neues Topic anlegen
router.post('/', createTopic);
// Topic bearbeiten
router.put('/:id', updateTopic);
// Topic löschen
router.delete('/:id', deleteTopic);

export default router; 