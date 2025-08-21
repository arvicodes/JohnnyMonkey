"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const FlashcardController_1 = require("../controllers/FlashcardController");
const router = express_1.default.Router();
// Middleware für Authentifizierung (wird später hinzugefügt)
// router.use(authMiddleware);
// FlashcardDeck Routes
router.post('/decks', FlashcardController_1.createDeck);
router.get('/decks', FlashcardController_1.getDecks);
router.get('/decks/:deckId', FlashcardController_1.getDeck);
router.put('/decks/:deckId', FlashcardController_1.updateDeck);
router.delete('/decks/:deckId', FlashcardController_1.deleteDeck);
// Flashcard Routes
router.post('/cards', FlashcardController_1.createCard);
router.put('/cards/:cardId', FlashcardController_1.updateCard);
router.delete('/cards/:cardId', FlashcardController_1.deleteCard);
// Progress Routes
router.get('/decks/:deckId/progress', FlashcardController_1.getStudentProgress);
router.post('/cards/:cardId/review', FlashcardController_1.submitCardReview);
router.get('/decks/:deckId/due-cards', FlashcardController_1.getDueCards);
// Assignment Routes
router.post('/assignments', FlashcardController_1.assignDeckToGroup);
router.get('/assignments', FlashcardController_1.getAssignments);
router.delete('/assignments/:assignmentId', FlashcardController_1.removeDeckAssignment);
exports.default = router;
