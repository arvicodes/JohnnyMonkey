import express from 'express';
import {
  createFlashcardDeckFromWord,
  addFlashcardsToExistingDeck,
  getFlashcardDecks,
  getFlashcardDeck,
  deleteDeck,
  createDeck,
  updateDeck,
  getDeckCards,
  createCard,
  updateCard,
  deleteCard,
  createAssignment,
  deleteAssignment,
  getFlashcardAssignments,
  getDocumentProcessingHistory
} from '../controllers/FlashcardController';

const router = express.Router();

// Create new flashcard deck from Word document
router.post('/create-from-word', createFlashcardDeckFromWord);

// Add flashcards to existing deck
router.post('/add-to-existing', addFlashcardsToExistingDeck);

// Get all flashcard decks for a teacher
router.get('/teacher/:teacherId', getFlashcardDecks);

// Deck routes
router.post('/decks', createDeck);
router.get('/decks/:id', getFlashcardDeck);
router.put('/decks/:id', updateDeck);
router.delete('/decks/:id', deleteDeck);

// Deck cards routes
router.get('/decks/:deckId/cards', getDeckCards);

// Card routes
router.post('/cards', createCard);
router.put('/cards/:cardId', updateCard);
router.delete('/cards/:cardId', deleteCard);

// Assignment routes
router.post('/assignments', createAssignment);
router.get('/assignments', getFlashcardAssignments);
router.delete('/assignments/:assignmentId', deleteAssignment);

// Document processing history
router.get('/document-history', getDocumentProcessingHistory);

// Backward compatibility routes
router.get('/:id', getFlashcardDeck);
router.delete('/:id', deleteDeck);

export default router;
