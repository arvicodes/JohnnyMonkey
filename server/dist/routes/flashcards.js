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
// Get specific flashcard deck
router.get('/:id', FlashcardController_1.getFlashcardDeck);
// Delete flashcard deck
router.delete('/:id', FlashcardController_1.deleteDeck);
exports.default = router;
