"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const KACorrectionController_1 = require("../controllers/KACorrectionController");
const router = express_1.default.Router();
// Abgabe einer Klassenarbeit speichern
router.post('/submit', KACorrectionController_1.KACorrectionController.submitKA);
// Alle Abgaben für eine Klassenarbeit abrufen (für Lehrer)
router.get('/submissions', KACorrectionController_1.KACorrectionController.getSubmissions);
// Einzelne Abgabe mit Details abrufen
router.get('/submissions/:id', KACorrectionController_1.KACorrectionController.getSubmission);
// Korrektur speichern/aktualisieren
router.post('/corrections', KACorrectionController_1.KACorrectionController.saveCorrection);
// Status der Abgabe aktualisieren
router.patch('/submissions/:id/status', KACorrectionController_1.KACorrectionController.updateStatus);
// Krank markieren (nicht im Klassenschnitt)
router.patch('/submissions/:id/marked-sick', KACorrectionController_1.KACorrectionController.setMarkedSick);
// Abgabe nachträglich bearbeiten (Lehrer)
router.patch('/submissions/:id/answers', KACorrectionController_1.KACorrectionController.updateSubmissionAnswers);
// Leere Abgabe für Schüler anlegen (Lehrer, ohne SuS-Abgabe)
router.post('/submissions/create-for-student', KACorrectionController_1.KACorrectionController.createSubmissionForStudent);
// Musterlösung ändern + alle Abgaben neu bewerten
router.post('/answer-key', KACorrectionController_1.KACorrectionController.updateAnswerKey);
// Alle Abgaben neu automatisch bewerten
router.post('/recalculate', KACorrectionController_1.KACorrectionController.recalculateExam);
// Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer)
router.post('/reset-all', KACorrectionController_1.KACorrectionController.resetAllSubmissions);
router.post('/reset-exam-session', KACorrectionController_1.KACorrectionController.resetExamSession);
// Prüfe ob eigene Submission existiert (für Schüler)
router.get('/check-my-submission', KACorrectionController_1.KACorrectionController.checkMySubmission);
// Freigegebene Prüfungsergebnisse (für Schüler)
router.get('/my-released', KACorrectionController_1.KACorrectionController.getMyReleasedResults);
// Alle Noten für eine Klassenarbeit freigeben/zurücknehmen (nur für Lehrer)
router.post('/release-all', KACorrectionController_1.KACorrectionController.releaseAllGrades);
// Freigabestatus für eine Klassenarbeit prüfen (nur für Lehrer)
router.get('/release-status', KACorrectionController_1.KACorrectionController.getReleaseStatus);
router.patch('/submissions/:id/exam-version', KACorrectionController_1.KACorrectionController.updateSubmissionExamVersion);
router.post('/submissions/:id/reset', KACorrectionController_1.KACorrectionController.resetOneSubmission);
exports.default = router;
//# sourceMappingURL=kaCorrections.js.map