/**
 * Multer/busboy liest Content-Disposition-Dateinamen als Latin-1.
 * UTF-8-Bytes (z. B. „Münzen.png“) landen dann als Mojibake auf der Platte,
 * während der Client den korrekten Unicode-Namen im Deck speichert → 404.
 */
export declare function decodeMulterFilename(name: string): string;
/** Sichere Varianten fürs Auflösen existierender Dateien (NFC/NFD/Mojibake). */
export declare function filenameLookupVariants(filePath: string): string[];
//# sourceMappingURL=multerFilename.d.ts.map