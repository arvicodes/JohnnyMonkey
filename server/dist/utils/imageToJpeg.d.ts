export declare function isHeicPath(filePath: string): boolean;
/** HEIC/HEIF → JPEG (macOS: sips). Optional maxEdge für schnelle Vorschau. */
export declare function fileToJpegBuffer(filePath: string, maxEdge?: number): Promise<Buffer>;
export declare function uploadBufferToJpegBuffer(buf: Buffer, originalName: string, maxEdge?: number): Promise<Buffer>;
//# sourceMappingURL=imageToJpeg.d.ts.map