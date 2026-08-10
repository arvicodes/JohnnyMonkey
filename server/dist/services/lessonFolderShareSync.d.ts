export declare function collectFilesInDirectory(dirPath: string): Promise<string[]>;
/**
 * Stundenordner-Freigaben bereinigen:
 * - Bilder / interne Präsentationsdateien entfernen
 * - Folien-PDFs (Original + bearbeitet) automatisch freigeben
 */
export declare function syncLessonFolderShares(groupId: string, lessonPath: string): Promise<void>;
/** Entfernt fälschlich freigegebene Bilder/Systemdateien in zugewiesenen Ordnerbäumen. */
export declare function revokeNonMaterialSharesInTree(groupId: string, rootPath: string): Promise<void>;
//# sourceMappingURL=lessonFolderShareSync.d.ts.map