import express from 'express';
import { TeacherSettingsController } from '../controllers/TeacherSettingsController';

const router = express.Router();

// Materialpfad für einen Lehrer abrufen
router.get('/:teacherId/material-path', TeacherSettingsController.getMaterialPath);

// Materialpfad für einen Lehrer aktualisieren
router.put('/:teacherId/material-path', TeacherSettingsController.updateMaterialPath);

// Alle Lehrer-Einstellungen für einen Lehrer abrufen
router.get('/:teacherId', TeacherSettingsController.getTeacherSettings);

// Materialien in einem Verzeichnis automatisch erkennen
router.get('/:teacherId/discover-materials', TeacherSettingsController.discoverMaterials);

// Verzeichnisstruktur für einen Lehrer abrufen
router.get('/:teacherId/directory-structure', TeacherSettingsController.getDirectoryStructure);

export default router;
