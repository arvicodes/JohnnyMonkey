"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const FileSystemPathController_1 = require("../controllers/FileSystemPathController");
const router = express_1.default.Router();
// Configure multer for file uploads (memory storage for whiteboards)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit for whiteboard files
    }
});
// Alle Pfade abrufen (für die Ordner-Zuordnung)
router.get('/', FileSystemPathController_1.FileSystemPathController.getAllPaths);
// Pfad speichern
router.post('/save', FileSystemPathController_1.FileSystemPathController.savePath);
// Alle Pfade eines Lehrers abrufen
router.get('/teacher/:teacherId', FileSystemPathController_1.FileSystemPathController.getPathsByTeacher);
// Verzeichnisstruktur eines Pfades lesen
router.get('/read', FileSystemPathController_1.FileSystemPathController.readDirectory);
// Ordner in einem Pfad scannen (nur Verzeichnisse)
router.get('/scan-directory', FileSystemPathController_1.FileSystemPathController.scanDirectory);
// HTML-Datei lesen
router.get('/read-html', FileSystemPathController_1.FileSystemPathController.readHtmlFile);
// J-M-Reihen Pfad für aktuelle Umgebung abrufen
router.get('/jm-reihen-path', FileSystemPathController_1.FileSystemPathController.getJmReihenPath);
// DOCX-Datei lesen
router.get('/read-docx', FileSystemPathController_1.FileSystemPathController.readDocxFile);
// Excel-Datei lesen
router.get('/read-excel', FileSystemPathController_1.FileSystemPathController.readExcelFile);
// PowerPoint-Datei lesen
router.get('/read-powerpoint', FileSystemPathController_1.FileSystemPathController.readPowerPointFile);
// Bild-Datei lesen
router.get('/read-image', FileSystemPathController_1.FileSystemPathController.readImageFile);
// GoodNotes-Datei lesen
router.get('/read-goodnotes', FileSystemPathController_1.FileSystemPathController.readGoodNotesFile);
// Text-Datei lesen
router.get('/read-text', FileSystemPathController_1.FileSystemPathController.readTextFile);
// PDF-Datei lesen
router.get('/read-pdf', FileSystemPathController_1.FileSystemPathController.readPdfFile);
// PDF-Datei lesen mit sauberer URL (nur Dateiname)
router.get('/pdf/:filename', FileSystemPathController_1.FileSystemPathController.readPdfByFilename);
// Datei für Download bereitstellen
router.get('/download', FileSystemPathController_1.FileSystemPathController.downloadFile);
// Pfad löschen
router.delete('/:id', FileSystemPathController_1.FileSystemPathController.deletePath);
// Datei speichern (z.B. Whiteboard)
router.post('/save-file', upload.single('file'), FileSystemPathController_1.FileSystemPathController.saveFile);
// Datei speichern mit sendBeacon (für automatisches Speichern beim Schließen)
router.post('/save-file-beacon', FileSystemPathController_1.FileSystemPathController.saveFileBeacon);
// Whiteboard-Datei laden
router.get('/load-whiteboard', FileSystemPathController_1.FileSystemPathController.loadWhiteboardFile);
// Statische Dateien aus J-M-Reihen bedienen (CSS, JS, etc.)
router.get('/static/*', FileSystemPathController_1.FileSystemPathController.serveStaticFile);
// Prüfung erstellen (KA, KU, HU, QZ)
router.post('/create-examination', FileSystemPathController_1.FileSystemPathController.createExamination);
// Stunde erstellen (Ordner + Standardmaterialien)
router.post('/create-lesson-folder', FileSystemPathController_1.FileSystemPathController.createLessonFolder);
// Prüfungsinhalte generieren
router.post('/generate-examination-content', FileSystemPathController_1.FileSystemPathController.generateExaminationContent);
// Einzelfrage generieren
router.post('/generate-single-question', FileSystemPathController_1.FileSystemPathController.generateSingleQuestion);
// Alle Fragen einer Prüfung abrufen
router.get('/get-examination-questions', FileSystemPathController_1.FileSystemPathController.getExaminationQuestions);
// Einzelfrage aktualisieren
router.post('/update-single-question', FileSystemPathController_1.FileSystemPathController.updateSingleQuestion);
// Titel einer Prüfung aktualisieren
router.post('/update-examination-title', FileSystemPathController_1.FileSystemPathController.updateExaminationTitle);
exports.default = router;
//# sourceMappingURL=fileSystemPaths.js.map