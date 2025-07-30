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
exports.getQuizzesByTeacher = exports.deleteQuiz = exports.updateQuiz = exports.getQuiz = exports.getQuizzes = exports.createQuiz = void 0;
const prisma_1 = require("../generated/prisma");
const wordParser_1 = require("../utils/wordParser");
const prisma = new prisma_1.PrismaClient();
const createQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, sourceFile, title, description, timeLimit, shuffleQuestions, shuffleAnswers } = req.body;
        if (!teacherId || !sourceFile || !title) {
            return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Titel sind erforderlich' });
        }
        // Parse the Word file to extract questions
        console.log('Parsing Word file for quiz creation:', sourceFile);
        const parsedQuestions = yield (0, wordParser_1.parseWordFile)(sourceFile);
        if (parsedQuestions.length === 0) {
            return res.status(400).json({ error: 'Keine Fragen in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
        }
        // Create the quiz with questions
        const quiz = yield prisma.quiz.create({
            data: {
                title,
                description: description || '',
                sourceFile,
                timeLimit: timeLimit || 30,
                shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : true,
                shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : true,
                teacherId,
                questions: {
                    create: parsedQuestions.map((q, index) => ({
                        question: q.question,
                        correctAnswer: q.correctAnswer,
                        options: JSON.stringify(q.options),
                        order: index + 1
                    }))
                }
            },
            include: {
                questions: true
            }
        });
        console.log(`Quiz created successfully with ${parsedQuestions.length} questions`);
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
        const quizzes = yield prisma.quiz.findMany({
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        // Deserialize options for each question
        const quizzesWithParsedOptions = quizzes.map(quiz => (Object.assign(Object.assign({}, quiz), { questions: quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) })));
        res.json(quizzesWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Quizzes' });
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
        // Deserialize options for each question
        const quizWithParsedOptions = Object.assign(Object.assign({}, quiz), { questions: quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) });
        res.json(quizWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen des Quiz' });
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
const getQuizzesByTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        const quizzes = yield prisma.quiz.findMany({
            where: { teacherId },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        // Deserialize options for each question
        const quizzesWithParsedOptions = quizzes.map(quiz => (Object.assign(Object.assign({}, quiz), { questions: quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) })));
        res.json(quizzesWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching teacher quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Lehrer-Quizzes' });
    }
});
exports.getQuizzesByTeacher = getQuizzesByTeacher;
