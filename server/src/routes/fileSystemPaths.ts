import express from 'express';
import { FileSystemPathController } from '../controllers/FileSystemPathController';

const router = express.Router();

// Pfad speichern
router.post('/save', FileSystemPathController.savePath);

// Alle Pfade eines Lehrers abrufen
router.get('/teacher/:teacherId', FileSystemPathController.getPathsByTeacher);

// Verzeichnisstruktur eines Pfades lesen
router.get('/read', FileSystemPathController.readDirectory);

// HTML-Datei lesen
router.get('/read-html', FileSystemPathController.readHtmlFile);

// PDF-Datei lesen
router.get('/read-pdf', FileSystemPathController.readPdfFile);

// DOCX-Datei lesen
router.get('/read-docx', FileSystemPathController.readDocxFile);

// Pfad löschen
router.delete('/:id', FileSystemPathController.deletePath);

export default router;
