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
// Alle Abgaben für eine Klassenarbeit zurücksetzen (nur für Lehrer)
router.post('/reset-all', KACorrectionController_1.KACorrectionController.resetAllSubmissions);
// Prüfe ob eigene Submission existiert (für Schüler)
router.get('/check-my-submission', KACorrectionController_1.KACorrectionController.checkMySubmission);
exports.default = router;
//# sourceMappingURL=kaCorrections.js.map