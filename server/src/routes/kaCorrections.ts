import express from 'express';
import { KACorrectionController } from '../controllers/KACorrectionController';

const router = express.Router();

// Abgabe einer Klassenarbeit speichern
router.post('/submit', KACorrectionController.submitKA);

// Alle Abgaben für eine Klassenarbeit abrufen (für Lehrer)
router.get('/submissions', KACorrectionController.getSubmissions);

// Einzelne Abgabe mit Details abrufen
router.get('/submissions/:id', KACorrectionController.getSubmission);

// Korrektur speichern/aktualisieren
router.post('/corrections', KACorrectionController.saveCorrection);

// Status der Abgabe aktualisieren
router.patch('/submissions/:id/status', KACorrectionController.updateStatus);

// Krank markieren (nicht im Klassenschnitt)
router.patch('/submissions/:id/marked-sick', KACorrectionController.setMarkedSick);

// Abgabe nachträglich bearbeiten (Lehrer)
router.patch('/submissions/:id/answers', KACorrectionController.updateSubmissionAnswers);

// Leere Abgabe für Schüler anlegen (Lehrer, ohne SuS-Abgabe)
router.post('/submissions/create-for-student', KACorrectionController.createSubmissionForStudent);

// Musterlösung ändern + alle Abgaben neu bewerten
router.post('/answer-key', KACorrectionController.updateAnswerKey);

// Alle Abgaben neu automatisch bewerten
router.post('/recalculate', KACorrectionController.recalculateExam);

// Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer)
router.post('/reset-all', KACorrectionController.resetAllSubmissions);

router.post('/reset-exam-session', KACorrectionController.resetExamSession);

// Prüfe ob eigene Submission existiert (für Schüler)
router.get('/check-my-submission', KACorrectionController.checkMySubmission);

// Freigegebene Prüfungsergebnisse (für Schüler)
router.get('/my-released', KACorrectionController.getMyReleasedResults);

// Alle Noten für eine Klassenarbeit freigeben/zurücknehmen (nur für Lehrer)
router.post('/release-all', KACorrectionController.releaseAllGrades);

// Freigabestatus für eine Klassenarbeit prüfen (nur für Lehrer)
router.get('/release-status', KACorrectionController.getReleaseStatus);

router.patch('/submissions/:id/exam-version', KACorrectionController.updateSubmissionExamVersion);

export default router;

