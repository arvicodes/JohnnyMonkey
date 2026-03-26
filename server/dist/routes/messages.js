"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const MessageController_1 = require("../controllers/MessageController");
const router = express_1.default.Router();
// Nachricht senden (Lehrer)
router.post('/send', MessageController_1.MessageController.sendMessage);
// Mehrere Nachrichten senden (Lehrer)
router.post('/send-bulk', MessageController_1.MessageController.sendBulkMessages);
// Empfangene Nachrichten abrufen (Schüler)
router.get('/student', MessageController_1.MessageController.getStudentMessages);
// Gesendete Nachrichten abrufen (Schüler)
router.get('/student/sent', MessageController_1.MessageController.getStudentSentMessages);
// Nachricht als gelesen markieren (Schüler)
router.put('/:id/read', MessageController_1.MessageController.markAsRead);
// Anzahl ungelesener Nachrichten (Schüler)
router.get('/unread-count', MessageController_1.MessageController.getUnreadCount);
// Gesendete Nachrichten eines Lehrers
router.get('/teacher', MessageController_1.MessageController.getTeacherMessages);
// Empfangene Nachrichten eines Lehrers (von Schülern)
router.get('/teacher/received', MessageController_1.MessageController.getTeacherReceivedMessages);
// Nachricht löschen (Lehrer)
router.delete('/:id', MessageController_1.MessageController.deleteMessage);
// Nachricht an Lehrer senden (Schüler)
router.post('/send-to-teacher', MessageController_1.MessageController.sendMessageToTeacher);
exports.default = router;
//# sourceMappingURL=messages.js.map