"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradesByStudent = exports.getGrades = exports.saveGrades = void 0;
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
//# sourceMappingURL=GradesController.js.map