import express from 'express';
import { FileSystemPathController } from '../controllers/FileSystemPathController';

const router = express.Router();

// Alle Pfade eines Lehrers abrufen
router.get('/teacher/:teacherId', FileSystemPathController.getPathsByTeacher);

// Neuen Pfad erstellen
router.post('/', FileSystemPathController.createPath);

// Pfad aktualisieren
router.put('/:id', FileSystemPathController.updatePath);

// Pfad löschen
router.delete('/:id', FileSystemPathController.deletePath);

// Ordnerstruktur eines Pfads lesen
router.get('/structure/:path(*)', FileSystemPathController.getFolderStructure);

export default router;
