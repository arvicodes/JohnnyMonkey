"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeQuizFromLesson = exports.getAvailableQuizzes = exports.getLessonQuiz = exports.assignQuizToLesson = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const assignQuizToLesson = async (req, res) => {
    try {
        const { lessonId, quizId } = req.body;
        if (!lessonId || !quizId) {
            return res.status(400).json({ error: 'Lesson-ID und Quiz-ID sind erforderlich' });
        }
        // Check if assignment already exists
        const existingAssignment = await prisma.lessonQuiz.findUnique({
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
        await prisma.lessonMaterial.deleteMany({
            where: { lessonId }
        });
        const lessonQuiz = await prisma.lessonQuiz.create({
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
};
exports.assignQuizToLesson = assignQuizToLesson;
const getLessonQuiz = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const lessonQuiz = await prisma.lessonQuiz.findFirst({
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
        const quizWithParsedOptions = {
            ...lessonQuiz,
            quiz: {
                ...lessonQuiz.quiz,
                questions: lessonQuiz.quiz.questions.map(q => ({
                    ...q,
                    options: JSON.parse(q.options)
                }))
            }
        };
        res.json(quizWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching lesson quiz:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen des Quiz' });
    }
};
exports.getLessonQuiz = getLessonQuiz;
const getAvailableQuizzes = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const quizzes = await prisma.quiz.findMany({
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
        const quizzesWithParsedOptions = quizzes.map(quiz => ({
            ...quiz,
            questions: quiz.questions.map(q => ({
                ...q,
                options: JSON.parse(q.options)
            }))
        }));
        res.json(quizzesWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching available quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der verfügbaren Quizze' });
    }
};
exports.getAvailableQuizzes = getAvailableQuizzes;
const removeQuizFromLesson = async (req, res) => {
    try {
        const { lessonId } = req.params;
        if (!lessonId) {
            return res.status(400).json({ error: 'Lesson-ID ist erforderlich' });
        }
        // Delete all quiz assignments for this lesson
        const deletedCount = await prisma.lessonQuiz.deleteMany({
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
};
exports.removeQuizFromLesson = removeQuizFromLesson;
//# sourceMappingURL=LessonQuizController.js.map