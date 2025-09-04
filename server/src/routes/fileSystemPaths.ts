import express from 'express';
import { FileSystemPathController } from '../controllers/FileSystemPathController';

const router = express.Router();

// Alle Pfade abrufen (für die Ordner-Zuordnung)
router.get('/', FileSystemPathController.getAllPaths);

// Pfad speichern
router.post('/save', FileSystemPathController.savePath);

// Alle Pfade eines Lehrers abrufen
router.get('/teacher/:teacherId', FileSystemPathController.getPathsByTeacher);

// Verzeichnisstruktur eines Pfades lesen
router.get('/read', FileSystemPathController.readDirectory);


// HTML-Datei lesen
router.get('/read-html', FileSystemPathController.readHtmlFile);

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

export default router;
