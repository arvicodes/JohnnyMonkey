import express from 'express';
import multer from 'multer';
import { FileSystemPathController } from '../controllers/FileSystemPathController';

const router = express.Router();

// Configure multer for file uploads (memory storage for whiteboards)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

// Datei für Download bereitstellen
router.get('/download', FileSystemPathController.downloadFile);

// Pfad löschen
router.delete('/:id', FileSystemPathController.deletePath);

// Datei speichern (z.B. Whiteboard)
router.post('/save-file', upload.single('file'), FileSystemPathController.saveFile);

// Whiteboard-Datei laden
router.get('/load-whiteboard', FileSystemPathController.loadWhiteboardFile);

export default router;
