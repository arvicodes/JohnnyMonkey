/**
 * Schreibt/aktualisiert die Sammel-Sicherheitskopie unter
 * `J-M-Reihen/Folien - ALLE - BACKUP/Praesentation__<Stundenpfad>.json`
 */
export declare function backupPresentationDeckToFolienAlle(deckFilePath: string, content: Buffer | string): string | null;
/**
 * Schreibt Sicherheitskopien:
 * 1) lokal neben der Präsentation: `.presentation-backups/`
 * 2) zentral im Projekt: `Presentation-Sicherheitskopien/<Stundenpfad>/`
 *    plus immer `latest.json` als schnellste Wiederherstellung.
 * 3) Sammelordner: `J-M-Reihen/Folien - ALLE - BACKUP/`
 */
export declare function backupPresentationDeckBeforeOverwrite(deckFilePath: string, options?: {
    force?: boolean;
    reason?: string;
}): {
    local?: string;
    central?: string;
    latest?: string;
    folienAlle?: string;
};
/**
 * Nach erfolgreichem Speichern: aktuelle Version in den Sammelordner schreiben
 * (auch bei Erst-Erstellung, wenn noch kein vorheriges Backup existierte).
 */
export declare function backupPresentationDeckAfterSave(deckFilePath: string, savedContent: Buffer | string, options?: {
    force?: boolean;
}): string | null;
/**
 * Zeitstempel-Kopie nach `J-M-Reihen/Backup - Folien/` (Deck + Annotationen, falls vorhanden).
 */
export declare function backupLessonToTeacherFolienFolder(lessonFilePath: string, options?: {
    force?: boolean;
    savedDeck?: Buffer | string;
}): string | null;
export declare function getCentralPresentationBackupRoot(): string;
//# sourceMappingURL=presentationDeckBackup.d.ts.map