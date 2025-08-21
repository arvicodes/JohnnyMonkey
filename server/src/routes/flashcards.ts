import express from 'express';
import {
  // Deck Controller
  createDeck,
  getDecks,
  getDeck,
  updateDeck,
  deleteDeck,
  
  // Card Controller
  createCard,
  updateCard,
  deleteCard,
  
  // Progress Controller
  getStudentProgress,
  submitCardReview,
  getDueCards,
  
  // Assignment Controller
  assignDeckToGroup,
  getAssignments,
  removeDeckAssignment
} from '../controllers/FlashcardController';

const router = express.Router();

// Middleware für Authentifizierung (wird später hinzugefügt)
// router.use(authMiddleware);

// FlashcardDeck Routes
router.post('/decks', createDeck);
router.get('/decks', getDecks);
router.get('/decks/:deckId', getDeck);
router.put('/decks/:deckId', updateDeck);
router.delete('/decks/:deckId', deleteDeck);

// Flashcard Routes
router.post('/cards', createCard);
router.put('/cards/:cardId', updateCard);
router.delete('/cards/:cardId', deleteCard);

// Progress Routes
router.get('/decks/:deckId/progress', getStudentProgress);
router.post('/cards/:cardId/review', submitCardReview);
router.get('/decks/:deckId/due-cards', getDueCards);

// Assignment Routes
router.post('/assignments', assignDeckToGroup);
router.get('/assignments', getAssignments);
router.delete('/assignments/:assignmentId', removeDeckAssignment);

export default router;
