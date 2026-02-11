import express from 'express';
import { MessageController } from '../controllers/MessageController';

const router = express.Router();

// Nachricht senden (Lehrer)
router.post('/send', MessageController.sendMessage);

// Mehrere Nachrichten senden (Lehrer)
router.post('/send-bulk', MessageController.sendBulkMessages);

// Nachrichten abrufen (Schüler)
router.get('/student', MessageController.getStudentMessages);

// Nachricht als gelesen markieren (Schüler)
router.put('/:id/read', MessageController.markAsRead);

// Anzahl ungelesener Nachrichten (Schüler)
router.get('/unread-count', MessageController.getUnreadCount);

// Gesendete Nachrichten eines Lehrers
router.get('/teacher', MessageController.getTeacherMessages);

// Empfangene Nachrichten eines Lehrers (von Schülern)
router.get('/teacher/received', MessageController.getTeacherReceivedMessages);

// Nachricht löschen (Lehrer)
router.delete('/:id', MessageController.deleteMessage);

// Nachricht an Lehrer senden (Schüler)
router.post('/send-to-teacher', MessageController.sendMessageToTeacher);

export default router;

