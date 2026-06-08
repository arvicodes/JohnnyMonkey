/** EXIF-Zeitstempel → YYYY-MM-DD (Kalenderdatum aus EXIF-String, ohne Zeitzonen-Verschiebung). */
export declare function exifValueToDateISO(raw: unknown): string | null;
export declare function firstExifDateISO(tags: Record<string, unknown> | undefined): string | null;
export declare function extractDateFromFileName(fileName: string): string | null;
export declare function readCaptureDateISOFromPath(fullPath: string): Promise<string | null>;
export declare function readCaptureDateISOFromBuffer(buffer: Buffer, fileName: string): Promise<string | null>;
//# sourceMappingURL=exifCaptureDate.d.ts.map