import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import { SpacedRepetitionService } from '../services/SpacedRepetitionService';
import { parseFlashcardWordFile, ParsedFlashcardDocument } from '../utils/flashcardWordParser';

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

export const getDeckCards = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId } = req.params;
    const userId = req.user?.id;

    console.log(`Loading cards for deck ${deckId}...`);

    // Prüfen ob das Deck existiert
    const deck = await prisma.flashcardDeck.findUnique({
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

    // Karten laden
    const cards = await prisma.flashcard.findMany({
      where: { deckId },
      orderBy: { order: 'asc' }
    });

    console.log(`Successfully loaded ${cards.length} cards for deck ${deck.title}`);
    
    res.json(cards);
  } catch (error) {
    console.error('Fehler beim Abrufen der Karten:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const updateDeck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: deckId } = req.params;
    const { title, description, subjectId, isPublic, teacherId } = req.body;
    const userId = teacherId;

    if (!deckId) {
      return res.status(400).json({ error: 'Deck-ID ist erforderlich' });
    }

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

export const deleteDeck = async (req: Request, res: Response) => {
  try {
    const { id: deckId } = req.params;
    const { teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

    // Prüfen ob der Benutzer der Besitzer ist
    const existingDeck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!existingDeck) {
      return res.status(404).json({ error: 'Karteideck nicht gefunden' });
    }

    if (existingDeck.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Karteidecks' });
    }

    // Lösche zuerst alle Zuweisungen, da sie keine Cascade-Delete-Regel haben
    await prisma.flashcardAssignment.deleteMany({
      where: { deckId }
    });

    // Lösche alle Karten (werden durch Cascade-Delete automatisch gelöscht)
    await prisma.flashcard.deleteMany({
      where: { deckId }
    });

    // Jetzt kann das Deck gelöscht werden
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
    const { deckId, front, back, hint, difficulty, order, teacherId } = req.body;
    const userId = teacherId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

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
    const { front, back, hint, difficulty, order, teacherId } = req.body;
    const userId = teacherId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

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
    const { teacherId } = req.body;
    
    // Fallback zu req.user?.id wenn teacherId nicht im Body ist
    const userId = teacherId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'Keine Benutzer-ID gefunden' });
    }

    // Prüfen ob der Benutzer der Besitzer des Decks ist
    const card = await prisma.flashcard.findUnique({
      where: { id: cardId },
      include: { deck: true }
    });

    if (!card) {
      return res.status(404).json({ error: 'Karte nicht gefunden' });
    }

    if (card.deck.teacherId !== userId) {
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

// Assignment Controller
export const createAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { deckId, groupId, teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

    // Prüfen ob der Benutzer der Besitzer des Decks ist
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId }
    });

    if (!deck || deck.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Zuweisen dieses Karteidecks' });
    }

    // Prüfen ob die Gruppe existiert und dem Lehrer gehört
    const group = await prisma.learningGroup.findUnique({
      where: { id: groupId }
    });

    if (!group || group.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung für diese Lerngruppe' });
    }

    const assignment = await prisma.flashcardAssignment.create({
      data: {
        deckId,
        groupId
      },
      include: {
        deck: true,
        group: true
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Fehler beim Erstellen der Zuweisung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const deleteAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { teacherId } = req.body;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

    // Prüfen ob die Zuweisung existiert und der Benutzer berechtigt ist
    const assignment = await prisma.flashcardAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        deck: true,
        group: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Zuweisung nicht gefunden' });
    }

    if (assignment.deck.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Zuweisung' });
    }

    await prisma.flashcardAssignment.delete({
      where: { id: assignmentId }
    });

    res.json({ message: 'Zuweisung erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen der Zuweisung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

export const getFlashcardAssignments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { teacherId } = req.query;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId ist erforderlich' });
    }

    const assignments = await prisma.flashcardAssignment.findMany({
      where: {
        deck: {
          teacherId: teacherId as string
        }
      },
      include: {
        deck: true,
        group: true
      }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Fehler beim Abrufen der Zuweisungen:', error);
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
            order: true,
            deckId: true
          }
        }
      },
      orderBy: {
        card: { order: 'asc' }
      }
    });

    // Nur Karten mit tatsächlichem Fortschritt zurückgeben
    // Ungelernte Karten werden NICHT mit Dummy-Fortschritt versehen
    res.json({ progress });
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

    if (quality < 1 || quality > 3) {
      return res.status(400).json({ error: 'Qualität muss zwischen 1 und 3 liegen (1=Perfekt, 2=Teilweise, 3=Nicht gewusst)' });
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
          reviewCount: progress.reviewCount + 1,
          quality: quality // Speichere die aktuelle Bewertung
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
          reviewCount: 1,
          quality: quality // Speichere die aktuelle Bewertung
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
      const cardProgress = progress.find(p => {
        const pTime = typeof p.nextReview === 'number' ? p.nextReview : p.nextReview.getTime();
        const sortedTime = typeof sorted.nextReview === 'number' ? sorted.nextReview : sorted.nextReview.getTime();
        return p.level === sorted.level && pTime === sortedTime;
      });
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



export const removeDeckAssignment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const { teacherId } = req.body;
    
    // Fallback zu req.user?.id wenn teacherId nicht im Body ist
    const userId = teacherId || req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: 'Keine Benutzer-ID gefunden' });
    }

    // Prüfen ob der Lehrer der Besitzer des Decks ist
    const assignment = await prisma.flashcardAssignment.findUnique({
      where: { id: assignmentId },
      include: { deck: true }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Zuweisung nicht gefunden' });
    }

    if (assignment.deck.teacherId !== userId) {
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

export const createFlashcardDeckFromWord = async (req: Request, res: Response) => {
  try {
    const { 
      teacherId, 
      sourceFile, 
      title, 
      description, 
      subjectId, 
      learningGroupIds,
      isPublic = false 
    } = req.body;
    
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
    
    let parsedDocument: ParsedFlashcardDocument;
    try {
      parsedDocument = await parseFlashcardWordFile(sourceFile);
      console.log('Parsed flashcard document:', parsedDocument);
    } catch (parseError) {
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
      const subject = await prisma.subject.findFirst({
        where: {
          id: subjectId,
          teacherId: teacherId
        }
      });
      if (subject) {
        validatedSubjectId = subjectId;
      } else {
        console.warn(`Subject ID ${subjectId} not found or doesn't belong to teacher ${teacherId}`);
      }
    }

    // Create the flashcard deck
    const deck = await prisma.flashcardDeck.create({
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
    const createdCards = await Promise.all(
      parsedDocument.cards.map((card, index) =>
        prisma.flashcard.create({
          data: {
            deckId: deck.id,
            front: card.front,
            back: card.back,
            hint: card.hint,
            difficulty: 1, // Default difficulty
            order: index
          }
        })
      )
    );

    console.log(`Created ${createdCards.length} flashcards`);

    // Assign to learning groups if specified
    if (learningGroupIds && learningGroupIds.length > 0) {
      // Validate that all learning group IDs exist and belong to the teacher
      const validGroups = await prisma.learningGroup.findMany({
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
        const assignments = await Promise.all(
          validGroups.map((group) =>
            prisma.flashcardAssignment.create({
              data: {
                deckId: deck.id,
                groupId: group.id
              }
            })
          )
        );
        console.log(`Assigned deck to ${assignments.length} learning groups`);
      }
    }

    // Track document processing
    await prisma.documentProcessingHistory.create({
      data: {
        sourceFile,
        fileName: sourceFile.split('/').pop() || sourceFile,
        teacherId,
        action: 'created_deck',
        deckId: deck.id,
        deckTitle: deck.title,
        cardsCount: createdCards.length
      }
    });

    // Return the created deck with cards
    const result = await prisma.flashcardDeck.findUnique({
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

  } catch (error) {
    console.error('Error creating flashcard deck:', error);
    res.status(500).json({ 
      error: `Fehler beim Erstellen des Karteikarten-Decks: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
};

export const addFlashcardsToExistingDeck = async (req: Request, res: Response) => {
  try {
    const { 
      teacherId, 
      sourceFile, 
      deckId 
    } = req.body;
    
    if (!teacherId || !sourceFile || !deckId) {
      return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Deck-ID sind erforderlich' });
    }

    console.log('Adding flashcards to existing deck:', {
      teacherId,
      sourceFile,
      deckId
    });

    // Verify the deck exists and belongs to the teacher
    const existingDeck = await prisma.flashcardDeck.findFirst({
      where: {
        id: deckId,
        teacherId
      }
    });

    if (!existingDeck) {
      return res.status(404).json({ error: 'Karteikarten-Deck nicht gefunden oder Sie haben keine Berechtigung dafür.' });
    }

    // Parse the Word file to extract flashcards
    let parsedDocument: ParsedFlashcardDocument;
    try {
      parsedDocument = await parseFlashcardWordFile(sourceFile);
    } catch (parseError) {
      console.error('Error parsing Word file:', parseError);
      return res.status(400).json({ 
        error: `Fehler beim Parsen der Word-Datei: ${parseError instanceof Error ? parseError.message : String(parseError)}` 
      });
    }
    
    if (!parsedDocument.cards || parsedDocument.cards.length === 0) {
      return res.status(400).json({ error: 'Keine Karteikarten in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
    }

    // Get current highest order in the deck
    const maxOrder = await prisma.flashcard.aggregate({
      where: { deckId },
      _max: { order: true }
    });

    const startOrder = (maxOrder._max.order || 0) + 1;

    // Create new flashcards
    const createdCards = await Promise.all(
      parsedDocument.cards.map((card, index) =>
        prisma.flashcard.create({
          data: {
            deckId,
            front: card.front,
            back: card.back,
            hint: card.hint,
            difficulty: 1, // Default difficulty
            order: startOrder + index
          }
        })
      )
    );

    console.log(`Added ${createdCards.length} flashcards to existing deck`);

    // Track document processing
    await prisma.documentProcessingHistory.create({
      data: {
        sourceFile,
        fileName: sourceFile.split('/').pop() || sourceFile,
        teacherId,
        action: 'added_to_deck',
        deckId: deckId,
        deckTitle: existingDeck.title,
        cardsCount: createdCards.length
      }
    });

    // Return updated deck
    const result = await prisma.flashcardDeck.findUnique({
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

  } catch (error) {
    console.error('Error adding flashcards to existing deck:', error);
    res.status(500).json({ 
      error: `Fehler beim Hinzufügen der Karteikarten: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
};

export const getFlashcardDecks = async (req: Request, res: Response) => {
  try {
    const { teacherId } = req.params;
    
    if (!teacherId) {
      return res.status(400).json({ error: 'Lehrer-ID ist erforderlich' });
    }

    const decks = await prisma.flashcardDeck.findMany({
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

  } catch (error) {
    console.error('Error fetching flashcard decks:', error);
    res.status(500).json({ 
      error: `Fehler beim Abrufen der Karteikarten-Decks: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
};

export const getFlashcardDeck = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Deck-ID ist erforderlich' });
    }

    const deck = await prisma.flashcardDeck.findUnique({
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

  } catch (error) {
    console.error('Error fetching flashcard deck:', error);
    res.status(500).json({ 
      error: `Fehler beim Abrufen des Karteikarten-Decks: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
};

// Neue Funktion: Verarbeitungshistorie für ein Dokument abrufen
export const getDocumentProcessingHistory = async (req: Request, res: Response) => {
  try {
    const { teacherId, sourceFile } = req.query;
    
    if (!teacherId || !sourceFile) {
      return res.status(400).json({ error: 'Lehrer-ID und Quelldatei sind erforderlich' });
    }

    const history = await prisma.documentProcessingHistory.findMany({
      where: {
        teacherId: teacherId as string,
        sourceFile: sourceFile as string
      },
      orderBy: { processedAt: 'desc' }
    });

    res.json({ history });
  } catch (error) {
    console.error('Error fetching document processing history:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ===== SPACED REPETITION SYSTEM FUNKTIONEN =====

// Zugewiesene Karteikarten für einen Schüler abrufen
export const getStudentAssignedFlashcards = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    // Finde alle Lerngruppen des Schülers
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        learningGroups: {
          include: {
            flashcardAssignments: {
              include: {
                deck: {
                  include: {
                    cards: {
                      orderBy: { order: 'asc' }
                    },
                    subject: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Schüler nicht gefunden' });
    }

    // Sammle alle zugewiesenen Karteikarten
    const assignedDecks: any[] = [];
    for (const group of student.learningGroups) {
      for (const assignment of group.flashcardAssignments) {
        assignedDecks.push(assignment.deck);
      }
    }

    res.json({ decks: assignedDecks });
  } catch (error) {
    console.error('Error fetching student assigned flashcards:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Lernstand für eine Karte aktualisieren (mit SM-2 Algorithmus)
export const updateCardProgress = async (req: Request, res: Response) => {
  try {
    const { studentId, cardId, quality } = req.body;
    
    if (!studentId || !cardId || quality === undefined) {
      return res.status(400).json({ error: 'Schüler-ID, Karten-ID und Qualität sind erforderlich' });
    }

    if (quality < 1 || quality > 5) {
      return res.status(400).json({ error: 'Qualität muss zwischen 1 und 5 liegen' });
    }

    // Finde oder erstelle den Lernstand
    let progress = await prisma.flashcardProgress.findUnique({
      where: { cardId_studentId: { cardId, studentId } }
    });

    if (!progress) {
      // Erste Wiederholung - erstelle neuen Eintrag
      progress = await prisma.flashcardProgress.create({
        data: {
          cardId,
          studentId,
          level: 0,
          easeFactor: 2.5,
          interval: 1,
          reviewCount: 1,
          lastReviewed: new Date(),
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000), // +1 Tag
          quality // ← Qualität wird jetzt auch bei der ersten Wiederholung gespeichert!
        }
      });
    } else {
      // SM-2 Algorithmus anwenden
      const newEaseFactor = Math.max(1.3, progress.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      
      let newInterval: number;
      if (quality >= 4) {
        // Karte gut gewusst
        if (progress.level === 0) {
          newInterval = 1;
        } else if (progress.level === 1) {
          newInterval = 6;
        } else {
          newInterval = Math.round(progress.interval * progress.easeFactor);
        }
        progress.level = Math.min(5, progress.level + 1);
      } else if (quality >= 3) {
        // Karte teilweise gewusst
        newInterval = Math.max(1, Math.round(progress.interval * 0.5));
        progress.level = Math.max(0, progress.level - 1);
      } else {
        // Karte nicht gewusst
        newInterval = 1;
        progress.level = 0;
      }

      // Aktualisiere den Lernstand
      progress = await prisma.flashcardProgress.update({
        where: { id: progress.id },
        data: {
          level: progress.level,
          easeFactor: newEaseFactor,
          interval: newInterval,
          reviewCount: progress.reviewCount + 1,
          lastReviewed: new Date(),
          nextReview: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
          quality
        }
      });
    }

    res.json({ progress });
  } catch (error) {
    console.error('Error updating card progress:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Lernstand für einen Schüler abrufen (alle Karten)
export const getStudentAllProgress = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    const progress = await prisma.flashcardProgress.findMany({
      where: { studentId },
      include: {
        card: {
          include: {
            deck: true
          }
        }
      },
      orderBy: { nextReview: 'asc' }
    });

    res.json({ progress });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Karten für heute zum Lernen abrufen
export const getTodayCards = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCards = await prisma.flashcardProgress.findMany({
      where: {
        studentId,
        nextReview: {
          lte: today
        }
      },
      include: {
        card: {
          include: {
            deck: true
          }
        }
      },
      orderBy: { nextReview: 'asc' }
    });

    res.json({ cards: todayCards });
  } catch (error) {
    console.error('Error fetching today cards:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Lern-Session starten
export const startLearningSession = async (req: Request, res: Response) => {
  try {
    const { studentId, deckId } = req.body;
    
    if (!studentId || !deckId) {
      return res.status(400).json({ error: 'Schüler-ID und Deck-ID sind erforderlich' });
    }

    const session = await prisma.flashcardLearningSession.create({
      data: {
        studentId,
        deckId,
        startTime: new Date()
      }
    });

    res.json({ session });
  } catch (error) {
    console.error('Error starting learning session:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Lern-Session beenden
export const endLearningSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, cardsReviewed, correctAnswers, incorrectAnswers } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session-ID ist erforderlich' });
    }

    const session = await prisma.flashcardLearningSession.update({
      where: { id: sessionId },
      data: {
        endTime: new Date(),
        cardsReviewed: cardsReviewed || 0,
        correctAnswers: correctAnswers || 0,
        incorrectAnswers: incorrectAnswers || 0,
        sessionDuration: Math.floor((Date.now() - new Date().getTime()) / 1000)
      }
    });

    res.json({ session });
  } catch (error) {
    console.error('Error ending learning session:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Alle zugewiesenen Karten für einen Schüler abrufen
export const getAllAssignedCards = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    const assignedCards = await prisma.flashcardAssignment.findMany({
      where: {
        group: {
          students: {
            some: { id: studentId }
          }
        }
      },
      include: {
        deck: {
          include: {
            cards: true,
            subject: true
          }
        },
        group: {
          select: { name: true }
        }
      }
    });

    res.json({ assignedCards });
  } catch (error) {
    console.error('Error fetching all assigned cards:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Migration zum neuen Spaced Repetition System
export const migrateToNewSpacedRepetitionSystem = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Prüfen ob der Benutzer Administrator ist
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Nur Administratoren können diese Aktion durchführen' });
    }

    // Alle bestehenden Fortschritte migrieren
    const allProgress = await prisma.flashcardProgress.findMany();
    
    for (const progress of allProgress) {
      // Standardwerte für das neue System setzen
      await prisma.flashcardProgress.update({
        where: { id: progress.id },
        data: {
          level: progress.level || 0,
          nextReview: new Date(),
          lastReviewed: progress.lastReviewed || new Date(),
          reviewCount: progress.reviewCount || 0
        }
      });
    }

    res.json({ message: 'Migration erfolgreich abgeschlossen', migratedCount: allProgress.length });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ error: 'Fehler bei der Migration' });
  }
};

// Alle fälligen Karten als gelernt markieren
export const markAllDueCardsAsLearned = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ error: 'Schüler-ID ist erforderlich' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Alle fälligen Karten finden
    const dueCards = await prisma.flashcardProgress.findMany({
      where: {
        studentId,
        nextReview: {
          lte: today
        }
      }
    });

    // Alle fälligen Karten als gelernt markieren
    for (const progress of dueCards) {
      await prisma.flashcardProgress.update({
        where: { id: progress.id },
        data: {
          level: Math.min(progress.level + 1, 5), // Level erhöhen, max 5
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000), // Nächster Review in 24 Stunden
          lastReviewed: new Date(),
          reviewCount: progress.reviewCount + 1
        }
      });
    }

    res.json({ 
      message: 'Alle fälligen Karten wurden als gelernt markiert', 
      updatedCount: dueCards.length 
    });
  } catch (error) {
    console.error('Error marking cards as learned:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};
