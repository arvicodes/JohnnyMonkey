"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGradesByStudent = exports.getGrades = exports.saveGrades = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const saveGrades = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, schemaId, grades } = req.body;
        if (!studentId || !schemaId || !grades || !Array.isArray(grades)) {
            return res.status(400).json({ error: 'Ungültige Daten' });
        }
        // Verwende upsert für jede Note (erstellt neue oder aktualisiert bestehende)
        const createdGrades = yield Promise.all(grades.map((gradeData) => prisma.grade.upsert({
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
});
exports.saveGrades = saveGrades;
const getGrades = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, schemaId } = req.params;
        if (!studentId || !schemaId) {
            return res.status(400).json({ error: 'Student ID und Schema ID erforderlich' });
        }
        const grades = yield prisma.grade.findMany({
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
});
exports.getGrades = getGrades;
const getGradesByStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID erforderlich' });
        }
        const grades = yield prisma.grade.findMany({
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
});
exports.getGradesByStudent = getGradesByStudent;
