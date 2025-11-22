import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MessageController {
  /**
   * Nachricht an einen Schüler senden (Lehrer)
   */
  static async sendMessage(req: Request, res: Response) {
    try {
      const { studentId, subject, content } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

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
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Fehler beim Senden der Nachricht' });
    }
  }

  /**
   * Mehrere Nachrichten an mehrere Schüler senden (Lehrer)
   */
  static async sendBulkMessages(req: Request, res: Response) {
    try {
      console.log('📧 sendBulkMessages aufgerufen');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('Headers:', req.headers);
      
      const { messages } = req.body; // Array von { studentId, subject, content }
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        console.error('❌ Kein loginCode im Header');
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      console.log('🔑 LoginCode:', loginCode);

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user) {
        console.error('❌ Benutzer nicht gefunden für loginCode:', loginCode);
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

      const createdMessages = await prisma.$transaction(
        messages.map(msg =>
          prisma.message.create({
            data: {
              teacherId: user.id,
              studentId: msg.studentId,
              subject: msg.subject,
              content: msg.content
            }
          })
        )
      );

      console.log('✅ Bulk-Nachrichten erfolgreich gesendet:', createdMessages.length);
      res.json({ success: true, count: createdMessages.length, messages: createdMessages });
    } catch (error) {
      console.error('❌ Error sending bulk messages:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error('Error details:', errorMessage);
      res.status(500).json({ error: `Fehler beim Senden der Nachrichten: ${errorMessage}` });
    }
  }

  /**
   * Alle Nachrichten für einen Schüler abrufen
   */
  static async getStudentMessages(req: Request, res: Response) {
    try {
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Nur Schüler können ihre Nachrichten abrufen' });
      }

      const messages = await prisma.message.findMany({
        where: { studentId: user.id },
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
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
    }
  }

  /**
   * Nachricht als gelesen markieren
   */
  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

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
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Fehler beim Markieren der Nachricht' });
    }
  }

  /**
   * Anzahl ungelesener Nachrichten für einen Schüler
   */
  static async getUnreadCount(req: Request, res: Response) {
    try {
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

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
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Anzahl' });
    }
  }

  /**
   * Alle gesendeten Nachrichten eines Lehrers abrufen
   */
  static async getTeacherMessages(req: Request, res: Response) {
    try {
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

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
    } catch (error) {
      console.error('Error getting teacher messages:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Nachrichten' });
    }
  }
}

