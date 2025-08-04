import express from 'express';
import { saveGrades, getGrades, getGradesByStudent } from '../controllers/GradesController';

const router = express.Router();

// POST /api/grades - Speichere Noten für einen Schüler
router.post('/', saveGrades);

// GET /api/grades/:studentId/:schemaId - Hole Noten für einen Schüler und ein Schema
router.get('/:studentId/:schemaId', getGrades);

// GET /api/grades/:studentId - Hole alle Noten für einen Schüler
router.get('/:studentId', getGradesByStudent);

export default router; 