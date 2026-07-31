import { PrismaClient } from '@prisma/client';
import {
  sanitizeBackupFilePart,
  writeFolienAlleBackupFile,
} from './folienAlleBackup';

const prisma = new PrismaClient();

/** Throttle: gleiches Deck nicht öfter als alle 5s neu schreiben (Karten-Edits). */
const MIN_INTERVAL_MS = 5_000;
const recentByDeckId = new Map<string, number>();

function flashcardBackupFileName(title: string, deckId: string): string {
  const titlePart = sanitizeBackupFilePart(title || 'Karteikarten', 80);
  const idPart = String(deckId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'unknown';
  return `Karteikarten__${titlePart}__${idPart}.json`;
}

/**
 * Schreibt eine JSON-Sicherheitskopie des kompletten Sets nach
 * `J-M-Reihen/Folien - ALLE - BACKUP/` (eine Datei pro Deck, wird überschrieben).
 */
export async function backupFlashcardDeckToFolienAlle(
  deckId: string,
  options?: { force?: boolean }
): Promise<string | null> {
  if (!deckId?.trim()) return null;
  const force = Boolean(options?.force);
  const now = Date.now();
  const prev = recentByDeckId.get(deckId);
  if (!force && prev != null && now - prev < MIN_INTERVAL_MS) {
    return null;
  }

  try {
    const deck = await prisma.flashcardDeck.findUnique({
      where: { id: deckId },
      include: {
        cards: { orderBy: { order: 'asc' } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
    });
    if (!deck) return null;

    const payload = {
      backupType: 'flashcard-deck',
      backedUpAt: new Date().toISOString(),
      id: deck.id,
      title: deck.title,
      description: deck.description,
      subjectId: deck.subjectId,
      subjectName: deck.subject?.name ?? null,
      teacherId: deck.teacherId,
      teacherName: deck.teacher?.name ?? null,
      isPublic: deck.isPublic,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
      cards: deck.cards.map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        hint: c.hint,
        difficulty: c.difficulty,
        order: c.order,
      })),
    };

    const fileName = flashcardBackupFileName(deck.title, deck.id);
    const written = writeFolienAlleBackupFile(fileName, JSON.stringify(payload, null, 2));
    if (written) {
      recentByDeckId.set(deckId, now);
      console.log('Folien-ALLE flashcard backup:', written);
    }
    return written;
  } catch (e) {
    console.warn('Flashcard Folien-ALLE backup failed:', deckId, e);
    return null;
  }
}

/** Fire-and-forget Wrapper für Controller (Fehler nicht an die API durchreichen). */
export function scheduleFlashcardDeckBackup(deckId: string | null | undefined, force = false): void {
  if (!deckId) return;
  void backupFlashcardDeckToFolienAlle(deckId, { force }).catch(() => undefined);
}
