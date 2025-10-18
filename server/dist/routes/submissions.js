"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const submissionController_1 = require("../controllers/submissionController");
const router = express_1.default.Router();
// Assignment erstellen oder abrufen
router.post('/assignments', submissionController_1.getOrCreateAssignment);
// Abgabe hochladen
router.post('/submit', submissionController_1.upload.single('file'), submissionController_1.submitAssignment);
// Einzelne Submission abrufen
router.get('/submission/:assignmentId/:studentId', submissionController_1.getSubmission);
// Alle Submissions für ein Assignment abrufen (Lehrer)
router.get('/assignment/:assignmentId/submissions', submissionController_1.getAssignmentSubmissions);
// Submission-Datei herunterladen/anzeigen
router.get('/download/:submissionId', submissionController_1.downloadSubmission);
// Prüfen ob Schüler bereits abgegeben hat
router.get('/check', submissionController_1.checkStudentSubmission);
// Lehrer-Kommentar hinzufügen
router.post('/submission/:submissionId/comment', submissionController_1.addTeacherComment);
// Submission löschen
router.delete('/submission/:submissionId', submissionController_1.deleteSubmission);
// Abgabestatistik für einen Schüler
router.get('/student/:studentId/stats', submissionController_1.getStudentSubmissionStats);
exports.default = router;
//# sourceMappingURL=submissions.js.map