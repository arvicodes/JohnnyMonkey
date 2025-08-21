import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';

const prisma = new PrismaClient();

// Erweitere den Request-Typ um user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// FlashcardDeck Controller
export const createDeck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, subjectId, isPublic, teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

    const deck = await prisma.flashcardDeck.create({
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
  } catch (error) {
    console.error('Fehler beim Erstellen des Karteidecks:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getDecks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId, subjectId, isPublic } = req.query;
    const userId = req.user?.id;

    const where: any = {};
    
    if (teacherId) where.teacherId = teacherId as string;
    if (subjectId) where.subjectId = subjectId as string;
    if (isPublic !== undefined) where.isPublic = isPublic === 'true';
    
    // Schüler sehen nur öffentliche Decks oder zugewiesene Decks
    if (req.user?.role === 'STUDENT') {
      const studentGroups = await prisma.user.findUnique({
        where: { id: userId },
        select: { learningGroups: { select: { id: true } } }
      });
      
      const groupIds = studentGroups?.learningGroups.map(g => g.id) || [];
      
      where.OR = [
        { isPublic: true },
        { assignments: { some: { groupId: { in: groupIds } } } }
      ];
    }

    const decks = await prisma.flashcardDeck.findMany({
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
  } catch (error) {
    console.error('Fehler beim Abrufen der Karteidecks:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getDeck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId } = req.params;
    const userId = req.user?.id;

    const deck = await prisma.flashcardDeck.findUnique({
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
    if (!deck.isPublic && deck.teacherId !== userId && req.user?.role === 'STUDENT') {
      // Prüfen ob der Schüler das Deck zugewiesen bekommen hat
      const hasAccess = await prisma.flashcardAssignment.findFirst({
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
  } catch (error) {
    console.error('Fehler beim Abrufen des Karteidecks:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const updateDeck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId } = req.params;
    const { title, description, subjectId, isPublic, teacherId } = req.body;
    const userId = teacherId;

    // Prüfen ob der Benutzer der Besitzer ist
    const existingDeck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!existingDeck || existingDeck.teacherId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieses Karteidecks' });
    }

    const updatedDeck = await prisma.flashcardDeck.update({
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
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Karteidecks:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const deleteDeck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId } = req.params;
    const userId = req.user?.id;

    // Prüfen ob der Benutzer der Besitzer ist
    const existingDeck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!existingDeck || existingDeck.teacherId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Karteidecks' });
    }

    await prisma.flashcardDeck.delete({
      where: { id: deckId }
    });

    res.json({ message: 'Karteideck erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Karteidecks:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Flashcard Controller
export const createCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId, front, back, hint, difficulty, order } = req.body;
    const userId = req.user?.id;

    // Prüfen ob der Benutzer der Besitzer des Decks ist
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!deck || deck.teacherId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Hinzufügen von Karten zu diesem Deck' });
    }

    const card = await prisma.flashcard.create({
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
  } catch (error) {
    console.error('Fehler beim Erstellen der Karte:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const updateCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { front, back, hint, difficulty, order } = req.body;
    const userId = req.user?.id;

    // Prüfen ob der Benutzer der Besitzer des Decks ist
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { deck: true }
    });

    if (!card || card.deck.teacherId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieser Karte' });
    }

    const updatedCard = await prisma.flashcard.update({
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
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Karte:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const deleteCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const userId = req.user?.id;

    // Prüfen ob der Benutzer der Besitzer des Decks ist
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { deck: true }
    });

    if (!card || card.deck.teacherId !== userId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Karte' });
    }

    await prisma.flashcard.delete({
      where: { id: cardId }
    });

    res.json({ message: 'Karte erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Karte:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Flashcard Progress Controller
export const getStudentProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const progress = await prisma.flashcardProgress.findMany({
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
    const allCards = await prisma.flashcard.findMany({
      where: { deckId },
      orderBy: { order: 'asc' }
    });

    const cardsWithProgress = allCards.map(card => {
      const existingProgress = progress.find(p => p.cardId === card.id);
      if (existingProgress) {
        return {
          ...card,
          progress: existingProgress
        };
      } else {
        return {
          ...card,
          progress: {
            id: null,
            level: 0,
            nextReview: new Date(),
            lastReviewed: null,
            reviewCount: 0
          }
        };
      }
    });

    res.json(cardsWithProgress);
  } catch (error) {
    console.error('Fehler beim Abrufen des Fortschritts:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const submitCardReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { quality } = req.body;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    if (quality < 1 || quality > 5) {
      return res.status(400).json({ error: 'Qualität muss zwischen 1 und 5 liegen' });
    }

    // Aktuellen Fortschritt abrufen oder erstellen
    let progress = await prisma.flashcardProgress.findUnique({
      where: {
        cardId_studentId: {
          cardId,
          studentId
        }
      }
    });

    const currentLevel = progress?.level || 0;
    const reviewResult = SpacedRepetitionService.calculateNextReview(currentLevel, quality);

    if (progress) {
      // Bestehenden Fortschritt aktualisieren
      progress = await prisma.flashcardProgress.update({
        where: { id: progress.id },
        data: {
          level: reviewResult.newLevel,
          nextReview: reviewResult.nextReview,
          lastReviewed: new Date(),
          reviewCount: progress.reviewCount + 1
        }
      });
    } else {
      // Neuen Fortschritt erstellen
      progress = await prisma.flashcardProgress.create({
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
  } catch (error) {
    console.error('Fehler beim Speichern des Karten-Reviews:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getDueCards = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const progress = await prisma.flashcardProgress.findMany({
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
    const dueCards = progress.filter(p => 
      SpacedRepetitionService.isCardReadyForReview(p.nextReview)
    );

    // Nach Priorität sortieren - Korrigiere den Typ-Konflikt
    const sortedCards = SpacedRepetitionService.sortCardsByPriority(
      dueCards.map(p => ({
        nextReview: p.nextReview,
        level: p.level,
        lastReviewed: p.lastReviewed || undefined
      }))
    );

    // Karten mit Fortschritt kombinieren
    const dueCardsWithProgress = sortedCards.map(sorted => {
      const cardProgress = progress.find(p => 
        p.level === sorted.level && 
        p.nextReview.getTime() === sorted.nextReview.getTime()
      );
      return cardProgress;
    }).filter(Boolean);

    res.json(dueCardsWithProgress);
  } catch (error) {
    console.error('Fehler beim Abrufen der fälligen Karten:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Flashcard Assignment Controller
export const assignDeckToGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId, groupId, dueDate, teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

    // Prüfen ob der Lehrer der Besitzer des Decks ist
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!deck || deck.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Zuweisen dieses Karteidecks' });
    }

    // Prüfen ob der Lehrer die Gruppe unterrichtet
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId }
    });

    if (!group || group.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Zuweisen an diese Gruppe' });
    }

    const assignment = await prisma.flashcardAssignment.create({
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
  } catch (error) {
    console.error('Fehler beim Zuweisen des Karteidecks:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getAssignments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId } = req.query;
    const userId = req.user?.id;

    const where: any = {};
    
    if (teacherId) {
      where.deck = { teacherId: teacherId as string };
    }

    const assignments = await prisma.flashcardAssignment.findMany({
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
  } catch (error) {
    console.error('Fehler beim Abrufen der Zuweisungen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const removeDeckAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user?.id;

    if (!teacherId) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    // Prüfen ob der Lehrer der Besitzer des Decks ist
    const assignment = await prisma.flashcardAssignment.findUnique({
      where: { id: assignmentId },
      include: { deck: true }
    });

    if (!assignment || assignment.deck.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Entfernen dieser Zuweisung' });
    }

    await prisma.flashcardAssignment.delete({
      where: { id: assignmentId }
    });

    res.json({ message: 'Zuweisung erfolgreich entfernt' });
  } catch (error) {
    console.error('Fehler beim Entfernen der Zuweisung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
