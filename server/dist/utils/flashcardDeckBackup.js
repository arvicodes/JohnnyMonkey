"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupFlashcardDeckToFolienAlle = backupFlashcardDeckToFolienAlle;
exports.scheduleFlashcardDeckBackup = scheduleFlashcardDeckBackup;
const client_1 = require("@prisma/client");
const folienAlleBackup_1 = require("./folienAlleBackup");
const prisma = new client_1.PrismaClient();
/** Throttle: gleiches Deck nicht öfter als alle 5s neu schreiben (Karten-Edits). */
const MIN_INTERVAL_MS = 5000;
const recentByDeckId = new Map();
function flashcardBackupFileName(title, deckId) {
    const titlePart = (0, folienAlleBackup_1.sanitizeBackupFilePart)(title || 'Karteikarten', 80);
    const idPart = String(deckId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12) || 'unknown';
    return `Karteikarten__${titlePart}__${idPart}.json`;
}
/**
 * Schreibt eine JSON-Sicherheitskopie des kompletten Sets nach
 * `J-M-Reihen/Folien - ALLE - BACKUP/` (eine Datei pro Deck, wird überschrieben).
 */
async function backupFlashcardDeckToFolienAlle(deckId, options) {
    var _a, _b, _c, _d;
    if (!(deckId === null || deckId === void 0 ? void 0 : deckId.trim()))
        return null;
    const force = Boolean(options === null || options === void 0 ? void 0 : options.force);
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
        if (!deck)
            return null;
        const payload = {
            backupType: 'flashcard-deck',
            backedUpAt: new Date().toISOString(),
            id: deck.id,
            title: deck.title,
            description: deck.description,
            subjectId: deck.subjectId,
            subjectName: (_b = (_a = deck.subject) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : null,
            teacherId: deck.teacherId,
            teacherName: (_d = (_c = deck.teacher) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : null,
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
        const written = (0, folienAlleBackup_1.writeFolienAlleBackupFile)(fileName, JSON.stringify(payload, null, 2));
        if (written) {
            recentByDeckId.set(deckId, now);
            console.log('Folien-ALLE flashcard backup:', written);
        }
        return written;
    }
    catch (e) {
        console.warn('Flashcard Folien-ALLE backup failed:', deckId, e);
        return null;
    }
}
/** Fire-and-forget Wrapper für Controller (Fehler nicht an die API durchreichen). */
function scheduleFlashcardDeckBackup(deckId, force = false) {
    if (!deckId)
        return;
    void backupFlashcardDeckToFolienAlle(deckId, { force }).catch(() => undefined);
}
//# sourceMappingURL=flashcardDeckBackup.js.map