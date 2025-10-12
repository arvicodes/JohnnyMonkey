import express from 'express';
import {
  getOrCreateAssignment,
  submitAssignment,
  getSubmission,
  getAssignmentSubmissions,
  downloadSubmission,
  checkStudentSubmission,
  deleteSubmission,
  addTeacherComment,
  upload
} from '../controllers/submissionController';

const router = express.Router();

// Assignment erstellen oder abrufen
router.post('/assignments', getOrCreateAssignment);

// Abgabe hochladen
router.post('/submit', upload.single('file'), submitAssignment);

// Einzelne Submission abrufen
router.get('/submission/:assignmentId/:studentId', getSubmission);

// Alle Submissions für ein Assignment abrufen (Lehrer)
router.get('/assignment/:assignmentId/submissions', getAssignmentSubmissions);

// Submission-Datei herunterladen/anzeigen
router.get('/download/:submissionId', downloadSubmission);

// Prüfen ob Schüler bereits abgegeben hat
router.get('/check', checkStudentSubmission);

// Lehrer-Kommentar hinzufügen
router.post('/submission/:submissionId/comment', addTeacherComment);

// Submission löschen
router.delete('/submission/:submissionId', deleteSubmission);

export default router;

