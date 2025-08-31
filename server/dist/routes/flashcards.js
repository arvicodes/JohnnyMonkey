"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FlashcardController_1 = require("../controllers/FlashcardController");
const router = express_1.default.Router();
// Create new flashcard deck from Word document
router.post('/create-from-word', FlashcardController_1.createFlashcardDeckFromWord);
// Add flashcards to existing deck
router.post('/add-to-existing', FlashcardController_1.addFlashcardsToExistingDeck);
// Get all flashcard decks for a teacher
router.get('/teacher/:teacherId', FlashcardController_1.getFlashcardDecks);
// Deck routes
router.post('/decks', FlashcardController_1.createDeck);
router.get('/decks/:id', FlashcardController_1.getFlashcardDeck);
router.put('/decks/:id', FlashcardController_1.updateDeck);
router.delete('/decks/:id', FlashcardController_1.deleteDeck);
// Deck cards routes
router.get('/decks/:deckId/cards', FlashcardController_1.getDeckCards);
// Card routes
router.post('/cards', FlashcardController_1.createCard);
router.put('/cards/:cardId', FlashcardController_1.updateCard);
router.delete('/cards/:cardId', FlashcardController_1.deleteCard);
// Assignment routes
router.post('/assignments', FlashcardController_1.createAssignment);
router.get('/assignments', FlashcardController_1.getFlashcardAssignments);
router.delete('/assignments/:assignmentId', FlashcardController_1.deleteAssignment);
// Document processing history
router.get('/document-history', FlashcardController_1.getDocumentProcessingHistory);
// ===== SPACED REPETITION SYSTEM ROUTEN =====
// Migration zum neuen System (nur für Administratoren)
router.post('/migrate-spaced-repetition', FlashcardController_1.migrateToNewSpacedRepetitionSystem);
// Alle fälligen Karten als gelernt markieren
router.post('/student/mark-all-learned', FlashcardController_1.markAllDueCardsAsLearned);
// Schüler-spezifische Routen
router.get('/student/:studentId/assigned', FlashcardController_1.getStudentAssignedFlashcards);
router.get('/student/:studentId/progress', FlashcardController_1.getStudentAllProgress);
router.get('/student/:studentId/today', FlashcardController_1.getTodayCards);
router.get('/student/:studentId/all-assigned', FlashcardController_1.getAllAssignedCards);
// Lernstand aktualisieren
router.post('/student/progress', FlashcardController_1.updateCardProgress);
// Karten-Review (Bewertung 1-2-3)
router.post('/student/:cardId/review', FlashcardController_1.submitCardReview);
// Lern-Sessions verwalten
router.post('/student/session/start', FlashcardController_1.startLearningSession);
router.post('/student/session/end', FlashcardController_1.endLearningSession);
// Backward compatibility routes
router.get('/:id', FlashcardController_1.getFlashcardDeck);
router.delete('/:id', FlashcardController_1.deleteDeck);
exports.default = router;
//# sourceMappingURL=flashcards.js.map