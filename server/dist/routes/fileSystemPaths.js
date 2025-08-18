"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FileSystemPathController_1 = require("../controllers/FileSystemPathController");
const router = express_1.default.Router();
// Alle Pfade abrufen (für die Ordner-Zuordnung)
router.get('/', FileSystemPathController_1.FileSystemPathController.getAllPaths);
// Pfad speichern
router.post('/save', FileSystemPathController_1.FileSystemPathController.savePath);
// Alle Pfade eines Lehrers abrufen
router.get('/teacher/:teacherId', FileSystemPathController_1.FileSystemPathController.getPathsByTeacher);
// Verzeichnisstruktur eines Pfades lesen
router.get('/read', FileSystemPathController_1.FileSystemPathController.readDirectory);
// HTML-Datei lesen
router.get('/read-html', FileSystemPathController_1.FileSystemPathController.readHtmlFile);
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
// Datei für Download bereitstellen
router.get('/download', FileSystemPathController_1.FileSystemPathController.downloadFile);
// Pfad löschen
router.delete('/:id', FileSystemPathController_1.FileSystemPathController.deletePath);
exports.default = router;
