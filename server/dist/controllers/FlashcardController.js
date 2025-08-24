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
exports.getFlashcardDeck = exports.getFlashcardDecks = exports.addFlashcardsToExistingDeck = exports.createFlashcardDeckFromWord = exports.removeDeckAssignment = exports.getAssignments = exports.assignDeckToGroup = exports.getDueCards = exports.submitCardReview = exports.getStudentProgress = exports.deleteCard = exports.updateCard = exports.createCard = exports.deleteDeck = exports.updateDeck = exports.getDeckCards = exports.getDeck = exports.getDecks = exports.createDeck = void 0;
const prisma_1 = require("../generated/prisma");
const SpacedRepetitionService_1 = require("../services/SpacedRepetitionService");
const flashcardWordParser_1 = require("../utils/flashcardWordParser");
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
const getDeckCards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { deckId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        console.log(`Loading cards for deck ${deckId}...`);
        // Prüfen ob das Deck existiert
        const deck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId },
            select: {
                id: true,
                teacherId: true,
                isPublic: true,
                title: true
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
        // Karten laden
        const cards = yield prisma.flashcard.findMany({
            where: { deckId },
            orderBy: { order: 'asc' }
        });
        console.log(`Successfully loaded ${cards.length} cards for deck ${deck.title}`);
        res.json(cards);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Karten:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getDeckCards = getDeckCards;
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
    try {
        const { id: deckId } = req.params;
        const { teacherId } = req.body;
        if (!teacherId) {
            return res.status(400).json({ error: 'teacherId ist erforderlich' });
        }
        // Prüfen ob der Benutzer der Besitzer ist
        const existingDeck = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId }
        });
        if (!existingDeck) {
            return res.status(404).json({ error: 'Karteideck nicht gefunden' });
        }
        if (existingDeck.teacherId !== teacherId) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Karteidecks' });
        }
        // Lösche zuerst alle Zuweisungen, da sie keine Cascade-Delete-Regel haben
        yield prisma.flashcardAssignment.deleteMany({
            where: { deckId }
        });
        // Lösche alle Karten (werden durch Cascade-Delete automatisch gelöscht)
        yield prisma.flashcard.deleteMany({
            where: { deckId }
        });
        // Jetzt kann das Deck gelöscht werden
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
        const { deckId, front, back, hint, difficulty, order, teacherId } = req.body;
        const userId = teacherId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(400).json({ error: 'teacherId ist erforderlich' });
        }
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
        const { front, back, hint, difficulty, order, teacherId } = req.body;
        const userId = teacherId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
        if (!userId) {
            return res.status(400).json({ error: 'teacherId ist erforderlich' });
        }
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
const createFlashcardDeckFromWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, sourceFile, title, description, subjectId, learningGroupIds, isPublic = false } = req.body;
        if (!teacherId || !sourceFile) {
            return res.status(400).json({ error: 'Lehrer-ID und Quelldatei sind erforderlich' });
        }
        console.log('Creating flashcard deck from Word file:', {
            teacherId,
            sourceFile,
            title,
            description,
            subjectId,
            learningGroupIds,
            isPublic
        });
        // Parse the Word file to extract flashcards
        console.log('Parsing Word file for flashcard creation:', sourceFile);
        let parsedDocument;
        try {
            parsedDocument = yield (0, flashcardWordParser_1.parseFlashcardWordFile)(sourceFile);
            console.log('Parsed flashcard document:', parsedDocument);
        }
        catch (parseError) {
            console.error('Error parsing Word file:', parseError);
            return res.status(400).json({
                error: `Fehler beim Parsen der Word-Datei: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            });
        }
        if (!parsedDocument.cards || parsedDocument.cards.length === 0) {
            return res.status(400).json({ error: 'Keine Karteikarten in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
        }
        console.log(`Found ${parsedDocument.cards.length} flashcards, creating deck...`);
        // Use provided title or extracted title from document
        const deckTitle = title || parsedDocument.title;
        const deckDescription = description || `Importiert aus ${sourceFile} - ${parsedDocument.cards.length} Karten`;
        // Validate subjectId if provided
        let validatedSubjectId = null;
        if (subjectId) {
            const subject = yield prisma.subject.findFirst({
                where: {
                    id: subjectId,
                    teacherId: teacherId
                }
            });
            if (subject) {
                validatedSubjectId = subjectId;
            }
            else {
                console.warn(`Subject ID ${subjectId} not found or doesn't belong to teacher ${teacherId}`);
            }
        }
        // Create the flashcard deck
        const deck = yield prisma.flashcardDeck.create({
            data: {
                title: deckTitle,
                description: deckDescription,
                teacherId,
                subjectId: validatedSubjectId,
                isPublic
            }
        });
        console.log('Created flashcard deck:', deck);
        // Create all flashcards
        const createdCards = yield Promise.all(parsedDocument.cards.map((card, index) => prisma.flashcard.create({
            data: {
                deckId: deck.id,
                front: card.front,
                back: card.back,
                hint: card.hint,
                difficulty: 1, // Default difficulty
                order: index
            }
        })));
        console.log(`Created ${createdCards.length} flashcards`);
        // Assign to learning groups if specified
        if (learningGroupIds && learningGroupIds.length > 0) {
            // Validate that all learning group IDs exist and belong to the teacher
            const validGroups = yield prisma.learningGroup.findMany({
                where: {
                    id: { in: learningGroupIds },
                    teacherId: teacherId
                },
                select: { id: true }
            });
            if (validGroups.length !== learningGroupIds.length) {
                console.warn(`Some learning group IDs are invalid. Expected: ${learningGroupIds.length}, Found: ${validGroups.length}`);
            }
            if (validGroups.length > 0) {
                const assignments = yield Promise.all(validGroups.map((group) => prisma.flashcardAssignment.create({
                    data: {
                        deckId: deck.id,
                        groupId: group.id
                    }
                })));
                console.log(`Assigned deck to ${assignments.length} learning groups`);
            }
        }
        // Return the created deck with cards
        const result = yield prisma.flashcardDeck.findUnique({
            where: { id: deck.id },
            include: {
                cards: {
                    orderBy: { order: 'asc' }
                },
                subject: true,
                assignments: {
                    include: {
                        group: true
                    }
                }
            }
        });
        res.status(201).json({
            message: `Karteikarten-Deck erfolgreich erstellt mit ${createdCards.length} Karten`,
            deck: result
        });
    }
    catch (error) {
        console.error('Error creating flashcard deck:', error);
        res.status(500).json({
            error: `Fehler beim Erstellen des Karteikarten-Decks: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});
exports.createFlashcardDeckFromWord = createFlashcardDeckFromWord;
const addFlashcardsToExistingDeck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, sourceFile, deckId } = req.body;
        if (!teacherId || !sourceFile || !deckId) {
            return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Deck-ID sind erforderlich' });
        }
        console.log('Adding flashcards to existing deck:', {
            teacherId,
            sourceFile,
            deckId
        });
        // Verify the deck exists and belongs to the teacher
        const existingDeck = yield prisma.flashcardDeck.findFirst({
            where: {
                id: deckId,
                teacherId
            }
        });
        if (!existingDeck) {
            return res.status(404).json({ error: 'Karteikarten-Deck nicht gefunden oder Sie haben keine Berechtigung dafür.' });
        }
        // Parse the Word file to extract flashcards
        let parsedDocument;
        try {
            parsedDocument = yield (0, flashcardWordParser_1.parseFlashcardWordFile)(sourceFile);
        }
        catch (parseError) {
            console.error('Error parsing Word file:', parseError);
            return res.status(400).json({
                error: `Fehler beim Parsen der Word-Datei: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            });
        }
        if (!parsedDocument.cards || parsedDocument.cards.length === 0) {
            return res.status(400).json({ error: 'Keine Karteikarten in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
        }
        // Get current highest order in the deck
        const maxOrder = yield prisma.flashcard.aggregate({
            where: { deckId },
            _max: { order: true }
        });
        const startOrder = (maxOrder._max.order || 0) + 1;
        // Create new flashcards
        const createdCards = yield Promise.all(parsedDocument.cards.map((card, index) => prisma.flashcard.create({
            data: {
                deckId,
                front: card.front,
                back: card.back,
                hint: card.hint,
                difficulty: 1, // Default difficulty
                order: startOrder + index
            }
        })));
        console.log(`Added ${createdCards.length} flashcards to existing deck`);
        // Return updated deck
        const result = yield prisma.flashcardDeck.findUnique({
            where: { id: deckId },
            include: {
                cards: {
                    orderBy: { order: 'asc' }
                },
                subject: true,
                assignments: {
                    include: {
                        group: true
                    }
                }
            }
        });
        res.status(200).json({
            message: `${createdCards.length} Karteikarten erfolgreich zum bestehenden Deck hinzugefügt`,
            deck: result
        });
    }
    catch (error) {
        console.error('Error adding flashcards to existing deck:', error);
        res.status(500).json({
            error: `Fehler beim Hinzufügen der Karteikarten: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});
exports.addFlashcardsToExistingDeck = addFlashcardsToExistingDeck;
const getFlashcardDecks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        if (!teacherId) {
            return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
        }
        const decks = yield prisma.flashcardDeck.findMany({
            where: { teacherId },
            include: {
                cards: {
                    orderBy: { order: 'asc' }
                },
                subject: true,
                assignments: {
                    include: {
                        group: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ decks });
    }
    catch (error) {
        console.error('Error fetching flashcard decks:', error);
        res.status(500).json({
            error: `Fehler beim Abrufen der Karteikarten-Decks: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});
exports.getFlashcardDecks = getFlashcardDecks;
const getFlashcardDeck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Deck-ID ist erforderlich' });
        }
        const deck = yield prisma.flashcardDeck.findUnique({
            where: { id },
            include: {
                cards: {
                    orderBy: { order: 'asc' }
                },
                subject: true,
                assignments: {
                    include: {
                        group: true
                    }
                }
            }
        });
        if (!deck) {
            return res.status(404).json({ error: 'Karteikarten-Deck nicht gefunden' });
        }
        res.status(200).json({ deck });
    }
    catch (error) {
        console.error('Error fetching flashcard deck:', error);
        res.status(500).json({
            error: `Fehler beim Abrufen des Karteikarten-Decks: ${error instanceof Error ? error.message : String(error)}`
        });
    }
});
exports.getFlashcardDeck = getFlashcardDeck;
