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
exports.getAvailableQuizzes = exports.getLessonQuiz = exports.assignQuizToLesson = void 0;
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
            where: {
                lessonId
            },
            include: {
                lesson: true,
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
        res.json(lessonQuiz);
    }
    catch (error) {
        console.error('Error fetching lesson quiz:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Quiz' });
    }
});
exports.getLessonQuiz = getLessonQuiz;
const getAvailableQuizzes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        const quizzes = yield prisma.quiz.findMany({
            where: {
                teacherId
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
        console.error('Error fetching available quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Laden der verfügbaren Quizze' });
    }
});
exports.getAvailableQuizzes = getAvailableQuizzes;
