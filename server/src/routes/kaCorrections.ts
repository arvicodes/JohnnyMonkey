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

// Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer)
router.post('/reset-all', KACorrectionController.resetAllSubmissions);

// Prüfe ob eigene Submission existiert (für Schüler)
router.get('/check-my-submission', KACorrectionController.checkMySubmission);

export default router;

