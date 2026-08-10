/**
 * Schreibt eine JSON-Sicherheitskopie des kompletten Sets nach
 * `J-M-Reihen/Folien - ALLE - BACKUP/` (eine Datei pro Deck, wird überschrieben).
 */
export declare function backupFlashcardDeckToFolienAlle(deckId: string, options?: {
    force?: boolean;
}): Promise<string | null>;
/** Fire-and-forget Wrapper für Controller (Fehler nicht an die API durchreichen). */
export declare function scheduleFlashcardDeckBackup(deckId: string | null | undefined, force?: boolean): void;
//# sourceMappingURL=flashcardDeckBackup.d.ts.map