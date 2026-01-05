import express from 'express';
import { saveGrades, getGrades, getGradesByStudent, toggleGradeRelease, getGradeRelease, saveBulkGrades, releaseBulkGrades } from '../controllers/GradesController';

const router = express.Router();

// POST /api/grades - Speichere Noten für einen Schüler
router.post('/', saveGrades);

// POST /api/grades/save-bulk - Speichere Noten für mehrere Schüler auf einmal
router.post('/save-bulk', saveBulkGrades);

// POST /api/grades/release - Freigabe der Gesamtnote
router.post('/release', toggleGradeRelease);

// POST /api/grades/release-bulk - Freigabe der Noten für mehrere Schüler auf einmal
router.post('/release-bulk', releaseBulkGrades);

// GET /api/grades/release/:studentId/:schemaId - Hole Freigabestatus
router.get('/release/:studentId/:schemaId', getGradeRelease);

// GET /api/grades/:studentId/:schemaId - Hole Noten für einen Schüler und ein Schema
router.get('/:studentId/:schemaId', getGrades);

// GET /api/grades/:studentId - Hole alle Noten für einen Schüler
router.get('/:studentId', getGradesByStudent);

export default router; 