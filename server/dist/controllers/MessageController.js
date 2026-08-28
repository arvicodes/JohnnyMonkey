"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageController = void 0;
const client_1 = require("@prisma/client");
const loginCodeCrypto_1 = require("../utils/loginCodeCrypto");
const prisma = new client_1.PrismaClient();
class MessageController {
    /**
     * Nachricht an einen Schüler senden (Lehrer)
     */
    static async sendMessage(req, res) {
        try {
            const { studentId, subject, content } = req.body;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können Nachrichten senden' });
            }
            if (!studentId || !subject || !content) {
                return res.status(400).json({ error: 'studentId, subject und content sind erforderlich' });
            }
            // Prüfe ob Schüler existiert
            const student = await prisma.user.findUnique({
                where: { id: studentId },
                select: { id: true, role: true }
            });
            if (!student || student.role !== 'STUDENT') {
                return res.status(404).json({ error: 'Schüler nicht gefunden' });
            }
            const message = await prisma.message.create({
                data: {
                    teacherId: user.id,
                    studentId,
                    subject,
                    content
                },
                include: {
                    teacher: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    student: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            res.json({ success: true, message });
        }
        catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Fehler beim Senden der Nachricht' });
        }
    }
    /**
     * Mehrere Nachrichten an mehrere Schüler senden (Lehrer)
     */
    static async sendBulkMessages(req, res) {
        try {
            console.log('📧 sendBulkMessages aufgerufen');
            console.log('Request body:', JSON.stringify(req.body, null, 2));
            console.log('Headers:', req.headers);
            const { messages } = req.body; // Array von { studentId, subject, content }
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                console.error('❌ Kein loginCode im Header');
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            console.log('🔑 Login geprüft');
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user) {
                console.error('❌ Benutzer nicht gefunden');
                return res.status(401).json({ error: 'Benutzer nicht gefunden' });
            }
            if (user.role !== 'TEACHER') {
                console.error('❌ Benutzer ist kein Lehrer:', user.role);
                return res.status(403).json({ error: 'Nur Lehrer können Nachrichten senden' });
            }
            if (!Array.isArray(messages) || messages.length === 0) {
                console.error('❌ messages ist kein Array oder leer:', messages);
                return res.status(400).json({ error: 'messages Array ist erforderlich' });
            }
            // Validiere alle Nachrichten
            for (const msg of messages) {
                if (!msg.studentId || !msg.subject || !msg.content) {
                    console.error('❌ Ungültige Nachricht:', msg);
                    return res.status(400).json({ error: 'Jede Nachricht muss studentId, subject und content haben' });
                }
            }
            // Erstelle alle Nachrichten
            console.log('📧 Sende Bulk-Nachrichten:', {
                teacherId: user.id,
                count: messages.length,
                studentIds: messages.map(m => m.studentId)
            });
            const createdMessages = await prisma.$transaction(messages.map(msg => prisma.message.create({
                data: {
                    teacherId: user.id,
                    studentId: msg.studentId,
                    subject: msg.subject,
                    content: msg.content
                }
            })));
            console.log('✅ Bulk-Nachrichten erfolgreich gesendet:', createdMessages.length);
            res.json({ success: true, count: createdMessages.length, messages: createdMessages });
        }
        catch (error) {
            console.error('❌ Error sending bulk messages:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
            console.error('Error details:', errorMessage);
            res.status(500).json({ error: `Fehler beim Senden der Nachrichten: ${errorMessage}` });
        }
    }
    /**
     * Alle empfangenen Nachrichten für einen Schüler abrufen (vom Lehrer gesendet)
     * Da beide Nachrichtentypen die gleiche Struktur haben, geben wir alle zurück
     * und unterscheiden im Frontend basierend auf dem Kontext
     */
    static async getStudentMessages(req, res) {
        try {
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können ihre Nachrichten abrufen' });
            }
            // Alle Nachrichten, bei denen der Schüler beteiligt ist
            const messages = await prisma.message.findMany({
                where: {
                    studentId: user.id
                },
                include: {
                    teacher: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            res.json({ messages });
        }
        catch (error) {
            console.error('Error getting messages:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
        }
    }
    /**
     * Alle gesendeten Nachrichten eines Schülers abrufen (an Lehrer gesendet)
     * Da die Struktur gleich ist, geben wir alle Nachrichten zurück, bei denen der Schüler beteiligt ist
     * Die Unterscheidung erfolgt im Frontend basierend auf dem Kontext
     */
    static async getStudentSentMessages(req, res) {
        try {
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können ihre gesendeten Nachrichten abrufen' });
            }
            // Alle Nachrichten, bei denen der Schüler beteiligt ist
            // Im Frontend werden wir diese als "gesendet" markieren
            const messages = await prisma.message.findMany({
                where: {
                    studentId: user.id
                },
                include: {
                    teacher: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            res.json({ messages });
        }
        catch (error) {
            console.error('Error getting student sent messages:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der gesendeten Nachrichten' });
        }
    }
    /**
     * Nachricht als gelesen markieren
     */
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können Nachrichten als gelesen markieren' });
            }
            // Prüfe ob Nachricht dem Schüler gehört
            const message = await prisma.message.findUnique({
                where: { id },
                select: { studentId: true }
            });
            if (!message) {
                return res.status(404).json({ error: 'Nachricht nicht gefunden' });
            }
            if (message.studentId !== user.id) {
                return res.status(403).json({ error: 'Keine Berechtigung' });
            }
            const updatedMessage = await prisma.message.update({
                where: { id },
                data: {
                    isRead: true,
                    readAt: new Date()
                }
            });
            res.json({ success: true, message: updatedMessage });
        }
        catch (error) {
            console.error('Error marking message as read:', error);
            res.status(500).json({ error: 'Fehler beim Markieren der Nachricht' });
        }
    }
    /**
     * Anzahl ungelesener Nachrichten für einen Schüler
     */
    static async getUnreadCount(req, res) {
        try {
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können ihre Nachrichten abrufen' });
            }
            const count = await prisma.message.count({
                where: {
                    studentId: user.id,
                    isRead: false
                }
            });
            res.json({ unreadCount: count });
        }
        catch (error) {
            console.error('Error getting unread count:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Anzahl' });
        }
    }
    /**
     * Alle gesendeten Nachrichten eines Lehrers abrufen
     */
    static async getTeacherMessages(req, res) {
        try {
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können ihre gesendeten Nachrichten abrufen' });
            }
            const messages = await prisma.message.findMany({
                where: { teacherId: user.id },
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            res.json({ messages });
        }
        catch (error) {
            console.error('Error getting teacher messages:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
        }
    }
    /**
     * Nachricht löschen (Lehrer kann nur eigene gesendete Nachrichten löschen)
     */
    static async deleteMessage(req, res) {
        try {
            const { id } = req.params;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können Nachrichten löschen' });
            }
            // Prüfe ob Nachricht dem Lehrer gehört
            const message = await prisma.message.findUnique({
                where: { id },
                select: { teacherId: true }
            });
            if (!message) {
                return res.status(404).json({ error: 'Nachricht nicht gefunden' });
            }
            if (message.teacherId !== user.id) {
                return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Nachricht' });
            }
            await prisma.message.delete({
                where: { id }
            });
            res.json({ success: true, message: 'Nachricht gelöscht' });
        }
        catch (error) {
            console.error('Error deleting message:', error);
            res.status(500).json({ error: 'Fehler beim Löschen der Nachricht' });
        }
    }
    /**
     * Empfangene Nachrichten eines Lehrers (von Schülern)
     * Diese Funktion gibt alle Nachrichten zurück, bei denen der Lehrer der Empfänger ist
     * (teacherId = Lehrer-ID und die Nachricht wurde von einem Schüler gesendet)
     */
    static async getTeacherReceivedMessages(req, res) {
        try {
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'TEACHER') {
                return res.status(403).json({ error: 'Nur Lehrer können ihre empfangenen Nachrichten abrufen' });
            }
            // Alle Nachrichten, bei denen dieser Lehrer der Empfänger ist
            // Da Schüler Nachrichten senden, ist teacherId immer der Empfänger
            const messages = await prisma.message.findMany({
                where: {
                    teacherId: user.id
                },
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            role: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            // Filtere: Nur Nachrichten von Schülern (empfangene Nachrichten)
            const receivedMessages = messages.filter(msg => msg.student.role === 'STUDENT');
            res.json({ messages: receivedMessages });
        }
        catch (error) {
            console.error('Error getting teacher received messages:', error);
            res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
        }
    }
    /**
     * Nachricht an Lehrer senden (Schüler)
     */
    static async sendMessageToTeacher(req, res) {
        try {
            const { teacherId, subject, content } = req.body;
            const loginCode = req.headers['x-login-code'];
            if (!loginCode) {
                return res.status(401).json({ error: 'Nicht angemeldet' });
            }
            const user = await (0, loginCodeCrypto_1.findUserByLoginCode)(prisma, loginCode);
            if (!user || user.role !== 'STUDENT') {
                return res.status(403).json({ error: 'Nur Schüler können Nachrichten an Lehrer senden' });
            }
            if (!teacherId || !subject || !content) {
                return res.status(400).json({ error: 'teacherId, subject und content sind erforderlich' });
            }
            // Prüfe ob Lehrer existiert
            const teacher = await prisma.user.findUnique({
                where: { id: teacherId },
                select: { id: true, role: true }
            });
            if (!teacher || teacher.role !== 'TEACHER') {
                return res.status(404).json({ error: 'Lehrer nicht gefunden' });
            }
            const message = await prisma.message.create({
                data: {
                    teacherId,
                    studentId: user.id,
                    subject,
                    content
                },
                include: {
                    teacher: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    student: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            res.json({ success: true, message });
        }
        catch (error) {
            console.error('Error sending message to teacher:', error);
            res.status(500).json({ error: 'Fehler beim Senden der Nachricht' });
        }
    }
}
exports.MessageController = MessageController;
//# sourceMappingURL=MessageController.js.map