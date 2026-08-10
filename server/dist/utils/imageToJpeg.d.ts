export declare function isHeicPath(filePath: string): boolean;
/** HEIC/HEIF → JPEG (macOS: sips). Optional maxEdge für schnelle Vorschau. */
export declare function fileToJpegBuffer(filePath: string, maxEdge?: number): Promise<Buffer>;
/**
 * Liest ein Bild; bei maxEdge auf macOS per sips verkleinern,
 * damit Editor/Filmstrip nicht Multi-MB-Originale laden.
 * PNG/WebP/GIF bleiben PNG (kein JPEG — Transparenz bleibt).
 * Kleine Bilder werden nicht hochskaliert.
 */
export declare function readImageFileForServe(filePath: string, maxEdge?: number): Promise<{
    buffer: Buffer;
    mimeType: string;
}>;
export declare function uploadBufferToJpegBuffer(buf: Buffer, originalName: string, maxEdge?: number): Promise<Buffer>;
//# sourceMappingURL=imageToJpeg.d.ts.map