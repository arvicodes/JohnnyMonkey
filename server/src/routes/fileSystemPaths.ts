import express from 'express';
import multer from 'multer';
import { FileSystemPathController } from '../controllers/FileSystemPathController';

const router = express.Router();

// Configure multer for file uploads (memory storage for whiteboards)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for whiteboard files
  }
});

// Alle Pfade abrufen (für die Ordner-Zuordnung)
router.get('/', FileSystemPathController.getAllPaths);

// Pfad speichern
router.post('/save', FileSystemPathController.savePath);

// Alle Pfade eines Lehrers abrufen
router.get('/teacher/:teacherId', FileSystemPathController.getPathsByTeacher);

// Verzeichnisstruktur eines Pfades lesen
router.get('/read', FileSystemPathController.readDirectory);

// Ordner in einem Pfad scannen (nur Verzeichnisse)
router.get('/scan-directory', FileSystemPathController.scanDirectory);


// HTML-Datei lesen
router.get('/read-html', FileSystemPathController.readHtmlFile);

// J-M-Reihen Pfad für aktuelle Umgebung abrufen
router.get('/jm-reihen-path', FileSystemPathController.getJmReihenPath);

// DOCX-Datei lesen
router.get('/read-docx', FileSystemPathController.readDocxFile);

// Excel-Datei lesen
router.get('/read-excel', FileSystemPathController.readExcelFile);

// PowerPoint-Datei lesen
router.get('/read-powerpoint', FileSystemPathController.readPowerPointFile);

// Bild-Datei lesen
router.get('/read-image', FileSystemPathController.readImageFile);

// GoodNotes-Datei lesen
router.get('/read-goodnotes', FileSystemPathController.readGoodNotesFile);

// Text-Datei lesen
router.get('/read-text', FileSystemPathController.readTextFile);

// PDF-Datei lesen
router.get('/read-pdf', FileSystemPathController.readPdfFile);

// PDF-Datei lesen mit sauberer URL (nur Dateiname)
router.get('/pdf/:filename', FileSystemPathController.readPdfByFilename);

// Datei für Download bereitstellen
router.get('/download', FileSystemPathController.downloadFile);

// Pfad löschen
router.delete('/:id', FileSystemPathController.deletePath);

// Datei speichern (z.B. Whiteboard)
router.post('/save-file', upload.single('file'), FileSystemPathController.saveFile);

// Datei speichern mit sendBeacon (für automatisches Speichern beim Schließen)
router.post('/save-file-beacon', FileSystemPathController.saveFileBeacon);

// Whiteboard-Datei laden
router.get('/load-whiteboard', FileSystemPathController.loadWhiteboardFile);

// Statische Dateien aus J-M-Reihen bedienen (CSS, JS, etc.)
router.get('/static/*', FileSystemPathController.serveStaticFile);

// Prüfung erstellen (KA, KU, HU, QZ)
router.post('/create-examination', FileSystemPathController.createExamination);

// Stunde erstellen (Ordner + Standardmaterialien)
router.post('/create-lesson-folder', FileSystemPathController.createLessonFolder);

// Prüfungsinhalte generieren
router.post('/generate-examination-content', FileSystemPathController.generateExaminationContent);

// Einzelfrage generieren
router.post('/generate-single-question', FileSystemPathController.generateSingleQuestion);

// Alle Fragen einer Prüfung abrufen
router.get('/get-examination-questions', FileSystemPathController.getExaminationQuestions);

// Einzelfrage aktualisieren
router.post('/update-single-question', FileSystemPathController.updateSingleQuestion);

// Titel einer Prüfung aktualisieren
router.post('/update-examination-title', FileSystemPathController.updateExaminationTitle);

export default router;
