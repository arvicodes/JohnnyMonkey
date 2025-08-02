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
exports.deleteParticipation = exports.getQuizStatistics = exports.resetParticipation = exports.getParticipationStatus = exports.getParticipationResultsForTeacher = exports.getParticipationResults = exports.submitAnswers = exports.startParticipation = void 0;
const prisma_1 = require("../generated/prisma");
const prisma = new prisma_1.PrismaClient();
// Start participation in a quiz session (student only)
const startParticipation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const { studentId } = req.body;
        // Check if session is active
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
            return res.status(404).json({ error: 'Keine aktive Quiz-Session gefunden' });
        }
        // Check if student already participated and completed
        const existingParticipation = yield prisma.quizParticipation.findUnique({
            where: {
                sessionId_studentId: {
                    sessionId: sessionId,
                    studentId: studentId
                }
            }
        });
        if (existingParticipation && existingParticipation.completedAt) {
            return res.status(400).json({ error: 'Sie haben bereits an diesem Quiz teilgenommen' });
        }
        // If participation exists but is not completed (was reset), return existing participation
        if (existingParticipation && !existingParticipation.completedAt) {
            // Update the start time to now
            const updatedParticipation = yield prisma.quizParticipation.update({
                where: {
                    id: existingParticipation.id
                },
                data: {
                    startedAt: new Date()
                },
                include: {
                    session: {
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
                    }
                }
            });
            // Prepare quiz data for student (without correct answers)
            const quizForStudent = Object.assign(Object.assign({}, updatedParticipation.session.quiz), { questions: updatedParticipation.session.quiz.questions.map((q) => ({
                    id: q.id,
                    question: q.question,
                    options: JSON.parse(q.options),
                    order: q.order
                })) });
            res.json({
                participation: {
                    id: updatedParticipation.id,
                    startedAt: updatedParticipation.startedAt,
                    maxScore: updatedParticipation.maxScore
                },
                quiz: quizForStudent
            });
            return;
        }
        // Create participation
        const participation = yield prisma.quizParticipation.create({
            data: {
                sessionId: sessionId,
                studentId: studentId,
                startedAt: new Date(),
                maxScore: session.quiz.questions.length
            },
            include: {
                session: {
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
                }
            }
        });
        // Prepare quiz data for student (without correct answers)
        const quizForStudent = Object.assign(Object.assign({}, participation.session.quiz), { questions: participation.session.quiz.questions.map((q) => ({
                id: q.id,
                question: q.question,
                options: JSON.parse(q.options),
                order: q.order
            })) });
        res.json({
            participation: {
                id: participation.id,
                startedAt: participation.startedAt,
                maxScore: participation.maxScore
            },
            quiz: quizForStudent
        });
    }
    catch (error) {
        console.error('Error starting participation:', error);
        res.status(500).json({ error: 'Fehler beim Starten der Quiz-Teilnahme' });
    }
});
exports.startParticipation = startParticipation;
// Submit quiz answers (student only)
const submitAnswers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { participationId } = req.params;
        const { answers } = req.body; // Array of { questionId, selectedAnswer }
        // Get participation and quiz data
        const participation = yield prisma.quizParticipation.findUnique({
            where: { id: participationId },
            include: {
                session: {
                    include: {
                        quiz: {
                            include: {
                                questions: true
                            }
                        }
                    }
                }
            }
        });
        if (!participation) {
            return res.status(404).json({ error: 'Teilnahme nicht gefunden' });
        }
        if (participation.completedAt) {
            return res.status(400).json({ error: 'Quiz bereits abgeschlossen' });
        }
        // Calculate score and create answers
        let totalScore = 0;
        const answerRecords = [];
        // Convert answers object to array format
        const answersArray = Object.entries(answers).map(([questionId, selectedAnswer]) => ({
            questionId,
            selectedAnswer: selectedAnswer
        }));
        for (const answer of answersArray) {
            const question = participation.session.quiz.questions.find((q) => q.id === answer.questionId);
            if (!question)
                continue;
            const isCorrect = answer.selectedAnswer === question.correctAnswer;
            const points = isCorrect ? 1 : 0;
            totalScore += points;
            answerRecords.push({
                participationId: participationId,
                questionId: answer.questionId,
                selectedAnswer: answer.selectedAnswer,
                isCorrect: isCorrect,
                points: points
            });
        }
        // Create all answers in a transaction
        yield prisma.$transaction([
            ...answerRecords.map(answer => prisma.quizAnswer.create({ data: answer })),
            prisma.quizParticipation.update({
                where: { id: participationId },
                data: {
                    completedAt: new Date(),
                    score: totalScore
                }
            })
        ]);
        // Get updated participation with answers
        const updatedParticipation = yield prisma.quizParticipation.findUnique({
            where: { id: participationId },
            include: {
                answers: {
                    include: {
                        question: true
                    }
                }
            }
        });
        res.json({
            participation: updatedParticipation,
            score: totalScore,
            maxScore: participation.maxScore,
            percentage: participation.maxScore ? Math.round((totalScore / (participation.maxScore || 0)) * 100) : 0
        });
    }
    catch (error) {
        console.error('Error submitting answers:', error);
        res.status(500).json({ error: 'Fehler beim Einreichen der Antworten' });
    }
});
exports.submitAnswers = submitAnswers;
// Get participation results (student only)
const getParticipationResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { participationId } = req.params;
        const studentId = req.query.studentId;
        if (!studentId) {
            return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
        }
        const participation = yield prisma.quizParticipation.findFirst({
            where: {
                id: participationId,
                studentId: studentId
            },
            include: {
                answers: {
                    include: {
                        question: true
                    }
                },
                session: {
                    include: {
                        quiz: {
                            include: {
                                questions: true
                            }
                        }
                    }
                }
            }
        });
        if (!participation) {
            return res.status(404).json({ error: 'Teilnahme nicht gefunden' });
        }
        if (!participation.completedAt) {
            return res.status(400).json({ error: 'Quiz noch nicht abgeschlossen' });
        }
        // Prepare results with correct answers
        const results = {
            participation: {
                id: participation.id,
                score: participation.score,
                maxScore: participation.maxScore,
                percentage: participation.maxScore && participation.score ? Math.round((participation.score / participation.maxScore) * 100) : 0,
                startedAt: participation.startedAt,
                completedAt: participation.completedAt
            },
            answers: participation.answers.map((answer) => ({
                question: answer.question.question,
                selectedAnswer: answer.selectedAnswer,
                correctAnswer: answer.question.correctAnswer,
                isCorrect: answer.isCorrect,
                points: answer.points
            }))
        };
        res.json(results);
    }
    catch (error) {
        console.error('Error getting participation results:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Teilnahme-Ergebnisse' });
    }
});
exports.getParticipationResults = getParticipationResults;
// Get participation results for teacher (no studentId check)
const getParticipationResultsForTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { participationId } = req.params;
        const teacherId = req.body.teacherId;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        const participation = yield prisma.quizParticipation.findFirst({
            where: {
                id: participationId,
                session: {
                    quiz: {
                        teacherId: teacherId
                    }
                }
            },
            include: {
                answers: {
                    include: {
                        question: true
                    }
                },
                student: true,
                session: {
                    include: {
                        quiz: {
                            include: {
                                questions: true
                            }
                        }
                    }
                }
            }
        });
        if (!participation) {
            return res.status(404).json({ error: 'Teilnahme nicht gefunden oder Sie haben keine Berechtigung' });
        }
        if (!participation.completedAt) {
            return res.status(400).json({ error: 'Quiz noch nicht abgeschlossen' });
        }
        // Prepare results with correct answers
        const results = {
            participation: {
                id: participation.id,
                score: participation.score,
                maxScore: participation.maxScore,
                percentage: participation.maxScore && participation.score ? Math.round((participation.score / participation.maxScore) * 100) : 0,
                startedAt: participation.startedAt,
                completedAt: participation.completedAt
            },
            student: {
                id: participation.student.id,
                name: participation.student.name
            },
            answers: participation.answers.map((answer) => ({
                question: answer.question.question,
                selectedAnswer: answer.selectedAnswer,
                correctAnswer: answer.question.correctAnswer,
                isCorrect: answer.isCorrect,
                points: answer.points
            }))
        };
        res.json(results);
    }
    catch (error) {
        console.error('Error getting participation results for teacher:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Teilnahme-Ergebnisse' });
    }
});
exports.getParticipationResultsForTeacher = getParticipationResultsForTeacher;
// Get student's participation status
const getParticipationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const studentId = req.query.studentId;
        if (!studentId) {
            return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
        }
        const participation = yield prisma.quizParticipation.findUnique({
            where: {
                sessionId_studentId: {
                    sessionId: sessionId,
                    studentId: studentId
                }
            }
        });
        if (!participation) {
            return res.json({ hasParticipated: false });
        }
        res.json({
            hasParticipated: true,
            isCompleted: !!participation.completedAt,
            participationId: participation.id,
            score: participation.score,
            maxScore: participation.maxScore,
            startedAt: participation.startedAt,
            completedAt: participation.completedAt
        });
    }
    catch (error) {
        console.error('Error getting participation status:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen des Teilnahme-Status' });
    }
});
exports.getParticipationStatus = getParticipationStatus;
// Reset student's participation (teacher only) - allows student to retake
const resetParticipation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { participationId } = req.params;
        const teacherId = req.body.teacherId;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        // Verify the participation belongs to a session owned by the teacher
        const participation = yield prisma.quizParticipation.findFirst({
            where: {
                id: participationId,
                session: {
                    quiz: {
                        teacherId: teacherId
                    }
                }
            },
            include: {
                session: {
                    include: {
                        quiz: true
                    }
                }
            }
        });
        if (!participation) {
            return res.status(404).json({ error: 'Teilnahme nicht gefunden oder Sie haben keine Berechtigung' });
        }
        // Reset participation by deleting answers and resetting completion status
        yield prisma.$transaction([
            prisma.quizAnswer.deleteMany({
                where: {
                    participationId: participationId
                }
            }),
            prisma.quizParticipation.update({
                where: {
                    id: participationId
                },
                data: {
                    score: null,
                    completedAt: null,
                    startedAt: new Date() // Reset start time
                }
            })
        ]);
        res.json({
            message: 'Teilnahme erfolgreich zurückgesetzt',
            studentId: participation.studentId,
            sessionId: participation.sessionId
        });
    }
    catch (error) {
        console.error('Error resetting participation:', error);
        res.status(500).json({ error: 'Fehler beim Zurücksetzen der Teilnahme' });
    }
});
exports.resetParticipation = resetParticipation;
// Get quiz statistics for all questions
const getQuizStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const teacherId = req.body.teacherId;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        // Get all completed participations for this session
        const participations = yield prisma.quizParticipation.findMany({
            where: {
                sessionId: sessionId,
                completedAt: { not: null },
                session: {
                    quiz: {
                        teacherId: teacherId
                    }
                }
            },
            include: {
                answers: {
                    include: {
                        question: true
                    }
                },
                session: {
                    include: {
                        quiz: {
                            include: {
                                questions: true
                            }
                        }
                    }
                }
            }
        });
        if (participations.length === 0) {
            return res.status(404).json({ error: 'Keine abgeschlossenen Teilnahmen gefunden' });
        }
        // Get all questions from the quiz
        const quiz = participations[0].session.quiz;
        const questions = quiz.questions;
        // Calculate statistics for each question
        const questionStats = questions.map((question) => {
            const questionAnswers = participations.flatMap(p => p.answers.filter(a => a.questionId === question.id));
            const totalAnswers = questionAnswers.length;
            const correctAnswers = questionAnswers.filter(a => a.isCorrect).length;
            const incorrectAnswers = totalAnswers - correctAnswers;
            const correctPercentage = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;
            // Get answer distribution
            const answerDistribution = {};
            questionAnswers.forEach(answer => {
                const selected = answer.selectedAnswer;
                answerDistribution[selected] = (answerDistribution[selected] || 0) + 1;
            });
            return {
                questionId: question.id,
                question: question.question,
                correctAnswer: question.correctAnswer,
                totalAnswers,
                correctAnswers,
                incorrectAnswers,
                correctPercentage,
                answerDistribution
            };
        });
        // Calculate overall statistics
        const totalParticipations = participations.length;
        const averageScore = participations.reduce((sum, p) => sum + (p.score || 0), 0) / totalParticipations;
        const averagePercentage = Math.round((averageScore / (quiz.questions.length || 1)) * 100);
        const statistics = {
            quizTitle: quiz.title,
            totalParticipations,
            averageScore: Math.round(averageScore * 100) / 100,
            averagePercentage,
            questionStats
        };
        res.json(statistics);
    }
    catch (error) {
        console.error('Error getting quiz statistics:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Quiz-Statistik' });
    }
});
exports.getQuizStatistics = getQuizStatistics;
// Delete student's participation (teacher only)
const deleteParticipation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { participationId } = req.params;
        const teacherId = req.body.teacherId;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        // Verify the participation belongs to a session owned by the teacher
        const participation = yield prisma.quizParticipation.findFirst({
            where: {
                id: participationId,
                session: {
                    quiz: {
                        teacherId: teacherId
                    }
                }
            },
            include: {
                session: {
                    include: {
                        quiz: true
                    }
                }
            }
        });
        if (!participation) {
            return res.status(404).json({ error: 'Teilnahme nicht gefunden oder Sie haben keine Berechtigung' });
        }
        // Delete all answers first, then the participation
        yield prisma.$transaction([
            prisma.quizAnswer.deleteMany({
                where: {
                    participationId: participationId
                }
            }),
            prisma.quizParticipation.delete({
                where: {
                    id: participationId
                }
            })
        ]);
        res.json({
            message: 'Teilnahme erfolgreich gelöscht',
            studentId: participation.studentId,
            sessionId: participation.sessionId
        });
    }
    catch (error) {
        console.error('Error deleting participation:', error);
        res.status(500).json({ error: 'Fehler beim Löschen der Teilnahme' });
    }
});
exports.deleteParticipation = deleteParticipation;
