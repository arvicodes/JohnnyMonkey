import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { findUserByLoginCode } from '../utils/loginCodeCrypto';
import {
  computeSubmissionTotal,
  parseExamAnswerKey,
  readExamHtml,
  replaceCorrectAnswersInHtml,
  writeExamHtml,
} from '../utils/examAutoPoints';
import { examGradeNumericFromPoints } from '../utils/examGradeNumeric';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Helper-Funktion: Prüft ob eine Datei eine korrigierbare Datei ist (KA_, KU_, HÜ_, HU_, QZ_)
 */
function isCorrectionFile(fileName: string): boolean {
  const base = (fileName || '').replace(/\\/g, '/').split('/').pop() || fileName || '';
  return /^(KA_|KU_|HÜ_|HU_|QZ_)/i.test(base);
}

function kaBasename(kaFilePath: string): string {
  return (kaFilePath || '').replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
}

async function resolveLessonFolderAbs(lessonPathRaw: string): Promise<string> {
  const { StorageManager } = await import('../utils/storageManager');
  const lp = lessonPathRaw.replace(/\\/g, '/').trim();
  const resolvedFile = StorageManager.resolveFilePath(lp);
  if (resolvedFile && fs.existsSync(resolvedFile) && fs.statSync(resolvedFile).isDirectory()) {
    return resolvedFile;
  }
  let inner = lp;
  if (inner.startsWith('git-intern/')) {
    inner = inner.replace(/^git-intern\//, '');
  } else if (inner.startsWith('J-M-Reihen/') || inner === 'J-M-Reihen') {
    inner = inner.replace(/^J-M-Reihen\/?/, '');
  }
  return StorageManager.resolveGitInternRelativePath(inner);
}

function submissionMatchesLesson(
  kaFilePath: string,
  lessonNorm: string,
  lessonFolderAbs: string,
  fileNameSet: Set<string>,
): boolean {
  const base = kaBasename(kaFilePath);
  const full = (kaFilePath || '').replace(/\\/g, '/').toLowerCase();
  if (!lessonNorm && fileNameSet.size === 0) return true;

  if (fileNameSet.size > 0 && fileNameSet.has(base)) return true;
  if (lessonNorm && full.includes(lessonNorm)) return true;
  if (lessonFolderAbs && base) {
    try {
      const candidate = path.join(lessonFolderAbs, base);
      if (fs.existsSync(candidate)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

/**
 * Pfad-Varianten für Abgaben: Lehrer übergibt oft den vollen Ordnerpfad,
 * SuS speichern meist nur den Dateinamen (z. B. HU_….html).
 */
function getPossiblePaths(filePath: string): string[] {
  const normalized = (filePath || '').replace(/\\/g, '/').trim();
  const base = normalized.split('/').pop() || normalized;
  const withoutExt = base.replace(/\.(html|htm)$/i, '');
  const stem = withoutExt.replace(/^(KA_|KU_|HÜ_|HU_|QZ_)/i, '');
  const candidates = new Set<string>();

  const add = (p: string) => {
    const v = (p || '').trim();
    if (!v) return;
    candidates.add(v);
    const noExt = v.replace(/\.(html|htm)$/i, '');
    candidates.add(noExt);
    if (!/\.(html|htm)$/i.test(v)) {
      candidates.add(`${v}.html`);
      candidates.add(`${v}.htm`);
    }
  };

  add(normalized);
  add(base);
  add(withoutExt);
  for (const pref of ['KA_', 'KU_', 'HÜ_', 'HU_', 'QZ_', '']) {
    add(`${pref}${stem}`);
  }

  return [...candidates];
}

async function requireTeacher(req: Request) {
  const loginCode = req.headers['x-login-code'] as string;
  if (!loginCode) return null;
  const user = await findUserByLoginCode(prisma, loginCode);
  if (!user || user.role !== 'TEACHER') return null;
  return user;
}

export class KACorrectionController {
  private static async recomputeSubmissionById(submissionId: string, teacherId?: string) {
    const submission = await prisma.kASubmission.findUnique({
      where: { id: submissionId },
      include: { corrections: true },
    });
    if (!submission) return null;
    let key = parseExamAnswerKey('');
    try {
      key = parseExamAnswerKey(readExamHtml(submission.kaFilePath));
    } catch {
      /* keine HTML-Datei */
    }
    if (Object.keys(key.answers).length === 0) {
      const manualSum = submission.corrections
        .filter(
          (c) =>
            c.taskNumber !== '__review_complete__' &&
            c.taskNumber !== '__general_comment__' &&
            c.taskNumber !== '3_comment',
        )
        .reduce((s, c) => s + (c.manualPoints ?? 0), 0);
      await prisma.kASubmission.update({
        where: { id: submissionId },
        data: { totalPoints: submission.autoPoints + manualSum, status: 'corrected' },
      });
    } else {
      const { autoPoints, totalPoints } = computeSubmissionTotal(
        submission.answers,
        key,
        submission.corrections.map((c) => ({
          taskNumber: c.taskNumber,
          manualPoints: c.manualPoints,
        })),
      );
      await prisma.kASubmission.update({
        where: { id: submissionId },
        data: { autoPoints, totalPoints, status: 'corrected' },
      });
    }
    return prisma.kASubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, name: true, loginCode: true } },
        corrections: teacherId ? { where: { teacherId } } : true,
      },
    });
  }

  private static async recalculateAllForExam(kaFilePath: string): Promise<number> {
    const uniquePaths = getPossiblePaths(kaFilePath);
    const html = readExamHtml(kaFilePath);
    const key = parseExamAnswerKey(html);
    const submissions = await prisma.kASubmission.findMany({
      where: { OR: uniquePaths.map((p) => ({ kaFilePath: p })) },
      include: { corrections: true },
    });
    for (const sub of submissions) {
      const { autoPoints, totalPoints } = computeSubmissionTotal(
        sub.answers,
        key,
        sub.corrections.map((c) => ({
          taskNumber: c.taskNumber,
          manualPoints: c.manualPoints,
        })),
      );
      await prisma.kASubmission.update({
        where: { id: sub.id },
        data: { autoPoints, totalPoints },
      });
    }
    return submissions.length;
  }
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

      const user = await findUserByLoginCode(prisma, loginCode);

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
    let kaFilePath: string = '';
    let fileName: string = '';
    
    try {
      const kaFilePathParam = req.query.kaFilePath;
      const loginCodeRaw =
        (typeof req.headers['x-login-code'] === 'string' && req.headers['x-login-code']) ||
        (Array.isArray(req.headers['x-login-code']) && req.headers['x-login-code'][0]) ||
        (typeof req.query.loginCode === 'string' && req.query.loginCode) ||
        '';
      const loginCode = String(loginCodeRaw).trim();

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await findUserByLoginCode(prisma, loginCode);

      if (!user) {
        return res.status(401).json({ error: 'Ungültiger Login-Code' });
      }

      if (user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können Abgaben einsehen' });
      }

      const teacherId = user.id;
      console.log('👤 Lehrer ID:', teacherId);
      
      if (!teacherId) {
        return res.status(500).json({ error: 'Lehrer-ID nicht gefunden' });
      }

      if (!kaFilePathParam || typeof kaFilePathParam !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      kaFilePath = kaFilePathParam;
      
      console.log('🔍 Suche Abgaben für kaFilePath:', kaFilePath);
      
      fileName = (kaFilePath.split(/[/\\]/).pop() || kaFilePath).trim();
      const fileNameWithoutExt = fileName.replace(/\.(html|htm)$/i, '');
      const fileNameLower = fileName.toLowerCase();
      const stemLower = fileNameWithoutExt.toLowerCase();
      
      console.log('🔍 Dateiname:', fileName);

      const pathMatches = (stored: string): boolean => {
        const n = (stored || '').replace(/\\/g, '/');
        const base = (n.split('/').pop() || n).toLowerCase();
        const stem = base.replace(/\.(html|htm)$/i, '');
        return (
          base === fileNameLower ||
          stem === stemLower ||
          n.toLowerCase() === fileNameLower ||
          n.toLowerCase().endsWith('/' + fileNameLower)
        );
      };
      
      let submissions: any[] = [];
      
      try {
        // Alle Abgaben laden und nach Dateiname matchen (SuS speichern oft nur den Namen)
        const allSubmissionsRaw = await prisma.kASubmission.findMany({
          select: {
            id: true,
            kaFilePath: true,
            status: true,
            studentId: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
        });
        
        console.log(`📊 Gesamt Submissions: ${allSubmissionsRaw.length}`);
        
        const matchingIds = allSubmissionsRaw
          .filter((sub) => {
            if (!pathMatches(sub.kaFilePath)) return false;
            // leere/draft ausblenden, alles Abgegebene behalten
            const st = String(sub.status || '').toLowerCase();
            return !st || st === 'submitted' || st === 'expired' || st === 'corrected' || st === 'released';
          })
          .map((sub) => sub.id);
        
        console.log(`✅ Gefundene IDs: ${matchingIds.length}`);
        
        if (matchingIds.length > 0) {
          try {
            submissions = await prisma.kASubmission.findMany({
              where: { id: { in: matchingIds } },
              include: {
                student: {
                  select: { id: true, name: true, loginCode: true },
                },
                corrections: {
                  where: { teacherId },
                },
              },
              orderBy: { submittedAt: 'desc' },
            });
          } catch (includeErr) {
            console.warn('⚠️ Include fehlgeschlagen, lade ohne Korrekturen:', includeErr);
            submissions = await prisma.kASubmission.findMany({
              where: { id: { in: matchingIds } },
              include: {
                student: {
                  select: { id: true, name: true, loginCode: true },
                },
              },
              orderBy: { submittedAt: 'desc' },
            });
          }
        }
        
        console.log(`✅ Final: ${submissions.length} Submissions`);
        
      } catch (queryError) {
        console.error('❌ Fehler:', queryError);
        throw queryError;
      }
      
      // Fallback: Varianten-Suche (älterer Code-Pfad, falls Matching zu streng war)
      if (submissions.length === 0) {
        console.log('⚠️ Keine Submissions mit exaktem Match gefunden, versuche Varianten...');
        const allSubmissionsForVariantSearch = await prisma.kASubmission.findMany({
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
        
        console.log(`🔍 Filtere ${allSubmissionsForVariantSearch.length} Submissions mit Dateiname: ${fileName}`);
        submissions = allSubmissionsForVariantSearch.filter(sub => {
          if (pathMatches(sub.kaFilePath)) return true;
          const subPathLower = sub.kaFilePath.toLowerCase();
          const subFileName = sub.kaFilePath.split('/').pop() || sub.kaFilePath;
          const subFileNameLower = subFileName.toLowerCase();
          const subFileNameWithoutExt = subFileName.replace(/\.(html|htm)$/i, '').toLowerCase();
          
          const matches = sub.kaFilePath === fileName ||
                 subPathLower === fileName.toLowerCase() ||
                 subFileName === fileName ||
                 subFileNameLower === fileName.toLowerCase() ||
                 subFileNameWithoutExt === fileNameWithoutExt.toLowerCase() ||
                 subFileName.includes(fileNameWithoutExt) ||
                 subFileNameLower.includes(fileNameWithoutExt.toLowerCase());
          
          if (matches) {
            console.log(`✅ Match gefunden: ${sub.kaFilePath} (Student: ${sub.student?.name})`);
          }
          
          return matches;
        });
        
        console.log(`✅ Nach Varianten-Suche: ${submissions.length} Submissions gefunden`);
      }
      
      // Falls immer noch keine gefunden, hole alle Submissions und filtere manuell mit erweiterten Kriterien
      if (submissions.length === 0) {
        console.log('⚠️ Keine Submissions mit Varianten gefunden, suche in allen Submissions...');
        const allSubmissionsForFilter = await prisma.kASubmission.findMany({
          where: {
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
        
        // Filtere manuell: Prüfe ob der Dateiname im kaFilePath enthalten ist
        // WICHTIG: Studenten speichern oft nur den Dateinamen, Lehrer verwenden den vollständigen Pfad
        submissions = allSubmissionsForFilter.filter(sub => {
          const subFileName = sub.kaFilePath.split('/').pop() || sub.kaFilePath;
          const subFileNameWithoutExt = subFileName.replace(/\.(html|htm)$/i, '');
          const subFileNameLower = subFileName.toLowerCase();
          const fileNameLower = fileName.toLowerCase();
          const fileNameWithoutExtLower = fileNameWithoutExt.toLowerCase();
          
          // Prüfe verschiedene Match-Varianten
          return subFileName === fileName || 
                 subFileNameLower === fileNameLower ||
                 subFileNameWithoutExt === fileNameWithoutExt ||
                 subFileNameWithoutExt.toLowerCase() === fileNameWithoutExtLower ||
                 sub.kaFilePath === kaFilePath ||
                 sub.kaFilePath.toLowerCase() === kaFilePath.toLowerCase() ||
                 sub.kaFilePath.includes(fileName) ||
                 sub.kaFilePath.toLowerCase().includes(fileNameLower) ||
                 sub.kaFilePath.includes(fileNameWithoutExt) ||
                 sub.kaFilePath.toLowerCase().includes(fileNameWithoutExtLower) ||
                 // Auch umgekehrt: Prüfe ob der gesuchte Dateiname im gespeicherten Pfad vorkommt
                 subFileName.includes(fileNameWithoutExt) ||
                 subFileNameLower.includes(fileNameWithoutExtLower);
        });
        
        console.log(`✅ Nach manuellem Filtern: ${submissions.length} Submissions gefunden`);
      }
      
      console.log(`✅ Gefunden: ${submissions.length} Submissions`);
      console.log('📋 Submissions Details:', submissions.map(s => ({
        id: s.id,
        kaFilePath: s.kaFilePath,
        studentName: s.student?.name || 'Unbekannt',
        status: s.status
      })));
      
      res.json({ submissions });
    } catch (error) {
      console.error('❌ Error getting submissions:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        kaFilePath: kaFilePath || 'unknown',
        fileName: fileName || 'unknown',
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorString: String(error)
      });
      res.status(500).json({ 
        error: 'Fehler beim Abrufen der Abgaben',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
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

      const user = await findUserByLoginCode(prisma, loginCode);

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

      console.log('💾 Speichere Korrektur:', {
        submissionId,
        taskNumber,
        manualPoints,
        comment: comment ? comment.substring(0, 50) + '...' : null,
        loginCode: loginCode ? 'vorhanden' : 'fehlt'
      });

      if (!loginCode) {
        console.error('❌ Kein Login-Code vorhanden');
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await findUserByLoginCode(prisma, loginCode);

      if (!user) {
        console.error('❌ Benutzer nicht gefunden für Login-Code');
        return res.status(401).json({ error: 'Benutzer nicht gefunden' });
      }

      if (user.role !== 'TEACHER') {
        console.error('❌ Benutzer ist kein Lehrer:', user.role);
        return res.status(403).json({ error: 'Nur Lehrer können korrigieren' });
      }

      const teacherId = user.id;

      if (!submissionId || !taskNumber) {
        console.error('❌ Fehlende Parameter:', { submissionId, taskNumber });
        return res.status(400).json({ error: 'submissionId und taskNumber sind erforderlich' });
      }

      // Prüfe ob Submission existiert
      const submission = await prisma.kASubmission.findUnique({
        where: { id: submissionId }
      });

      if (!submission) {
        console.error('❌ Submission nicht gefunden:', submissionId);
        return res.status(404).json({ error: 'Abgabe nicht gefunden' });
      }

      console.log('✅ Submission gefunden:', {
        id: submission.id,
        kaFilePath: submission.kaFilePath,
        autoPoints: submission.autoPoints
      });

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
          manualPoints: manualPoints !== undefined && manualPoints !== null ? manualPoints : null,
          comment: comment || null
        },
        update: {
          manualPoints: manualPoints !== undefined && manualPoints !== null ? manualPoints : null,
          comment: comment || null,
          updatedAt: new Date()
        }
      });

      console.log('✅ Korrektur gespeichert:', {
        id: correction.id,
        taskNumber: correction.taskNumber,
        manualPoints: correction.manualPoints
      });

      const updatedSubmission = await KACorrectionController.recomputeSubmissionById(
        submissionId,
        teacherId,
      );
      const totalPoints = updatedSubmission?.totalPoints ?? submission.totalPoints;
      const autoPoints = updatedSubmission?.autoPoints ?? submission.autoPoints;

      console.log('📊 Punkteberechnung:', { autoPoints, totalPoints });

      res.json({ success: true, correction, totalPoints, autoPoints });
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Korrektur:', error);
      console.error('Fehler-Details:', {
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ 
        error: 'Fehler beim Speichern der Korrektur',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });
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

      const user = await findUserByLoginCode(prisma, loginCode);

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können Abgaben zurücksetzen' });
      }

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      // Versuche auch mit verschiedenen Varianten zu suchen (falls es Unterschiede gibt)
      const uniquePaths = getPossiblePaths(kaFilePath);
      
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
  /** Lehrer: Abgabe als krank markieren (hellgelb in UI, nicht im Klassenschnitt). */
  static async setMarkedSick(req: Request, res: Response) {
    try {
      const teacher = await requireTeacher(req);
      if (!teacher) {
        return res.status(403).json({ error: 'Nur Lehrer können Krank markieren' });
      }
      const { id } = req.params;
      const markedSick = Boolean(req.body?.markedSick);
      const submission = await prisma.kASubmission.update({
        where: { id },
        data: { markedSick },
        include: {
          student: { select: { id: true, name: true, loginCode: true } },
          corrections: { where: { teacherId: teacher.id } },
        },
      });
      res.json({ success: true, submission });
    } catch (error) {
      console.error('Error setting markedSick:', error);
      res.status(500).json({ error: 'Krank-Status konnte nicht gespeichert werden' });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, expiredAt } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await findUserByLoginCode(prisma, loginCode);

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

      const user = await findUserByLoginCode(prisma, loginCode);

      if (!user || user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Nur Schüler können diese Funktion nutzen' });
      }

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      const studentId = user.id;

      console.log('🔍 checkMySubmission:', {
        kaFilePath,
        studentId,
        loginCode: loginCode ? 'vorhanden' : 'fehlt'
      });

      // Prüfe ob eine Submission für diesen Schüler existiert
      // Versuche auch mit verschiedenen Varianten (HU_ vs HÜ_)
      const uniquePaths = getPossiblePaths(kaFilePath);
      
      console.log('🔍 Prüfe Pfade:', uniquePaths);
      
      // Zuerst: Suche mit exaktem Match
      let submission = await prisma.kASubmission.findUnique({
        where: {
          kaFilePath_studentId: {
            kaFilePath,
            studentId
          }
        },
        select: {
          id: true,
          status: true,
          isReleased: true,
          totalPoints: true,
          autoPoints: true,
          kaFilePath: true,
        }
      });
      
      console.log('🔍 Exakte Suche Ergebnis:', submission ? 'gefunden' : 'nicht gefunden');
      
      // Falls keine gefunden, versuche mit Varianten
      if (!submission) {
        const submissions = await prisma.kASubmission.findMany({
          where: {
            OR: uniquePaths.map(path => ({
              kaFilePath: path
            })),
            studentId
          },
          select: {
            id: true,
            status: true,
            isReleased: true,
            totalPoints: true,
            autoPoints: true,
            kaFilePath: true,
          },
          take: 1
        });
        
        console.log('🔍 Varianten-Suche Ergebnis:', submissions.length > 0 ? 'gefunden' : 'nicht gefunden');
        
        if (submissions.length > 0) {
          submission = submissions[0];
        }
      }

      const exists = !!submission;
      console.log('🔍 Finales Ergebnis:', exists ? 'Submission existiert' : 'Keine Submission');

      res.json({ 
        exists,
        isReleased: submission?.isReleased === true,
        submission: submission || null
      });
    } catch (error) {
      console.error('Error checking submission:', error);
      res.status(500).json({ error: 'Fehler beim Prüfen der Abgabe' });
    }
  }

  /**
   * Alle Noten für eine Klassenarbeit freigeben/zurücknehmen (nur für Lehrer)
   */
  static async releaseAllGrades(req: Request, res: Response) {
    try {
      const { kaFilePath } = req.body;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await findUserByLoginCode(prisma, loginCode);

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können Noten freigeben' });
      }

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      // Versuche auch mit verschiedenen Varianten zu suchen
      const uniquePaths = getPossiblePaths(kaFilePath);
      const baseName = (kaFilePath.replace(/\\/g, '/').split('/').pop() || kaFilePath).toLowerCase();
      
      // Finde alle Submissions für diese KA (Pfad-Varianten + Basename-Fallback)
      let submissions = await prisma.kASubmission.findMany({
        where: {
          OR: uniquePaths.map(path => ({
            kaFilePath: path
          }))
        }
      });

      if (submissions.length === 0 && baseName) {
        const all = await prisma.kASubmission.findMany({
          select: { id: true, kaFilePath: true, isReleased: true },
        });
        const matchingIds = all
          .filter((sub) => {
            const subBase = (sub.kaFilePath || '').replace(/\\/g, '/').split('/').pop() || '';
            return subBase.toLowerCase() === baseName;
          })
          .map((sub) => sub.id);
        if (matchingIds.length > 0) {
          submissions = await prisma.kASubmission.findMany({
            where: { id: { in: matchingIds } },
          });
        }
      }

      if (submissions.length === 0) {
        return res.status(404).json({ error: 'Keine Abgaben für diese Klassenarbeit gefunden' });
      }

      // Optional explizit setzen (z. B. nach Notenfreigabe), sonst umschalten
      const bodyReleased = req.body?.isReleased;
      const allReleased = submissions.every(sub => sub.isReleased);
      const newReleaseStatus =
        typeof bodyReleased === 'boolean' ? bodyReleased : !allReleased;

      // Aktualisiere gezielt die gefundenen Abgaben (zuverlässiger als Pfad-OR)
      const result = await prisma.kASubmission.updateMany({
        where: {
          id: { in: submissions.map((s) => s.id) },
        },
        data: {
          isReleased: newReleaseStatus
        }
      });

      console.log(`✅ ${result.count} Abgabe(n) ${newReleaseStatus ? 'freigegeben' : 'zurückgenommen'}`);

      res.json({ 
        success: true,
        isReleased: newReleaseStatus,
        count: result.count,
        message: `${result.count} Abgabe(n) wurden ${newReleaseStatus ? 'freigegeben' : 'zurückgenommen'}` 
      });
    } catch (error) {
      console.error('Error releasing grades:', error);
      res.status(500).json({ error: 'Fehler beim Freigeben der Noten' });
    }
  }

  /**
   * Prüfe Freigabestatus für eine Klassenarbeit (nur für Lehrer)
   */
  static async getReleaseStatus(req: Request, res: Response) {
    try {
      const { kaFilePath } = req.query;
      const loginCode = req.headers['x-login-code'] as string;

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await findUserByLoginCode(prisma, loginCode);

      if (!user || user.role !== 'TEACHER') {
        return res.status(403).json({ error: 'Nur Lehrer können den Freigabestatus prüfen' });
      }

      if (!kaFilePath || typeof kaFilePath !== 'string') {
        return res.status(400).json({ error: 'kaFilePath ist erforderlich' });
      }

      // Versuche auch mit verschiedenen Varianten zu suchen
      const uniquePaths = getPossiblePaths(kaFilePath);
      const baseName = (kaFilePath.replace(/\\/g, '/').split('/').pop() || kaFilePath).toLowerCase();

      // Finde alle Submissions für diese KA
      // Prüfe zuerst, ob isReleased Feld existiert (Prisma Client könnte veraltet sein)
      let submissions: Array<{ isReleased: boolean }>;
      try {
        submissions = await prisma.kASubmission.findMany({
          where: {
            OR: uniquePaths.map(path => ({
              kaFilePath: path
            }))
          },
          select: {
            isReleased: true
          }
        });
      } catch (e: any) {
        // Wenn isReleased nicht existiert (Prisma Client veraltet), lade alle Felder
        if (e?.message?.includes('Unknown field') || e?.message?.includes('isReleased')) {
          console.warn('⚠️ isReleased Feld nicht verfügbar (Prisma Client veraltet), lade alle Submissions');
          const allSubmissions = await prisma.kASubmission.findMany({
            where: {
              OR: uniquePaths.map(path => ({
                kaFilePath: path
              }))
            }
          });
          submissions = allSubmissions.map(sub => ({ isReleased: sub.isReleased || false }));
        } else {
          throw e;
        }
      }

      if (submissions.length === 0 && baseName) {
        const all = await prisma.kASubmission.findMany({
          select: { isReleased: true, kaFilePath: true },
        });
        submissions = all
          .filter((sub) => {
            const subBase =
              (sub.kaFilePath || '').replace(/\\/g, '/').split('/').pop() || '';
            return subBase.toLowerCase() === baseName;
          })
          .map((sub) => ({ isReleased: sub.isReleased }));
      }

      if (submissions.length === 0) {
        return res.json({ isReleased: false, count: 0 });
      }

      // Prüfe ob alle freigegeben sind
      const allReleased = submissions.length > 0 && submissions.every(sub => sub.isReleased);

      res.json({ 
        isReleased: allReleased,
        count: submissions.length
      });
    } catch (error) {
      console.error('Error checking release status:', error);
      res.status(500).json({ error: 'Fehler beim Prüfen des Freigabestatus' });
    }
  }

  /**
   * Freigegebene Prüfungsergebnisse für den angemeldeten Schüler
   * Optional: lessonPath filtert auf Abgaben dieser Stunde
   */
  static async getMyReleasedResults(req: Request, res: Response) {
    try {
      const loginCode = req.headers['x-login-code'] as string;
      const lessonPathRaw = typeof req.query.lessonPath === 'string' ? req.query.lessonPath : '';

      if (!loginCode) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
      }

      const user = await findUserByLoginCode(prisma, loginCode);
      if (!user || user.role !== 'STUDENT') {
        return res.status(403).json({ error: 'Nur Schüler können ihre Ergebnisse abrufen' });
      }

      const submissions = await prisma.kASubmission.findMany({
        where: {
          studentId: user.id,
          isReleased: true,
        },
        select: {
          id: true,
          kaFilePath: true,
          totalPoints: true,
          autoPoints: true,
          status: true,
          submittedAt: true,
          answers: true,
          corrections: {
            orderBy: { taskNumber: 'asc' },
            select: {
              taskNumber: true,
              manualPoints: true,
              comment: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });

      const lessonNorm = lessonPathRaw.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
      const fileNamesRaw = typeof req.query.fileNames === 'string' ? req.query.fileNames : '';
      const fileNameSet = new Set(
        fileNamesRaw
          .split(',')
          .map((s) => decodeURIComponent(s.trim()).toLowerCase())
          .filter(Boolean),
      );

      let lessonFolderAbs = '';
      if (lessonPathRaw) {
        try {
          lessonFolderAbs = await resolveLessonFolderAbs(lessonPathRaw);
          if (lessonFolderAbs && fs.existsSync(lessonFolderAbs)) {
            for (const name of fs.readdirSync(lessonFolderAbs)) {
              if (isCorrectionFile(name) && /\.html?$/i.test(name)) {
                fileNameSet.add(name.toLowerCase());
              }
            }
          }
        } catch (e) {
          console.warn('my-released: Ordnerliste nicht lesbar', e);
        }
      }

      let filtered = submissions.filter((sub) =>
        submissionMatchesLesson(sub.kaFilePath, lessonNorm, lessonFolderAbs, fileNameSet),
      );

      // SuS speichern oft nur HU_….html — wenn Stundenfilter alles ausblendet, Korrekturdateien nachladen
      if (lessonPathRaw && filtered.length === 0 && submissions.length > 0) {
        filtered = submissions.filter((sub) => isCorrectionFile(kaBasename(sub.kaFilePath)));
      }

      const resultsSource = filtered;

      // Klassenschnitt je Prüfungsdatei (alle freigegebenen Abgaben derselben Datei)
      const allReleasedPeers = await prisma.kASubmission.findMany({
        where: { isReleased: true, markedSick: false },
        select: { kaFilePath: true, totalPoints: true },
      });
      const classStats = new Map<
        string,
        { avgPoints: number; avgGrade: number; count: number }
      >();
      const byBase = new Map<string, { points: number; path: string }[]>();
      for (const p of allReleasedPeers) {
        const b = kaBasename(p.kaFilePath);
        if (!b) continue;
        const arr = byBase.get(b) || [];
        arr.push({ points: Number(p.totalPoints) || 0, path: p.kaFilePath });
        byBase.set(b, arr);
      }
      const maxPointsByBase = new Map<string, number>();
      const maxForBase = (base: string, samplePath: string): number => {
        if (maxPointsByBase.has(base)) return maxPointsByBase.get(base)!;
        let max = 0;
        try {
          const key = parseExamAnswerKey(readExamHtml(samplePath));
          max = key.maxPoints || 0;
        } catch {
          try {
            const key = parseExamAnswerKey(readExamHtml(base));
            max = key.maxPoints || 0;
          } catch {
            max = 0;
          }
        }
        maxPointsByBase.set(base, max);
        return max;
      };
      byBase.forEach((rows, base) => {
        const samplePath = rows[0]?.path || base;
        const maxPts = maxForBase(base, samplePath);
        const sumPts = rows.reduce((a, r) => a + r.points, 0);
        if (maxPts <= 0) {
          classStats.set(base, {
            avgPoints: sumPts / rows.length,
            avgGrade: NaN,
            count: rows.length,
          });
          return;
        }
        const grades = rows.map((r) => examGradeNumericFromPoints(r.points, maxPts));
        const sumGrades = grades.reduce((a, g) => a + g, 0);
        classStats.set(base, {
          avgPoints: sumPts / rows.length,
          avgGrade: sumGrades / rows.length,
          count: rows.length,
        });
      });

      // Noten aus dem Schema (Schüler)
      const grades = await prisma.grade.findMany({
        where: { studentId: user.id },
        select: {
          categoryName: true,
          grade: true,
          updatedAt: true,
          schema: { select: { name: true, gradingSystem: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const formatGradeLabel = (g: number): string => {
        const rounded = Math.round(g * 10) / 10;
        const map: Record<string, string> = {
          '1': '1', '1.3': '1-', '1.7': '2+', '2': '2', '2.3': '2-',
          '2.7': '3+', '3': '3', '3.3': '3-', '3.7': '4+', '4': '4',
          '4.3': '4-', '4.7': '5+', '5': '5', '5.3': '5-', '5.7': '6', '6': '6',
        };
        const key = String(rounded);
        return map[key] || String(rounded).replace('.', ',');
      };

      res.json({
        results: resultsSource.map((sub) => {
          const fileName = (sub.kaFilePath || '').replace(/\\/g, '/').split('/').pop() || sub.kaFilePath;
          const base = (fileName || '').toLowerCase();
          const title = fileName.replace(/\.(html|htm)$/i, '').replace(/^(KA_|KU_|HÜ_|HU_|QZ_)/, '');
          let answers: Record<string, unknown> = {};
          try {
            answers = JSON.parse(sub.answers || '{}');
          } catch {
            answers = {};
          }
          const stem = title.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, ' ').trim();
          const matchedGrade =
            grades.find((g) => {
              const cn = (g.categoryName || '').toLowerCase();
              return (
                cn.includes('hü') ||
                cn.includes('hu') ||
                cn.includes('ka') ||
                (stem && cn.includes(stem.slice(0, 8)))
              );
            }) || grades[0];
          const stats = classStats.get(base);
          let totalPoints = sub.totalPoints;
          let autoPoints = sub.autoPoints;
          try {
            const key = parseExamAnswerKey(readExamHtml(sub.kaFilePath));
            if (Object.keys(key.answers).length > 0) {
              const computed = computeSubmissionTotal(
                sub.answers,
                key,
                sub.corrections.map((c) => ({
                  taskNumber: c.taskNumber,
                  manualPoints: c.manualPoints,
                })),
              );
              totalPoints = computed.totalPoints;
              autoPoints = computed.autoPoints;
              if (
                computed.totalPoints !== sub.totalPoints ||
                computed.autoPoints !== sub.autoPoints
              ) {
                void prisma.kASubmission
                  .update({
                    where: { id: sub.id },
                    data: {
                      totalPoints: computed.totalPoints,
                      autoPoints: computed.autoPoints,
                    },
                  })
                  .catch(() => {});
              }
            }
          } catch {
            /* HTML/Pfad — gespeicherte Werte belassen */
          }
          return {
            id: sub.id,
            kaFilePath: sub.kaFilePath,
            fileName,
            title,
            totalPoints,
            autoPoints,
            submittedAt: sub.submittedAt,
            answers,
            corrections: sub.corrections,
            schemaGrade: matchedGrade?.grade ?? null,
            schemaGradeLabel:
              matchedGrade?.grade != null ? formatGradeLabel(Number(matchedGrade.grade)) : null,
            schemaCategoryName: matchedGrade?.categoryName || null,
            classAveragePoints: stats?.avgPoints ?? null,
            classAverageGrade:
              stats && Number.isFinite(stats.avgGrade) ? stats.avgGrade : null,
            classAverageCount: stats?.count ?? 0,
            recentGrades: grades.slice(0, 8).map((g) => ({
              categoryName: g.categoryName,
              grade: g.grade,
              schemaName: g.schema?.name,
              gradingSystem: g.schema?.gradingSystem,
              updatedAt: g.updatedAt,
            })),
          };
        }),
      });
    } catch (error) {
      console.error('Error getting released results:', error);
      res.status(500).json({ error: 'Fehler beim Laden der Prüfungsergebnisse' });
    }
  }

  /** Lehrer: leere Abgabe für Schüler anlegen (z. B. Papierabgabe nachtragen) */
  static async createSubmissionForStudent(req: Request, res: Response) {
    try {
      const teacher = await requireTeacher(req);
      if (!teacher) return res.status(403).json({ error: 'Nur Lehrer' });

      const { kaFilePath, studentId, answers } = req.body as {
        kaFilePath?: string;
        studentId?: string;
        answers?: Record<string, unknown>;
      };

      if (!kaFilePath || !studentId) {
        return res.status(400).json({ error: 'kaFilePath und studentId sind erforderlich' });
      }

      const student = await prisma.user.findUnique({ where: { id: studentId } });
      if (!student || student.role !== 'STUDENT') {
        return res.status(400).json({ error: 'Ungültige Schüler-ID' });
      }

      const pathVariants = getPossiblePaths(kaFilePath);
      const existing = await prisma.kASubmission.findFirst({
        where: {
          studentId,
          OR: pathVariants.map((p) => ({ kaFilePath: p })),
        },
        include: {
          student: { select: { id: true, name: true, loginCode: true } },
          corrections: { where: { teacherId: teacher.id } },
        },
      });
      if (existing) {
        return res.json({ success: true, submission: existing, created: false });
      }

      const normalizedPath = kaFilePath.replace(/\\/g, '/').trim();
      const initialAnswers =
        answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};

      const submission = await prisma.kASubmission.create({
        data: {
          kaFilePath: normalizedPath,
          studentId,
          answers: JSON.stringify(initialAnswers),
          autoPoints: 0,
          totalPoints: 0,
          status: 'submitted',
        },
      });

      const updated = await KACorrectionController.recomputeSubmissionById(submission.id, teacher.id);
      res.json({ success: true, submission: updated, created: true });
    } catch (error) {
      console.error('Error creating submission for student:', error);
      res.status(500).json({ error: 'Fehler beim Anlegen der Abgabe' });
    }
  }

  /** Lehrer: Abgabe eines Schülers nachträglich ändern */
  static async updateSubmissionAnswers(req: Request, res: Response) {
    try {
      const teacher = await requireTeacher(req);
      if (!teacher) return res.status(403).json({ error: 'Nur Lehrer' });

      const { id } = req.params;
      const { answers } = req.body as { answers?: Record<string, unknown> };
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'answers ist erforderlich' });
      }

      const submission = await prisma.kASubmission.findUnique({
        where: { id },
        include: { corrections: true },
      });
      if (!submission) return res.status(404).json({ error: 'Abgabe nicht gefunden' });

      await prisma.kASubmission.update({
        where: { id },
        data: { answers: JSON.stringify(answers) },
      });
      const updated = await KACorrectionController.recomputeSubmissionById(id, teacher.id);
      res.json({ success: true, submission: updated });
    } catch (error) {
      console.error('Error updating submission answers:', error);
      res.status(500).json({ error: 'Fehler beim Aktualisieren der Abgabe' });
    }
  }

  /** Lehrer: Musterlösung (correctAnswers) in der Prüfungs-HTML ändern und neu bewerten */
  static async updateAnswerKey(req: Request, res: Response) {
    try {
      const teacher = await requireTeacher(req);
      if (!teacher) return res.status(403).json({ error: 'Nur Lehrer' });

      const { kaFilePath, answers } = req.body as {
        kaFilePath?: string;
        answers?: Record<string, string | string[] | number>;
      };
      if (!kaFilePath || !answers) {
        return res.status(400).json({ error: 'kaFilePath und answers sind erforderlich' });
      }

      const html = readExamHtml(kaFilePath);
      const updatedHtml = replaceCorrectAnswersInHtml(html, answers);
      writeExamHtml(kaFilePath, updatedHtml);
      const count = await KACorrectionController.recalculateAllForExam(kaFilePath);
      res.json({ success: true, recalculated: count });
    } catch (error) {
      console.error('Error updating answer key:', error);
      res.status(500).json({ error: 'Fehler beim Speichern der Musterlösung' });
    }
  }

  /** Lehrer: Alle Abgaben einer Prüfung neu automatisch bewerten */
  static async recalculateExam(req: Request, res: Response) {
    try {
      const teacher = await requireTeacher(req);
      if (!teacher) return res.status(403).json({ error: 'Nur Lehrer' });

      const { kaFilePath } = req.body as { kaFilePath?: string };
      if (!kaFilePath) return res.status(400).json({ error: 'kaFilePath ist erforderlich' });

      const count = await KACorrectionController.recalculateAllForExam(kaFilePath);
      res.json({ success: true, recalculated: count });
    } catch (error) {
      console.error('Error recalculating exam:', error);
      res.status(500).json({ error: 'Fehler bei der Neubewertung' });
    }
  }
}

