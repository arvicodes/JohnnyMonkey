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
exports.deleteQuiz = exports.updateQuiz = exports.getQuiz = exports.getQuizzes = exports.createQuiz = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const createQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, sourceFile, title, description, timeLimit, shuffleQuestions, shuffleAnswers } = req.body;
        if (!teacherId || !sourceFile || !title) {
            return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Titel sind erforderlich' });
        }
        // For now, create a basic quiz without parsing the Word file
        // In a real implementation, you would parse the Word file here
        const quiz = yield prisma.quiz.create({
            data: {
                title,
                description: description || '',
                sourceFile,
                timeLimit: timeLimit || 30,
                shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : true,
                shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : true,
                teacherId
            },
            include: {
                questions: true
            }
        });
        res.json(quiz);
    }
    catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Quiz' });
    }
});
exports.createQuiz = createQuiz;
const getQuizzes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.query;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        const quizzes = yield prisma.quiz.findMany({
            where: {
                teacherId: teacherId
            },
            include: {
                questions: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(quizzes);
    }
    catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Quizze' });
    }
});
exports.getQuizzes = getQuizzes;
const getQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const quiz = yield prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz nicht gefunden' });
        }
        res.json(quiz);
    }
    catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Quiz' });
    }
});
exports.getQuiz = getQuiz;
const updateQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description, timeLimit, shuffleQuestions, shuffleAnswers } = req.body;
        const quiz = yield prisma.quiz.update({
            where: { id },
            data: {
                title,
                description,
                timeLimit,
                shuffleQuestions,
                shuffleAnswers
            },
            include: {
                questions: true
            }
        });
        res.json(quiz);
    }
    catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Quiz' });
    }
});
exports.updateQuiz = updateQuiz;
const deleteQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.quiz.delete({
            where: { id }
        });
        res.json({ message: 'Quiz erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Quiz' });
    }
});
exports.deleteQuiz = deleteQuiz;
