export interface StorageConfig {
    type: 'local' | 'git-intern';
    basePath?: string;
}
export declare class StorageManager {
    private static config;
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