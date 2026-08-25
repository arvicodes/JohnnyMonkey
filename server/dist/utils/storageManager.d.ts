export interface StorageConfig {
    type: 'local' | 'git-intern';
    basePath?: string;
}
export declare class StorageManager {
    private static config;
    /**
     * Physical root of J-M-Reihen (Docker: usually /app/J-M-Reihen when LOCAL_MATERIALS_PATH=/app).
     */
    private static resolveJmReihenRoot;
    /**
     * UI/DB sometimes stores "J-M-Reihen/..." instead of "git-intern/..." — normalize for one code path.
     */
    private static normalizeDirRequestPath;
    /**
     * Read directory contents
     */
    static readDirectory(dirPath: string, recursive?: boolean): Promise<any>;
    /**
     * Read git-intern directory (J-M-Reihen)
     */
    private static readGitInternDirectory;
    /**
     * Read local directory
     */
    private static readLocalDirectory;
    private static normalizeCompare;
    /** macOS NFD/NFC-tolerant: Ordner- und Dateinamen segmentweise auflösen */
    private static resolveUnicodePath;
    /**
     * Absoluter Pfad zu einer Datei oder einem Ordner unter git-intern (Relativpfad ohne Präfix "git-intern/").
     * Gleiche Logik wie readFile — wichtig für saveFile, damit Speichern und Lesen dasselbe Verzeichnis nutzen.
     */
    static resolveGitInternRelativePath(relativePath: string): string;
    /**
     * Folien speichern oft absolute macOS-Pfade. Auf dem Schulserver/Docker
     * auf LOCAL_MATERIALS_PATH bzw. git-intern umbiegen.
     */
    private static remapLegacyAbsolutePath;
    static resolveFilePath(filePath: string): string | null;
    /**
     * Wie resolveFilePath, plus: gleicher Dateiname in Elternordnern / Grafiken
     * (nach dem Zusammenlegen von Stundenordnern bleiben oft alte Pfade in Folien).
     */
    static resolveImageFilePath(filePath: string): string | null;
    private static resolveSameImageNameNearby;
    /**
     * Read file contents
     */
    static readFile(filePath: string): Promise<Buffer | null>;
    /**
     * Get file information
     */
    static getFileInfo(filePath: string): any;
    /**
     * Get file extension from filename
     */
    private static getFileExtension;
    /**
     * Update configuration
     */
    static updateConfig(config: Partial<StorageConfig>): void;
    /**
     * Get current configuration
     */
    static getConfig(): StorageConfig;
}
//# sourceMappingURL=storageManager.d.ts.map