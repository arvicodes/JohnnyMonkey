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
exports.stopQuizSession = exports.getSessionResults = exports.getSessionsForQuiz = exports.getSessionById = exports.getQuizForSession = exports.getActiveSession = exports.startQuizSession = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Start a quiz session (teacher only)
const startQuizSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { quizId } = req.params;
        const { teacherId } = req.body;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        // Check if quiz exists and belongs to teacher
        const quiz = yield prisma.quiz.findFirst({
            where: {
                id: quizId,
                teacherId: teacherId
            }
        });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz nicht gefunden oder Sie haben keine Berechtigung' });
        }
        // Check if there's already an active session
        const existingSession = yield prisma.quizSession.findFirst({
            where: {
                quizId: quizId,
                isActive: true
            }
        });
        if (existingSession) {
            return res.status(400).json({ error: 'Es läuft bereits eine aktive Session für dieses Quiz' });
        }
        // Create new session
        const session = yield prisma.quizSession.create({
            data: {
                quizId: quizId,
                isActive: true,
                startedAt: new Date()
            },
            include: {
                participations: {
                    include: {
                        student: true
                    }
                },
                quiz: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        res.json(session);
    }
    catch (error) {
        console.error('Error starting quiz session:', error);
        res.status(500).json({ error: 'Fehler beim Starten der Quiz-Session' });
    }
});
exports.startQuizSession = startQuizSession;
// Get active session for a quiz
const getActiveSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { quizId } = req.params;
        const session = yield prisma.quizSession.findFirst({
            where: {
                quizId: quizId,
                isActive: true
            },
            include: {
                participations: {
                    include: {
                        student: true
                    }
                },
                quiz: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        if (!session) {
            return res.status(404).json({ error: 'Keine aktive Session gefunden' });
        }
        res.json(session);
    }
    catch (error) {
        console.error('Error getting active session:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der aktiven Session' });
    }
});
exports.getActiveSession = getActiveSession;
// Get quiz data for a session (student only)
const getQuizForSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const session = yield prisma.quizSession.findFirst({
            where: {
                id: sessionId,
                isActive: true
            },
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
        if (!session) {
            return res.status(404).json({ error: 'Session nicht gefunden oder nicht aktiv' });
        }
        // Prepare quiz data for student (without correct answers)
        const quizForStudent = {
            id: session.quiz.id,
            title: session.quiz.title,
            description: session.quiz.description,
            timeLimit: session.quiz.timeLimit,
            shuffleQuestions: session.quiz.shuffleQuestions,
            shuffleAnswers: session.quiz.shuffleAnswers,
            questions: session.quiz.questions.map((q) => ({
                id: q.id,
                question: q.question,
                options: JSON.parse(q.options),
                order: q.order
            }))
        };
        res.json(quizForStudent);
    }
    catch (error) {
        console.error('Error getting quiz for session:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Quiz-Daten' });
    }
});
exports.getQuizForSession = getQuizForSession;
// Get session by ID
const getSessionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const session = yield prisma.quizSession.findUnique({
            where: {
                id: sessionId
            },
            include: {
                participations: {
                    include: {
                        student: true
                    }
                },
                quiz: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        if (!session) {
            return res.status(404).json({ error: 'Session nicht gefunden' });
        }
        res.json(session);
    }
    catch (error) {
        console.error('Error getting session by ID:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Session' });
    }
});
exports.getSessionById = getSessionById;
// Get all sessions for a quiz
const getSessionsForQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const quizId = req.params.quizId;
        const sessions = yield prisma.quizSession.findMany({
            where: {
                quizId: quizId
            },
            include: {
                participations: {
                    include: {
                        student: true
                    }
                },
                quiz: {
                    include: {
                        questions: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(sessions);
    }
    catch (error) {
        console.error('Error getting sessions for quiz:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Sessions' });
    }
});
exports.getSessionsForQuiz = getSessionsForQuiz;
// Get session results (teacher only)
const getSessionResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const teacherId = req.query.teacherId;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        const session = yield prisma.quizSession.findFirst({
            where: {
                id: sessionId,
                quiz: {
                    teacherId: teacherId
                }
            },
            include: {
                participations: {
                    include: {
                        student: true,
                        answers: {
                            include: {
                                question: true
                            }
                        }
                    }
                },
                quiz: {
                    include: {
                        questions: true
                    }
                }
            }
        });
        if (!session) {
            return res.status(404).json({ error: 'Session nicht gefunden oder Sie haben keine Berechtigung' });
        }
        res.json(session);
    }
    catch (error) {
        console.error('Error getting session results:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Session-Ergebnisse' });
    }
});
exports.getSessionResults = getSessionResults;
// Stop quiz session
const stopQuizSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const { teacherId } = req.body;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        const session = yield prisma.quizSession.findUnique({
            where: { id: sessionId },
            include: {
                quiz: true
            }
        });
        if (!session) {
            return res.status(404).json({ error: 'Session nicht gefunden' });
        }
        if (session.quiz.teacherId !== teacherId) {
            return res.status(403).json({ error: 'Nur der Quiz-Ersteller kann die Session beenden' });
        }
        yield prisma.quizSession.update({
            where: { id: sessionId },
            data: {
                isActive: false,
                endedAt: new Date()
            }
        });
        res.json({ message: 'Session erfolgreich beendet' });
    }
    catch (error) {
        console.error('Error stopping quiz session:', error);
        res.status(500).json({ error: 'Fehler beim Beenden der Session' });
    }
});
exports.stopQuizSession = stopQuizSession;
