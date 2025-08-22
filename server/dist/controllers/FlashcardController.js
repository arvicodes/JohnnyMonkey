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
exports.removeDeckAssignment = exports.getAssignments = exports.assignDeckToGroup = exports.getDueCards = exports.submitCardReview = exports.getStudentProgress = exports.deleteCard = exports.updateCard = exports.createCard = exports.deleteDeck = exports.updateDeck = exports.getDeck = exports.getDecks = exports.createDeck = void 0;
const prisma_1 = require("../generated/prisma");
const SpacedRepetitionService_1 = require("../services/SpacedRepetitionService");
const prisma = new prisma_1.PrismaClient();
// FlashcardDeck Controller
const createDeck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, subjectId, isPublic, teacherId } = req.body;
        if (!teacherId) {
            return res.status(400).json({ error: 'teacherId ist erforderlich' });
        }
        const deck = yield prisma.flashcardDeck.create({
            data: {
                title,
                description,
                subjectId: subjectId || null,
                teacherId,
                isPublic: isPublic || false
            },
            include: {
                subject: true,
                teacher: {
                    select: { id: true, name: true }
                }
            }
        });
        res.status(201).json(deck);
    }
    catch (error) {
        console.error('Fehler beim Erstellen des Karteidecks:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.createDeck = createDeck;
const getDecks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { teacherId, subjectId, isPublic } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const where = {};
        if (teacherId)
            where.teacherId = teacherId;
        if (subjectId)
            where.subjectId = subjectId;
        if (isPublic !== undefined)
            where.isPublic = isPublic === 'true';
        // Schüler sehen nur öffentliche Decks oder zugewiesene Decks
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'STUDENT') {
            const studentGroups = yield prisma.user.findUnique({
                where: { id: userId },
                select: { learningGroups: { select: { id: true } } }
            });
            const groupIds = (studentGroups === null || studentGroups === void 0 ? void 0 : studentGroups.learningGroups.map(g => g.id)) || [];
            where.OR = [
                { isPublic: true },
                { assignments: { some: { groupId: { in: groupIds } } } }
            ];
        }
        const decks = yield prisma.flashcardDeck.findMany({
            where,
            include: {
                subject: true,
                teacher: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: { cards: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(decks);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Karteidecks:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getDecks = getDecks;
const getDeck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { deckId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const deck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId },
            include: {
                subject: true,
                teacher: {
                    select: { id: true, name: true }
                },
                cards: {
                    orderBy: { order: 'asc' }
                }
            }
        });
        if (!deck) {
            return res.status(404).json({ error: 'Karteideck nicht gefunden' });
        }
        // Prüfen ob der Benutzer Zugriff hat
        if (!deck.isPublic && deck.teacherId !== userId && ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'STUDENT') {
            // Prüfen ob der Schüler das Deck zugewiesen bekommen hat
            const hasAccess = yield prisma.flashcardAssignment.findFirst({
                where: {
                    deckId,
                    group: {
                        students: { some: { id: userId } }
                    }
                }
            });
            if (!hasAccess) {
                return res.status(403).json({ error: 'Kein Zugriff auf dieses Karteideck' });
            }
        }
        res.json(deck);
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Karteidecks:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getDeck = getDeck;
const updateDeck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deckId } = req.params;
        const { title, description, subjectId, isPublic, teacherId } = req.body;
        const userId = teacherId;
        // Prüfen ob der Benutzer der Besitzer ist
        const existingDeck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId }
        });
        if (!existingDeck || existingDeck.teacherId !== userId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieses Karteidecks' });
        }
        const updatedDeck = yield prisma.flashcardDeck.update({
            where: { id: deckId },
            data: {
                title,
                description,
                subjectId: subjectId || null,
                isPublic
            },
            include: {
                subject: true,
                teacher: {
                    select: { id: true, name: true }
                }
            }
        });
        res.json(updatedDeck);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Karteidecks:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.updateDeck = updateDeck;
