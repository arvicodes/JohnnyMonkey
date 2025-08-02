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
exports.removeQuizFromLesson = exports.getAvailableQuizzes = exports.getLessonQuiz = exports.assignQuizToLesson = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const assignQuizToLesson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lessonId, quizId } = req.body;
        if (!lessonId || !quizId) {
            return res.status(400).json({ error: 'Lesson-ID und Quiz-ID sind erforderlich' });
        }
        // Check if assignment already exists
        const existingAssignment = yield prisma.lessonQuiz.findUnique({
            where: {
                lessonId_quizId: {
                    lessonId,
                    quizId
                }
            }
        });
        if (existingAssignment) {
            return res.status(400).json({ error: 'Quiz ist bereits dieser Stunde zugeordnet' });
        }
        // Remove all existing materials from this lesson first
        yield prisma.lessonMaterial.deleteMany({
            where: { lessonId }
        });
        const lessonQuiz = yield prisma.lessonQuiz.create({
            data: {
                lessonId,
                quizId
            },
            include: {
                lesson: true,
                quiz: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        res.json(lessonQuiz);
    }
    catch (error) {
        console.error('Error assigning quiz to lesson:', error);
        res.status(500).json({ error: 'Fehler beim Zuordnen des Quiz' });
    }
});
exports.assignQuizToLesson = assignQuizToLesson;
const getLessonQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lessonId } = req.params;
        const lessonQuiz = yield prisma.lessonQuiz.findFirst({
            where: { lessonId },
            include: {
                quiz: {
                    include: {
                        questions: {
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    }
                }
            }
        });
        if (!lessonQuiz) {
            return res.status(404).json({ error: 'Kein Quiz für diese Stunde gefunden' });
        }
        // Deserialize options for each question
        const quizWithParsedOptions = Object.assign(Object.assign({}, lessonQuiz), { quiz: Object.assign(Object.assign({}, lessonQuiz.quiz), { questions: lessonQuiz.quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) }) });
        res.json(quizWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching lesson quiz:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen des Quiz' });
    }
});
exports.getLessonQuiz = getLessonQuiz;
const getAvailableQuizzes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        console.error('Error fetching available quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der verfügbaren Quizze' });
    }
});
exports.getAvailableQuizzes = getAvailableQuizzes;
const removeQuizFromLesson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { lessonId } = req.params;
        if (!lessonId) {
            return res.status(400).json({ error: 'Lesson-ID ist erforderlich' });
        }
        // Delete all quiz assignments for this lesson
        const deletedCount = yield prisma.lessonQuiz.deleteMany({
            where: {
                lessonId
            }
        });
        res.json({ message: `Quiz erfolgreich von der Stunde entfernt`, deletedCount });
    }
    catch (error) {
        console.error('Error removing quiz from lesson:', error);
        res.status(500).json({ error: 'Fehler beim Entfernen des Quiz' });
    }
});
exports.removeQuizFromLesson = removeQuizFromLesson;
