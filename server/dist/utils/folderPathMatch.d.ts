/** Portable Ordner-Schlüssel (git-intern / J-M-Reihen / Mac-Absolut). */
export declare function toPortableFolderRef(raw: string): string;
export declare function portableFolderKey(raw: string): string;
export declare function folderPathsEquivalent(a: string, b: string): boolean;
/** true, wenn assigned den target-Ordner ist oder ihn enthält (Reihe → Stunde). */
export declare function folderPathCovers(assigned: string, target: string): boolean;
//# sourceMappingURL=folderPathMatch.d.ts.map