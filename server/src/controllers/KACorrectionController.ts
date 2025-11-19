import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KACorrectionController {
  /**
   * Abgabe einer Klassenarbeit speichern
   */
  static async submitKA(req: Request, res: Response) {
    try {
      const { kaFilePath, answers, autoPoints } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Nur Schüler können Klassenarbeiten abgeben' });
      }

      const studentId = user.id;

      if (!kaFilePath || !answers) {
        return res.status(400).json({ error: 'kaFilePath und answers sind erforderlich' });
      }

      // Prüfe ob bereits abgegeben
      const existing = await prisma.kASubmission.findUnique({
        where: {
          kaFilePath_studentId: {
            kaFilePath,
            studentId
          }
        }
      });

      // Debug: Log die eingehenden Daten
      console.log('📥 Neue Abgabe:', {
        kaFilePath,
        studentId,
        autoPoints,
        answersCount: Object.keys(answers || {}).length
      });

      if (existing) {
        console.log('⚠️ Abgabe existiert bereits:', existing.id);
        return res.status(400).json({ error: 'Klassenarbeit wurde bereits abgegeben' });
      }

      const submission = await prisma.kASubmission.create({
        data: {
          kaFilePath,
          studentId,
          answers: JSON.stringify(answers),
          autoPoints: autoPoints || 0,
          totalPoints: autoPoints || 0,
          status: 'submitted'
        }
      });

      console.log('✅ Abgabe gespeichert:', {
        id: submission.id,
        kaFilePath: submission.kaFilePath,
        studentId: submission.studentId,
        status: submission.status
      });

      res.json({ success: true, submission });
    } catch (error) {
      console.error('Error submitting KA:', error);
      res.status(500).json({ error: 'Fehler beim Speichern der Abgabe' });
    }
  }

  /**
   * Alle Abgaben für eine Klassenarbeit abrufen (für Lehrer)
   */
  static async getSubmissions(req: Request, res: Response) {
    try {
      const { kaFilePath } = req.query;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können Abgaben einsehen' });
      }

      const teacherId = user.id;

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      // Debug: Log den gesuchten kaFilePath
      console.log('🔍 Suche Abgaben für kaFilePath:', kaFilePath);
      
      // Prüfe alle Submissions in der DB (für Debugging)
      const allSubmissions = await prisma.kASubmission.findMany({
        select: {
          id: true,
          kaFilePath: true,
          status: true,
          studentId: true
        }
      });
      console.log('📊 Alle Submissions in DB:', allSubmissions.map(s => ({ 
        kaFilePath: s.kaFilePath, 
        status: s.status 
      })));

      // Versuche auch mit verschiedenen Varianten zu suchen (falls es Unterschiede gibt)
      const possiblePaths = [
        kaFilePath,
        kaFilePath.replace('.html', ''),
        kaFilePath.replace('.htm', ''),
        kaFilePath.replace('KA_', ''),
        `KA_${kaFilePath.replace('KA_', '')}`,
        kaFilePath.startsWith('KA_') ? kaFilePath : `KA_${kaFilePath}`
      ];
      
      // Entferne Duplikate
      const uniquePaths = [...new Set(possiblePaths)];
      
      console.log('🔍 Gesuchter Pfad:', kaFilePath);
      console.log('🔍 Versuche Pfade:', uniquePaths);
      
      // Zuerst: Suche mit exaktem Match
      let submissions = await prisma.kASubmission.findMany({
        where: {
          kaFilePath,
          status: {
            in: ['submitted', 'expired', 'corrected']
          }
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              loginCode: true
            }
          },
          corrections: {
            where: {
              teacherId
            }
          }
        },
        orderBy: {
          submittedAt: 'desc'
        }
      });
      
      // Falls keine gefunden, versuche mit Varianten
      if (submissions.length === 0) {
        console.log('⚠️ Keine Submissions mit exaktem Match gefunden, versuche Varianten...');
        submissions = await prisma.kASubmission.findMany({
          where: {
            OR: uniquePaths.map(path => ({
              kaFilePath: path
            })),
            status: {
              in: ['submitted', 'expired', 'corrected']
            }
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                loginCode: true
              }
            },
            corrections: {
              where: {
                teacherId
              }
            }
          },
          orderBy: {
            submittedAt: 'desc'
          }
        });
      }
      
      console.log(`✅ Gefunden: ${submissions.length} Submissions`);
      res.json({ submissions });
    } catch (error) {
      console.error('Error getting submissions:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Abgaben' });
    }
  }

  /**
   * Einzelne Abgabe mit Details abrufen
   */
  static async getSubmission(req: Request, res: Response) {
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

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können Abgaben einsehen' });
      }

      const teacherId = user.id;

      const submission = await prisma.kASubmission.findUnique({
        where: { id },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              loginCode: true
            }
          },
          corrections: {
            where: {
              teacherId
            },
            orderBy: {
              taskNumber: 'asc'
            }
          }
        }
      });

      if (!submission) {
        return res.status(404).json({ error: 'Abgabe nicht gefunden' });
      }

      res.json({ submission });
    } catch (error) {
      console.error('Error getting submission:', error);
      res.status(500).json({ error: 'Fehler beim Abrufen der Abgabe' });
    }
  }

  /**
   * Korrektur speichern/aktualisieren
   */
  static async saveCorrection(req: Request, res: Response) {
    try {
      const { submissionId, taskNumber, manualPoints, comment } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können korrigieren' });
      }

      const teacherId = user.id;

      if (!submissionId || !taskNumber) {
        return res.status(400).json({ error: 'submissionId und taskNumber sind erforderlich' });
      }

      // Prüfe ob Submission existiert
      const submission = await prisma.kASubmission.findUnique({
        where: { id: submissionId }
      });

      if (!submission) {
        return res.status(404).json({ error: 'Abgabe nicht gefunden' });
      }

      // Upsert Korrektur
      const correction = await prisma.kACorrection.upsert({
        where: {
          submissionId_taskNumber: {
            submissionId,
            taskNumber
          }
        },
        create: {
          submissionId,
          teacherId,
          taskNumber,
          manualPoints: manualPoints !== undefined ? manualPoints : null,
          comment: comment || null
        },
        update: {
          manualPoints: manualPoints !== undefined ? manualPoints : null,
          comment: comment || null,
          updatedAt: new Date()
        }
      });

      // Berechne Gesamtpunkte neu
      const allCorrections = await prisma.kACorrection.findMany({
        where: { submissionId }
      });

      const totalManualPoints = allCorrections.reduce((sum, c) => sum + (c.manualPoints || 0), 0);
      const totalPoints = submission.autoPoints + totalManualPoints;

      // Update Submission
      await prisma.kASubmission.update({
        where: { id: submissionId },
        data: {
          totalPoints,
          status: 'corrected'
        }
      });

      res.json({ success: true, correction, totalPoints });
    } catch (error) {
      console.error('Error saving correction:', error);
      res.status(500).json({ error: 'Fehler beim Speichern der Korrektur' });
    }
  }

  /**
   * Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer, nur zu Testzwecken)
   */
  static async resetAllSubmissions(req: Request, res: Response) {
    try {
      const { kaFilePath } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können Abgaben zurücksetzen' });
      }

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      // Versuche auch mit verschiedenen Varianten zu suchen (falls es Unterschiede gibt)
      const possiblePaths = [
        kaFilePath,
        kaFilePath.replace('.html', ''),
        kaFilePath.replace('.htm', ''),
        kaFilePath.replace('KA_', ''),
        `KA_${kaFilePath.replace('KA_', '')}`,
        kaFilePath.startsWith('KA_') ? kaFilePath : `KA_${kaFilePath}`
      ];
      
      // Entferne Duplikate
      const uniquePaths = [...new Set(possiblePaths)];
      
      console.log('🔍 Lösche Abgaben für Pfade:', uniquePaths);

      // Finde alle Submissions für diese KA (mit allen Varianten)
      const submissions = await prisma.kASubmission.findMany({
        where: {
          OR: uniquePaths.map(path => ({
            kaFilePath: path
          }))
        }
      });

      console.log(`🗑️ Gefunden: ${submissions.length} Abgabe(n) für ${kaFilePath}`);

      // Lösche alle Submissions (Cascade löscht auch die Korrekturen)
      const deleted = await prisma.kASubmission.deleteMany({
        where: {
          OR: uniquePaths.map(path => ({
            kaFilePath: path
          }))
        }
      });

      console.log(`✅ ${deleted.count} Abgabe(n) gelöscht`);

      res.json({ 
        success: true, 
        deletedCount: deleted.count,
        message: `${deleted.count} Abgabe(n) wurden zurückgesetzt` 
      });
    } catch (error) {
      console.error('Error resetting submissions:', error);
      res.status(500).json({ error: 'Fehler beim Zurücksetzen der Abgaben' });
    }
  }

  /**
   * Status der Abgabe aktualisieren (z.B. wenn Zeit abgelaufen)
   */
  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, expiredAt } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Benutzer nicht gefunden' });
      }

      const studentId = user.id;

      const submission = await prisma.kASubmission.update({
        where: { id },
        data: {
          status: status || 'expired',
          expiredAt: expiredAt ? new Date(expiredAt) : new Date()
        }
      });

      res.json({ success: true, submission });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Fehler beim Aktualisieren des Status' });
    }
  }

  /**
   * Prüfe ob eine Submission für einen Schüler existiert (für Schüler)
   */
  static async checkMySubmission(req: Request, res: Response) {
    try {
      const { kaFilePath } = req.query;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await prisma.user.findUnique({
        where: { loginCode },
        select: { id: true, role: true }
      });

      if (!user || user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Nur Schüler können diese Funktion nutzen' });
      }

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      const studentId = user.id;

      // Prüfe ob eine Submission für diesen Schüler existiert
      const submission = await prisma.kASubmission.findUnique({
        where: {
          kaFilePath_studentId: {
            kaFilePath,
            studentId
          }
        },
        select: {
          id: true,
          status: true
        }
      });

      res.json({ 
        exists: !!submission,
        submission: submission || null
      });
    } catch (error) {
      console.error('Error checking submission:', error);
      res.status(500).json({ error: 'Fehler beim Prüfen der Abgabe' });
    }
  }
}

