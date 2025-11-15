"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDoorsForYear = exports.createDoor = exports.getDoorResults = exports.submitAnswer = exports.getDoor = exports.getDoors = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Hilfsfunktion: Aktuelles Datum in CET (Central European Time)
const getCurrentDateCET = () => {
    const now = new Date();
    // CET ist UTC+1 (Winter) oder UTC+2 (Sommer)
    // Für Dezember nehmen wir UTC+1 an
    const cetOffset = 1;
    const cetTime = new Date(now.getTime() + (cetOffset * 60 * 60 * 1000));
    return {
        year: cetTime.getUTCFullYear(),
        month: cetTime.getUTCMonth() + 1, // 0-indexed
        day: cetTime.getUTCDate()
    };
};
// Alle Türchen für ein Jahr abrufen
const getDoors = async (req, res) => {
    var _a;
    try {
        let year = parseInt(req.query.year) || new Date().getFullYear();
        const studentId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
        console.log('getDoors aufgerufen - year:', year, 'studentId:', studentId);
        // Prüfe, ob für das angeforderte Jahr Türchen existieren
        let doors = await prisma.adventCalendarDoor.findMany({
            where: { year },
            orderBy: { day: 'asc' },
            include: {
                submissions: studentId ? {
                    where: { studentId },
                    select: {
                        id: true,
                        answer: true,
                        isCorrect: true,
                        submittedAt: true
                    }
                } : false
            }
        });
        // Falls keine Türchen für das aktuelle Jahr gefunden wurden, verwende das neueste verfügbare Jahr
        if (doors.length === 0) {
            const latestYear = await prisma.adventCalendarDoor.findFirst({
                orderBy: { year: 'desc' },
                select: { year: true }
            });
            if (latestYear) {
                console.log('Keine Türchen für Jahr', year, 'gefunden, verwende Jahr', latestYear.year);
                year = latestYear.year;
                doors = await prisma.adventCalendarDoor.findMany({
                    where: { year },
                    orderBy: { day: 'asc' },
                    include: {
                        submissions: studentId ? {
                            where: { studentId },
                            select: {
                                id: true,
                                answer: true,
                                isCorrect: true,
                                submittedAt: true
                            }
                        } : false
                    }
                });
            }
        }
        console.log('Gefundene Türchen:', doors.length, 'für Jahr', year);
        // Markiere, welche Türchen geöffnet werden können
        // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar (unabhängig vom aktuellen Monat)
        const currentDate = getCurrentDateCET();
        const isDecember = currentDate.month === 12;
        const today = currentDate.day;
        // Für Simulation: Wenn nicht Dezember, erlaube alle Türchen bis Tag 24
        const simulationMode = !isDecember;
        const maxOpenableDay = simulationMode ? 24 : today;
        const doorsWithStatus = doors.map(door => {
            const isOpenable = (simulationMode || isDecember) && door.day <= maxOpenableDay;
            const hasSubmission = door.submissions && door.submissions.length > 0;
            const isOpened = hasSubmission;
            return {
                ...door,
                isOpenable,
                isOpened,
                hasSubmission,
                mySubmission: door.submissions && door.submissions.length > 0 ? door.submissions[0] : null,
                submissions: undefined // Entferne submissions aus der Antwort
            };
        });
        res.json(doorsWithStatus);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Türchen:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
};
exports.getDoors = getDoors;
// Einzelnes Türchen abrufen (mit Fun Fact und Frage)
const getDoor = async (req, res) => {
    var _a;
    try {
        const { doorId } = req.params;
        const studentId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
        const door = await prisma.adventCalendarDoor.findUnique({
            where: { id: doorId },
            include: {
                submissions: studentId ? {
                    where: { studentId },
                    select: {
                        id: true,
                        answer: true,
                        isCorrect: true,
                        submittedAt: true
                    }
                } : false
            }
        });
        if (!door) {
            return res.status(404).json({ error: 'Türchen nicht gefunden' });
        }
        // Prüfe, ob das Türchen heute geöffnet werden kann
        // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar
        const currentDate = getCurrentDateCET();
        const isDecember = currentDate.month === 12;
        const today = currentDate.day;
        const simulationMode = !isDecember;
        const maxOpenableDay = simulationMode ? 24 : today;
        if ((!simulationMode && !isDecember) || door.day > maxOpenableDay) {
            return res.status(403).json({
                error: 'Dieses Türchen kann noch nicht geöffnet werden',
                day: door.day,
                today,
                maxOpenableDay
            });
        }
        const hasSubmission = door.submissions && door.submissions.length > 0;
        const mySubmission = hasSubmission ? door.submissions[0] : null;
        res.json({
            ...door,
            mySubmission,
            submissions: undefined
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Türchens:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
};
exports.getDoor = getDoor;
// Antwort einreichen
const submitAnswer = async (req, res) => {
    var _a;
    try {
        const { doorId } = req.params;
        const { answer } = req.body;
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Nicht authentifiziert. Bitte melden Sie sich an.' });
        }
        if (!answer || answer.trim() === '') {
            return res.status(400).json({ error: 'Antwort ist erforderlich' });
        }
        // Hole das Türchen
        const door = await prisma.adventCalendarDoor.findUnique({
            where: { id: doorId }
        });
        if (!door) {
            return res.status(404).json({ error: 'Türchen nicht gefunden' });
        }
        // Prüfe, ob das Türchen heute geöffnet werden kann
        // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar
        const currentDate = getCurrentDateCET();
        const isDecember = currentDate.month === 12;
        const today = currentDate.day;
        const simulationMode = !isDecember;
        const maxOpenableDay = simulationMode ? 24 : today;
        if ((!simulationMode && !isDecember) || door.day > maxOpenableDay) {
            return res.status(403).json({
                error: 'Dieses Türchen kann noch nicht geöffnet werden'
            });
        }
        // Prüfe, ob bereits eine Antwort eingereicht wurde
        const existingSubmission = await prisma.adventCalendarSubmission.findUnique({
            where: {
                doorId_studentId: {
                    doorId,
                    studentId
                }
            }
        });
        if (existingSubmission) {
            return res.status(400).json({ error: 'Du hast bereits eine Antwort eingereicht' });
        }
        // Normalisiere die Antworten für Vergleich (case-insensitive, trim)
        const normalizedAnswer = answer.trim().toLowerCase();
        const normalizedCorrect = door.correctAnswer.trim().toLowerCase();
        const isCorrect = normalizedAnswer === normalizedCorrect;
        // Erstelle die Submission
        const submission = await prisma.adventCalendarSubmission.create({
            data: {
                doorId,
                studentId,
                answer: answer.trim(),
                isCorrect
            },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        avatarEmoji: true
                    }
                }
            }
        });
        res.status(201).json(submission);
    }
    catch (error) {
        console.error('Fehler beim Einreichen der Antwort:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
};
exports.submitAnswer = submitAnswer;
// Ergebnisse anderer Schüler für ein Türchen abrufen (kooperatives Spiel)
const getDoorResults = async (req, res) => {
    var _a;
    try {
        const { doorId } = req.params;
        const studentId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null;
        // Hole das Türchen
        const door = await prisma.adventCalendarDoor.findUnique({
            where: { id: doorId }
        });
        if (!door) {
            return res.status(404).json({ error: 'Türchen nicht gefunden' });
        }
        // Prüfe, ob das Türchen heute geöffnet werden kann
        // SIMULATION: Alle Türchen bis Tag 24 sind öffnenbar
        const currentDate = getCurrentDateCET();
        const isDecember = currentDate.month === 12;
        const today = currentDate.day;
        const simulationMode = !isDecember;
        const maxOpenableDay = simulationMode ? 24 : today;
        if ((!simulationMode && !isDecember) || door.day > maxOpenableDay) {
            return res.status(403).json({
                error: 'Dieses Türchen kann noch nicht geöffnet werden'
            });
        }
        // Hole alle Submissions für dieses Türchen
        const submissions = await prisma.adventCalendarSubmission.findMany({
            where: { doorId },
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        avatarEmoji: true
                    }
                }
            },
            orderBy: { submittedAt: 'asc' }
        });
        // Statistiken berechnen
        const totalSubmissions = submissions.length;
        const correctSubmissions = submissions.filter(s => s.isCorrect).length;
        const correctPercentage = totalSubmissions > 0
            ? Math.round((correctSubmissions / totalSubmissions) * 100)
            : 0;
        // Eigene Submission markieren
        const results = submissions.map(submission => ({
            id: submission.id,
            studentName: submission.student.name,
            avatarEmoji: submission.student.avatarEmoji || '👤',
            isCorrect: submission.isCorrect,
            submittedAt: submission.submittedAt,
            isMine: submission.studentId === studentId,
            // Zeige die Antwort nur, wenn es die eigene ist oder wenn sie korrekt ist
            answer: submission.studentId === studentId || submission.isCorrect
                ? submission.answer
                : '❓'
        }));
        res.json({
            door: {
                id: door.id,
                day: door.day,
                funFact: door.funFact,
                question: door.question,
                explanation: door.explanation
            },
            statistics: {
                totalSubmissions,
                correctSubmissions,
                incorrectSubmissions: totalSubmissions - correctSubmissions,
                correctPercentage
            },
            results
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Ergebnisse:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
};
exports.getDoorResults = getDoorResults;
// Türchen erstellen (Admin/Teacher Funktion)
const createDoor = async (req, res) => {
    try {
        const { day, year, funFact, question, correctAnswer, explanation } = req.body;
        if (!day || !year || !funFact || !question || !correctAnswer) {
            return res.status(400).json({
                error: 'day, year, funFact, question und correctAnswer sind erforderlich'
            });
        }
        if (day < 1 || day > 24) {
            return res.status(400).json({ error: 'day muss zwischen 1 und 24 liegen' });
        }
        const door = await prisma.adventCalendarDoor.create({
            data: {
                day,
                year,
                funFact,
                question,
                correctAnswer,
                explanation
            }
        });
        res.status(201).json(door);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({
                error: 'Ein Türchen für diesen Tag und Jahr existiert bereits'
            });
        }
        console.error('Fehler beim Erstellen des Türchens:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
};
exports.createDoor = createDoor;
// Alle Türchen für ein Jahr erstellen (Bulk Create)
const createDoorsForYear = async (req, res) => {
    try {
        const { year, doors } = req.body;
        if (!year || !doors || !Array.isArray(doors)) {
            return res.status(400).json({
                error: 'year und doors (Array) sind erforderlich'
            });
        }
        if (doors.length !== 24) {
            return res.status(400).json({
                error: 'Es müssen genau 24 Türchen erstellt werden'
            });
        }
        // Validiere alle Türchen
        for (let i = 0; i < doors.length; i++) {
            const door = doors[i];
            if (!door.day || !door.funFact || !door.question || !door.correctAnswer) {
                return res.status(400).json({
                    error: `Türchen ${i + 1} ist unvollständig`
                });
            }
            if (door.day < 1 || door.day > 24) {
                return res.status(400).json({
                    error: `Türchen ${i + 1} hat einen ungültigen Tag (muss 1-24 sein)`
                });
            }
        }
        // Erstelle alle Türchen in einer Transaktion
        const createdDoors = await prisma.$transaction(doors.map(door => prisma.adventCalendarDoor.upsert({
            where: {
                day_year: {
                    day: door.day,
                    year: year
                }
            },
            update: {
                funFact: door.funFact,
                question: door.question,
                correctAnswer: door.correctAnswer,
                explanation: door.explanation || null
            },
            create: {
                day: door.day,
                year,
                funFact: door.funFact,
                question: door.question,
                correctAnswer: door.correctAnswer,
                explanation: door.explanation || null
            }
        })));
        res.status(201).json({
            message: `${createdDoors.length} Türchen erfolgreich erstellt/aktualisiert`,
            doors: createdDoors
        });
    }
    catch (error) {
        console.error('Fehler beim Erstellen der Türchen:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            message: (error === null || error === void 0 ? void 0 : error.message) || 'Unbekannter Fehler'
        });
    }
};
exports.createDoorsForYear = createDoorsForYear;
//# sourceMappingURL=AdventCalendarController.js.map