export type ScannedPhoto = {
    relativePath: string;
    fileName: string;
    dateISO: string | null;
    size: number;
};
/** Pfad aus Finder-Zwischenablage / manueller Eingabe bereinigen. */
export declare function normalizeUserFolderPath(inputPath: string): string;
export declare function resolveSafeSourceRoot(inputPath: string): string;
export declare function assertFileUnderRoot(root: string, filePath: string): string;
export declare function scanPhotoFolder(sourcePath: string, targetDateISO?: string | null): Promise<{
    root: string;
    images: ScannedPhoto[];
    total: number;
    matchedCount: number;
    suggestedCaptureDateISO: string | null;
    exifCount: number;
}>;
export declare function getErasmusBilderDir(erasmusFolder: string | undefined): string | null;
export type ImportedPhoto = {
    relativePath: string;
    galleryUrl: string;
    erasmusPath: string;
    dateISO: string | null;
};
export declare function importPhotosToErasmus(params: {
    siteId: string;
    erasmusFolder?: string;
    sourceRoot: string;
    relativePaths: string[];
    pageDateStr: string;
    mediaDir: string;
}): Promise<ImportedPhoto[]>;
/** Fotos aus Browser-Upload (ohne Server-Pfad zum Quellordner). */
export declare function importPhotoBuffersToErasmus(params: {
    siteId: string;
    erasmusFolder?: string;
    files: {
        buffer: Buffer;
        originalName: string;
    }[];
    pageDateStr: string;
    mediaDir: string;
}): Promise<ImportedPhoto[]>;
//# sourceMappingURL=erasmusPhotoImport.d.ts.map