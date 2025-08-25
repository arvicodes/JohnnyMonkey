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
  getDocumentProcessingHistory,
  getStudentAssignedFlashcards,
  updateCardProgress,
  getStudentAllProgress,
  getTodayCards,
  startLearningSession,
  endLearningSession
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

// ===== SPACED REPETITION SYSTEM ROUTEN =====

// Schüler-spezifische Routen
router.get('/student/:studentId/assigned', getStudentAssignedFlashcards);
router.get('/student/:studentId/progress', getStudentAllProgress);
router.get('/student/:studentId/today', getTodayCards);

// Lernstand aktualisieren
router.post('/student/progress', updateCardProgress);

// Lern-Sessions verwalten
router.post('/student/session/start', startLearningSession);
router.post('/student/session/end', endLearningSession);

// Backward compatibility routes
router.get('/:id', getFlashcardDeck);
router.delete('/:id', deleteDeck);

export default router;
