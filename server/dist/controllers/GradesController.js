"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradeRelease = exports.toggleGradeRelease = exports.getGradesByStudent = exports.getGrades = exports.saveGrades = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const saveGrades = async (req, res) => {
    try {
        const { studentId, schemaId, grades } = req.body;
        if (!studentId || !schemaId || !grades || !Array.isArray(grades)) {
            return res.status(400).json({ error: 'Ungültige Daten' });
        }
        // Verwende upsert für jede Note (erstellt neue oder aktualisiert bestehende)
        const createdGrades = await Promise.all(grades.map((gradeData) => prisma.grade.upsert({
            where: {
                studentId_schemaId_categoryName: {
                    studentId,
                    schemaId,
                    categoryName: gradeData.categoryName
                }
            },
            update: {
                grade: gradeData.grade,
                weight: gradeData.weight
            },
            create: {
                studentId,
                schemaId,
                categoryName: gradeData.categoryName,
                grade: gradeData.grade,
                weight: gradeData.weight
            }
        })));
        res.status(201).json(createdGrades);
    }
    catch (error) {
        console.error('Error saving grades:', error);
        res.status(500).json({ error: 'Fehler beim Speichern der Noten' });
    }
};
exports.saveGrades = saveGrades;
const getGrades = async (req, res) => {
    try {
        const { studentId, schemaId } = req.params;
        if (!studentId || !schemaId) {
            return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
        }
        const grades = await prisma.grade.findMany({
            where: {
                studentId,
                schemaId
            },
            orderBy: {
                categoryName: 'asc'
            }
        });
        res.json(grades);
    }
    catch (error) {
        console.error('Error fetching grades:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Noten' });
    }
};
exports.getGrades = getGrades;
const getGradesByStudent = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID erforderlich' });
        }
        const grades = await prisma.grade.findMany({
            where: {
                studentId
            },
            include: {
                schema: true
            },
            orderBy: {
                schemaId: 'asc'
            }
        });
        res.json(grades);
    }
    catch (error) {
        console.error('Error fetching student grades:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Schüler-Noten' });
    }
};
exports.getGradesByStudent = getGradesByStudent;
// Freigabe der Gesamtnote für einen Schüler
const toggleGradeRelease = async (req, res) => {
    try {
        const { studentId, schemaId, isReleased } = req.body;
        console.log('toggleGradeRelease - Request body:', req.body);
        console.log('toggleGradeRelease - studentId:', studentId, 'schemaId:', schemaId, 'isReleased:', isReleased);
        if (!studentId || !schemaId) {
            return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
        }
        const gradeRelease = await prisma.gradeRelease.upsert({
            where: {
                studentId_schemaId: {
                    studentId,
                    schemaId
                }
            },
            update: {
                isReleased: isReleased !== undefined ? isReleased : true
            },
            create: {
                studentId,
                schemaId,
                isReleased: isReleased !== undefined ? isReleased : true
            }
        });
        console.log('toggleGradeRelease - Success:', gradeRelease);
        res.json(gradeRelease);
    }
    catch (error) {
        console.error('Error toggling grade release:', error);
        console.error('Error details:', error.message, error.stack);
        res.status(500).json({ error: 'Fehler beim Freigeben der Gesamtnote', details: error.message });
    }
};
exports.toggleGradeRelease = toggleGradeRelease;
// Hole Freigabestatus für einen Schüler und Schema
const getGradeRelease = async (req, res) => {
    try {
        const { studentId, schemaId } = req.params;
        if (!studentId || !schemaId) {
            return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
        }
        const gradeRelease = await prisma.gradeRelease.findUnique({
            where: {
                studentId_schemaId: {
                    studentId,
                    schemaId
                }
            }
        });
        res.json(gradeRelease || { isReleased: false });
    }
    catch (error) {
        console.error('Error fetching grade release:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Freigabestatus' });
    }
};
exports.getGradeRelease = getGradeRelease;
//# sourceMappingURL=GradesController.js.map