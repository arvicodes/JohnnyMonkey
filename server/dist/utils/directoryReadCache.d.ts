/**
 * Kurzzeit-Cache für rekursive Verzeichnis-Lesevorgänge (entlastet Event-Loop bei vielen Tabs).
 */
export declare function directoryReadCacheKey(filePath: string, recursive: boolean): string;
export declare function getDirectoryReadCache(key: string): unknown | undefined;
export declare function setDirectoryReadCache(key: string, payload: unknown): void;
export declare function invalidateDirectoryReadCache(pathPrefix?: string): void;
//# sourceMappingURL=directoryReadCache.d.ts.map