const deleteDeck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { deckId } = req.params;
        const { teacherId } = req.body;
        // Fallback zu req.user?.id wenn teacherId nicht im Body ist
        const userId = teacherId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(400).json({ error: 'Keine Benutzer-ID gefunden' });
        }
        // Prüfen ob der Benutzer der Besitzer ist
        const existingDeck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId }
        });
        if (!existingDeck) {
            return res.status(404).json({ error: 'Karteideck nicht gefunden' });
        }
        if (existingDeck.teacherId !== userId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Karteidecks' });
        }
        yield prisma.flashcardDeck.delete({
            where: { id: deckId }
        });
        res.json({ message: 'Karteideck erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Karteidecks:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.deleteDeck = deleteDeck;
// Flashcard Controller
const createCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { deckId, front, back, hint, difficulty, order } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Prüfen ob der Benutzer der Besitzer des Decks ist
        const deck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId }
        });
        if (!deck || deck.teacherId !== userId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Hinzufügen von Karten zu diesem Deck' });
        }
        const card = yield prisma.flashcard.create({
            data: {
                deckId,
                front,
                back,
                hint: hint || null,
                difficulty: difficulty || 1,
                order: order || 0
            }
        });
        res.status(201).json(card);
    }
    catch (error) {
        console.error('Fehler beim Erstellen der Karte:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.createCard = createCard;
const updateCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { cardId } = req.params;
        const { front, back, hint, difficulty, order } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Prüfen ob der Benutzer der Besitzer des Decks ist
        const card = yield prisma.flashcard.findUnique({
            where: { id: cardId },
            include: { deck: true }
        });
        if (!card || card.deck.teacherId !== userId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieser Karte' });
        }
        const updatedCard = yield prisma.flashcard.update({
            where: { id: cardId },
            data: {
                front,
                back,
                hint: hint || null,
                difficulty,
                order
            }
        });
        res.json(updatedCard);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Karte:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.updateCard = updateCard;
const deleteCard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { cardId } = req.params;
        const { teacherId } = req.body;
        // Fallback zu req.user?.id wenn teacherId nicht im Body ist
        const userId = teacherId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(400).json({ error: 'Keine Benutzer-ID gefunden' });
        }
        // Prüfen ob der Benutzer der Besitzer des Decks ist
        const card = yield prisma.flashcard.findUnique({
            where: { id: cardId },
            include: { deck: true }
        });
        if (!card) {
            return res.status(404).json({ error: 'Karte nicht gefunden' });
        }
        if (card.deck.teacherId !== userId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Karte' });
        }
        yield prisma.flashcard.delete({
            where: { id: cardId }
        });
        res.json({ message: 'Karte erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen der Karte:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.deleteCard = deleteCard;
// Flashcard Progress Controller
const getStudentProgress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { deckId } = req.params;
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Nicht autorisiert' });
        }
        const progress = yield prisma.flashcardProgress.findMany({
            where: {
                card: { deckId },
                studentId
            },
            include: {
                card: {
                    select: {
                        id: true,
                        front: true,
                        back: true,
                        hint: true,
                        difficulty: true,
                        order: true
                    }
                }
            },
            orderBy: {
                card: { order: 'asc' }
            }
        });
        // Karten ohne Fortschritt hinzufügen
        const allCards = yield prisma.flashcard.findMany({
            where: { deckId },
            orderBy: { order: 'asc' }
        });
        const cardsWithProgress = allCards.map(card => {
            const existingProgress = progress.find(p => p.cardId === card.id);
            if (existingProgress) {
                return Object.assign(Object.assign({}, card), { progress: existingProgress });
            }
            else {
                return Object.assign(Object.assign({}, card), { progress: {
                        id: null,
                        level: 0,
                        nextReview: new Date(),
                        lastReviewed: null,
                        reviewCount: 0
                    } });
            }
        });
        res.json(cardsWithProgress);
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Fortschritts:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getStudentProgress = getStudentProgress;
const submitCardReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { cardId } = req.params;
        const { quality } = req.body;
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Nicht autorisiert' });
        }
        if (quality < 1 || quality > 5) {
            return res.status(400).json({ error: 'Qualität muss zwischen 1 und 5 liegen' });
        }
        // Aktuellen Fortschritt abrufen oder erstellen
        let progress = yield prisma.flashcardProgress.findUnique({
            where: {
                cardId_studentId: {
                    cardId,
                    studentId
                }
            }
        });
        const currentLevel = (progress === null || progress === void 0 ? void 0 : progress.level) || 0;
        const reviewResult = SpacedRepetitionService_1.SpacedRepetitionService.calculateNextReview(currentLevel, quality);
        if (progress) {
            // Bestehenden Fortschritt aktualisieren
            progress = yield prisma.flashcardProgress.update({
                where: { id: progress.id },
                data: {
                    level: reviewResult.newLevel,
                    nextReview: reviewResult.nextReview,
                    lastReviewed: new Date(),
                    reviewCount: progress.reviewCount + 1
                }
            });
        }
        else {
            // Neuen Fortschritt erstellen
            progress = yield prisma.flashcardProgress.create({
                data: {
                    cardId,
                    studentId,
                    level: reviewResult.newLevel,
                    nextReview: reviewResult.nextReview,
                    lastReviewed: new Date(),
                    reviewCount: 1
                }
            });
        }
        res.json({
            progress,
            reviewResult,
            message: 'Karten-Review erfolgreich gespeichert'
        });
    }
    catch (error) {
        console.error('Fehler beim Speichern des Karten-Reviews:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.submitCardReview = submitCardReview;
const getDueCards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { deckId } = req.params;
        const studentId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!studentId) {
            return res.status(401).json({ error: 'Nicht autorisiert' });
        }
        const progress = yield prisma.flashcardProgress.findMany({
            where: {
                card: { deckId },
                studentId
            },
            include: {
                card: {
                    select: {
                        id: true,
                        front: true,
                        back: true,
                        hint: true,
                        difficulty: true,
                        order: true
                    }
                }
            }
        });
        // Fällige Karten filtern
        const dueCards = progress.filter(p => SpacedRepetitionService_1.SpacedRepetitionService.isCardReadyForReview(p.nextReview));
        // Nach Priorität sortieren - Korrigiere den Typ-Konflikt
        const sortedCards = SpacedRepetitionService_1.SpacedRepetitionService.sortCardsByPriority(dueCards.map(p => ({
            nextReview: p.nextReview,
            level: p.level,
            lastReviewed: p.lastReviewed || undefined
        })));
        // Karten mit Fortschritt kombinieren
        const dueCardsWithProgress = sortedCards.map(sorted => {
            const cardProgress = progress.find(p => p.level === sorted.level &&
                p.nextReview.getTime() === sorted.nextReview.getTime());
            return cardProgress;
        }).filter(Boolean);
        res.json(dueCardsWithProgress);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der fälligen Karten:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getDueCards = getDueCards;
// Flashcard Assignment Controller
const assignDeckToGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { deckId, groupId, dueDate, teacherId } = req.body;
        if (!teacherId) {
            return res.status(400).json({ error: 'teacherId ist erforderlich' });
        }
        // Prüfen ob der Lehrer der Besitzer des Decks ist
        const deck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId }
        });
        if (!deck || deck.teacherId !== teacherId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Zuweisen dieses Karteidecks' });
        }
        // Prüfen ob der Lehrer die Gruppe unterrichtet
        const group = yield prisma.learningGroup.findUnique({
            where: { id: groupId }
        });
        if (!group || group.teacherId !== teacherId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Zuweisen an diese Gruppe' });
        }
        const assignment = yield prisma.flashcardAssignment.create({
            data: {
                deckId,
                groupId,
                dueDate: dueDate ? new Date(dueDate) : null
            },
            include: {
                deck: { select: { title: true } },
                group: { select: { name: true } }
            }
        });
        res.status(201).json(assignment);
    }
    catch (error) {
        console.error('Fehler beim Zuweisen des Karteidecks:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.assignDeckToGroup = assignDeckToGroup;
const getAssignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { teacherId } = req.query;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const where = {};
        if (teacherId) {
            where.deck = { teacherId: teacherId };
        }
        const assignments = yield prisma.flashcardAssignment.findMany({
            where,
            include: {
                deck: {
                    select: { id: true, title: true }
                },
                group: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assignments);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Zuweisungen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getAssignments = getAssignments;
const removeDeckAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { assignmentId } = req.params;
        const { teacherId } = req.body;
        // Fallback zu req.user?.id wenn teacherId nicht im Body ist
        const userId = teacherId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(400).json({ error: 'Keine Benutzer-ID gefunden' });
        }
        // Prüfen ob der Lehrer der Besitzer des Decks ist
        const assignment = yield prisma.flashcardAssignment.findUnique({
            where: { id: assignmentId },
            include: { deck: true }
        });
        if (!assignment) {
            return res.status(404).json({ error: 'Zuweisung nicht gefunden' });
        }
        if (assignment.deck.teacherId !== userId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Entfernen dieser Zuweisung' });
        }
        yield prisma.flashcardAssignment.delete({
            where: { id: assignmentId }
        });
        res.json({ message: 'Zuweisung erfolgreich entfernt' });
    }
    catch (error) {
        console.error('Fehler beim Entfernen der Zuweisung:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.removeDeckAssignment = removeDeckAssignment;
