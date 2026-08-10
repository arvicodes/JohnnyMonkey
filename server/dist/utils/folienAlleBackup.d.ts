/** Zentraler Sammelordner unter J-M-Reihen für Präsentations- und Karteikarten-Sicherheitskopien */
export declare const FOLIEN_ALLE_BACKUP_DIR_NAME = "Folien - ALLE - BACKUP";
/** Absoluter Pfad zu `J-M-Reihen/Folien - ALLE - BACKUP` (Ordner wird angelegt). */
export declare function ensureFolienAlleBackupDir(): string;
/** Dateinamen-sichere Variante eines Pfads/Titels (ohne Extension). */
export declare function sanitizeBackupFilePart(raw: string, maxLen?: number): string;
export declare function writeFolienAlleBackupFile(fileName: string, content: string | Buffer): string | null;
//# sourceMappingURL=folienAlleBackup.d.ts.map