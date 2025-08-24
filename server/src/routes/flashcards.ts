import express from 'express';
import {
  createFlashcardDeckFromWord,
  addFlashcardsToExistingDeck,
  getFlashcardDecks,
  getFlashcardDeck,
  deleteDeck
} from '../controllers/FlashcardController';

const router = express.Router();

// Create new flashcard deck from Word document
router.post('/create-from-word', createFlashcardDeckFromWord);

// Add flashcards to existing deck
router.post('/add-to-existing', addFlashcardsToExistingDeck);

// Get all flashcard decks for a teacher
router.get('/teacher/:teacherId', getFlashcardDecks);

// Get specific flashcard deck
router.get('/:id', getFlashcardDeck);

// Delete flashcard deck
router.delete('/:id', deleteDeck);

export default router;
